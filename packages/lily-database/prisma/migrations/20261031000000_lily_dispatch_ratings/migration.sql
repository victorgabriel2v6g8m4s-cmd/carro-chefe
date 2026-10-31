ALTER TABLE "LilyUser" ADD COLUMN "courierAvailable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LilyUser" ADD COLUMN "courierLatitude" REAL;
ALTER TABLE "LilyUser" ADD COLUMN "courierLongitude" REAL;
ALTER TABLE "LilyUser" ADD COLUMN "courierLocationUpdatedAt" DATETIME;

ALTER TABLE "LilyOperationalSettings" ADD COLUMN "courierOfferTimeoutSeconds" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "LilyOperationalSettings" ADD COLUMN "pickupLatitude" REAL;
ALTER TABLE "LilyOperationalSettings" ADD COLUMN "pickupLongitude" REAL;

ALTER TABLE "LilyOrder" ADD COLUMN "offeredCourierUserId" TEXT;
ALTER TABLE "LilyOrder" ADD COLUMN "courierOfferExpiresAt" DATETIME;
ALTER TABLE "LilyOrder" ADD COLUMN "restaurantDecisionStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "LilyOrder" ADD COLUMN "restaurantDecisionAt" DATETIME;
ALTER TABLE "LilyOrder" ADD COLUMN "restaurantPrepEstimateMinutes" INTEGER;
ALTER TABLE "LilyOrder" ADD COLUMN "dispatchChecklistJson" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "LilyOrder" ADD COLUMN "dispatchCheckedAt" DATETIME;
ALTER TABLE "LilyOrder" ADD COLUMN "dispatchCheckedBy" TEXT;

CREATE INDEX "LilyUser_courierAvailable_courierLocationUpdatedAt_idx" ON "LilyUser"("courierAvailable", "courierLocationUpdatedAt");
CREATE INDEX "LilyOrder_offeredCourierUserId_courierOfferExpiresAt_idx" ON "LilyOrder"("offeredCourierUserId", "courierOfferExpiresAt");

CREATE TABLE "LilyOrderReview" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "storeRating" INTEGER,
  "storeComment" TEXT,
  "deliveryRating" INTEGER,
  "deliveryComment" TEXT,
  "platformRating" INTEGER,
  "platformComment" TEXT,
  "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "LilyOrderReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "LilyOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LilyOrderReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LilyUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LilyOrderReview_orderId_key" ON "LilyOrderReview"("orderId");
CREATE INDEX "LilyOrderReview_userId_submittedAt_idx" ON "LilyOrderReview"("userId", "submittedAt");
ALTER TABLE "LilyOrder" ADD COLUMN "restaurantDecisionReason" TEXT;
ALTER TABLE "LilyOrder" ADD COLUMN "refundStatus" TEXT NOT NULL DEFAULT 'not_required';
