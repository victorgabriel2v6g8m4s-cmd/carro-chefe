ALTER TABLE "LilySurvey" ADD COLUMN "estimatedMinutes" INTEGER NOT NULL DEFAULT 5;

CREATE TABLE "LilyCustomerNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LilyCustomerNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LilyUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "LilyCustomerNotification_userId_sourceKey_key" ON "LilyCustomerNotification"("userId", "sourceKey");
CREATE INDEX "LilyCustomerNotification_userId_readAt_createdAt_idx" ON "LilyCustomerNotification"("userId", "readAt", "createdAt");
