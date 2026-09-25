-- Entrega 07: pagamentos/reconciliação e upgrade obrigatório de senha para contas privilegiadas.

PRAGMA foreign_keys=ON;

ALTER TABLE "LilyUser" ADD COLUMN "staffPasswordUpgradeRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LilyOrder" ADD COLUMN "guestAccessTokenHash" TEXT;

ALTER TABLE "LilyOperationalSettings" ADD COLUMN "paymentsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LilyOperationalSettings" ADD COLUMN "paymentProvider" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "LilyOperationalSettings" ADD COLUMN "manualPixEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LilyOperationalSettings" ADD COLUMN "manualPixInstructions" TEXT;

CREATE TABLE "LilyPayment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "providerPaymentId" TEXT,
  "providerReference" TEXT,
  "instructionsSnapshot" TEXT,
  "expiresAt" DATETIME,
  "approvedAt" DATETIME,
  "failedAt" DATETIME,
  "cancelledAt" DATETIME,
  "refundedAt" DATETIME,
  "refundedCents" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "LilyPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "LilyOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "LilyPayment_idempotencyKey_key" ON "LilyPayment"("idempotencyKey");
CREATE INDEX "LilyPayment_orderId_status_createdAt_idx" ON "LilyPayment"("orderId","status","createdAt");
CREATE INDEX "LilyPayment_status_createdAt_idx" ON "LilyPayment"("status","createdAt");
CREATE INDEX "LilyPayment_provider_providerPaymentId_idx" ON "LilyPayment"("provider","providerPaymentId");

CREATE TABLE "LilyPaymentEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "paymentId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "providerEventId" TEXT,
  "fromStatus" TEXT,
  "toStatus" TEXT,
  "payloadHash" TEXT,
  "payloadJson" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LilyPaymentEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "LilyPayment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "LilyPaymentEvent_providerEventId_key" ON "LilyPaymentEvent"("providerEventId");
CREATE INDEX "LilyPaymentEvent_paymentId_createdAt_idx" ON "LilyPaymentEvent"("paymentId","createdAt");
CREATE INDEX "LilyPaymentEvent_source_eventType_createdAt_idx" ON "LilyPaymentEvent"("source","eventType","createdAt");

CREATE TABLE "LilyPaymentReconciliation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "paymentId" TEXT NOT NULL,
  "expectedGrossCents" INTEGER NOT NULL,
  "reportedGrossCents" INTEGER NOT NULL,
  "feeCents" INTEGER NOT NULL DEFAULT 0,
  "netCents" INTEGER NOT NULL,
  "discrepancyCents" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL,
  "providerReference" TEXT,
  "note" TEXT,
  "reconciledBy" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LilyPaymentReconciliation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "LilyPayment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "LilyPaymentReconciliation_paymentId_createdAt_idx" ON "LilyPaymentReconciliation"("paymentId","createdAt");
CREATE INDEX "LilyPaymentReconciliation_status_createdAt_idx" ON "LilyPaymentReconciliation"("status","createdAt");
