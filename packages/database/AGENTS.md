# AGENTS — Banco operacional

## Região

Schema Prisma, client, migrações e seed da Central Operacional em SQLite.

## Regras locais

- O SQLite é fonte mutável do plano/auditoria; o ERP é fonte de produtos, estoque, pedidos, pagamentos, fiscal e financeiro.
- Nunca edite banco, migração aplicada ou seed operacional à mão; gere migração versionada e reversível.
- Defina `NOT NULL`, `UNIQUE`, FKs, delete policy e índices segundo invariantes/queries.
- Listagens escalam com paginação; transações são curtas; raw SQL é parametrizado e justificado.
- Não versionar `.runtime`, uploads, backups ou dados pessoais.

## Pronto

- [ ] Migração em banco vazio e existente avaliada; risco de perda/lock documentado.
- [ ] Prisma validate/generate e testes de integridade passam.
