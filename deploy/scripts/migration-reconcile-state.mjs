export const FAILED_CANCELLATION_MIGRATION = "20261104190000_lily_customer_cancellation";
export const PRIOR_CANCELLATION_MIGRATION = "20261103100000_lily_customer_cancellation_window";

export function shouldResolveFailedCancellationMigration(db) {
  const table = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='_prisma_migrations'").get();
  if (!table) return false;
  const columns = new Set(db.pragma("table_info('LilyOperationalSettings')").map((column) => column.name));
  const rows = db.prepare("SELECT migration_name, finished_at, rolled_back_at, logs FROM _prisma_migrations WHERE migration_name IN (?, ?)").all(FAILED_CANCELLATION_MIGRATION, PRIOR_CANCELLATION_MIGRATION);
  const failed = rows.find((row) => row.migration_name === FAILED_CANCELLATION_MIGRATION && !row.finished_at && !row.rolled_back_at);
  if (!failed) return false;
  const priorApplied = rows.some((row) => row.migration_name === PRIOR_CANCELLATION_MIGRATION && row.finished_at && !row.rolled_back_at);
  const knownDuplicate = String(failed.logs ?? "").toLowerCase().includes("duplicate column name: customercancellationenabled");
  if (!priorApplied || !knownDuplicate || !columns.has("customerCancellationEnabled") || !columns.has("customerCancellationWindowMinutes")) {
    throw new Error(`Migration ${FAILED_CANCELLATION_MIGRATION} falhou com estado diferente do caso duplicado conhecido; intervenção automática recusada.`);
  }
  return true;
}
