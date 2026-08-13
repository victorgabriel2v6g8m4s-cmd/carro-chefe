CREATE TABLE "AgentRunReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "diagnosis" TEXT,
    "successesJson" TEXT NOT NULL DEFAULT '[]',
    "failuresJson" TEXT NOT NULL DEFAULT '[]',
    "recommendationsJson" TEXT NOT NULL DEFAULT '[]',
    "evidenceJson" TEXT NOT NULL DEFAULT '[]',
    "generatedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgentRunReport_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AgentRunReport_runId_key" ON "AgentRunReport"("runId");

CREATE TABLE "AgentCommunication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT,
    "intentId" TEXT,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'delivered',
    "summary" TEXT NOT NULL,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentCommunication_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgentCommunication_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "OperationalIntent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "AgentCommunication_createdAt_idx" ON "AgentCommunication"("createdAt");
CREATE INDEX "AgentCommunication_sourceId_targetId_createdAt_idx" ON "AgentCommunication"("sourceId", "targetId", "createdAt");
CREATE INDEX "AgentCommunication_runId_createdAt_idx" ON "AgentCommunication"("runId", "createdAt");
CREATE INDEX "AgentCommunication_intentId_createdAt_idx" ON "AgentCommunication"("intentId", "createdAt");

-- Preserva o histórico existente como fluxo real de delegação do proprietário para cada agente.
INSERT INTO "AgentCommunication" ("id", "runId", "intentId", "sourceId", "targetId", "kind", "status", "summary", "metadataJson", "createdAt")
SELECT lower(hex(randomblob(16))), r."id", r."intentId", r."requestedBy", r."agentId", 'delegation', 'delivered', r."title", '{}', r."createdAt"
FROM "AgentRun" r;

-- Reconstrói as perguntas e respostas já registradas sem alterar a auditoria original.
INSERT INTO "AgentCommunication" ("id", "runId", "intentId", "sourceId", "targetId", "kind", "status", "summary", "metadataJson", "createdAt")
SELECT lower(hex(randomblob(16))), q."runId", r."intentId", q."askedBy", 'PROPRIETARIO', 'question', q."status", q."question", json_object('questionId', q."id"), q."createdAt"
FROM "AgentQuestion" q JOIN "AgentRun" r ON r."id" = q."runId";

INSERT INTO "AgentCommunication" ("id", "runId", "intentId", "sourceId", "targetId", "kind", "status", "summary", "metadataJson", "createdAt")
SELECT lower(hex(randomblob(16))), q."runId", r."intentId", COALESCE(q."answeredBy", 'PROPRIETARIO'), q."askedBy", 'answer', 'delivered', q."answer", json_object('questionId', q."id"), q."answeredAt"
FROM "AgentQuestion" q JOIN "AgentRun" r ON r."id" = q."runId"
WHERE q."answer" IS NOT NULL AND q."answeredAt" IS NOT NULL;
