ALTER TABLE "LilyLoyaltyEvent" ADD COLUMN "configVersion" INTEGER;

CREATE TABLE "LilyLoyaltyConfigVersion" (
  "version" INTEGER NOT NULL PRIMARY KEY,
  "orderCentsPerPoint" INTEGER NOT NULL,
  "campaignBonusPoints" INTEGER NOT NULL,
  "couponBonusPoints" INTEGER NOT NULL,
  "roundingMode" TEXT NOT NULL,
  "levelsJson" TEXT NOT NULL DEFAULT '[]',
  "rewardsJson" TEXT NOT NULL DEFAULT '[]',
  "missionsJson" TEXT NOT NULL DEFAULT '[]',
  "actorUserId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "LilyLoyaltyConfigVersion_createdAt_idx" ON "LilyLoyaltyConfigVersion"("createdAt");

INSERT OR IGNORE INTO "LilyOperationalSettings" ("id") VALUES ('default');
INSERT INTO "LilyLoyaltyConfigVersion" (
  "version", "orderCentsPerPoint", "campaignBonusPoints", "couponBonusPoints", "roundingMode", "levelsJson", "actorUserId"
)
SELECT 1, "loyaltyOrderCentsPerPoint", "loyaltyCampaignBonusPoints", "loyaltyCouponBonusPoints", "loyaltyRoundingMode", '[]', 'system:migration'
FROM "LilyOperationalSettings" WHERE "id" = 'default';

INSERT INTO "LilyLoyaltyEvent" (
  "id", "userId", "type", "points", "sourceKey", "configVersion", "metadataJson", "createdAt"
)
SELECT
  'legacy-order:' || orders."id",
  orders."userId",
  'order_purchase',
  CASE settings."loyaltyRoundingMode"
    WHEN 'ceil' THEN CAST((orders."grandTotalCents" + settings."loyaltyOrderCentsPerPoint" - 1) / settings."loyaltyOrderCentsPerPoint" AS INTEGER)
    WHEN 'nearest' THEN CAST((orders."grandTotalCents" * 1.0 / settings."loyaltyOrderCentsPerPoint") + 0.5 AS INTEGER)
    ELSE CAST(orders."grandTotalCents" / settings."loyaltyOrderCentsPerPoint" AS INTEGER)
  END,
  'order:' || orders."id",
  1,
  '{"source":"loyalty-version-backfill","configVersion":1}',
  COALESCE(orders."paidAt", orders."updatedAt", orders."createdAt")
FROM "LilyOrder" AS orders
CROSS JOIN "LilyOperationalSettings" AS settings
WHERE orders."userId" IS NOT NULL
  AND orders."status" IN ('paid', 'completed')
  AND orders."grandTotalCents" > 0
  AND settings."id" = 'default'
  AND NOT EXISTS (SELECT 1 FROM "LilyLoyaltyEvent" AS events WHERE events."sourceKey" = 'order:' || orders."id");

INSERT INTO "LilyLoyaltyEvent" (
  "id", "userId", "type", "points", "sourceKey", "configVersion", "metadataJson", "createdAt"
)
SELECT
  'legacy-campaign:' || campaigns."userId" || ':' || campaigns."orderId",
  campaigns."userId",
  'campaign_bonus',
  settings."loyaltyCampaignBonusPoints",
  'campaign:' || campaigns."userId" || ':' || campaigns."laCampaign",
  1,
  '{"source":"loyalty-version-backfill","configVersion":1}',
  CURRENT_TIMESTAMP
FROM (
  SELECT "userId", "laCampaign", MIN("id") AS "orderId"
  FROM "LilyOrder"
  WHERE "userId" IS NOT NULL AND "status" IN ('paid', 'completed') AND "laCampaign" IS NOT NULL
  GROUP BY "userId", "laCampaign"
) AS campaigns
CROSS JOIN "LilyOperationalSettings" AS settings
WHERE settings."id" = 'default'
  AND NOT EXISTS (SELECT 1 FROM "LilyLoyaltyEvent" AS events WHERE events."sourceKey" = 'campaign:' || campaigns."userId" || ':' || campaigns."laCampaign");
