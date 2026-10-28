CREATE TABLE "LilyReelLike" (
  "userId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", "productId"),
  CONSTRAINT "LilyReelLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LilyUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LilyReelLike_productId_fkey" FOREIGN KEY ("productId") REFERENCES "LilyProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LilyReelLike_productId_createdAt_idx" ON "LilyReelLike"("productId", "createdAt");

CREATE TABLE "LilyReelSave" (
  "userId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", "productId"),
  CONSTRAINT "LilyReelSave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LilyUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LilyReelSave_productId_fkey" FOREIGN KEY ("productId") REFERENCES "LilyProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LilyReelSave_userId_createdAt_idx" ON "LilyReelSave"("userId", "createdAt");

CREATE TABLE "LilyReelComment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'published',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LilyReelComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LilyUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LilyReelComment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "LilyProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LilyReelComment_productId_status_createdAt_idx" ON "LilyReelComment"("productId", "status", "createdAt");
CREATE INDEX "LilyReelComment_userId_createdAt_idx" ON "LilyReelComment"("userId", "createdAt");
