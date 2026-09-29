-- CookLily Entrega 11H: opt-in operacional + outbox persistente de WhatsApp.

ALTER TABLE "LilyOrder" ADD COLUMN "whatsappUpdatesOptIn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LilyOrder" ADD COLUMN "whatsappConsentAt" DATETIME;
ALTER TABLE "LilyOrder" ADD COLUMN "whatsappConsentVersion" TEXT;

CREATE TABLE "LilyWhatsAppNotification" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "stage" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "provider" TEXT,
  "providerMessageId" TEXT,
  "lastErrorCode" TEXT,
  "lastErrorMessage" TEXT,
  "sentAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "LilyWhatsAppNotification_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "LilyOrder" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "LilyWhatsAppNotification_orderId_stage_key"
  ON "LilyWhatsAppNotification"("orderId", "stage");

CREATE INDEX "LilyWhatsAppNotification_status_nextAttemptAt_idx"
  ON "LilyWhatsAppNotification"("status", "nextAttemptAt");

CREATE INDEX "LilyWhatsAppNotification_orderId_createdAt_idx"
  ON "LilyWhatsAppNotification"("orderId", "createdAt");
