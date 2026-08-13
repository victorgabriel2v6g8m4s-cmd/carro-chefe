ALTER TABLE "AgentRun" ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'execution';
ALTER TABLE "AgentRun" ADD COLUMN "complexity" TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE "AgentRun" ADD COLUMN "selectedModel" TEXT;
ALTER TABLE "AgentRun" ADD COLUMN "selectedReasoningEffort" TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE "AgentRun" ADD COLUMN "routingReason" TEXT;

CREATE INDEX "AgentRun_purpose_status_createdAt_idx" ON "AgentRun"("purpose", "status", "createdAt");
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");
CREATE INDEX "AuditEvent_action_createdAt_idx" ON "AuditEvent"("action", "createdAt");

INSERT OR IGNORE INTO "AgentDefinition" (
  "id", "projectId", "name", "role", "mission", "model", "reasoningEffort", "browserEnabled", "enabled", "order"
)
SELECT
  'AG-DADOS', "id", 'Dados & Analytics', 'dados',
  'Governar contratos, qualidade, privacidade, eventos, analytics e reconciliação dos dados.',
  'gpt-5.6-terra', 'medium', 1, 1, 4
FROM "Project" WHERE "id" = 'carro-chefe';

UPDATE "AgentDefinition"
SET "name" = 'Development',
    "role" = 'development',
    "mission" = 'Construir software, integrações, testes, deploy e observabilidade com escopo técnico explícito.'
WHERE "id" = 'AG-DEV';

UPDATE "Task" SET "ownerAgentId" = 'AG-DADOS' WHERE "id" LIKE 'TASK-DAT-%';
