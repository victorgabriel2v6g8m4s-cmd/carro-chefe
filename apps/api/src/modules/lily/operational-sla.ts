export type LilyKitchenSlaSnapshot = {
  thresholdMinutes: number;
  startedAt: Date;
  dueAt: Date;
  elapsedMinutes: number;
  remainingMinutes: number;
  overdueMinutes: number;
  status: "on_track" | "overdue";
};

export function lilyKitchenPreparationSla(
  order: {
    operationStatus: string;
    operationUpdatedAt: Date | string;
  },
  thresholdMinutes: number | null | undefined,
  now = new Date()
): LilyKitchenSlaSnapshot | null {
  if (order.operationStatus !== "preparing") return null;
  if (!Number.isInteger(thresholdMinutes) || (thresholdMinutes ?? 0) <= 0) return null;

  const startedAt = order.operationUpdatedAt instanceof Date
    ? order.operationUpdatedAt
    : new Date(order.operationUpdatedAt);
  if (!Number.isFinite(startedAt.getTime())) return null;

  const safeNow = Number.isFinite(now.getTime()) ? now : new Date();
  const thresholdMs = (thresholdMinutes as number) * 60_000;
  const startedMs = startedAt.getTime();
  const nowMs = Math.max(startedMs, safeNow.getTime());
  const dueMs = startedMs + thresholdMs;
  const elapsedMs = nowMs - startedMs;
  const overdueMs = Math.max(0, nowMs - dueMs);
  const remainingMs = Math.max(0, dueMs - nowMs);
  const overdue = nowMs > dueMs;

  return {
    thresholdMinutes: thresholdMinutes as number,
    startedAt,
    dueAt: new Date(dueMs),
    elapsedMinutes: Math.floor(elapsedMs / 60_000),
    remainingMinutes: overdue ? 0 : Math.ceil(remainingMs / 60_000),
    overdueMinutes: overdue ? Math.ceil(overdueMs / 60_000) : 0,
    status: overdue ? "overdue" : "on_track"
  };
}
