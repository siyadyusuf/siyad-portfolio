import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const backend = path.resolve(import.meta.dirname, "..");

// Vercel maps every file in api/ to a serverless function, then installs
// { src: "^/api(/.*)?$", status: 404 } for paths that do not match a file.
// api/index.ts only matches exact /api, so /api/health was that platform 404
// and never reached the Express app in src/app.ts. The Express preset already
// sends every other path to that app, so the api/ entry must stay absent.
describe("vercel routing config", () => {
  it("lets the Express app in src/app.ts own /api/health", () => {
    const config = JSON.parse(readFileSync(path.join(backend, "vercel.json"), "utf8"));

    expect(config.framework).toBe("express");
    expect(config.functions["src/app.ts"].includeFiles).toBe("schema.sql");

    const functionPaths = Object.keys(config.functions);
    expect(functionPaths.filter((key) => key.startsWith("api/"))).toEqual([]);
    expect(config.rewrites).toBeUndefined();

    const apiDir = path.join(backend, "api");
    const sources = existsSync(apiDir)
      ? readdirSync(apiDir).filter((name) => /\.(cjs|cts|js|mjs|mts|ts)$/.test(name))
      : [];
    expect(sources).toEqual([]);
  });
});
