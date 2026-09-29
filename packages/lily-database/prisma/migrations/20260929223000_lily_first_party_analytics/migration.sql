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
  "occurredAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "LilyAnalyticsEvent_eventId_key"
  ON "LilyAnalyticsEvent"("eventId");

CREATE INDEX "LilyAnalyticsEvent_event_occurredAt_idx"
  ON "LilyAnalyticsEvent"("event", "occurredAt");

CREATE INDEX "LilyAnalyticsEvent_sessionId_occurredAt_idx"
  ON "LilyAnalyticsEvent"("sessionId", "occurredAt");

CREATE INDEX "LilyAnalyticsEvent_laCampaign_laVariant_occurredAt_idx"
  ON "LilyAnalyticsEvent"("laCampaign", "laVariant", "occurredAt");

CREATE INDEX "LilyAnalyticsEvent_laQr_occurredAt_idx"
  ON "LilyAnalyticsEvent"("laQr", "occurredAt");

CREATE INDEX "LilyAnalyticsEvent_productSlug_event_occurredAt_idx"
  ON "LilyAnalyticsEvent"("productSlug", "event", "occurredAt");
