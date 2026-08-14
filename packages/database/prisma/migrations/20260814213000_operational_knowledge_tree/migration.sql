CREATE TABLE "KnowledgeNode" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "parentId" TEXT,
  "sourceRunId" TEXT,
  "sourceIntentId" TEXT,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'branch',
  "value" TEXT,
  "valueType" TEXT NOT NULL DEFAULT 'text',
  "verificationStatus" TEXT NOT NULL DEFAULT 'informed',
  "referencesJson" TEXT NOT NULL DEFAULT '[]',
  "sourceType" TEXT NOT NULL DEFAULT 'manual',
  "sourceId" TEXT,
  "createdBy" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "KnowledgeNode_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "KnowledgeNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "KnowledgeNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "KnowledgeNode_sourceRunId_fkey" FOREIGN KEY ("sourceRunId") REFERENCES "AgentRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "KnowledgeNode_sourceIntentId_fkey" FOREIGN KEY ("sourceIntentId") REFERENCES "OperationalIntent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "KnowledgeNodeAttachment" (
  "nodeId" TEXT NOT NULL,
  "uploadId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("nodeId", "uploadId"),
  CONSTRAINT "KnowledgeNodeAttachment_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "KnowledgeNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "KnowledgeNodeAttachment_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "KnowledgeNode_projectId_path_key" ON "KnowledgeNode"("projectId", "path");
CREATE INDEX "KnowledgeNode_parentId_status_name_idx" ON "KnowledgeNode"("parentId", "status", "name");
CREATE INDEX "KnowledgeNode_sourceRunId_idx" ON "KnowledgeNode"("sourceRunId");
CREATE INDEX "KnowledgeNode_sourceIntentId_idx" ON "KnowledgeNode"("sourceIntentId");
CREATE INDEX "KnowledgeNode_status_updatedAt_idx" ON "KnowledgeNode"("status", "updatedAt");
CREATE INDEX "KnowledgeNodeAttachment_uploadId_idx" ON "KnowledgeNodeAttachment"("uploadId");

INSERT OR IGNORE INTO "KnowledgeNode" ("id", "projectId", "parentId", "slug", "name", "path", "kind", "createdBy", "sourceType", "updatedAt") VALUES
  ('KN-ROOT-ESTABELECIMENTO', 'carro-chefe', NULL, 'estabelecimento', 'Estabelecimento', 'estabelecimento', 'branch', 'MIGRACAO', 'system', CURRENT_TIMESTAMP),
  ('KN-ROOT-PESSOAS', 'carro-chefe', NULL, 'pessoas', 'Pessoas', 'pessoas', 'branch', 'MIGRACAO', 'system', CURRENT_TIMESTAMP),
  ('KN-ROOT-OPERACAO', 'carro-chefe', NULL, 'operacao', 'Operação', 'operacao', 'branch', 'MIGRACAO', 'system', CURRENT_TIMESTAMP),
  ('KN-ROOT-CARDAPIO', 'carro-chefe', NULL, 'cardapio', 'Cardápio', 'cardapio', 'branch', 'MIGRACAO', 'system', CURRENT_TIMESTAMP),
  ('KN-ROOT-SISTEMAS', 'carro-chefe', NULL, 'sistemas', 'Sistemas', 'sistemas', 'branch', 'MIGRACAO', 'system', CURRENT_TIMESTAMP),
  ('KN-ROOT-MARCA', 'carro-chefe', NULL, 'marca', 'Marca', 'marca', 'branch', 'MIGRACAO', 'system', CURRENT_TIMESTAMP),
  ('KN-ROOT-MARKETING', 'carro-chefe', NULL, 'marketing', 'Marketing', 'marketing', 'branch', 'MIGRACAO', 'system', CURRENT_TIMESTAMP),
  ('KN-ROOT-FINANCEIRO', 'carro-chefe', NULL, 'financeiro', 'Financeiro', 'financeiro', 'branch', 'MIGRACAO', 'system', CURRENT_TIMESTAMP),
  ('KN-ROOT-FORNECEDORES', 'carro-chefe', NULL, 'fornecedores', 'Fornecedores', 'fornecedores', 'branch', 'MIGRACAO', 'system', CURRENT_TIMESTAMP),
  ('KN-ROOT-DECISOES', 'carro-chefe', NULL, 'decisoes', 'Decisões', 'decisoes', 'branch', 'MIGRACAO', 'system', CURRENT_TIMESTAMP),
  ('KN-ROOT-ARQUIVOS', 'carro-chefe', NULL, 'arquivos', 'Arquivos', 'arquivos', 'branch', 'MIGRACAO', 'system', CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO "KnowledgeNode" ("id", "projectId", "parentId", "slug", "name", "path", "kind", "createdBy", "sourceType", "updatedAt") VALUES
  ('KN-EST-ENDERECO', 'carro-chefe', 'KN-ROOT-ESTABELECIMENTO', 'endereco', 'Endereço', 'estabelecimento/endereco', 'branch', 'MIGRACAO', 'system', CURRENT_TIMESTAMP),
  ('KN-PES-EQUIPE', 'carro-chefe', 'KN-ROOT-PESSOAS', 'equipe', 'Equipe', 'pessoas/equipe', 'branch', 'MIGRACAO', 'system', CURRENT_TIMESTAMP),
  ('KN-OPE-COZINHA', 'carro-chefe', 'KN-ROOT-OPERACAO', 'cozinha', 'Cozinha', 'operacao/cozinha', 'branch', 'MIGRACAO', 'system', CURRENT_TIMESTAMP),
  ('KN-SIS-ERP', 'carro-chefe', 'KN-ROOT-SISTEMAS', 'erp', 'ERP', 'sistemas/erp', 'branch', 'MIGRACAO', 'system', CURRENT_TIMESTAMP),
  ('KN-DEC-CAPTURADAS', 'carro-chefe', 'KN-ROOT-DECISOES', 'capturadas', 'Decisões capturadas', 'decisoes/capturadas', 'branch', 'MIGRACAO', 'system', CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO "KnowledgeNode" (
  "id", "projectId", "parentId", "sourceIntentId", "slug", "name", "path", "kind", "value",
  "valueType", "verificationStatus", "sourceType", "sourceId", "createdBy", "updatedAt"
)
SELECT
  'KN-BF-' || "id", "projectId", 'KN-SIS-ERP', "sourceIntentId", 'selecionado', 'ERP selecionado',
  'sistemas/erp/selecionado', 'fact', "value", 'text', "verificationStatus", 'legacy_fact', "id", 'MIGRACAO', CURRENT_TIMESTAMP
FROM "BusinessFact" WHERE "key" = 'erp.selected';
