# CookLily — Entrega 11J — SLA e alertas operacionais da cozinha

- status: in_progress
- owner: AG-DEV
- branch: `feat/lily-entrega-11j-sla-alertas-operacionais`
- base_branch: `cooklily/canonical`
- base_sha_verified: `19381bda06010f971f41a024a27d928c2e96c3f6`
- head_sha_verified: `c3519c042af3d0a64de7c0bdb7ffa3336d74fc8e`
- pull_requests: PR #104 -> `cooklily/canonical` (draft); PR #105 -> `main` (gate temporário, não mergear)
- last_verified_at: 2026-09-29
- interruption_state: execução iniciada após conclusão da 11I

## Objetivo

Fechar a pendência `SLA/alertas de atraso` da fila da cozinha sem inventar prazo operacional.

Primeiro escopo:
- SLA configurável somente para a etapa `preparing` / “Montar pedido”;
- valor em minutos, nullable e desabilitado por padrão;
- cálculo server-side a partir de `operationUpdatedAt`;
- alerta visual na cozinha e resumo de pedidos atrasados;
- configuração no painel staff de fulfillment;
- sem notificação externa e sem alterar fluxo/status do pedido.

## Concluído e persistido

- Branch criada a partir da canonical após fechamento da 11I.
- Regras locais de API Lily, frontend Lily, banco Lily e docs revisadas.
- Decisão: nenhum threshold default será inventado; `null` significa SLA desligado.
- Campo nullable `LilyOperationalSettings.kitchenPreparationSlaMinutes`.
- Migration `20260929203000_lily_kitchen_sla`.
- PATCH/GET administrativo de fulfillment expõe o SLA da montagem.
- Função pura `lilyKitchenPreparationSla` calcula prazo pelo relógio do servidor a partir de `operationUpdatedAt`.
- Fila da cozinha expõe `sla` por pedido e resumo `overdue`.
- Atraso não altera status nem avança pedido automaticamente.
- Painel staff permite configurar/desativar SLA sem valor default.
- UI da cozinha mostra tempo restante ou atraso.
- Testes unitários e de integração adicionados.

## Em andamento

Implementação funcional, revisão de diff e documentação concluídas. Em andamento: gate CI/CodeQL.

## Gates e testes

Ainda não iniciados. A entrega só poderá integrar após CI e CodeQL verdes no SHA final.

## Migrations

`packages/lily-database/prisma/migrations/20260929203000_lily_kitchen_sla/migration.sql` — migration aditiva, nullable e sem valor presumido.

## Bloqueios/riscos

- O valor real do SLA deve ser definido pela operação; o sistema não assume minutos por conta própria.
- Alerta não pode bloquear avanço do pedido nem alterar status automaticamente.
- O cálculo deve usar relógio do servidor e o timestamp da entrada em `preparing`.

## Próxima ação exata

Acompanhar CI/CodeQL do HEAD resultante deste checkpoint; corrigir qualquer falha antes de marcar o PR #104 pronto.
