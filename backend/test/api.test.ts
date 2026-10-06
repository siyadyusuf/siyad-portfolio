import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { newDb } from "pg-mem";
import { createApp } from "../src/app.js";
import type { Config } from "../src/config.js";

const PASSWORD = "test-password";
const cfg: Config = {
  adminPasswordHash: bcrypt.hashSync(PASSWORD, 4),
  sessionSecret: "test-secret",
  contactTo: "owner@example.com",
  contactFrom: "Portfolio <noreply@example.com>",
  githubUser: "siyadyusuf",
  secureCookies: false,
};

let now = new Date("2026-10-06T15:00:00Z");
let sent: any[];
let app: ReturnType<typeof createApp>;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  const mem = newDb();
  const { Pool } = mem.adapters.createPg();
  const db = new Pool();
  await db.query(readFileSync(new URL("../schema.sql", import.meta.url), "utf8").replace(/CHECK \(.*?\)\)/, ""));
  sent = [];
  now = new Date("2026-10-06T15:00:00Z");
  fetchMock = vi.fn(async (url: string) => url.includes("/contributions") ? ({
    ok: true,
    status: 200,
    text: async () => readFileSync(new URL("./fixtures/contributions.html", import.meta.url), "utf8"),
  }) : ({
    ok: true,
    status: 200,
    json: async () =>
      url.includes("/repos")
        ? [
            { name: "ypinr", description: "scam detector", html_url: "https://github.com/siyadyusuf/ypinr", language: "TypeScript", stargazers_count: 3, pushed_at: "2026-10-01T00:00:00Z", fork: false },
            { name: "forked", html_url: "x", fork: true },
          ]
        : [{ type: "PushEvent", repo: { name: "siyadyusuf/ypinr" }, payload: { size: 1, commits: [{ message: "fix bug\nmore" }] }, created_at: "2026-10-02T00:00:00Z" }],
  }));
  app = createApp({ cfg, db: db as any, sendEmail: async (m) => void sent.push(m), fetchImpl: fetchMock as any, now: () => now });
});

async function login() {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ password: PASSWORD }).expect(200);
  return agent;
}

const post = (over: Record<string, unknown> = {}) => ({
  title: "Hello World",
  content: "# Hi\n\nThis is my **first** post.",
  publishedAt: "2026-10-05T12:00:00Z",
  status: "published",
  ...over,
});

describe("auth", () => {
  it("rejects wrong password and reports session state", async () => {
    await request(app).post("/api/auth/login").send({ password: "nope" }).expect(401);
    expect((await request(app).get("/api/auth/me")).body).toEqual({ authenticated: false });
    const agent = await login();
    expect((await agent.get("/api/auth/me")).body).toEqual({ authenticated: true });
    await agent.post("/api/auth/logout").expect(200);
    expect((await agent.get("/api/auth/me")).body).toEqual({ authenticated: false });
  });

  it("protects admin routes", async () => {
    const r = await request(app).get("/api/admin/posts").expect(401);
    expect(r.body.error.code).toBe("unauthorized");
  });
});

