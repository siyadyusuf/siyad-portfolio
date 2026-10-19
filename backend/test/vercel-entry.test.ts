import { beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../src/db.js", () => ({
  createPool: vi.fn(() => ({ query: vi.fn(), end: vi.fn(async () => undefined) })),
  migrate: vi.fn(async () => undefined),
}));

beforeAll(() => {
  process.env.ADMIN_PASSWORD_HASH = "hash";
  process.env.SESSION_SECRET = "test-secret";
});

async function loadApp() {
  vi.resetModules();
  const db = await import("../src/db.js");
  const migrate = vi.mocked(db.migrate);
  const createPool = vi.mocked(db.createPool);
  migrate.mockReset();
  migrate.mockResolvedValue(undefined);
  createPool.mockReset();
  createPool.mockImplementation(() => ({ query: vi.fn(), end: vi.fn(async () => undefined) }) as never);
  const { default: app } = await import("../src/app.js");
  return { app, migrate, createPool };
}

function poolEnd(createPool: { mock: { results: Array<{ value: unknown }> } }, index: number) {
  return (createPool.mock.results[index]?.value as { end: ReturnType<typeof vi.fn> }).end;
}

describe("vercel serverless entry", () => {
  it("default-exports an app function and serves /api/health without the database", async () => {
    const { app, migrate, createPool } = await loadApp();

    // Vercel accepts a function (Express apps are functions) or an http.Server.
    // Express apps also expose listen(), which is the port-listener shape.
    expect(typeof app).toBe("function");
    expect(typeof app.listen).toBe("function");
    expect(migrate).not.toHaveBeenCalled();
    expect(createPool).not.toHaveBeenCalled();

    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(migrate).not.toHaveBeenCalled();
    expect(createPool).not.toHaveBeenCalled();

    const again = await request(app).get("/api/health");
    expect(again.status).toBe(200);
    expect(again.body).toEqual({ ok: true });
    expect(migrate).not.toHaveBeenCalled();
  });

  it("migrates once for routes that need the database", async () => {
    const { app, migrate, createPool } = await loadApp();

    const missing = await request(app).get("/api/nope");
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ error: { code: "not_found", message: "No such endpoint" } });
    expect(migrate).toHaveBeenCalledTimes(1);
    expect(createPool).toHaveBeenCalledTimes(1);

    const exactApi = await request(app).get("/api");
    expect(exactApi.status).toBe(404);
    expect(exactApi.body).toEqual({ error: { code: "not_found", message: "No such endpoint" } });
    expect(migrate).toHaveBeenCalledTimes(1);
    expect(createPool).toHaveBeenCalledTimes(1);
    expect(poolEnd(createPool, 0)).not.toHaveBeenCalled();
  });

  it("shares one in-flight migration across concurrent requests", async () => {
    const { app, migrate } = await loadApp();
    let releaseMigrate: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      releaseMigrate = resolve;
    });
    migrate.mockImplementation(() => gate);

    try {
      const pending = Promise.all([request(app).get("/api/nope"), request(app).get("/api")]);
      await vi.waitFor(() => expect(migrate).toHaveBeenCalledTimes(1));

      const health = await request(app).get("/api/health");
      expect(health.status).toBe(200);
      expect(health.body).toEqual({ ok: true });
      expect(migrate).toHaveBeenCalledTimes(1);

      releaseMigrate();
      const [missing, exactApi] = await pending;
      expect(missing.status).toBe(404);
      expect(exactApi.status).toBe(404);
      expect(migrate).toHaveBeenCalledTimes(1);
    } finally {
      releaseMigrate();
    }
  });

  it("retries boot after a transient migration failure", async () => {
    const { app, migrate, createPool } = await loadApp();
    migrate.mockRejectedValueOnce(Object.assign(new Error("deadlock detected"), { code: "40P01" }));

    const failed = await request(app).get("/api/nope");
    expect(failed.status).toBe(500);
    expect(failed.body).toEqual({ error: { code: "internal_error", message: "Something went wrong" } });
    expect(migrate).toHaveBeenCalledTimes(1);
    expect(createPool).toHaveBeenCalledTimes(1);
    expect(poolEnd(createPool, 0)).toHaveBeenCalledTimes(1);

    const health = await request(app).get("/api/health");
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ ok: true });
    expect(migrate).toHaveBeenCalledTimes(1);

    const retried = await request(app).get("/api/nope");
    expect(retried.status).toBe(404);
    expect(retried.body).toEqual({ error: { code: "not_found", message: "No such endpoint" } });
    expect(migrate).toHaveBeenCalledTimes(2);
    expect(createPool).toHaveBeenCalledTimes(2);
    expect(poolEnd(createPool, 1)).not.toHaveBeenCalled();

    const again = await request(app).get("/api/nope");
    expect(again.status).toBe(404);
    expect(migrate).toHaveBeenCalledTimes(2);
    expect(createPool).toHaveBeenCalledTimes(2);
  });

  it("sends CORS on /api/health without opening the database", async () => {
    process.env.CORS_ORIGIN = "https://example.com";
    try {
      const { app, migrate, createPool } = await loadApp();
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
      expect(res.headers["access-control-allow-origin"]).toBe("https://example.com");
      expect(res.headers["access-control-allow-credentials"]).toBe("true");
      expect(migrate).not.toHaveBeenCalled();
      expect(createPool).not.toHaveBeenCalled();

      const preflight = await request(app).options("/api/health");
      expect(preflight.status).toBe(204);
      expect(preflight.headers["access-control-allow-origin"]).toBe("https://example.com");
      expect(migrate).not.toHaveBeenCalled();
    } finally {
      delete process.env.CORS_ORIGIN;
    }
  });
});
