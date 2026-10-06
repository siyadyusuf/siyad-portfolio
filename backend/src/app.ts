import express, { type NextFunction, type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import type { Pool } from "pg";
import { loadConfig, type Config } from "./config.js";
import { createPool, migrate } from "./db.js";
import { errorHandler, HttpError } from "./errors.js";
import { requireAdmin } from "./auth.js";
import { PostsRepo } from "./posts-repo.js";
import { authRouter } from "./routes/auth.js";
import { publicPostsRouter } from "./routes/posts.js";
import { adminPostsRouter } from "./routes/admin-posts.js";
import { contactRouter, resendSender, type SendEmail } from "./routes/contact.js";
import { githubRouter } from "./routes/github.js";

export interface AppDeps {
  cfg: Config;
  db: Pool;
  sendEmail?: SendEmail;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

export function createApp({ cfg, db, sendEmail, fetchImpl, now = () => new Date() }: AppDeps) {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(express.json({ limit: "200kb" }));
  app.use(cookieParser());

  if (cfg.corsOrigin) {
    app.use((req, res, next) => {
      res.set("Access-Control-Allow-Origin", cfg.corsOrigin!);
      res.set("Access-Control-Allow-Credentials", "true");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      res.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
      res.set("Vary", "Origin");
      if (req.method === "OPTIONS") return res.sendStatus(204);
      next();
    });
  }

  const repo = new PostsRepo(db);
  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRouter(cfg));
  app.use("/api/posts", publicPostsRouter(repo, now));
  app.use("/api/admin/posts", requireAdmin(cfg.sessionSecret), adminPostsRouter(repo));
  app.use("/api/contact", contactRouter(cfg, sendEmail ?? resendSender(cfg.resendApiKey, fetchImpl)));
  app.use("/api/github", githubRouter(cfg, fetchImpl));
  app.use("/api", (_req, _res, next) => next(new HttpError(404, "not_found", "No such endpoint")));
  app.use(errorHandler);
  return app;
}

let booted: Promise<ReturnType<typeof createApp>> | undefined;

/** One pool and one migrate() per cold start. Importing this module does not connect. */
function bootProductionApp() {
  if (!booted) {
    const db = createPool();
    const app = createApp({ cfg: loadConfig(), db });
    booted = migrate(db).then(() => app);
  }
  return booted;
}

// The Express preset loads this file (it imports express and matches a
// recognized entry name) and sends every path here, including /api/health.
// The Node runtime exits unless the default export is a function or server.
// Routes stay on an inner app created after migrate() so unit tests can
// import createApp without opening a database.
//
// Do not add an api/ serverless file. When any api/ function exists, Vercel
// matches only that file's path (api/index.ts is exact /api) and returns its
// own 404 for the rest of /api/*, so /api/health never reaches this app.
const vercelApp = express();
vercelApp.disable("x-powered-by");
vercelApp.use((req: Request, res: Response, next: NextFunction) => {
  return bootProductionApp()
    .then((api) => api(req, res, next))
    .catch(next);
});
vercelApp.use(errorHandler);

export default vercelApp;
