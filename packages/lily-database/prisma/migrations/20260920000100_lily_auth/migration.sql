CREATE TABLE "LilyUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phoneNormalized" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'customer',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "LilyUser_phoneNormalized_key" ON "LilyUser"("phoneNormalized");
CREATE INDEX "LilyUser_status_createdAt_idx" ON "LilyUser"("status", "createdAt");

CREATE TABLE "LilySession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "csrfTokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LilySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LilyUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "LilySession_tokenHash_key" ON "LilySession"("tokenHash");
CREATE INDEX "LilySession_userId_expiresAt_idx" ON "LilySession"("userId", "expiresAt");
CREATE INDEX "LilySession_expiresAt_revokedAt_idx" ON "LilySession"("expiresAt", "revokedAt");

CREATE TABLE "LilyConsentRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "source" TEXT NOT NULL,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    CONSTRAINT "LilyConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LilyUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "LilyConsentRecord_userId_purpose_recordedAt_idx" ON "LilyConsentRecord"("userId", "purpose", "recordedAt");
