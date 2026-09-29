# CookLily — Entrega 11J — SLA e alertas operacionais da cozinha

- status: merged
- owner: AG-DEV
- branch: `feat/lily-entrega-11j-sla-alertas-operacionais`
- base_branch: `cooklily/canonical`
- base_sha_verified: `19381bda06010f971f41a024a27d928c2e96c3f6`
- validated_head_sha: `b5413d4bc9d0c6cd63f9661f285968f10dc22747`
- merge_sha: `16097e4ed3dda019d981d8d1da3f1be6dd00794c`
- pull_requests: PR #104 -> `cooklily/canonical` (merged); PR #105 -> `main` (gate temporário fechado sem merge)
- last_verified_at: 2026-09-29
- interruption_state: concluída tecnicamente; parametrização operacional/QA real pendentes

## Objetivo

Fechar a pendência `SLA/alertas de atraso` da fila da cozinha sem inventar prazo operacional.

## Concluído e persistido

- Campo nullable `LilyOperationalSettings.kitchenPreparationSlaMinutes`, sem valor padrão.
- Migration `20260929203000_lily_kitchen_sla`.
- GET/PATCH administrativo de fulfillment expõe a configuração.
- Validação server-side: inteiro de 1–720 minutos ou `null`.
- Função `lilyKitchenPreparationSla` calcula prazo pelo relógio do servidor a partir de `operationUpdatedAt`.
- SLA existe somente durante `preparing`.
- Fila da cozinha expõe `sla` por pedido e contador agregado de atrasados.
- Painel staff permite configurar ou desativar o SLA.
- UI da cozinha mostra tempo restante ou atraso.
- Atraso nunca muda status, cancela, avança nem dispara ação externa automaticamente.
- Testes unitários e de integração cobrem cálculo, desativação, configuração e preservação do estado.

## Gates e testes

Validação final do SHA `b5413d4bc9d0c6cd63f9661f285968f10dc22747`:

- CI `36626787032`: success.
- CodeQL `36626787547`: success.
- Quality / Node 20: success.
- Quality / Node 24: success.
- Tool Health / Linux: success.
- Windows Supervisor: success.
- Workbook Snapshot: success.
- Excel Recipe Linux: success.
- Excel Recipe Windows: success.

## Integração

- PR #104 marcado pronto somente após gates verdes.
- Squash merge concluído em `cooklily/canonical`.
- Merge SHA: `16097e4ed3dda019d981d8d1da3f1be6dd00794c`.
- PR gate #105 fechado sem merge.

## Migrations

- `packages/lily-database/prisma/migrations/20260929203000_lily_kitchen_sla/migration.sql`

## Bloqueios/riscos remanescentes

- A operação ainda precisa definir o SLA real de montagem.
- QA visual/operacional em tablet/celular continua pendente.
- O recurso permanece desativado enquanto o campo estiver `null`.

## Próxima ação exata

Definir com Operações o SLA real de montagem e homologar o alerta na cozinha em tablet/celular; tecnicamente, a próxima pendência desbloqueada do roadmap é impressão.