describe("posts", () => {
  it("hides drafts and future posts, shows published ones newest first", async () => {
    const a = await login();
    await a.post("/api/admin/posts").send(post({ title: "Old", publishedAt: "2026-10-01T00:00:00Z" })).expect(201);
    await a.post("/api/admin/posts").send(post({ title: "New" })).expect(201);
    await a.post("/api/admin/posts").send(post({ title: "Draft", status: "draft" })).expect(201);
    await a.post("/api/admin/posts").send(post({ title: "Scheduled", publishedAt: "2026-10-10T00:00:00Z" })).expect(201);

    const list = (await request(app).get("/api/posts").expect(200)).body;
    expect(list.posts.map((p: any) => p.title)).toEqual(["New", "Old"]);
    expect(list.posts[0]).toMatchObject({ slug: "new", publishedAt: "2026-10-05T12:00:00.000Z", sourceUrl: null });
    expect(list.posts[0].excerpt).toBe("Hi This is my first post.");
    expect(list).toMatchObject({ page: 1, totalPages: 1 });

    await request(app).get("/api/posts/scheduled").expect(404);
    await request(app).get("/api/posts/draft").expect(404);

    now = new Date("2026-10-11T00:00:00Z");
    const later = (await request(app).get("/api/posts")).body;
    expect(later.posts[0].title).toBe("Scheduled");

    const admin = (await a.get("/api/admin/posts")).body.posts;
    expect(admin).toHaveLength(4);
  });

  it("returns a full post and paginates", async () => {
    const a = await login();
    for (let i = 1; i <= 3; i++) await a.post("/api/admin/posts").send(post({ title: `P${i}`, publishedAt: `2026-10-0${i}T00:00:00Z` }));
    const one = (await request(app).get("/api/posts/p2").expect(200)).body;
    expect(one).toMatchObject({ slug: "p2", title: "P2", content: post().content });
    expect(one.updatedAt).toBeTruthy();
    expect(one.sourceUrl).toBeNull();
    const page2 = (await request(app).get("/api/posts?page=2&limit=2")).body;
    expect(page2).toMatchObject({ page: 2, totalPages: 2 });
    expect(page2.posts.map((p: any) => p.title)).toEqual(["P1"]);
  });

  it("makes unique slugs, respects custom slugs, updates and deletes", async () => {
    const a = await login();
    const p1 = (await a.post("/api/admin/posts").send(post())).body;
    const p2 = (await a.post("/api/admin/posts").send(post())).body;
    expect([p1.slug, p2.slug]).toEqual(["hello-world", "hello-world-2"]);
    await a.post("/api/admin/posts").send(post({ slug: "hello-world" })).expect(409);
    await a.post("/api/admin/posts").send(post({ slug: "Bad Slug" })).expect(400);

    const upd = (await a.put(`/api/admin/posts/${p1.id}`).send(post({ title: "Edited", slug: "edited" })).expect(200)).body;
    expect(upd).toMatchObject({ title: "Edited", slug: "edited", sourceUrl: null });
    const li = "https://www.linkedin.com/posts/example";
    await a.put(`/api/admin/posts/${p1.id}`).send(post({ title: "Edited", slug: "edited", sourceUrl: li })).expect(200);
    expect((await request(app).get("/api/posts/edited")).body.sourceUrl).toBe(li);
    await a.put(`/api/admin/posts/${p1.id}`).send(post({ slug: "edited", sourceUrl: "not a url" })).expect(400);
    await a.put(`/api/admin/posts/${p2.id}`).send(post({ slug: "edited" })).expect(409);

    await a.delete(`/api/admin/posts/${p1.id}`).expect(200);
    await a.delete(`/api/admin/posts/${p1.id}`).expect(404);
    await request(app).get("/api/posts/edited").expect(404);
  });

  it("validates input", async () => {
    const a = await login();
    const r = await a.post("/api/admin/posts").send(post({ publishedAt: "tomorrow" })).expect(400);
    expect(r.body.error.code).toBe("validation_error");
  });
});

describe("contact", () => {
  it("sends email, ignores honeypot, validates", async () => {
    await request(app).post("/api/contact").send({ name: "Recruiter", email: "r@co.com", message: "Hi!" }).expect(200, { ok: true });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: "owner@example.com", replyTo: "r@co.com" });
    await request(app).post("/api/contact").send({ name: "Bot", email: "b@x.com", message: "spam", website: "http://spam" }).expect(200);
    expect(sent).toHaveLength(1);
    await request(app).post("/api/contact").send({ name: "X", email: "not-an-email", message: "hi" }).expect(400);
  });

  it("rate limits after 5 messages", async () => {
    for (let i = 0; i < 5; i++) await request(app).post("/api/contact").send({ name: "A", email: "a@b.com", message: "m" });
    const r = await request(app).post("/api/contact").send({ name: "A", email: "a@b.com", message: "m" }).expect(429);
    expect(r.body.error.code).toBe("rate_limited");
  });
});

describe("github", () => {
  it("shapes and caches data", async () => {
    const r = (await request(app).get("/api/github").expect(200)).body;
    expect(r.repos).toEqual([
      { name: "ypinr", description: "scam detector", url: "https://github.com/siyadyusuf/ypinr", language: "TypeScript", stars: 3, updatedAt: "2026-10-01T00:00:00.000Z" },
    ]);
    expect(r.recentActivity[0]).toMatchObject({ type: "PushEvent", repo: "siyadyusuf/ypinr", message: "Pushed 1 commit: fix bug" });
    expect(r.contributions).toEqual({
      total: 1205,
      days: [
        { date: "2025-10-05", count: 0 },
        { date: "2025-10-06", count: 1204 },
        { date: "2025-10-07", count: 1 },
      ],
    });
    await request(app).get("/api/github").expect(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

it("unknown api routes 404 with error shape", async () => {
  const r = await request(app).get("/api/nope").expect(404);
  expect(r.body).toEqual({ error: { code: "not_found", message: "No such endpoint" } });
});
