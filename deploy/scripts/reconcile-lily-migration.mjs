import { spawnSync } from "node:child_process";
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FAILED_CANCELLATION_MIGRATION, shouldResolveFailedCancellationMigration } from "./migration-reconcile-state.mjs";
const databaseUrl = process.env.LILY_DATABASE_URL;
if (!databaseUrl?.startsWith("file:")) throw new Error("LILY_DATABASE_URL deve apontar para SQLite.");
const databasePath = databaseUrl.slice(5).split("?")[0];
const db = new Database(databasePath, { readonly: true, fileMustExist: true });
let shouldResolve;
try {
  shouldResolve = shouldResolveFailedCancellationMigration(db);
} finally {
  db.close();
}
if (!shouldResolve) process.exit(0);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const result = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", ["prisma", "migrate", "resolve", "--rolled-back", FAILED_CANCELLATION_MIGRATION, "--config", "packages/lily-database/prisma.config.ts"], { cwd: root, env: process.env, stdio: "inherit" });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`Resolvido via Prisma migrate resolve: ${FAILED_CANCELLATION_MIGRATION}; a migration histórica equivalente já criou as colunas.`);
