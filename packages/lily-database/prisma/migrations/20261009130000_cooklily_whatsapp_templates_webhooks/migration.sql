CREATE TABLE "LilyWhatsAppMessageTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'utility',
    "language" TEXT NOT NULL DEFAULT 'pt_BR',
    "bodyTemplate" TEXT NOT NULL,
    "variablesJson" TEXT NOT NULL DEFAULT '[]',
    "metaTemplateName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "LilyWhatsAppMessageTemplate_key_key" ON "LilyWhatsAppMessageTemplate"("key");
CREATE UNIQUE INDEX "LilyWhatsAppMessageTemplate_metaTemplateName_key" ON "LilyWhatsAppMessageTemplate"("metaTemplateName");
CREATE INDEX "LilyWhatsAppMessageTemplate_status_category_updatedAt_idx" ON "LilyWhatsAppMessageTemplate"("status", "category", "updatedAt");

CREATE TABLE "LilyWhatsAppWebhookEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dedupeKey" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "providerStatus" TEXT,
    "payloadHash" TEXT NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "LilyWhatsAppWebhookEvent_dedupeKey_key" ON "LilyWhatsAppWebhookEvent"("dedupeKey");
CREATE INDEX "LilyWhatsAppWebhookEvent_eventType_receivedAt_idx" ON "LilyWhatsAppWebhookEvent"("eventType", "receivedAt");
CREATE INDEX "LilyWhatsAppWebhookEvent_providerMessageId_receivedAt_idx" ON "LilyWhatsAppWebhookEvent"("providerMessageId", "receivedAt");
