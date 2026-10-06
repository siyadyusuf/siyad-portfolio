import { readFileSync } from "node:fs";
import pg from "pg";

export function createPool(url = process.env.DATABASE_URL) {
  if (!url) throw new Error("Missing env var DATABASE_URL");
  return new pg.Pool({ connectionString: url, ssl: url.includes("localhost") ? false : { rejectUnauthorized: false } });
}

export async function migrate(pool: pg.Pool) {
  const sql = readFileSync(new URL("../schema.sql", import.meta.url), "utf8");
  await pool.query(sql);
}
