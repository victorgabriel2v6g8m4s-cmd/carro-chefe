import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sourceDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const entrypoint = readFileSync(resolve(sourceDirectory, "styles.css"), "utf8");

describe("arquitetura dos estilos da Central", () => {
  it("mantém o entrypoint composto apenas por módulos existentes", () => {
    const imports = [...entrypoint.matchAll(/@import\s+["'](.+?)["'];/g)].map((match) => match[1]);
    expect(imports.length).toBeGreaterThanOrEqual(8);
    expect(entrypoint).not.toContain("{");
    expect(imports.every((path) => existsSync(resolve(sourceDirectory, path)))).toBe(true);
  });
});
