# CookLily — Entrega 10A — Observabilidade e backup/restore

- status: merged_validated
- owner: AG-DEV
- branch: `feat/lily-entrega-10a-observabilidade-backup`
- base_branch: `cooklily/canonical`
- base_sha_verified: `9262aa60d875f0a9c58d352e9e3d469a20e7419f`
- validated_head_sha: `3ba8c615c64b736692d7e925d51d9659225f876d`
- canonical_merge_sha: `632ad25a2e72954e301093259c28535993ef7d05`
- ci_run: `36639472270` — success
- codeql_run: `36639472287` — success
- canonical_pr: #112 — squash merged
- gate_pr: #113 — closed without merge
- last_verified_at: 2026-09-29
- previous_delivery: Entrega 09, merge `3ca8b5aa66ad9c1831c65284cf781c5fc7d8eedd`
- interruption_state: integrada; deploy, drill real de restore e QA operacional permanecem para homologação

## Entregue

- `X-Request-Id` em respostas da API;
- redaction explícita de headers sensíveis do logger;
- teste real da configuração de redaction do Fastify/Pino;
- resumo staff de saúde operacional sem PII;
- painel `/painel/saude`;
- verificador isolado de backup SQLite;
- `integrity_check`, `foreign_key_check`, migrations, tamanho e SHA-256;
- deploy falha antes de parar serviço/migrar caso o backup recém-criado seja inválido;
- hashes de backup nas evidências de deploy;
- helper pós-deploy `carro-chefe-verify-backup`;
- runbook de backup/restore e drill isolado;
- testes de RBAC, privacidade, no-store e ordenação do gate.

## Histórico do gate

O primeiro head `f427a346...` passou static checks, observabilidade e verificador funcional, mas um teste procurava a fase antiga `migrate-core`. O deployer real usa `production-migrations`. A asserção foi corrigida sem mudança da lógica de produção; o head final `3ba8c615...` passou CI e CodeQL completos.

## Pendências deliberadas

- executar deploy e conferir o helper/evidence na VPS;
- validar pelo menos um backup real gerado na VPS;
- executar drill controlado de restauração sem tocar produção;
- manter cópia externa criptografada antes da operação comercial plena;
- definir retenção jurídica/operacional;
- recuperação de senha continua bloqueada até existir canal seguro de verificação;
- QA físico/mobile continua separado.

## Continuidade

Próxima subentrega: Entrega 10B — regressões automatizadas de acessibilidade, overflow e performance de build. Isso não substitui QA em aparelhos reais.
