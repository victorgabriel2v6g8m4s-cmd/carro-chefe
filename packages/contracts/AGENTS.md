# AGENTS — Contratos

## Região

Schemas Zod, tipos e enums estáveis compartilhados entre API e interfaces.

## Regras locais

- Schema é a fonte única para validação e inferência; não duplique interface equivalente.
- Entrada externa usa allowlist/strict quando apropriado, limites explícitos e mensagens/códigos estáveis.
- Preserve IDs e compatibilidade; mudança breaking exige versão/migração coordenada.
- Não importe Prisma, Fastify, React ou implementação de aplicação.

## Pronto

- [ ] Casos válido, inválido, vazio, limite e campos extras testados.
- [ ] Consumidores e contrato ERP avaliados.
