# AGENTS — Banco Lily Açaí

## Região

Persistência exclusiva da operação temporária Lily Açaí. Este pacote é separado de `packages/database`, que continua pertencendo à Central Operacional do Carro Chefe.

## Isolamento

- Usar datasource/banco dedicado da Lily.
- Nunca criar FK, relation, view ou acesso direto às tabelas do banco Carro Chefe.
- Nunca importar client Prisma de `packages/database`.
- Backups Lily são independentes.
- Dados pessoais, banco, backups e uploads nunca são versionados no Git.

## Integridade

- IDs são estáveis.
- Definir NOT NULL, UNIQUE, FKs, índices e política de delete segundo os invariantes.
- Pedido mantém snapshots comerciais de nome/preço para preservar histórico.
- Consentimentos preservam versão, momento, finalidade e revogação.
- Sessão persiste somente hash de token.
- Pagamento não persiste número de cartão, CVV ou payload sensível desnecessário.
- Migrações são versionadas; nunca editar migração aplicada ou banco manualmente.

## Encerramento da operação

O banco deve poder ser arquivado/removido da execução sem afetar o banco ou disponibilidade do Carro Chefe. Rollback operacional preserva backup Lily para auditoria e obrigações aplicáveis.

## Pronto

- [ ] Prisma validate/generate passam.
- [ ] Migração em banco vazio testada.
- [ ] Constraints e índices críticos cobertos.
- [ ] Nenhuma referência ao banco Carro Chefe.
