import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Never migrate a caller-selected database automatically. CI/deploy prepare their
// explicit test snapshots; local defaults use the repository's ignored runtime DB.
if (process.env.LILY_DATABASE_URL) {
  console.log("LILY_DATABASE_URL explicit; preserving caller-managed migration setup.");
  process.exit(0);
}

const localDatabase = path.join(root, ".runtime", "lily-acai.db").split(path.sep).join("/");
const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
const result = spawnSync(process.execPath, [prismaCli, "migrate", "deploy", "--config", "packages/lily-database/prisma.config.ts"], {
  cwd: root,
  env: { ...process.env, LILY_DATABASE_URL: `file:${localDatabase}` },
  stdio: "inherit",
  shell: false
});

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
