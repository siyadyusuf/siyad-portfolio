import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../errors.js";
import { excerptOf, PostsRepo, type PostRow } from "../posts-repo.js";

export const iso = (d: Date) => new Date(d).toISOString();

export function publicPostsRouter(repo: PostsRepo, now: () => Date) {
  const r = Router();

  r.get("/", async (req, res) => {
    const q = z
      .object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(50).default(10),
      })
      .parse(req.query);
    const { total, rows } = await repo.listPublic(now(), q.limit, (q.page - 1) * q.limit);
    res.json({
      posts: rows.map((p: PostRow) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        excerpt: excerptOf(p.content),
        publishedAt: iso(p.published_at),
        sourceUrl: p.source_url ?? null,
      })),
      page: q.page,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
    });
  });

  r.get("/:slug", async (req, res) => {
    const p = await repo.getPublicBySlug(req.params.slug, now());
    if (!p) throw new HttpError(404, "not_found", "Post not found");
    res.json({
      id: p.id,
      slug: p.slug,
      title: p.title,
      content: p.content,
      publishedAt: iso(p.published_at),
      updatedAt: iso(p.updated_at),
      sourceUrl: p.source_url ?? null,
    });
  });

  return r;
}
