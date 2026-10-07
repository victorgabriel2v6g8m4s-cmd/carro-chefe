import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const appRoot = path.resolve(process.cwd(), "apps/lily_acai");

describe("upload administrativo de capa por sabor", () => {
  it("carrega a extensão administrativa no bundle CookLily", async () => {
    const index = await readFile(path.join(appRoot, "index.html"), "utf8");
    expect(index).toContain('/src/flavor-cover-admin.ts');
  });

  it("faz upload direto e associa a mídia ao sabor", async () => {
    const source = await readFile(path.join(appRoot, "src/flavor-cover-admin.ts"), "utf8");
    expect(source).toContain('/api/v1/lily/admin/media');
    expect(source).toContain('/cover`');
    expect(source).toContain('Enviar foto de capa');
    expect(source).toContain('Substituir foto');
    expect(source).toContain('image/jpeg,image/png,image/webp');
    expect(source).toContain('10 * 1024 * 1024');
  });
});
