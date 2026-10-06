import type { Pool } from "pg";

export interface PostRow {
  id: number;
  slug: string;
  title: string;
  content: string;
  status: "draft" | "published";
  published_at: Date;
  updated_at: Date;
  source_url: string | null;
}

export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "post"
  );
}

export function excerptOf(markdown: string, max = 180): string {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, " ")
    .replace(/[#>*_`~]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length <= max ? plain : plain.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

const PUBLIC_WHERE = "status = 'published' AND published_at <= $1";

export class PostsRepo {
  constructor(private db: Pool) {}

  async listPublic(now: Date, limit: number, offset: number) {
    const total = await this.db.query(`SELECT COUNT(*)::int AS n FROM posts WHERE ${PUBLIC_WHERE}`, [now]);
    const rows = await this.db.query<PostRow>(
      `SELECT * FROM posts WHERE ${PUBLIC_WHERE} ORDER BY published_at DESC, id DESC LIMIT $2 OFFSET $3`,
      [now, limit, offset]
    );
    return { total: Number(total.rows[0].n), rows: rows.rows };
  }

  async getPublicBySlug(slug: string, now: Date) {
    const r = await this.db.query<PostRow>(`SELECT * FROM posts WHERE slug = $2 AND ${PUBLIC_WHERE}`, [now, slug]);
    return r.rows[0];
  }

  async listAll() {
    const r = await this.db.query<PostRow>("SELECT * FROM posts ORDER BY published_at DESC, id DESC");
    return r.rows;
  }

  async getById(id: number) {
    const r = await this.db.query<PostRow>("SELECT * FROM posts WHERE id = $1", [id]);
    return r.rows[0];
  }

  async slugTaken(slug: string, exceptId?: number) {
    const r = await this.db.query("SELECT id FROM posts WHERE slug = $1", [slug]);
    return r.rows.some((row) => row.id !== exceptId);
  }

  async uniqueSlug(base: string, exceptId?: number) {
    let slug = base;
    for (let i = 2; await this.slugTaken(slug, exceptId); i++) slug = `${base}-${i}`;
    return slug;
  }

  async create(p: { slug: string; title: string; content: string; status: string; publishedAt: Date; sourceUrl: string | null }) {
    const r = await this.db.query<PostRow>(
      `INSERT INTO posts (slug, title, content, status, published_at, source_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [p.slug, p.title, p.content, p.status, p.publishedAt, p.sourceUrl]
    );
    return r.rows[0];
  }

  async update(id: number, p: { slug: string; title: string; content: string; status: string; publishedAt: Date; sourceUrl: string | null }) {
    const r = await this.db.query<PostRow>(
      `UPDATE posts SET slug = $2, title = $3, content = $4, status = $5, published_at = $6, source_url = $7, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, p.slug, p.title, p.content, p.status, p.publishedAt, p.sourceUrl]
    );
    return r.rows[0];
  }

  async remove(id: number) {
    const r = await this.db.query("DELETE FROM posts WHERE id = $1 RETURNING id", [id]);
    return (r.rowCount ?? 0) > 0;
  }
}
