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
      "deploy/scripts/enable-lily-entrega06-nginx",
      "deploy/scripts/enable-lily-entrega07-nginx"
    ]) {
      const result = spawnSync("bash", ["-n", path.join(root, relative)], {
        encoding: "utf8"
      });
      expect(result.status, `${relative}: ${result.stderr || result.stdout}`).toBe(0);
    }
  });

  it("mantém bootstrap Nginx da Entrega 07 idempotente e fail-closed", () => {
    const helper = readFileSync(path.join(root, "deploy/scripts/enable-lily-entrega07-nginx"), "utf8");
    expect(helper).toContain("location = /api/v1/lily/payments");
    expect(helper).toContain("location ^~ /api/v1/lily/payments/");
    expect(helper).toContain("Configuração parcial detectada");
    expect(helper).toContain("nginx -t falhou; restaurando backup");
    expect(helper).toContain("systemctl reload nginx");
    expect(helper.indexOf("location = /api/v1/lily/payments")).toBeLessThan(helper.indexOf('marker = "    location ^~ /api/ { return 404; }"'));
  });

  it("reexecuta a versão do deployer contida no SHA alvo antes do release", () => {
    const deployer = readFileSync(path.join(root, "deploy/scripts/carro-chefe-deploy"), "utf8");
    expect(deployer).toContain('git show "${RELEASE_SHA}:deploy/scripts/carro-chefe-deploy"');
    expect(deployer).toContain('CARRO_CHEFE_DEPLOY_REEXEC');
    expect(deployer).toContain('DEPLOYER_PATH="$(readlink -f "${BASH_SOURCE[0]}")"');
    expect(deployer).toContain('sha256sum "${DEPLOYER_PATH}"');
    expect(deployer).toContain('reexec do deployer sem lock herdado');
    expect(deployer).toContain('exec env CARRO_CHEFE_DEPLOY_REEXEC=1');
    expect(deployer.indexOf('deployer_update=reexec')).toBeLessThan(deployer.indexOf('PHASE="nginx-precheck"'));
    expect(deployer.indexOf('deployer_update=reexec')).toBeLessThan(deployer.indexOf('PHASE="backup"'));
  });

  it("força NODE_ENV=test somente durante a suíte de preflight", () => {
    const deployer = readFileSync(path.join(root, "deploy/scripts/carro-chefe-deploy"), "utf8");
    expect(deployer).toContain('preflight env NODE_ENV=test npm test');
  });

  it("faz deploy falhar fechado sem chave MFA de produção", () => {
    const deployer = readFileSync(path.join(root, "deploy/scripts/carro-chefe-deploy"), "utf8");
    expect(deployer).toContain("LILY_MFA_ENCRYPTION_KEY ausente");
    expect(deployer).toContain("32 bytes em base64url");
  });
});
