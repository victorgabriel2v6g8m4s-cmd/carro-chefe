-- CookLily Entrega 11G: cache persistente de ETA/rota.
CREATE TABLE "LilyDeliveryRouteEstimate" (
  "orderId" TEXT NOT NULL PRIMARY KEY,
  "provider" TEXT NOT NULL,
  "sourceHash" TEXT NOT NULL,
  "originLat" REAL NOT NULL,
  "originLng" REAL NOT NULL,
  "destinationLat" REAL NOT NULL,
  "destinationLng" REAL NOT NULL,
  "distanceMeters" INTEGER NOT NULL,
  "durationSeconds" INTEGER NOT NULL,
  "calculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LilyDeliveryRouteEstimate_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "LilyOrder" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "LilyDeliveryRouteEstimate_provider_calculatedAt_idx"
  ON "LilyDeliveryRouteEstimate"("provider", "calculatedAt");
