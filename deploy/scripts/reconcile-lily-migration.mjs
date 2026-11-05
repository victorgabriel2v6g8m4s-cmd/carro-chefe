import { spawnSync } from "node:child_process";
import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FAILED_CANCELLATION_MIGRATION,
  LEGACY_COLUMN_MIGRATIONS,
  PRIOR_LEGACY_MISSIONS_MIGRATION,
  shouldResolveFailedCancellationMigration,
  planLegacyColumnReconciliation
} from "./migration-reconcile-state.mjs";
const databaseUrl = process.env.LILY_DATABASE_URL;
if (!databaseUrl?.startsWith("file:")) throw new Error("LILY_DATABASE_URL deve apontar para SQLite.");
const databasePath = databaseUrl.slice(5).split("?")[0];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let db = new Database(databasePath, { fileMustExist: true });
const resolveMigration = (kind, migration) => {
  const result = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", ["prisma", "migrate", "resolve", `--${kind}`, migration, "--config", "packages/lily-database/prisma.config.ts"], { cwd: root, env: process.env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Prisma migrate resolve falhou para ${migration}.`);
};

try {
  if (shouldResolveFailedCancellationMigration(db)) {
    db.close();
    resolveMigration("rolled-back", FAILED_CANCELLATION_MIGRATION);
    console.log(`Resolvido via Prisma migrate resolve: ${FAILED_CANCELLATION_MIGRATION}; a migration histórica equivalente já criou as colunas.`);
    db = new Database(databasePath, { fileMustExist: true });
  }

  const rows = db.prepare("SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations WHERE migration_name IN (?, ?, ?)")
    .all(PRIOR_LEGACY_MISSIONS_MIGRATION, ...LEGACY_COLUMN_MIGRATIONS.map(({ migration }) => migration));
  const priorApplied = rows.some((row) => row.migration_name === PRIOR_LEGACY_MISSIONS_MIGRATION && row.finished_at && !row.rolled_back_at);
  const plans = [];
  for (const target of LEGACY_COLUMN_MIGRATIONS) {
    const targetRow = rows.find((row) => row.migration_name === target.migration);
    const migrationState = !targetRow ? "missing" : targetRow.finished_at && !targetRow.rolled_back_at ? "applied" : targetRow.rolled_back_at ? "rolled-back" : "failed";
    const columns = new Set(db.pragma(`table_info('${target.table}')`).map((column) => column.name));
    const sqlPath = path.join(root, "packages/lily-database/prisma/migrations", target.migration, "migration.sql");
    const statements = readFileSync(sqlPath, "utf8").split("\n").map((line) => line.trim()).filter(Boolean);
    const operations = planLegacyColumnReconciliation({ priorApplied, migrationState, columns, statements, collisionColumn: target.collisionColumn });
    if (operations === null) continue;
    plans.push({ target, operations });
  }
  if (plans.some(({ operations }) => operations.length)) {
    db.transaction(() => plans.forEach(({ operations }) => operations.forEach((statement) => db.exec(statement))))();
  }
  db.close();
  for (const { target } of plans) {
    resolveMigration("applied", target.migration);
    console.log(`Reconciliação validada para ${target.migration}: apenas colunas ausentes foram aplicadas; Prisma registrou a migration como aplicada.`);
  }
} finally {
  if (db.open) db.close();
}
