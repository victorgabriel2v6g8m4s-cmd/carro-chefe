-- Capacidades configuráveis dos agentes.
ALTER TABLE "AgentDefinition" ADD COLUMN "workspaceMode" TEXT NOT NULL DEFAULT 'read_only';

UPDATE "AgentDefinition" SET "workspaceMode" = 'project' WHERE "id" = 'AG-DEV';
UPDATE "AgentDefinition" SET "workspaceMode" = 'artifacts' WHERE "id" IN (
  'AG-GESTAO', 'AG-MARKETING', 'AG-MIDIAS', 'AG-COMPRAS',
  'AG-OPERACOES', 'AG-FINANCAS', 'AG-MARCA', 'AG-DADOS'
);

-- Conversas com a Gestão não são tarefas, mas continuam auditáveis por execução.
CREATE TABLE "ManagementConversation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AgentRun" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "taskId" TEXT,
  "agentId" TEXT NOT NULL,
  "intentId" TEXT,
  "managementConversationId" TEXT,
  "parentRunId" TEXT,
  "provider" TEXT NOT NULL DEFAULT 'manual',
  "externalThreadId" TEXT,
  "title" TEXT NOT NULL,
  "objective" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "currentStep" TEXT,
  "requestedBy" TEXT NOT NULL,
  "purpose" TEXT NOT NULL DEFAULT 'execution',
  "complexity" TEXT NOT NULL DEFAULT 'medium',
  "selectedModel" TEXT,
  "selectedReasoningEffort" TEXT NOT NULL DEFAULT 'medium',
  "routingReason" TEXT,
  "startedAt" DATETIME,
  "lastHeartbeatAt" DATETIME,
  "finishedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "AgentRun_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AgentRun_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentDefinition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AgentRun_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "OperationalIntent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AgentRun_managementConversationId_fkey" FOREIGN KEY ("managementConversationId") REFERENCES "ManagementConversation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AgentRun_parentRunId_fkey" FOREIGN KEY ("parentRunId") REFERENCES "AgentRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_AgentRun" (
  "id", "taskId", "agentId", "intentId", "provider", "externalThreadId",
  "title", "objective", "status", "currentStep", "requestedBy", "purpose",
  "complexity", "selectedModel", "selectedReasoningEffort", "routingReason",
  "startedAt", "lastHeartbeatAt", "finishedAt", "createdAt", "updatedAt"
)
SELECT
  "id", "taskId", "agentId", "intentId", "provider", "externalThreadId",
  "title", "objective", "status", "currentStep", "requestedBy", "purpose",
  "complexity", "selectedModel", "selectedReasoningEffort", "routingReason",
  "startedAt", "lastHeartbeatAt", "finishedAt", "createdAt", "updatedAt"
FROM "AgentRun";

DROP TABLE "AgentRun";
ALTER TABLE "new_AgentRun" RENAME TO "AgentRun";
CREATE INDEX "AgentRun_status_createdAt_idx" ON "AgentRun"("status", "createdAt");
CREATE INDEX "AgentRun_intentId_createdAt_idx" ON "AgentRun"("intentId", "createdAt");
CREATE INDEX "AgentRun_managementConversationId_createdAt_idx" ON "AgentRun"("managementConversationId", "createdAt");
CREATE INDEX "AgentRun_parentRunId_createdAt_idx" ON "AgentRun"("parentRunId", "createdAt");
CREATE INDEX "AgentRun_purpose_status_createdAt_idx" ON "AgentRun"("purpose", "status", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

CREATE TABLE "ManagementMessage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "conversationId" TEXT NOT NULL,
  "runId" TEXT,
  "sender" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "referencesJson" TEXT NOT NULL DEFAULT '[]',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ManagementMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ManagementConversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ManagementMessage_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "AgentDispatch" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sourceRunId" TEXT NOT NULL,
  "targetAgentId" TEXT NOT NULL,
  "resultRunId" TEXT,
  "message" TEXT NOT NULL,
  "dataRef" TEXT,
  "contextJson" TEXT NOT NULL DEFAULT '{}',
  "isRequiredToProceed" BOOLEAN NOT NULL DEFAULT false,
  "dependenciesJson" TEXT NOT NULL DEFAULT '[]',
  "onSuccessJson" TEXT NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'buffered',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dispatchedAt" DATETIME,
  "completedAt" DATETIME,
  CONSTRAINT "AgentDispatch_sourceRunId_fkey" FOREIGN KEY ("sourceRunId") REFERENCES "AgentRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AgentDispatch_targetAgentId_fkey" FOREIGN KEY ("targetAgentId") REFERENCES "AgentDefinition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AgentDispatch_resultRunId_fkey" FOREIGN KEY ("resultRunId") REFERENCES "AgentRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

ALTER TABLE "AgentQuestion" ADD COLUMN "answerReferencesJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Upload" ADD COLUMN "questionId" TEXT REFERENCES "AgentQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Upload" ADD COLUMN "managementMessageId" TEXT REFERENCES "ManagementMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ManagementConversation_userId_status_updatedAt_idx" ON "ManagementConversation"("userId", "status", "updatedAt");
CREATE INDEX "ManagementMessage_conversationId_createdAt_idx" ON "ManagementMessage"("conversationId", "createdAt");
CREATE INDEX "ManagementMessage_runId_createdAt_idx" ON "ManagementMessage"("runId", "createdAt");
CREATE INDEX "AgentDispatch_sourceRunId_status_createdAt_idx" ON "AgentDispatch"("sourceRunId", "status", "createdAt");
CREATE INDEX "AgentDispatch_resultRunId_idx" ON "AgentDispatch"("resultRunId");
CREATE INDEX "AgentDispatch_targetAgentId_status_createdAt_idx" ON "AgentDispatch"("targetAgentId", "status", "createdAt");
CREATE INDEX "Upload_questionId_createdAt_idx" ON "Upload"("questionId", "createdAt");
CREATE INDEX "Upload_managementMessageId_createdAt_idx" ON "Upload"("managementMessageId", "createdAt");
