-- Capa por sabor CookLily.
-- A imagem continua sendo um LilyMediaAsset; esta tabela guarda somente a associação.

CREATE TABLE "LilyFlavorCover" (
  "flavorId" TEXT NOT NULL PRIMARY KEY,
  "mediaId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LilyFlavorCover_flavorId_fkey"
    FOREIGN KEY ("flavorId") REFERENCES "LilyFlavorComponent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LilyFlavorCover_mediaId_fkey"
    FOREIGN KEY ("mediaId") REFERENCES "LilyMediaAsset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "LilyFlavorCover_mediaId_idx" ON "LilyFlavorCover"("mediaId");
