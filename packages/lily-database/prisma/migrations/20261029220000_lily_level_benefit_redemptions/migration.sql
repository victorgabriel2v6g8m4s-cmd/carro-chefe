CREATE TABLE "LilyLevelBenefitRedemption" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "levelId" TEXT NOT NULL,
  "levelName" TEXT NOT NULL,
  "benefitId" TEXT NOT NULL,
  "benefitKind" TEXT NOT NULL,
  "benefitLabel" TEXT NOT NULL,
  "configurationJson" TEXT NOT NULL DEFAULT '{}',
  "redemptionCode" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'claimed',
  "couponId" TEXT,
  "fulfilledBy" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fulfilledAt" DATETIME,
  CONSTRAINT "LilyLevelBenefitRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LilyUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LilyLevelBenefitRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "LilyCoupon" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "LilyLevelBenefitRedemption_redemptionCode_key" ON "LilyLevelBenefitRedemption"("redemptionCode");
CREATE UNIQUE INDEX "LilyLevelBenefitRedemption_couponId_key" ON "LilyLevelBenefitRedemption"("couponId");
CREATE INDEX "LilyLevelBenefitRedemption_userId_levelId_benefitId_createdAt_idx" ON "LilyLevelBenefitRedemption"("userId", "levelId", "benefitId", "createdAt");
CREATE INDEX "LilyLevelBenefitRedemption_status_createdAt_idx" ON "LilyLevelBenefitRedemption"("status", "createdAt");
