#!/usr/bin/env node
import process from "node:process";
import { assertRepositoryMapCurrent, writeRepositoryMap } from "./core.mjs";

const projectRoot = process.cwd();
const mode = process.argv.includes("--write") ? "write" : "check";

async function main() {
  if (mode === "write") {
    await writeRepositoryMap(projectRoot);
    await assertRepositoryMapCurrent(projectRoot);
    console.log("Mapa do repositório atualizado e estrutura validada.");
    return;
  }
  await assertRepositoryMapCurrent(projectRoot);
  console.log("Mapa do repositório e estrutura estão íntegros.");
}

main().catch((error) => {
  console.error(`Falha no mapa do repositório: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
