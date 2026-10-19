import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import type pg from "pg";
import { migrate } from "../src/db.js";

const LOCK_SQL = "SELECT pg_advisory_xact_lock(814202610::bigint)";

interface FakeClient {
  queries: string[];
  query: ReturnType<typeof vi.fn>;
  release: ReturnType<typeof vi.fn>;
}

function harness(run?: (sql: string, attempt: number) => void) {
  const clients: FakeClient[] = [];
  const connect = vi.fn(async () => {
    const attempt = clients.length + 1;
    const client: FakeClient = {
      queries: [],
      query: vi.fn(async (sql: string) => {
        client.queries.push(sql);
        run?.(sql, attempt);
        return { rows: [] };
      }),
      release: vi.fn(),
    };
    clients.push(client);
    return client;
  });
  return { pool: { connect } as unknown as pg.Pool, clients, connect };
}

function pgError(message: string, code: string) {
  return Object.assign(new Error(message), { code });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("migrate", () => {
  const schema = readFileSync(new URL("../schema.sql", import.meta.url), "utf8");

  it("takes an advisory lock before the idempotent schema statements and commits", async () => {
    const { pool, clients, connect } = harness();

    await migrate(pool);

    expect(connect).toHaveBeenCalledTimes(1);
    const queries = clients[0].queries;
    expect(queries[0]).toBe("BEGIN");
    expect(queries[1]).toBe(LOCK_SQL);
    const ddl = queries.slice(2, -1);
    expect(ddl.length).toBeGreaterThan(0);
    for (const statement of ddl) {
      expect(schema).toContain(statement);
      expect(statement).toMatch(/IF NOT EXISTS/);
    }
    expect(ddl.some((statement) => statement.startsWith("CREATE TABLE"))).toBe(true);
    expect(ddl.some((statement) => statement.startsWith("CREATE INDEX"))).toBe(true);
    expect(ddl.some((statement) => statement.startsWith("ALTER TABLE"))).toBe(true);
    expect(queries.at(-1)).toBe("COMMIT");
    expect(queries).not.toContain("ROLLBACK");
    expect(clients[0].release).toHaveBeenCalledTimes(1);
    expect(clients[0].release).toHaveBeenCalledWith();
  });

  it("retries a deadlock on a new connection and then commits", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { pool, clients } = harness((sql, attempt) => {
      if (attempt === 1 && sql.startsWith("CREATE")) throw pgError("deadlock detected", "40P01");
    });

    await migrate(pool);

    expect(clients).toHaveLength(2);
    expect(clients[0].queries).toContain("ROLLBACK");
    expect(clients[0].queries).not.toContain("COMMIT");
    expect(clients[0].release).toHaveBeenCalledWith();
    expect(clients[1].queries[1]).toBe(LOCK_SQL);
    expect(clients[1].queries.at(-1)).toBe("COMMIT");
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it("does not retry a non-lock error", async () => {
    const syntax = pgError("syntax error", "42601");
    const { pool, clients, connect } = harness((sql) => {
      if (sql.startsWith("CREATE")) throw syntax;
    });

    await expect(migrate(pool)).rejects.toBe(syntax);

    expect(connect).toHaveBeenCalledTimes(1);
    expect(clients[0].queries).toContain("ROLLBACK");
    expect(clients[0].release).toHaveBeenCalledWith();
  });

  it("stops after three lock conflicts", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const deadlock = pgError("deadlock detected", "40P01");
    const { pool, clients } = harness((sql) => {
      if (sql.startsWith("CREATE") || sql.startsWith("ALTER")) throw deadlock;
    });

    await expect(migrate(pool)).rejects.toBe(deadlock);

    expect(clients).toHaveLength(3);
    expect(clients.every((client) => client.queries.includes("ROLLBACK"))).toBe(true);
    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  it("discards the connection when rollback fails and still throws the original error", async () => {
    const terminated = pgError("connection terminated", "57P01");
    const { pool, clients } = harness((sql) => {
      if (sql.startsWith("CREATE") || sql === "ROLLBACK") throw terminated;
    });

    await expect(migrate(pool)).rejects.toBe(terminated);

    expect(clients).toHaveLength(1);
    expect(clients[0].release).toHaveBeenCalledWith(true);
  });
});
