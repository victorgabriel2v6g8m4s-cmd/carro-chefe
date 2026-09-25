-- Ajustes pós-homologação 05/06: perfil, canais públicos e fidelidade.

PRAGMA foreign_keys=ON;

ALTER TABLE "LilyUser" ADD COLUMN "avatarMediaId" TEXT;
ALTER TABLE "LilyUser" ADD COLUMN "rankingOptIn" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "LilyOperationalSettings" ADD COLUMN "instagramHandle" TEXT NOT NULL DEFAULT 'acai._lily';
ALTER TABLE "LilyOperationalSettings" ADD COLUMN "whatsappPhone" TEXT NOT NULL DEFAULT '+5567999289187';
ALTER TABLE "LilyOperationalSettings" ADD COLUMN "publicAddressText" TEXT;
ALTER TABLE "LilyOperationalSettings" ADD COLUMN "loyaltyOrderCentsPerPoint" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "LilyOperationalSettings" ADD COLUMN "loyaltyCampaignBonusPoints" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "LilyOperationalSettings" ADD COLUMN "loyaltyCouponBonusPoints" INTEGER NOT NULL DEFAULT 10;

CREATE TABLE "LilyLoyaltyEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "points" INTEGER NOT NULL,
  "sourceKey" TEXT,
  "metadataJson" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LilyLoyaltyEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LilyUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "LilyLoyaltyEvent_sourceKey_key" ON "LilyLoyaltyEvent"("sourceKey");
CREATE INDEX "LilyLoyaltyEvent_userId_createdAt_idx" ON "LilyLoyaltyEvent"("userId","createdAt");
CREATE INDEX "LilyLoyaltyEvent_type_createdAt_idx" ON "LilyLoyaltyEvent"("type","createdAt");
