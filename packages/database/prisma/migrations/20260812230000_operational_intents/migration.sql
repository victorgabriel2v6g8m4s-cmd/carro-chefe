CREATE TABLE "OperationalIntent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "submittedBy" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "classificationJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    CONSTRAINT "OperationalIntent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "BusinessFact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending_verification',
    "sourceIntentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BusinessFact_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BusinessFact_sourceIntentId_fkey" FOREIGN KEY ("sourceIntentId") REFERENCES "OperationalIntent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "intentId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "route" TEXT,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "OperationalIntent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_AgentRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "intentId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'manual',
    "externalThreadId" TEXT,
    "title" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "currentStep" TEXT,
    "requestedBy" TEXT NOT NULL,
    "startedAt" DATETIME,
    "lastHeartbeatAt" DATETIME,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgentRun_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgentRun_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentDefinition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AgentRun_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "OperationalIntent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_AgentRun" ("agentId", "createdAt", "currentStep", "externalThreadId", "finishedAt", "id", "lastHeartbeatAt", "objective", "provider", "requestedBy", "startedAt", "status", "taskId", "title", "updatedAt") SELECT "agentId", "createdAt", "currentStep", "externalThreadId", "finishedAt", "id", "lastHeartbeatAt", "objective", "provider", "requestedBy", "startedAt", "status", "taskId", "title", "updatedAt" FROM "AgentRun";
DROP TABLE "AgentRun";
ALTER TABLE "new_AgentRun" RENAME TO "AgentRun";
CREATE INDEX "AgentRun_status_createdAt_idx" ON "AgentRun"("status", "createdAt");
CREATE INDEX "AgentRun_intentId_createdAt_idx" ON "AgentRun"("intentId", "createdAt");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

CREATE INDEX "OperationalIntent_status_createdAt_idx" ON "OperationalIntent"("status", "createdAt");
CREATE UNIQUE INDEX "BusinessFact_projectId_key_key" ON "BusinessFact"("projectId", "key");
CREATE INDEX "BusinessFact_sourceIntentId_idx" ON "BusinessFact"("sourceIntentId");
CREATE UNIQUE INDEX "Notification_intentId_key" ON "Notification"("intentId");
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");
