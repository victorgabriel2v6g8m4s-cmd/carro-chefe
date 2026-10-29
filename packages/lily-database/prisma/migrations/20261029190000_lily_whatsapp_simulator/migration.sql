ALTER TABLE "LilyWhatsAppMessageTemplate" ADD COLUMN "flowJson" TEXT NOT NULL DEFAULT '[]';
CREATE TABLE "LilyWhatsAppSimulatorSettings" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
  "pricingJson" TEXT NOT NULL DEFAULT '{}',
  "updatedBy" TEXT,
  "updatedAt" DATETIME NOT NULL
);