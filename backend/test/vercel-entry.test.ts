import { beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../src/db.js", () => ({
  createPool: () => ({ query: vi.fn() }),
  migrate: vi.fn(async () => undefined),
}));

import { migrate } from "../src/db.js";

beforeAll(() => {
  process.env.ADMIN_PASSWORD_HASH = "hash";
  process.env.SESSION_SECRET = "test-secret";
});

describe("vercel serverless entry", () => {
  it("default-exports an app function, migrates once, and serves /api/health", async () => {
    const { default: app } = await import("../src/app.js");
    const { default: apiEntry } = await import("../api/index.js");

    // Vercel accepts a function (Express apps are functions) or an http.Server.
    // Express apps also expose listen(), which is the port-listener shape.
    expect(typeof app).toBe("function");
    expect(typeof app.listen).toBe("function");
    expect(apiEntry).toBe(app);
    expect(migrate).not.toHaveBeenCalled();

    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(migrate).toHaveBeenCalledTimes(1);

    const again = await request(app).get("/api/health");
    expect(again.status).toBe(200);
    expect(again.body).toEqual({ ok: true });
    expect(migrate).toHaveBeenCalledTimes(1);

    const missing = await request(app).get("/api/nope");
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ error: { code: "not_found", message: "No such endpoint" } });
    expect(migrate).toHaveBeenCalledTimes(1);
  });
});
