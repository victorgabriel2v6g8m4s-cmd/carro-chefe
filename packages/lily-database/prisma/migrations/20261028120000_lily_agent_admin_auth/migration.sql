ALTER TABLE "LilyUser" ADD COLUMN "agentIdentity" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LilySession" ADD COLUMN "agentKeyId" TEXT;
ALTER TABLE "LilyAdminAudit" ADD COLUMN "actorType" TEXT NOT NULL DEFAULT 'human';
ALTER TABLE "LilyAdminAudit" ADD COLUMN "agentKeyId" TEXT;
ALTER TABLE "LilyAdminAudit" ADD COLUMN "agentKeyFingerprint" TEXT;

CREATE TABLE "LilyAgentKey" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "label" TEXT NOT NULL,
  "publicKey" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "revokedAt" DATETIME,
  "lastUsedAt" DATETIME,
  CONSTRAINT "LilyAgentKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LilyUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "LilyAgentAuthChallenge" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "agentKeyId" TEXT NOT NULL,
  "challenge" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" DATETIME NOT NULL,
  "consumedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LilyAgentAuthChallenge_agentKeyId_fkey" FOREIGN KEY ("agentKeyId") REFERENCES "LilyAgentKey" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "LilyAgentAuthHandoff" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "agentKeyId" TEXT NOT NULL,
  "ticketHash" TEXT NOT NULL UNIQUE,
  "expiresAt" DATETIME NOT NULL,
  "consumedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LilyAgentAuthHandoff_agentKeyId_fkey" FOREIGN KEY ("agentKeyId") REFERENCES "LilyAgentKey" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "LilyAgentKey_status_updatedAt_idx" ON "LilyAgentKey"("status", "updatedAt");
CREATE INDEX "LilyAgentAuthChallenge_agentKeyId_expiresAt_consumedAt_idx" ON "LilyAgentAuthChallenge"("agentKeyId", "expiresAt", "consumedAt");
CREATE INDEX "LilyAgentAuthHandoff_agentKeyId_expiresAt_consumedAt_idx" ON "LilyAgentAuthHandoff"("agentKeyId", "expiresAt", "consumedAt");
CREATE INDEX "LilySession_agentKeyId_idx" ON "LilySession"("agentKeyId");
CREATE INDEX "LilyAdminAudit_agentKeyId_createdAt_idx" ON "LilyAdminAudit"("agentKeyId", "createdAt");
