import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(process.cwd());

describe("scripts operacionais CookLily", () => {
  it.skipIf(process.platform === "win32")("mantém sintaxe Bash válida", () => {
    for (const relative of [
      "deploy/scripts/carro-chefe-deploy",
      "deploy/scripts/lily-promote-user",
      "deploy/scripts/enable-lily-entrega06-nginx"
    ]) {
      const result = spawnSync("bash", ["-n", path.join(root, relative)], {
        encoding: "utf8"
      });
      expect(result.status, `${relative}: ${result.stderr || result.stdout}`).toBe(0);
    }
  });

  it("faz deploy falhar fechado sem chave MFA de produção", () => {
    const deployer = readFileSync(path.join(root, "deploy/scripts/carro-chefe-deploy"), "utf8");
    expect(deployer).toContain("LILY_MFA_ENCRYPTION_KEY ausente");
    expect(deployer).toContain("32 bytes em base64url");
  });
});
