import assert from "node:assert/strict";
import test from "node:test";
import Database from "better-sqlite3";
import { FAILED_CANCELLATION_MIGRATION, LEGACY_COLUMN_MIGRATIONS, PRIOR_CANCELLATION_MIGRATION, PRIOR_LEGACY_MISSIONS_MIGRATION, planLegacyColumnReconciliation, shouldResolveFailedCancellationMigration } from "./migration-reconcile-state.mjs";

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

test("reconcilia somente colunas já cobertas por migration histórica alternativa conhecida", () => {
  const statements = [
    'ALTER TABLE "LilyMission" ADD COLUMN "instructionsJson" TEXT NOT NULL DEFAULT \'[]\';',
    'ALTER TABLE "LilyMission" ADD COLUMN "actionUrl" TEXT;'
  ];
  assert.deepEqual(planLegacyColumnReconciliation({
    priorApplied: true,
    migrationState: "missing",
    columns: new Set(["actionUrl"]),
    statements,
    collisionColumn: "actionUrl"
  }), [statements[0]]);
  assert.equal(planLegacyColumnReconciliation({
    priorApplied: false,
    migrationState: "missing",
    columns: new Set(["actionUrl"]),
    statements,
    collisionColumn: "actionUrl"
  }), null);
  assert.equal(planLegacyColumnReconciliation({
    priorApplied: true,
    migrationState: "applied",
    columns: new Set(["actionUrl"]),
    statements,
    collisionColumn: "actionUrl"
  }), null);
  assert.throws(() => planLegacyColumnReconciliation({
    priorApplied: true,
    migrationState: "failed",
    columns: new Set(["actionUrl"]),
    statements,
    collisionColumn: "actionUrl"
  }), /Migration alvo já falhou/);
  assert.equal(LEGACY_COLUMN_MIGRATIONS.length, 2);
  assert.equal(PRIOR_LEGACY_MISSIONS_MIGRATION, "20261104120000_lily_mission_rewards_streaks");
});
