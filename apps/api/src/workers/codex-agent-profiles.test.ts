import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { config } from "../config";

const profilesRoot = path.join(config.projectRoot, ".codex", "agents");

async function readProfiles() {
  const filenames = (await fs.readdir(profilesRoot)).filter((filename) => filename.endsWith(".toml")).sort();
  return Promise.all(filenames.map(async (filename) => ({ filename, content: await fs.readFile(path.join(profilesRoot, filename), "utf8") })));
}

describe("perfis especializados do Codex", () => {
  it("obriga preflight e leitura das fontes em todos os perfis", async () => {
    const profiles = await readProfiles();

    expect(profiles.length).toBeGreaterThan(0);
    for (const profile of profiles) {
      expect(profile.content, profile.filename).toContain("policy:preflight");
      expect(profile.content, profile.filename).toContain("REGRAS.md");
      expect(profile.content, profile.filename).toContain("AGENTS.md");
      expect(profile.content, profile.filename).toContain("versão/hash");
    }
  });

  it("reserva escrita de projeto ao development e mantém dados separado", async () => {
    const profiles = await readProfiles();
    const development = profiles.find((profile) => profile.filename === "development.toml");
    const businessProfiles = profiles.filter((profile) => profile.filename !== "development.toml");

    expect(development?.content).toContain('sandbox_mode = "workspace-write"');
    expect(development?.content).toContain("AG-DADOS");
    expect(profiles.some((profile) => profile.filename === "dados.toml")).toBe(true);
    for (const profile of businessProfiles) {
      expect(profile.content, profile.filename).toContain('sandbox_mode = "read-only"');
      expect(profile.content, profile.filename).toMatch(/Não altere código|Não programe/);
      expect(profile.content, profile.filename).toContain("handoff");
    }
  });

  it("mantém a decisão vigente da marca sem a instrução obsoleta", async () => {
    const marca = await fs.readFile(path.join(profilesRoot, "marca.toml"), "utf8");

    expect(marca).toContain("Carro Chefe para a marca");
    expect(marca).toContain("Carro‑Chefe para o produto");
    expect(marca).toContain("alias legado interno");
    expect(marca).not.toContain("Não consolide a relação");
  });
});
