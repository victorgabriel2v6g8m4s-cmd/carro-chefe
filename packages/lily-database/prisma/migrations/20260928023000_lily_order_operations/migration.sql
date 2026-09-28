-- Entrega 11B: estado operacional separado do estado financeiro do pedido.

PRAGMA foreign_keys=ON;

ALTER TABLE "LilyOrder" ADD COLUMN "operationStatus" TEXT NOT NULL DEFAULT 'received';
ALTER TABLE "LilyOrder" ADD COLUMN "operationUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "LilyOrderOperationEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT NOT NULL,
  "actor" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LilyOrderOperationEvent_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "LilyOrder" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "LilyOrder_operationStatus_operationUpdatedAt_idx"
  ON "LilyOrder"("operationStatus", "operationUpdatedAt");

CREATE INDEX "LilyOrderOperationEvent_orderId_createdAt_idx"
  ON "LilyOrderOperationEvent"("orderId", "createdAt");

CREATE INDEX "LilyOrderOperationEvent_toStatus_createdAt_idx"
  ON "LilyOrderOperationEvent"("toStatus", "createdAt");
