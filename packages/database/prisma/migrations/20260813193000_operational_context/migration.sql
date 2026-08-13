ALTER TABLE "AgentDefinition" ADD COLUMN "reasoningEffort" TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE "AgentDefinition" ADD COLUMN "browserEnabled" BOOLEAN NOT NULL DEFAULT false;

UPDATE "AgentDefinition" SET "browserEnabled" = true;

ALTER TABLE "AuditEvent" ADD COLUMN "decisionId" TEXT REFERENCES "Decision"("id") ON DELETE SET NULL;
ALTER TABLE "Upload" ADD COLUMN "decisionId" TEXT REFERENCES "Decision"("id") ON DELETE SET NULL;
ALTER TABLE "Notification" ADD COLUMN "runId" TEXT REFERENCES "AgentRun"("id") ON DELETE SET NULL;
ALTER TABLE "Notification" ADD COLUMN "taskId" TEXT REFERENCES "Task"("id") ON DELETE SET NULL;

CREATE TABLE "DecisionContext" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "decisionId" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DecisionContext_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "BrowserNavigation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "title" TEXT,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "resultJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" DATETIME,
    CONSTRAINT "BrowserNavigation_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BrowserNavigation_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "DecisionContext_decisionId_createdAt_idx" ON "DecisionContext"("decisionId", "createdAt");
CREATE INDEX "AuditEvent_decisionId_createdAt_idx" ON "AuditEvent"("decisionId", "createdAt");
CREATE INDEX "Upload_decisionId_createdAt_idx" ON "Upload"("decisionId", "createdAt");
CREATE UNIQUE INDEX "Notification_runId_key" ON "Notification"("runId");
CREATE INDEX "BrowserNavigation_runId_createdAt_idx" ON "BrowserNavigation"("runId", "createdAt");
CREATE INDEX "BrowserNavigation_taskId_createdAt_idx" ON "BrowserNavigation"("taskId", "createdAt");

INSERT INTO "AuditEvent" ("id", "taskId", "actor", "action", "entityType", "entityId", "summary", "createdAt")
SELECT lower(hex(randomblob(12))), t."id", 'importacao-inicial', 'task_added', 'task', t."id", 'Tarefa adicionada ao planejamento: ' || t."title", t."createdAt"
FROM "Task" t
WHERE NOT EXISTS (
  SELECT 1 FROM "AuditEvent" a WHERE a."entityType" = 'task' AND a."entityId" = t."id" AND a."action" = 'task_added'
);

INSERT INTO "AuditEvent" ("id", "decisionId", "actor", "action", "entityType", "entityId", "summary", "createdAt")
SELECT lower(hex(randomblob(12))), d."id", 'importacao-inicial', 'decision_added', 'decision', d."id", 'Decisão adicionada ao registro: ' || d."question", d."createdAt"
FROM "Decision" d
WHERE NOT EXISTS (
  SELECT 1 FROM "AuditEvent" a WHERE a."entityType" = 'decision' AND a."entityId" = d."id" AND a."action" = 'decision_added'
);
