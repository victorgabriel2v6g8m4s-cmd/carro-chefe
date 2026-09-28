-- CookLily Entrega 11D: fluxo logístico separado de pagamento e cozinha.
-- Mantemos courierUserId como identificador auditável sem FK rígida para preservar histórico
-- mesmo se uma conta de entregador for suspensa/removida no futuro.

ALTER TABLE "LilyOrder" ADD COLUMN "deliveryStatus" TEXT NOT NULL DEFAULT 'not_applicable';
ALTER TABLE "LilyOrder" ADD COLUMN "deliveryUpdatedAt" DATETIME;
ALTER TABLE "LilyOrder" ADD COLUMN "courierUserId" TEXT;

UPDATE "LilyOrder"
SET
  "deliveryStatus" = CASE
    WHEN "fulfillmentType" <> 'delivery' THEN 'not_applicable'
    WHEN "operationStatus" = 'ready_for_dispatch' THEN 'waiting_courier'
    ELSE 'not_ready'
  END,
  "deliveryUpdatedAt" = COALESCE("operationUpdatedAt", "createdAt");

CREATE TABLE "LilyOrderDeliveryEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT NOT NULL,
  "actor" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LilyOrderDeliveryEvent_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "LilyOrder" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "LilyOrderDeliveryEvent" (
  "id",
  "orderId",
  "fromStatus",
  "toStatus",
  "actor",
  "createdAt"
)
SELECT
  lower(hex(randomblob(12))),
  "id",
  NULL,
  "deliveryStatus",
  'system:migration',
  COALESCE("deliveryUpdatedAt", "createdAt")
FROM "LilyOrder"
WHERE "fulfillmentType" = 'delivery';

CREATE INDEX "LilyOrder_deliveryStatus_deliveryUpdatedAt_idx"
  ON "LilyOrder"("deliveryStatus", "deliveryUpdatedAt");

CREATE INDEX "LilyOrder_courierUserId_deliveryUpdatedAt_idx"
  ON "LilyOrder"("courierUserId", "deliveryUpdatedAt");

CREATE INDEX "LilyOrderDeliveryEvent_orderId_createdAt_idx"
  ON "LilyOrderDeliveryEvent"("orderId", "createdAt");

CREATE INDEX "LilyOrderDeliveryEvent_toStatus_createdAt_idx"
  ON "LilyOrderDeliveryEvent"("toStatus", "createdAt");
