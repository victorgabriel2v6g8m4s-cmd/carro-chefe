import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildManifest } from "./core.mjs";

async function buildFixture(lineEnding) {
  const root = await mkdtemp(path.join(os.tmpdir(), "agent-policy-eol-"));
  const config = {
    schemaVersion: 1,
    policyVersion: "test",
    runtimeBudgetChars: 6500,
    commonCapsuleIds: [],
    regionCapsules: { apps: [] },
    capsules: {},
    agentCapsules: { "AG-DEV": [], business: [] },
    businessAgentIds: []
  };
  const write = (file, content) => writeFile(file, content.replace(/\n/g, lineEnding), "utf8");

  try {
    await mkdir(path.join(root, ".agent-policy"), { recursive: true });
    await mkdir(path.join(root, "apps"), { recursive: true });
    await write(path.join(root, "REGRAS.md"), "Regras\nlinha dois\n");
    await write(path.join(root, "AGENTS.md"), "Agentes\nlinha dois\n");
    await write(path.join(root, "apps", "AGENTS.md"), "Aplicações\nlinha dois\n");
    await write(path.join(root, ".agent-policy", "capsules.json"), `${JSON.stringify(config, null, 2)}\n`);
    return await buildManifest(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("gera os mesmos hashes de política com arquivos LF e CRLF", async () => {
  const [lfManifest, crlfManifest] = await Promise.all([buildFixture("\n"), buildFixture("\r\n")]);
  assert.deepEqual(crlfManifest, lfManifest);
});
