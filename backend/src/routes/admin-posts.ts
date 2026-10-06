import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../errors.js";
import { PostsRepo, slugify, type PostRow } from "../posts-repo.js";
import { iso } from "./posts.js";

const PostInput = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().min(1).max(100_000),
  publishedAt: z.string().datetime({ offset: true }),
  status: z.enum(["draft", "published"]),
  sourceUrl: z.string().trim().url().max(500).nullable().optional(),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "use lowercase letters, numbers and dashes")
    .max(80)
    .optional(),
});

const toAdmin = (p: PostRow) => ({
  id: p.id,
  slug: p.slug,
  title: p.title,
  content: p.content,
  status: p.status,
  publishedAt: iso(p.published_at),
  updatedAt: iso(p.updated_at),
  sourceUrl: p.source_url ?? null,
});

export function adminPostsRouter(repo: PostsRepo) {
  const r = Router();
  const idParam = (raw: string) => {
    const id = Number(raw);
    if (!Number.isInteger(id) || id < 1) throw new HttpError(404, "not_found", "Post not found");
    return id;
  };

  r.get("/", async (_req, res) => {
    res.json({ posts: (await repo.listAll()).map(toAdmin) });
  });

  r.get("/:id", async (req, res) => {
    const p = await repo.getById(idParam(req.params.id));
    if (!p) throw new HttpError(404, "not_found", "Post not found");
    res.json(toAdmin(p));
  });

  r.post("/", async (req, res) => {
    const body = PostInput.parse(req.body);
    let slug: string;
    if (body.slug) {
      if (await repo.slugTaken(body.slug)) throw new HttpError(409, "slug_taken", "That slug is already used");
      slug = body.slug;
    } else {
      slug = await repo.uniqueSlug(slugify(body.title));
    }
    const p = await repo.create({ ...body, slug, publishedAt: new Date(body.publishedAt), sourceUrl: body.sourceUrl ?? null });
    res.status(201).json(toAdmin(p));
  });

  r.put("/:id", async (req, res) => {
    const id = idParam(req.params.id);
    const existing = await repo.getById(id);
    if (!existing) throw new HttpError(404, "not_found", "Post not found");
    const body = PostInput.parse(req.body);
    const slug = body.slug ?? existing.slug;
    if (await repo.slugTaken(slug, id)) throw new HttpError(409, "slug_taken", "That slug is already used");
    const p = await repo.update(id, { ...body, slug, publishedAt: new Date(body.publishedAt), sourceUrl: body.sourceUrl ?? null });
    res.json(toAdmin(p));
  });

  r.delete("/:id", async (req, res) => {
    if (!(await repo.remove(idParam(req.params.id)))) throw new HttpError(404, "not_found", "Post not found");
    res.json({ ok: true });
  });

  return r;
}
