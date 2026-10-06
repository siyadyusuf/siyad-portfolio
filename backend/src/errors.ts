import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  if (err instanceof ZodError) {
    const msg = err.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
    return res.status(400).json({ error: { code: "validation_error", message: msg } });
  }
  console.error(err);
  return res.status(500).json({ error: { code: "internal_error", message: "Something went wrong" } });
}
