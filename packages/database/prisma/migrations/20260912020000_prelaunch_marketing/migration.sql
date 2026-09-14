-- CreateTable
CREATE TABLE "PrelaunchLead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phoneNormalized" TEXT NOT NULL,
    "firstName" TEXT,
    "marketingConsentAt" DATETIME NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "privacyPolicyVersion" TEXT NOT NULL,
    "ccQr" TEXT,
    "ccCampaign" TEXT,
    "ccVariant" TEXT,
    "firstSeenAt" DATETIME NOT NULL,
    "signupAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PrelaunchAnalyticsEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "ccQr" TEXT,
    "ccCampaign" TEXT,
    "ccVariant" TEXT,
    "path" TEXT NOT NULL,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "requestId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "PrelaunchLead_phoneNormalized_key" ON "PrelaunchLead"("phoneNormalized");
CREATE INDEX "PrelaunchLead_ccCampaign_ccVariant_idx" ON "PrelaunchLead"("ccCampaign", "ccVariant");
CREATE INDEX "PrelaunchLead_status_signupAt_idx" ON "PrelaunchLead"("status", "signupAt");
CREATE UNIQUE INDEX "PrelaunchAnalyticsEvent_requestId_key" ON "PrelaunchAnalyticsEvent"("requestId");
CREATE INDEX "PrelaunchAnalyticsEvent_event_createdAt_idx" ON "PrelaunchAnalyticsEvent"("event", "createdAt");
CREATE INDEX "PrelaunchAnalyticsEvent_sessionId_createdAt_idx" ON "PrelaunchAnalyticsEvent"("sessionId", "createdAt");
CREATE INDEX "PrelaunchAnalyticsEvent_ccCampaign_ccVariant_createdAt_idx" ON "PrelaunchAnalyticsEvent"("ccCampaign", "ccVariant", "createdAt");
