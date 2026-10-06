import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import type { Config } from "../config.js";
import { HttpError } from "../errors.js";
import { clearSession, isAuthed, issueSession } from "../auth.js";

export function authRouter(cfg: Config) {
  const r = Router();
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) =>
      res.status(429).json({ error: { code: "rate_limited", message: "Too many login attempts, try again later" } }),
  });

  r.post("/login", loginLimiter, async (req, res) => {
    const { password } = z.object({ password: z.string().min(1).max(200) }).parse(req.body);
    const ok = await bcrypt.compare(password, cfg.adminPasswordHash);
    if (!ok) throw new HttpError(401, "invalid_password", "Wrong password");
    issueSession(res, cfg.sessionSecret, cfg.secureCookies);
    res.json({ ok: true });
  });

  r.post("/logout", (_req, res) => {
    clearSession(res, cfg.secureCookies);
    res.json({ ok: true });
  });

  r.get("/me", (req, res) => {
    res.json({ authenticated: isAuthed(req, cfg.sessionSecret) });
  });

  return r;
}
