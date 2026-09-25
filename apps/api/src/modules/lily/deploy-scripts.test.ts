import { spawnSync } from "node:child_process";
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
});
