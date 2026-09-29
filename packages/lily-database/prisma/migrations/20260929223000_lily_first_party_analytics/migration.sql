-- CookLily Entrega 09: analytics first-party minimizado e pseudônimo.

CREATE TABLE "LilyAnalyticsEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "eventId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "laQr" TEXT,
  "laCampaign" TEXT,
  "laVariant" TEXT,
  "surface" TEXT,
  "productSlug" TEXT,
  "comboSlug" TEXT,
  "variantSizeMl" INTEGER,
  "addonCount" INTEGER,
  "itemCount" INTEGER,
  "fulfillmentType" TEXT,
  "paymentMethod" TEXT,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "LilyAnalyticsEvent_eventId_key"
  ON "LilyAnalyticsEvent"("eventId");

CREATE INDEX "LilyAnalyticsEvent_event_createdAt_idx"
  ON "LilyAnalyticsEvent"("event", "createdAt");

CREATE INDEX "LilyAnalyticsEvent_sessionId_createdAt_idx"
  ON "LilyAnalyticsEvent"("sessionId", "createdAt");

CREATE INDEX "LilyAnalyticsEvent_laCampaign_laVariant_createdAt_idx"
  ON "LilyAnalyticsEvent"("laCampaign", "laVariant", "createdAt");

CREATE INDEX "LilyAnalyticsEvent_laQr_createdAt_idx"
  ON "LilyAnalyticsEvent"("laQr", "createdAt");

CREATE INDEX "LilyAnalyticsEvent_productSlug_event_createdAt_idx"
  ON "LilyAnalyticsEvent"("productSlug", "event", "createdAt");
