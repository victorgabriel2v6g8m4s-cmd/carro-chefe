import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(process.cwd());

describe("scripts operacionais CookLily", () => {
  it.skipIf(process.platform === "win32")("mantém sintaxe Bash válida", () => {
    for (const relative of [
      "deploy/scripts/carro-chefe-deploy",
      "deploy/scripts/lily-promote-user",
      "deploy/scripts/enable-lily-entrega06-nginx",
      "deploy/scripts/enable-lily-entrega07-nginx",
      "deploy/scripts/enable-lily-entrega11-nginx",
      "deploy/scripts/verify-sqlite-backup"
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

  it("mantém bootstrap Nginx da Entrega 11D idempotente e fail-closed", () => {
    const helper = readFileSync(path.join(root, "deploy/scripts/enable-lily-entrega11-nginx"), "utf8");
    expect(helper).toContain("location ^~ /api/v1/lily/courier/");
    expect(helper).toContain('marker = "    location ^~ /api/ { return 404; }"');
    expect(helper).toContain("nginx -t falhou; restaurando backup");
    expect(helper).toContain("systemctl reload nginx");
    expect(helper.indexOf("location ^~ /api/v1/lily/courier/")).toBeLessThan(
      helper.indexOf('marker = "    location ^~ /api/ { return 404; }"')
    );
  });


  it.skipIf(process.platform === "win32")("valida backup SQLite por cópia isolada e rejeita arquivo inválido", () => {
    const sqliteAvailable = spawnSync("sqlite3", ["--version"], { encoding: "utf8" });
    if (sqliteAvailable.status !== 0) return;

    const temp = mkdtempSync(path.join(os.tmpdir(), "cooklily-backup-test-"));
    try {
      const db = path.join(temp, "backup.db");
      const created = spawnSync("sqlite3", [
        db,
        'CREATE TABLE "_prisma_migrations" ("id" TEXT PRIMARY KEY); INSERT INTO "_prisma_migrations" ("id") VALUES ("m1");'
      ], { encoding: "utf8" });
      expect(created.status, created.stderr || created.stdout).toBe(0);

      const verifier = path.join(root, "deploy/scripts/verify-sqlite-backup");
      const valid = spawnSync("bash", [verifier, db, "test"], { encoding: "utf8" });
      expect(valid.status, valid.stderr || valid.stdout).toBe(0);
      expect(valid.stdout).toContain("backup_verification=ok");
      expect(valid.stdout).toContain("migrations=1");
      expect(valid.stdout).toMatch(/sha256=[0-9a-f]{64}/);

      const invalid = path.join(temp, "invalid.db");
      const broken = spawnSync("bash", ["-c", 'printf "not sqlite" > "$1"', "_", invalid], { encoding: "utf8" });
      expect(broken.status).toBe(0);
      const rejected = spawnSync("bash", [verifier, invalid, "broken"], { encoding: "utf8" });
      expect(rejected.status).not.toBe(0);
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });

  it("verifica os backups antes de parar o serviço ou aplicar migrations", () => {
    const deployer = readFileSync(path.join(root, "deploy/scripts/carro-chefe-deploy"), "utf8");
    expect(deployer).toContain('PHASE="backup-verify"');
    expect(deployer).toContain('bash deploy/scripts/verify-sqlite-backup "${CORE_BACKUP}" core');
    expect(deployer).toContain('bash deploy/scripts/verify-sqlite-backup "${LILY_BACKUP}" lily');
    expect(deployer).toContain("core_backup_sha256=");
    expect(deployer).toContain("lily_backup_sha256=");
    expect(deployer).toContain("backup_verification=ok");
    expect(deployer.indexOf('PHASE="backup-verify"')).toBeLessThan(deployer.indexOf('PHASE="stop-service"'));
    expect(deployer.indexOf('PHASE="backup-verify"')).toBeLessThan(deployer.indexOf('PHASE="production-migrations"'));
    expect(deployer.indexOf('PHASE="backup-verify"')).toBeLessThan(deployer.indexOf("npm run db:deploy:core"));
  });

  it.skipIf(process.platform === "win32")("preserva o descritor do lock através do reexec", () => {
    const temp = mkdtempSync(path.join(os.tmpdir(), "carro-chefe-lock-reexec-"));
    try {
      const lock = path.join(temp, "deploy.lock");
      const probe = spawnSync("bash", ["-c", `
        set -euo pipefail
        exec 9>"$1"
        flock -n 9
        exec env CARRO_CHEFE_DEPLOY_REEXEC=1 bash -c '[[ -e /proc/self/fd/9 ]]'
      `, "_", lock], { encoding: "utf8" });
      expect(probe.status, probe.stderr || probe.stdout).toBe(0);
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });

  it("reexecuta a versão do deployer contida no SHA alvo antes do release", () => {
    const deployer = readFileSync(path.join(root, "deploy/scripts/carro-chefe-deploy"), "utf8");
    expect(deployer).toContain('git show "${RELEASE_SHA}:deploy/scripts/carro-chefe-deploy"');
    expect(deployer).toContain('CARRO_CHEFE_DEPLOY_REEXEC');
    expect(deployer).toContain('DEPLOYER_PATH="$(readlink -f "${BASH_SOURCE[0]}")"');
    expect(deployer).toContain('sha256sum "${DEPLOYER_PATH}"');
    expect(deployer).toContain('reexec do deployer sem lock herdado');
    expect(deployer).toContain('[[ -e "/proc/self/fd/9" ]]');
    expect(deployer).not.toContain('"/proc/$/fd/9"');
    expect(deployer).toContain('exec env CARRO_CHEFE_DEPLOY_REEXEC=1');
    expect(deployer.indexOf('deployer_update=reexec')).toBeLessThan(deployer.indexOf('PHASE="nginx-precheck"'));
    expect(deployer.indexOf('deployer_update=reexec')).toBeLessThan(deployer.indexOf('PHASE="backup"'));
  });

  it("força NODE_ENV=test somente durante a suíte de preflight", () => {
    const deployer = readFileSync(path.join(root, "deploy/scripts/carro-chefe-deploy"), "utf8");
    expect(deployer).toContain('preflight env NODE_ENV=test npm test');
  });

  it("faz deploy falhar fechado sem chaves de segurança de produção", () => {
    const deployer = readFileSync(path.join(root, "deploy/scripts/carro-chefe-deploy"), "utf8");
    expect(deployer).toContain("LILY_MFA_ENCRYPTION_KEY ausente");
    expect(deployer).toContain("COOKLILY_LOGISTICS_CODE_KEY ausente");
    expect(deployer).toContain("COOKLILY_LOGISTICS_CODE_KEY deve conter 32 bytes em base64url");
    expect(deployer).toContain("'location ^~ /api/v1/lily/courier/'");
  });
});
