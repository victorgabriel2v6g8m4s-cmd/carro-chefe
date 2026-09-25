CREATE TABLE "LilyMarketingLead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phoneNormalized" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'subscribed',
    "marketingConsentAt" DATETIME NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "privacyVersion" TEXT NOT NULL,
    "laQr" TEXT,
    "laCampaign" TEXT,
    "laVariant" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "LilyMarketingLead_phoneNormalized_key" ON "LilyMarketingLead"("phoneNormalized");
CREATE INDEX "LilyMarketingLead_status_createdAt_idx" ON "LilyMarketingLead"("status", "createdAt");
