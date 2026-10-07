# Incidente — cache de migrations de preflight CookLily (2026-10-07)

## Sintoma

O deploy de `c3628ab2f8c97572e5a2c7948afc4a7492c3f638` avançou até a fase de testes e apresentou falhas massivas de Prisma com tabelas Lily ausentes (`LilyAnalyticsEvent`, `LilyPaymentReconciliation`, `LilyUser`, `LilyOrder`, `LilyFlavorComponent` e outras).

## Causa raiz

O deployer remove os bancos temporários `.runtime/deploy-preflight-core.db` e `.runtime/deploy-preflight-lily.db` no início de cada preflight. A fase `preflight-migrations` havia sido tornada cacheável. Depois de uma tentativa anterior armazenar sucesso para esse gate, uma nova tentativa removia os bancos temporários e aceitava o cache hit, pulando `npm run db:deploy`. Ao iniciar os testes, SQLite recriava um arquivo vazio e as suites encontravam um banco sem tabelas.

Não houve falha de 120 funcionalidades independentes: as suites compartilhavam o mesmo problema de infraestrutura de teste.

## Segurança operacional

A tentativa falhou antes de qualquer migration real. O deployer restaurou o checkout anterior `f7a976d082293a20335fce4e7d0b726608e98e10`; os bancos de produção não foram migrados por essa tentativa.

## Correção

`preflight-migrations` deixa de usar cache. Os bancos temporários continuam sendo removidos no início de cada tentativa e `npm run db:deploy` passa a ser executado sempre antes de static checks/testes. Os gates caros e repetíveis (dependências, static checks, testes, builds e Tool Health) continuam usando cache por fingerprint.

Um teste estrutural do deployer passa a exigir explicitamente que `preflight-migrations` não use `run_cached_gate`.
