CREATE TABLE "LilyAddress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "label" TEXT,
    "postalCode" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "complement" TEXT,
    "neighborhood" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "reference" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LilyAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LilyUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LilyAddress_userId_isDefault_createdAt_idx" ON "LilyAddress"("userId", "isDefault", "createdAt");

CREATE TABLE "LilyOperationalSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "ordersEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pickupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "deliveryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "minimumOrderCents" INTEGER NOT NULL DEFAULT 0,
    "deliveryStrategy" TEXT NOT NULL DEFAULT 'flat',
    "flatDeliveryFeeCents" INTEGER NOT NULL DEFAULT 0,
    "pickupAddressText" TEXT,
    "pickupInstructions" TEXT,
    "businessHoursJson" TEXT NOT NULL DEFAULT '[]',
    "timezone" TEXT NOT NULL DEFAULT 'America/Campo_Grande',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "LilyOperationalSettings" (
    "id","ordersEnabled","pickupEnabled","deliveryEnabled","minimumOrderCents",
    "deliveryStrategy","flatDeliveryFeeCents","businessHoursJson","timezone","updatedAt"
) VALUES ('default',false,false,false,0,'flat',0,'[]','America/Campo_Grande',CURRENT_TIMESTAMP);

CREATE TABLE "LilyDeliveryZone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "feeCents" INTEGER NOT NULL,
    "minimumOrderCents" INTEGER NOT NULL DEFAULT 0,
    "neighborhoodsJson" TEXT NOT NULL DEFAULT '[]',
    "postalCodePrefixesJson" TEXT NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE INDEX "LilyDeliveryZone_status_sortOrder_name_idx" ON "LilyDeliveryZone"("status","sortOrder","name");

CREATE TABLE "LilyOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "userId" TEXT,
    "phoneNormalized" TEXT NOT NULL,
    "fulfillmentType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'awaiting_payment',
    "subtotalCents" INTEGER NOT NULL,
    "deliveryFeeCents" INTEGER NOT NULL,
    "discountTotalCents" INTEGER NOT NULL DEFAULT 0,
    "grandTotalCents" INTEGER NOT NULL,
    "addressSnapshotJson" TEXT,
    "customerNote" TEXT,
    "laQr" TEXT,
    "laCampaign" TEXT,
    "laVariant" TEXT,
    "paidAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LilyOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LilyUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LilyOrder_orderNumber_key" ON "LilyOrder"("orderNumber");
CREATE UNIQUE INDEX "LilyOrder_idempotencyKey_key" ON "LilyOrder"("idempotencyKey");
CREATE INDEX "LilyOrder_userId_createdAt_idx" ON "LilyOrder"("userId","createdAt");
CREATE INDEX "LilyOrder_phoneNormalized_createdAt_idx" ON "LilyOrder"("phoneNormalized","createdAt");
CREATE INDEX "LilyOrder_status_createdAt_idx" ON "LilyOrder"("status","createdAt");

CREATE TABLE "LilyOrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "productNameSnapshot" TEXT NOT NULL,
    "variantNameSnapshot" TEXT NOT NULL,
    "sizeMl" INTEGER NOT NULL,
    "configurationHash" TEXT NOT NULL,
    "configurationSnapshotJson" TEXT NOT NULL,
    "flavorsSnapshotJson" TEXT NOT NULL DEFAULT '[]',
    "unitPriceSnapshotCents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineTotalCents" INTEGER NOT NULL,
    "customerNote" TEXT,
    CONSTRAINT "LilyOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "LilyOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LilyOrderItem_orderId_idx" ON "LilyOrderItem"("orderId");
CREATE INDEX "LilyOrderItem_productId_variantId_idx" ON "LilyOrderItem"("productId","variantId");

CREATE TABLE "LilyOrderItemAddon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderItemId" TEXT NOT NULL,
    "addonId" TEXT NOT NULL,
    "addonNameSnapshot" TEXT NOT NULL,
    "unitPriceSnapshotCents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "LilyOrderItemAddon_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "LilyOrderItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LilyOrderItemAddon_orderItemId_idx" ON "LilyOrderItemAddon"("orderItemId");
CREATE INDEX "LilyOrderItemAddon_addonId_idx" ON "LilyOrderItemAddon"("addonId");

CREATE TABLE "LilyOrderStatusEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LilyOrderStatusEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "LilyOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LilyOrderStatusEvent_orderId_createdAt_idx" ON "LilyOrderStatusEvent"("orderId","createdAt");
