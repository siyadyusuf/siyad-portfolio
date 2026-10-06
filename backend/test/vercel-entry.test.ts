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
  it("runs migrate on cold start and serves /api/health", async () => {
    const { default: handler } = await import("../api/index.js");
    expect(migrate).toHaveBeenCalledTimes(1);
    const res = await request(handler as never).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
