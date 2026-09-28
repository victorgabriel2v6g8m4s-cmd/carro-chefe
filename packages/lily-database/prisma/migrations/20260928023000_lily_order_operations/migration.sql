-- Entrega 11B: estado operacional separado do estado financeiro do pedido.
-- SQLite não permite ADD COLUMN com DEFAULT CURRENT_TIMESTAMP; reconstruímos LilyOrder
-- preservando todas as colunas, dados, FKs lógicas e índices existentes.

PRAGMA foreign_keys=OFF;

CREATE TABLE "new_LilyOrder" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderNumber" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestFingerprint" TEXT NOT NULL,
  "guestAccessTokenHash" TEXT,
  "userId" TEXT,
  "phoneNormalized" TEXT NOT NULL,
  "fulfillmentType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'awaiting_payment',
  "operationStatus" TEXT NOT NULL DEFAULT 'received',
  "operationUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isHomologation" BOOLEAN NOT NULL DEFAULT false,
  "subtotalCents" INTEGER NOT NULL,
  "deliveryFeeCents" INTEGER NOT NULL,
  "discountTotalCents" INTEGER NOT NULL DEFAULT 0,
  "grandTotalCents" INTEGER NOT NULL,
  "addressSnapshotJson" TEXT,
  "customerNote" TEXT,
  "laQr" TEXT,
  "laCampaign" TEXT,
  "laVariant" TEXT,
  "paidAt" DATETIME,
  "completedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "LilyOrder_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "LilyUser" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_LilyOrder" (
  "id","orderNumber","idempotencyKey","requestFingerprint","guestAccessTokenHash",
  "userId","phoneNormalized","fulfillmentType","status","operationStatus",
  "operationUpdatedAt","isHomologation","subtotalCents","deliveryFeeCents",
  "discountTotalCents","grandTotalCents","addressSnapshotJson","customerNote",
  "laQr","laCampaign","laVariant","paidAt","completedAt","createdAt","updatedAt"
)
SELECT
  "id","orderNumber","idempotencyKey","requestFingerprint","guestAccessTokenHash",
  "userId","phoneNormalized","fulfillmentType","status",'received',
  COALESCE("updatedAt","createdAt",CURRENT_TIMESTAMP),"isHomologation",
  "subtotalCents","deliveryFeeCents","discountTotalCents","grandTotalCents",
  "addressSnapshotJson","customerNote","laQr","laCampaign","laVariant",
  "paidAt","completedAt","createdAt","updatedAt"
FROM "LilyOrder";

DROP TABLE "LilyOrder";
ALTER TABLE "new_LilyOrder" RENAME TO "LilyOrder";

CREATE UNIQUE INDEX "LilyOrder_orderNumber_key" ON "LilyOrder"("orderNumber");
CREATE UNIQUE INDEX "LilyOrder_idempotencyKey_key" ON "LilyOrder"("idempotencyKey");
CREATE INDEX "LilyOrder_userId_createdAt_idx" ON "LilyOrder"("userId","createdAt");
CREATE INDEX "LilyOrder_phoneNormalized_createdAt_idx" ON "LilyOrder"("phoneNormalized","createdAt");
CREATE INDEX "LilyOrder_status_createdAt_idx" ON "LilyOrder"("status","createdAt");
CREATE INDEX "LilyOrder_operationStatus_operationUpdatedAt_idx"
  ON "LilyOrder"("operationStatus","operationUpdatedAt");

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

CREATE INDEX "LilyOrderOperationEvent_orderId_createdAt_idx"
  ON "LilyOrderOperationEvent"("orderId","createdAt");
CREATE INDEX "LilyOrderOperationEvent_toStatus_createdAt_idx"
  ON "LilyOrderOperationEvent"("toStatus","createdAt");

-- Pedidos anteriores à Entrega 11B passam a ter um evento inicial coerente.
INSERT INTO "LilyOrderOperationEvent" (
  "id","orderId","fromStatus","toStatus","actor","note","createdAt"
)
SELECT
  lower(hex(randomblob(12))),
  "id",
  NULL,
  'received',
  'migration:20260928023000',
  'Estado operacional inicial criado durante migração.',
  COALESCE("createdAt",CURRENT_TIMESTAMP)
FROM "LilyOrder";

PRAGMA foreign_keys=ON;
