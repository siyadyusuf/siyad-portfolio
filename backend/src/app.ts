import express from "express";
import cookieParser from "cookie-parser";
import type { Pool } from "pg";
import type { Config } from "./config.js";
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
