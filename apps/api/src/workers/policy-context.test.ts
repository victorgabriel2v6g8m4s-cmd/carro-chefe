import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { config } from "../config";
import {
  formatPolicyPrompt,
  loadPolicyManifest,
  policyAuditPayload,
  resolvePolicyContext,
  verifyPolicyManifest,
  type PolicyManifest
} from "./policy-context";

describe("política compacta dos agentes", () => {
  let manifest: PolicyManifest;

  beforeAll(async () => {
    manifest = await loadPolicyManifest(config.projectRoot);
  });

  it("herda fontes da raiz até a região mais específica", () => {
    const context = resolvePolicyContext(manifest, "AG-DEV", "apps/api/src/workers/codex-bridge.ts", config.projectRoot);

    expect(context.scope).toBe("apps/api/src/workers");
    expect(context.sourcePaths).toEqual([
      "REGRAS.md",
      "AGENTS.md",
      "apps/AGENTS.md",
      "apps/api/AGENTS.md",
      "apps/api/src/workers/AGENTS.md"
    ]);
    expect(context.capsuleIds).toContain("role.development");
    expect(context.runtimeChars).toBeLessThanOrEqual(context.runtimeBudgetChars);
  });

  it("mantém agentes de negócio fora da programação", () => {
    const context = resolvePolicyContext(manifest, "AG-GESTAO", "docs/ROADMAP.md", config.projectRoot);

    expect(context.capsuleIds).toContain("role.business");
    expect(context.capsuleIds).not.toContain("role.development");
    expect(context.capsule).toContain("Não programe");
    expect(context.capsule).not.toContain("único agente autorizado a implementar");
  });

  it("entrega referências resolvíveis e compactas sem despejar REGRAS.md", () => {
    const context = resolvePolicyContext(manifest, "AG-COMPRAS", "pesquisa de fornecedor", config.projectRoot);
    const prompt = formatPolicyPrompt(context);

    expect(prompt).toContain(config.projectRoot);
    expect(prompt).toContain("REGRAS.md@");
    expect(prompt).toContain(context.manifestHash);
    expect(prompt.length).toBeLessThan(context.runtimeBudgetChars + 1_500);
    expect(prompt).not.toContain("# 394. REGRA ABSOLUTA FINAL");
  });

  it("falha fechado quando o manifesto é adulterado", async () => {
    const tampered = structuredClone(manifest);
    tampered.sources[0].sha256 = "0".repeat(64);

    await expect(verifyPolicyManifest(config.projectRoot, tampered)).rejects.toThrow("Hash interno");
  });

  it("falha fechado quando uma fonte muda depois da geração", async () => {
    const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "carro-policy-"));
    try {
      for (const source of manifest.sources) {
        const target = path.join(temporaryRoot, ...source.path.split("/"));
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.copyFile(path.join(config.projectRoot, ...source.path.split("/")), target);
      }
      await verifyPolicyManifest(temporaryRoot, manifest);
      await fs.appendFile(path.join(temporaryRoot, "REGRAS.md"), "\nregra não compilada\n", "utf8");

      await expect(verifyPolicyManifest(temporaryRoot, manifest)).rejects.toThrow("Fonte de política alterada: REGRAS.md");
    } finally {
      if (path.dirname(path.resolve(temporaryRoot)) !== path.resolve(os.tmpdir()) || !path.basename(temporaryRoot).startsWith("carro-policy-")) {
        throw new Error(`Diretório temporário inesperado: ${temporaryRoot}`);
      }
      await fs.rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("prepara evidência completa para o log de auditoria da execução", () => {
    const context = resolvePolicyContext(manifest, "AG-DEV", "tools/agent-policy/cli.mjs", config.projectRoot);
    const audit = policyAuditPayload(context);

    expect(audit).toMatchObject({
      policyVersion: manifest.policyVersion,
      manifestHash: manifest.manifestHash,
      scope: "tools/agent-policy"
    });
    expect(audit.sourceHashes.every((source) => source.sha256.length === 64)).toBe(true);
  });
});
