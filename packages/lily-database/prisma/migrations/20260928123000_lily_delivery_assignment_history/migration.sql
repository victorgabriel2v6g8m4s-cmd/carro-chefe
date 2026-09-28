-- CookLily Entrega 11E: histórico de atribuições e reatribuição segura.
-- courierUserId permanece sem FK para preservar auditoria mesmo se a conta for removida.

CREATE TABLE "LilyDeliveryAssignment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "courierUserId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "assignedBy" TEXT NOT NULL,
  "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" DATETIME,
  "endReason" TEXT,
  "endNote" TEXT,
  CONSTRAINT "LilyDeliveryAssignment_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "LilyOrder" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- O fluxo anterior permitia no máximo um courier atual por pedido.
-- Fazemos backfill do vínculo atual para não perder cadeia de custódia na migração.
INSERT INTO "LilyDeliveryAssignment" (
  "id", "orderId", "courierUserId", "status", "assignedBy", "assignedAt", "endedAt", "endReason"
)
SELECT
  lower(hex(randomblob(12))),
  o."id",
  o."courierUserId",
  CASE
    WHEN o."deliveryStatus" = 'left_delivery' THEN 'completed'
    WHEN o."deliveryStatus" = 'cancelled' THEN 'cancelled'
    ELSE 'active'
  END,
  COALESCE((
    SELECT e."actor"
    FROM "LilyOrderDeliveryEvent" e
    WHERE e."orderId" = o."id" AND e."toStatus" = 'courier_accepted'
    ORDER BY e."createdAt" ASC
    LIMIT 1
  ), 'system:migration'),
  COALESCE((
    SELECT e."createdAt"
    FROM "LilyOrderDeliveryEvent" e
    WHERE e."orderId" = o."id" AND e."toStatus" = 'courier_accepted'
    ORDER BY e."createdAt" ASC
    LIMIT 1
  ), o."deliveryUpdatedAt", o."createdAt"),
  CASE
    WHEN o."deliveryStatus" IN ('left_delivery', 'cancelled') THEN
      COALESCE((
        SELECT e."createdAt"
        FROM "LilyOrderDeliveryEvent" e
        WHERE e."orderId" = o."id" AND e."toStatus" = o."deliveryStatus"
        ORDER BY e."createdAt" DESC
        LIMIT 1
      ), o."deliveryUpdatedAt")
    ELSE NULL
  END,
  CASE
    WHEN o."deliveryStatus" = 'left_delivery' THEN 'completed'
    WHEN o."deliveryStatus" = 'cancelled' THEN 'cancelled'
    ELSE NULL
  END
FROM "LilyOrder" o
WHERE o."courierUserId" IS NOT NULL;

CREATE INDEX "LilyDeliveryAssignment_orderId_assignedAt_idx"
  ON "LilyDeliveryAssignment"("orderId", "assignedAt");

CREATE INDEX "LilyDeliveryAssignment_courierUserId_assignedAt_idx"
  ON "LilyDeliveryAssignment"("courierUserId", "assignedAt");

CREATE INDEX "LilyDeliveryAssignment_status_assignedAt_idx"
  ON "LilyDeliveryAssignment"("status", "assignedAt");

-- Invariante estrutural: um pedido não pode ter dois vínculos ativos.
CREATE UNIQUE INDEX "LilyDeliveryAssignment_one_active_per_order"
  ON "LilyDeliveryAssignment"("orderId")
  WHERE "status" = 'active';
