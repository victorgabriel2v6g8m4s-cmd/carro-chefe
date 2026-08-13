UPDATE "AgentDefinition" SET "order" = "order" + 1 WHERE "id" <> 'AG-DADOS' AND "order" >= 4;
UPDATE "AgentDefinition" SET "order" = 4 WHERE "id" = 'AG-DADOS';
UPDATE "Risk" SET "ownerAgentId" = 'AG-DADOS' WHERE "id" = 'RISK-007';
