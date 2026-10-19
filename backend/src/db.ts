import { readFileSync } from "node:fs";
import pg from "pg";

/**
 * Arbitrary stable id shared by every instance. Concurrent cold starts take
 * this transaction-scoped advisory lock before any DDL, so they queue instead
 * of deadlocking on the table locks inside schema.sql.
 */
const MIGRATION_LOCK_KEY = 814_202_610;
const MAX_MIGRATION_ATTEMPTS = 3;
const RETRYABLE_PG_CODES = new Set(["40P01", "40001", "55P03"]);

export function createPool(url = process.env.DATABASE_URL) {
  if (!url) throw new Error("Missing env var DATABASE_URL");
  return new pg.Pool({ connectionString: url, ssl: url.includes("localhost") ? false : { rejectUnauthorized: false } });
}

export async function migrate(pool: pg.Pool): Promise<void> {
  const statements = schemaStatements(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  if (statements.length === 0) throw new Error("schema.sql did not contain any statements");

  for (let attempt = 1; attempt <= MAX_MIGRATION_ATTEMPTS; attempt++) {
    try {
      await applySchema(pool, statements);
      return;
    } catch (err) {
      if (attempt === MAX_MIGRATION_ATTEMPTS || !isRetryableMigrationError(err)) throw err;
      console.warn(`schema migration attempt ${attempt} failed (${pgErrorCode(err)}); retrying`);
    }
  }
}

/**
 * schema.sql is one implicit transaction when sent as a single simple-query
 * message. CREATE INDEX IF NOT EXISTS holds ShareLock until that transaction
 * ends, and the following ALTER TABLE then asks for AccessExclusiveLock.
 * Two overlapping boots each hold the weaker lock and wait on the stronger
 * one: deadlock 40P01, including when the schema is already in place.
 * Run each statement on its own, after the advisory lock, in one transaction.
 */
function schemaStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function isRetryableMigrationError(err: unknown): boolean {
  const code = pgErrorCode(err);
  return code !== undefined && RETRYABLE_PG_CODES.has(code);
}

function pgErrorCode(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null || !("code" in err)) return undefined;
  const code = (err as { code: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

async function applySchema(pool: pg.Pool, statements: string[]): Promise<void> {
  const client = await pool.connect();
  let discard = false;
  try {
    try {
      await client.query("BEGIN");
      // Literal key, not a bound parameter: the single-argument lock is
      // unambiguous, and Neon's transaction pooler can drop prepared statements.
      await client.query(`SELECT pg_advisory_xact_lock(${MIGRATION_LOCK_KEY}::bigint)`);
      for (const statement of statements) await client.query(statement);
      await client.query("COMMIT");
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // The session is unusable. Returning it to the pool would hand the
        // next caller a connection stuck in an aborted transaction.
        discard = true;
      }
      throw err;
    }
  } finally {
    if (discard) client.release(true);
    else client.release();
  }
}
