ALTER TABLE "LilyOperationalSettings" ADD COLUMN "loyaltyCoinName" TEXT NOT NULL DEFAULT 'LilyCoins';
ALTER TABLE "LilyOperationalSettings" ADD COLUMN "loyaltyCoinIconMediaId" TEXT REFERENCES "LilyMediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "LilyOperationalSettings_loyaltyCoinIconMediaId_key" ON "LilyOperationalSettings"("loyaltyCoinIconMediaId");

ALTER TABLE "LilyLevel" ADD COLUMN "iconMediaId" TEXT REFERENCES "LilyMediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "LilyLevel_iconMediaId_idx" ON "LilyLevel"("iconMediaId");

ALTER TABLE "LilyLoyaltyConfigVersion" ADD COLUMN "loyaltyCoinName" TEXT NOT NULL DEFAULT 'LilyCoins';
ALTER TABLE "LilyLoyaltyConfigVersion" ADD COLUMN "loyaltyCoinIconMediaId" TEXT;
