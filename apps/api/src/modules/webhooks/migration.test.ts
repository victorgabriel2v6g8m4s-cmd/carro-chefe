import { readFileSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

describe("migração de idempotência das entregas", () => {
  it("preserva deterministicamente a entrega concluída e cria a restrição única", () => {
    const database = new Database(":memory:");
    database.exec(`CREATE TABLE "WebhookDelivery" (
      "id" TEXT PRIMARY KEY, "endpointId" TEXT NOT NULL, "eventId" TEXT NOT NULL,
      "status" TEXT NOT NULL, "attempt" INTEGER NOT NULL, "responseCode" INTEGER,
      "error" TEXT, "createdAt" DATETIME NOT NULL, "deliveredAt" DATETIME
    )`);
    const insert = database.prepare("INSERT INTO WebhookDelivery VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    insert.run("pending", "endpoint-1", "event-1", "pending", 1, null, null, "2026-08-20T10:00:00Z", null);
    insert.run("delivered", "endpoint-1", "event-1", "delivered", 2, 204, null, "2026-08-20T10:01:00Z", "2026-08-20T10:02:00Z");
    const migrationPath = path.resolve(import.meta.dirname, "../../../../../packages/database/prisma/migrations/20260820143000_webhook_delivery_idempotency/migration.sql");
    database.exec(readFileSync(migrationPath, "utf8"));
    expect(database.prepare("SELECT id, status FROM WebhookDelivery").all()).toEqual([{ id: "delivered", status: "delivered" }]);
    expect(() => insert.run("duplicate", "endpoint-1", "event-1", "pending", 0, null, null, "2026-08-20T10:03:00Z", null)).toThrow();
    database.close();
  });
});
