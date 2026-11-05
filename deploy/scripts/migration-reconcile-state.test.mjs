import assert from "node:assert/strict";
import test from "node:test";
import Database from "better-sqlite3";
import { FAILED_CANCELLATION_MIGRATION, PRIOR_CANCELLATION_MIGRATION, shouldResolveFailedCancellationMigration } from "./migration-reconcile-state.mjs";

function fixture({ logs = "duplicate column name: customerCancellationEnabled", priorApplied = true, hasColumns = true } = {}) {
  const db = new Database(":memory:");
  db.exec("CREATE TABLE _prisma_migrations (migration_name TEXT, finished_at TEXT, rolled_back_at TEXT, logs TEXT);");
  db.exec("CREATE TABLE LilyOperationalSettings (id TEXT PRIMARY KEY" + (hasColumns ? ", customerCancellationEnabled BOOLEAN, customerCancellationWindowMinutes INTEGER" : "") + ");");
  db.prepare("INSERT INTO _prisma_migrations VALUES (?, ?, NULL, NULL)").run(PRIOR_CANCELLATION_MIGRATION, priorApplied ? "2026-11-03" : null);
  db.prepare("INSERT INTO _prisma_migrations VALUES (?, NULL, NULL, ?)").run(FAILED_CANCELLATION_MIGRATION, logs);
  return db;
}

test("reconcilia somente a falha duplicada com migration equivalente e colunas existentes", () => {
  const db = fixture();
  try { assert.equal(shouldResolveFailedCancellationMigration(db), true); } finally { db.close(); }
});

test("recusa falha com log diferente", () => {
  const db = fixture({ logs: "database is locked" });
  try { assert.throws(() => shouldResolveFailedCancellationMigration(db), /estado diferente/); } finally { db.close(); }
});

test("recusa ausência da migration equivalente ou das colunas", () => {
  for (const options of [{ priorApplied: false }, { hasColumns: false }]) {
    const db = fixture(options);
    try { assert.throws(() => shouldResolveFailedCancellationMigration(db), /estado diferente/); } finally { db.close(); }
  }
});
