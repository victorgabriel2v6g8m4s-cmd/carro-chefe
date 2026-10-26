ALTER TABLE "LilyProduct" ADD COLUMN "vipEarlyAccess" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LilyProduct" ADD COLUMN "vipTeaserDescription" TEXT;
ALTER TABLE "LilyCoupon" ADD COLUMN "assignedUserId" TEXT REFERENCES "LilyUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LilyOperationalSettings" ADD COLUMN "vipPointsThreshold" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LilyOperationalSettings" ADD COLUMN "vipAnalyticsRetentionDays" INTEGER NOT NULL DEFAULT 180;
CREATE TABLE "LilyVipCode" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "codeHash" TEXT NOT NULL,
  "displaySuffix" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "couponIdsJson" TEXT NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'active',
  "startsAt" DATETIME,
  "endsAt" DATETIME,
  "maxRedemptions" INTEGER,
  "redemptionCount" INTEGER NOT NULL DEFAULT 0,
  "createdBy" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "LilyVipCode_codeHash_key" ON "LilyVipCode"("codeHash");
CREATE INDEX "LilyVipCode_status_startsAt_endsAt_idx" ON "LilyVipCode"("status", "startsAt", "endsAt");
CREATE TABLE "LilyVipRedemption" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "vipCodeId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LilyVipRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LilyUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LilyVipRedemption_vipCodeId_fkey" FOREIGN KEY ("vipCodeId") REFERENCES "LilyVipCode" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LilyVipRedemption_userId_vipCodeId_key" ON "LilyVipRedemption"("userId", "vipCodeId");
CREATE INDEX "LilyVipRedemption_userId_createdAt_idx" ON "LilyVipRedemption"("userId", "createdAt");
CREATE TABLE "LilyVipMembership" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'invited',
  "source" TEXT NOT NULL,
  "consentVersion" TEXT,
  "consentedAt" DATETIME,
  "enrolledAt" DATETIME,
  "canceledAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "LilyVipMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LilyUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LilyVipMembership_userId_key" ON "LilyVipMembership"("userId");
CREATE INDEX "LilyVipMembership_status_enrolledAt_idx" ON "LilyVipMembership"("status", "enrolledAt");
CREATE INDEX "LilyCoupon_assignedUserId_status_idx" ON "LilyCoupon"("assignedUserId", "status");
CREATE TABLE "LilyVipAnalyticsEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "reference" TEXT,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LilyVipAnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LilyUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LilyVipAnalyticsEvent_userId_occurredAt_idx" ON "LilyVipAnalyticsEvent"("userId", "occurredAt");
CREATE INDEX "LilyVipAnalyticsEvent_event_occurredAt_idx" ON "LilyVipAnalyticsEvent"("event", "occurredAt");
