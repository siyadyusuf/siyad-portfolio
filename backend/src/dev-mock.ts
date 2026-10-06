// Local dev server with an in-memory Postgres and sample posts. No real DB or secrets needed.
// Admin password: "dev". Contact emails are logged instead of sent.
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { newDb } from "pg-mem";
import express from "express";
import { createApp } from "./app.js";

const mem = newDb();
const { Pool } = mem.adapters.createPg();
const db = new Pool();
await db.query(readFileSync(new URL("../schema.sql", import.meta.url), "utf8").replace(/CHECK \(.*?\)\)/, ""));

const day = 86_400_000;
const samples = [
  { slug: "sample-post-one", title: "Sample post one", status: "published", at: Date.now() - 3 * day },
  { slug: "sample-post-two", title: "Sample post two", status: "published", at: Date.now() - 1 * day },
  { slug: "sample-draft", title: "Sample draft (hidden)", status: "draft", at: Date.now() - day },
  { slug: "sample-scheduled", title: "Sample scheduled post (hidden until next week)", status: "published", at: Date.now() + 7 * day },
];
for (const s of samples) {
  await db.query(
    "INSERT INTO posts (slug, title, content, status, published_at) VALUES ($1, $2, $3, $4, $5)",
    [s.slug, s.title, `# ${s.title}\n\nPlaceholder text for layout testing. **Bold**, _italic_, and a [link](https://example.com).\n\n- one\n- two\n\nAnother paragraph so the phone view has something to scroll.`, s.status, new Date(s.at)]
  );
}

const api = createApp({
  cfg: {
    adminPasswordHash: bcrypt.hashSync("dev", 4),
    sessionSecret: "dev-secret",
    contactTo: "dev@example.com",
    contactFrom: "dev@example.com",
    githubUser: process.env.GITHUB_USER ?? "siyadyusuf",
    secureCookies: false,
    corsOrigin: process.env.CORS_ORIGIN,
  },
  db: db as any,
  sendEmail: async (m) => console.log("[contact email]", m),
});
// Safety net for the public test link: requests that came through a Cloudflare tunnel
// can't log in or reach admin routes, since the mock password is just "dev".
const app = express();
app.use((req, res, next) => {
  const viaTunnel = Boolean(req.headers["cf-connecting-ip"] || req.headers["cf-ray"]);
  if (viaTunnel && (req.path.startsWith("/api/auth/login") || req.path.startsWith("/api/admin"))) {
    return res.status(403).json({ error: { code: "disabled_on_test_link", message: "The editor is turned off on the test link" } });
  }
  next();
});
app.use(api);
const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`Mock API on http://localhost:${port} (admin password: dev)`));
