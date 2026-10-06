import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { HttpError } from "./errors.js";

export const COOKIE = "session";
const MAX_AGE_SEC = 60 * 60 * 24 * 7;

export function issueSession(res: Response, secret: string, secure: boolean) {
  const token = jwt.sign({ role: "admin" }, secret, { expiresIn: MAX_AGE_SEC });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: MAX_AGE_SEC * 1000,
    path: "/",
  });
}

export function clearSession(res: Response, secure: boolean) {
  res.clearCookie(COOKIE, { httpOnly: true, secure, sameSite: "lax", path: "/" });
}

export function isAuthed(req: Request, secret: string): boolean {
  const token = req.cookies?.[COOKIE];
  if (!token) return false;
  try {
    const payload = jwt.verify(token, secret) as { role?: string };
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export function requireAdmin(secret: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!isAuthed(req, secret)) return next(new HttpError(401, "unauthorized", "Please log in"));
    next();
  };
}
