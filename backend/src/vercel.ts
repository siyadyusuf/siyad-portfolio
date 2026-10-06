// Vercel serverless entry: one function serves every /api/* route.
// Reuses the pool and runs the idempotent migration once per cold start.
import type { Request, Response } from "express";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createPool, migrate } from "./db.js";

const db = createPool();
const ready = migrate(db);
const app = createApp({ cfg: loadConfig(), db });

export default async function handler(req: Request, res: Response) {
  await ready;
  return app(req, res);
}
