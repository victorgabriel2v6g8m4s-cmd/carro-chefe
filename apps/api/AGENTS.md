# AGENTS — API e backend

## Região

API Fastify, módulos de domínio, workers e integração com Prisma. Não é dona de checkout, fiscal ou pagamento do ERP.

## Arquitetura

```text
rota fina → schema/authorization → caso de uso → repository/adapter → Prisma ou integração
worker → contrato/runtime API → serviço → auditoria e telemetria
```

## Regras locais

- Valide `params`, `query`, `body`, headers e arquivos nas fronteiras; use DTO mínimo na resposta.
- Rotas não concentram regra de negócio nem SQL/Prisma extenso; services e repositories têm responsabilidade única.
- Toda lista potencialmente grande é paginada e limitada; novos filtros exigem análise de índice.
- Operações críticas são autorizadas server-side, auditáveis e idempotentes quando repetíveis.
- Erros externos têm timeout/retry limitado; logs usam contexto e redaction.

## Agentes

- `AG-DEV` implementa. `AG-DADOS` define contratos sem editar código.
- Segurança, API, Database, Testing, Performance e Observability revisam conceitualmente mudanças críticas.

## Pronto

- [ ] Schemas, autorização, payload, falha e concorrência testados conforme risco.
- [ ] Migração/índice avaliados explicitamente; sem mudança manual no SQLite.
- [ ] `npm run check`, `npm test` e `npm run build` passam.
