import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(process.cwd());

describe("cache do preflight de deploy", () => {
  it("não reutiliza migration cacheada depois que os bancos temporários foram removidos", () => {
    const gates = JSON.parse(readFileSync(path.join(root, "deploy/validation/gates.json"), "utf8"));
    expect(gates.gates["preflight-migrations"].requiredPaths).toEqual([
      ".runtime/deploy-preflight-core.db",
      ".runtime/deploy-preflight-lily.db"
    ]);

    const engine = readFileSync(path.join(root, "deploy/scripts/deploy-validation.mjs"), "utf8");
    expect(engine).toContain("const configuredRequiredPaths = gate.requiredPaths ?? []");
    expect(engine).toContain("const missing = allRequiredPaths.filter");
    expect(engine).toContain("const missingAfterRun = allRequiredPaths.filter");

    const deployer = readFileSync(path.join(root, "deploy/scripts/carro-chefe-deploy"), "utf8");
    expect(deployer).toContain('rm -f "${PRE_CORE}"');
    expect(deployer).toContain("run_cached_gate preflight-migrations 0 npm run db:deploy");
  });
});
