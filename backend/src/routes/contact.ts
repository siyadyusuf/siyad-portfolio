import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import type { Config } from "../config.js";
import { HttpError } from "../errors.js";

export type SendEmail = (msg: { to: string; from: string; replyTo: string; subject: string; text: string }) => Promise<void>;

export function resendSender(apiKey?: string, fetchImpl: typeof fetch = fetch): SendEmail {
  return async (msg) => {
    if (!apiKey) throw new HttpError(503, "email_not_configured", "Contact form isn't set up yet");
    const res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: msg.from, to: [msg.to], reply_to: msg.replyTo, subject: msg.subject, text: msg.text }),
    });
    if (!res.ok) throw new HttpError(502, "email_failed", "Couldn't send your message, please try again");
  };
}

const ContactInput = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(1).max(5000),
  website: z.string().optional(),
});

export function contactRouter(cfg: Config, send: SendEmail) {
  const r = Router();
  const limiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) =>
      res.status(429).json({ error: { code: "rate_limited", message: "You've sent a few messages already, try again later" } }),
  });

  r.post("/", limiter, async (req, res) => {
    const body = ContactInput.parse(req.body);
    // Honeypot: bots fill the hidden "website" field. Pretend success, send nothing.
    if (body.website && body.website.trim() !== "") return res.json({ ok: true });
    await send({
      to: cfg.contactTo,
      from: cfg.contactFrom,
      replyTo: body.email,
      subject: `Portfolio message from ${body.name}`,
      text: `From: ${body.name} <${body.email}>\n\n${body.message}`,
    });
    res.json({ ok: true });
  });

  return r;
}
