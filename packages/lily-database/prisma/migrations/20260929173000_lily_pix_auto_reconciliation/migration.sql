-- CookLily Entrega 11I: ledger de Pix recebidos + cursor do poller bancário.

CREATE TABLE "LilyPixSettlement" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "source" TEXT NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "endToEndId" TEXT NOT NULL,
  "txid" TEXT,
  "amountCents" INTEGER NOT NULL,
  "occurredAt" DATETIME NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "matchStatus" TEXT NOT NULL,
  "paymentId" TEXT,
  "matchedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LilyPixSettlement_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "LilyPayment" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "LilyPixSettlement_providerEventId_key"
  ON "LilyPixSettlement"("providerEventId");

CREATE INDEX "LilyPixSettlement_source_occurredAt_idx"
  ON "LilyPixSettlement"("source", "occurredAt");

CREATE INDEX "LilyPixSettlement_txid_matchStatus_idx"
  ON "LilyPixSettlement"("txid", "matchStatus");

CREATE INDEX "LilyPixSettlement_paymentId_createdAt_idx"
  ON "LilyPixSettlement"("paymentId", "createdAt");

CREATE TABLE "LilyPixReconciliationState" (
  "source" TEXT NOT NULL PRIMARY KEY,
  "lastSuccessfulAt" DATETIME,
  "lastAttemptAt" DATETIME,
  "lastErrorCode" TEXT,
  "lastErrorMessage" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
