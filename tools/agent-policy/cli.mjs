#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { assertManifestCurrent, buildManifest, renderManifest, resolvePolicyCapsule } from "./core.mjs";

const projectRoot = process.cwd();
const command = process.argv[2] ?? "check";

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

async function validateBudgets(manifest) {
  const agentIds = ["AG-DEV", ...manifest.businessAgentIds];
  for (const scope of Object.keys(manifest.regions)) {
    for (const agentId of agentIds) resolvePolicyCapsule(manifest, agentId, scope);
  }
}

async function main() {
  if (command === "build") {
    const manifest = await buildManifest(projectRoot);
    await validateBudgets(manifest);
    await fs.writeFile(path.join(projectRoot, ".agent-policy", "manifest.json"), renderManifest(manifest), "utf8");
    console.log(`Manifesto ${manifest.policyVersion} gerado: sha256:${manifest.manifestHash}`);
    return;
  }
  if (command === "check") {
    const manifest = await assertManifestCurrent(projectRoot);
    await validateBudgets(manifest);
    console.log(`Política íntegra: ${manifest.policyVersion} sha256:${manifest.manifestHash}`);
    return;
  }
  if (command === "preflight") {
    const manifest = await assertManifestCurrent(projectRoot);
    const context = resolvePolicyCapsule(manifest, option("--agent", "AG-DEV"), option("--scope", "."));
    console.log(JSON.stringify(context, null, 2));
    return;
  }
  throw new Error(`Comando desconhecido: ${command}. Use build, check ou preflight.`);
}

main().catch((error) => {
  console.error(`Falha de política: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
