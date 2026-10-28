ALTER TABLE "LilyOperationalSettings" ADD COLUMN "loyaltyRoundingMode" TEXT NOT NULL DEFAULT 'floor';
ALTER TABLE "LilyMission" ADD COLUMN "lilyCoins" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "LilyLevel" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "requiredPoints" INTEGER NOT NULL,
  "lilyCoins" INTEGER NOT NULL DEFAULT 0,
  "benefitsJson" TEXT NOT NULL DEFAULT '[]',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "LilyLevel_sortOrder_key" ON "LilyLevel"("sortOrder");
CREATE INDEX "LilyLevel_active_sortOrder_idx" ON "LilyLevel"("active", "sortOrder");

CREATE TABLE "LilyCoinEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "kind" TEXT NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LilyCoinEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LilyUser"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LilyCoinEvent_sourceKey_key" ON "LilyCoinEvent"("sourceKey");
CREATE INDEX "LilyCoinEvent_userId_createdAt_idx" ON "LilyCoinEvent"("userId", "createdAt");

CREATE TABLE "LilyReward" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL,
  "lilyCoinCost" INTEGER NOT NULL,
  "couponId" TEXT,
  "productId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "startsAt" DATETIME,
  "endsAt" DATETIME,
  "maxRedemptions" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE INDEX "LilyReward_active_startsAt_endsAt_idx" ON "LilyReward"("active", "startsAt", "endsAt");

CREATE TABLE "LilyRewardRedemption" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "rewardId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "coinEventId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LilyRewardRedemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "LilyReward"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LilyRewardRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LilyUser"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LilyRewardRedemption_coinEventId_key" ON "LilyRewardRedemption"("coinEventId");
CREATE INDEX "LilyRewardRedemption_userId_createdAt_idx" ON "LilyRewardRedemption"("userId", "createdAt");
