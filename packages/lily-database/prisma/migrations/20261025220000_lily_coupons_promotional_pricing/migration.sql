ALTER TABLE "LilyMixPriceTier" ADD COLUMN "compareAtPriceCents" INTEGER;

ALTER TABLE "LilyOrder" ADD COLUMN "couponDiscountCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LilyOrder" ADD COLUMN "couponProductDiscountCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LilyOrder" ADD COLUMN "couponShippingDiscountCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LilyOrder" ADD COLUMN "couponsSnapshotJson" TEXT NOT NULL DEFAULT '[]';

CREATE TABLE "LilyCoupon" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL,
  "value" INTEGER NOT NULL DEFAULT 0,
  "minimumOrderCents" INTEGER NOT NULL DEFAULT 0,
  "maxDiscountCents" INTEGER,
  "color" TEXT NOT NULL DEFAULT '#78002E',
  "imageMediaId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "startsAt" DATETIME,
  "endsAt" DATETIME,
  "recurrence" TEXT NOT NULL DEFAULT 'none',
  "maxUsesTotal" INTEGER,
  "maxUsesPerCustomer" INTEGER NOT NULL DEFAULT 1,
  "allowCombination" BOOLEAN NOT NULL DEFAULT false,
  "isAdditive" BOOLEAN NOT NULL DEFAULT false,
  "appliesToShipping" BOOLEAN NOT NULL DEFAULT false,
  "usesCount" INTEGER NOT NULL DEFAULT 0,
  "createdBy" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "LilyCoupon_imageMediaId_fkey" FOREIGN KEY ("imageMediaId") REFERENCES "LilyMediaAsset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LilyCoupon_code_key" ON "LilyCoupon"("code");
CREATE INDEX "LilyCoupon_status_startsAt_endsAt_idx" ON "LilyCoupon"("status", "startsAt", "endsAt");
CREATE INDEX "LilyCoupon_updatedAt_idx" ON "LilyCoupon"("updatedAt");

CREATE TABLE "LilyCouponCategory" (
  "couponId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  CONSTRAINT "LilyCouponCategory_pkey" PRIMARY KEY ("couponId", "categoryId"),
  CONSTRAINT "LilyCouponCategory_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "LilyCoupon" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LilyCouponCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "LilyCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LilyCouponCategory_categoryId_idx" ON "LilyCouponCategory"("categoryId");

CREATE TABLE "LilyCouponProduct" (
  "couponId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  CONSTRAINT "LilyCouponProduct_pkey" PRIMARY KEY ("couponId", "productId"),
  CONSTRAINT "LilyCouponProduct_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "LilyCoupon" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LilyCouponProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "LilyProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LilyCouponProduct_productId_idx" ON "LilyCouponProduct"("productId");

CREATE TABLE "LilyCouponRedemption" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "couponId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "discountCents" INTEGER NOT NULL,
  "periodKey" TEXT NOT NULL,
  "codeSnapshot" TEXT NOT NULL,
  "titleSnapshot" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LilyCouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "LilyCoupon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LilyCouponRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "LilyOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LilyCouponRedemption_couponId_orderId_key" ON "LilyCouponRedemption"("couponId", "orderId");
CREATE INDEX "LilyCouponRedemption_couponId_periodKey_createdAt_idx" ON "LilyCouponRedemption"("couponId", "periodKey", "createdAt");
CREATE INDEX "LilyCouponRedemption_orderId_idx" ON "LilyCouponRedemption"("orderId");
