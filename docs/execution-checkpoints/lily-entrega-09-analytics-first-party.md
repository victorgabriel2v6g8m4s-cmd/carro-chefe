# CookLily — Entrega 09 — Analytics first-party

- status: merged_validated
- owner: AG-DEV
- branch: `feat/lily-entrega-09-analytics-first-party`
- base_branch: `cooklily/canonical`
- base_sha_verified: `3e4f4bdb6f8dc123a3174fa320b141c73bd764ed`
- validated_head_sha: `c52a0fcda0d016f282ad513b4b91b0098fc0a75c`
- canonical_merge_sha: `3ca8b5aa66ad9c1831c65284cf781c5fc7d8eedd`
- ci_run: `36637864661` — success
- codeql_run: `36637864655` — success
- canonical_pr: #110 — squash merged
- gate_pr: #111 — closed without merge
- last_verified_at: 2026-09-29
- previous_delivery: Entrega 08, merge `64f4af027fcdd3cf13ee57457c193a8c622cc5f9`
- interruption_state: entrega integrada; deploy/homologação real permanece separado

## Entregue

- analytics first-party sem dependência de fornecedor externo;
- opt-in explícito e zero transmissão após recusa;
- fila em memória enquanto consentimento está indefinido;
- evento idempotente por UUID + sessão pseudônima;
- path sem query/fragment e allowlist estrita de metadata;
- atribuição `la_*` com compatibilidade de entrada `cc_*`;
- eventos de landing, catálogo, produto, combo, carrinho, checkout, pagamento e canais;
- painel staff `/painel/analytics`;
- funil por sessão e interesse por produto;
- pedidos/receita derivados de `LilyOrder` como fonte autoritativa;
- homologação excluída das métricas comerciais por padrão;
- testes backend e frontend de consentimento, privacidade, idempotência e agregação.

## Pendências externas

- definir retenção jurídica definitiva de analytics/PII antes da operação comercial plena;
- QA real do aviso/preferências em navegadores e mobile;
- conferir números do dashboard com tráfego real após deploy.

## Continuidade

A próxima entrega técnica é a Entrega 10 — QA automatizado, observabilidade e hardening. Recuperação de senha continua bloqueada até existir canal seguro de verificação; QA físico/mobile continua separado para o ciclo de homologação.
