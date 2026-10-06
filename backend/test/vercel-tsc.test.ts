import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const backend = path.resolve(import.meta.dirname, "..");

// @vercel/express compiles TypeScript 7 by extending this project's tsconfig
// from a temp directory. An explicit compilerOptions.types entry is resolved
// from that temp directory, which is how TS2688 survived @types/node being
// installed.
describe("vercel typescript compile", () => {
  it("typechecks the Express and serverless entries through a temp tsconfig", () => {
    const temp = mkdtempSync(path.join(tmpdir(), "vercel-typescript-"));
    const configFile = path.join(temp, "tsconfig.json");
    const files = ["src/app.ts", "src/server.ts"].map((file) => path.join(backend, file));
    writeFileSync(
      configFile,
      JSON.stringify({
        extends: path.join(backend, "tsconfig.json"),
        compilerOptions: {
          sourceMap: true,
          inlineSourceMap: false,
          inlineSources: true,
          declaration: false,
          declarationMap: false,
          emitDeclarationOnly: false,
          noEmit: true,
          rootDir: backend,
          incremental: false,
          composite: false,
          noCheck: false,
          rewriteRelativeImportExtensions: true,
        },
        files,
        include: [],
        exclude: [],
      }),
    );

    const result = spawnSync(
      process.execPath,
      [path.join(backend, "node_modules/typescript/bin/tsc"), "--project", configFile, "--pretty", "false"],
      { cwd: backend, encoding: "utf8" },
    );

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
  });
});
