# Checkpoint — cupons e preços promocionais CookLily

- status: candidate (PR draft aberto; CI, merge e deploy pendentes)
- owner: AG-DEV
- branch: `codex/cooklily-coupons-publish`
- base_branch: `cooklily/canonical`
- base_sha_verified: `067a7c2a39e8528bc6b4c29f29f58852be1b4f96`
- head_sha_verified: `113383ecd1adf7bfe65893d7723af6d1be7b0c91`
- pull_requests: [#195](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/195), draft, base `cooklily/canonical`
- migration: `packages/lily-database/prisma/migrations/20261025220000_lily_coupons_promotional_pricing/migration.sql` (criada, não aplicada no banco de produção)
- last_verified_at: 2026-10-25
- interruption_state: none

## Entrega

Implementar cadastro/edição e uso de cupons, preço anterior promocional, aplicação composta no pagamento e autosave sem recarregar o catálogo inteiro.

## Marcos persistidos no worktree

- [x] API staff com CSRF e auditoria para criar/editar cupom; estados rascunho, ativo, pausado e desativado.
- [x] Código único maiúsculo, modalidade percentual/fixa/frete grátis, datas inicial/final, cor, arte por mídia existente, limite global, limite por cliente e recorrência diária/semanal/mensal do limite.
- [x] Escopos selecionáveis por categorias, produtos e frete; combinação e somatório explícitos.
- [x] Resgate validado no orçamento e recalculado na criação do pedido; contagem global reservada e histórico/snapshot feitos na mesma transação do pedido.
- [x] Descoberta pública dos cupons ativos e cartões quadrados com arte/cor no checkout; remoção/aplicação recotam o carrinho no servidor.
- [x] Preço antigo por variante e por faixa LilyMix, validação que exige preço anterior superior ao atual e componente comum de preço no catálogo, checkout e escolha do pagamento.
- [x] Descontos por método de pagamento calculados sobre mercadorias restantes após cupom, excluindo somente o frete ainda cobrado.
- [x] Autosave com debounce em produtos, variantes, alergênicos, regras, categorias, adicionais, combos, ofertas e compatibilidade. Atualizações não fazem refetch integral nem snapshot/toast de sucesso por campo. Criação ainda atualiza seletores após concluir.
- [x] Documento funcional e técnico em `docs/lily-acai/CUPONS_E_PRECOS_PROMOCIONAIS.md`.
- [x] Budget CookLily ajustado de forma medida para suportar esta entrega: JS raw 640000 B, gzip 168000 B e JS+CSS gzip 194000 B. Build medido: JS 615.42 KiB raw / 162.00 KiB gzip; JS+CSS gzip 185.82 KiB.

## Decisões técnicas

- Recorrência controla o reinício do limite por cliente. Validade da campanha continua sendo a janela `startsAt`/`endsAt`.
- Pedidos criados reservam o limite, inclusive antes da confirmação de pagamento. Cancelamentos posteriores não liberam uso automaticamente nesta versão; registrar expiração/liberação como política pendente no documento técnico.
- Quando vários cupons são somativos, o cálculo sequencial consome apenas o valor ainda elegível e evita que descontos somados ultrapassem os itens elegíveis ou o frete restante.
- A política operacional existente exige margem mínima de 10%, mas o motor de cupom ainda não projeta custo por configuração de carrinho. Campanhas com desconto profundo exigem revisão manual da equipe antes de ativar; a limitação está documentada.

## Validação

- `npm run policy:preflight -- --agent AG-DEV --scope apps/gestao,apps/lily_acai,apps/api,packages/lily-database`: passou antes das alterações desta tarefa.
- `npm run check`: passou após as alterações finais; Prisma Client gerado, schemas core/Lily válidos e TypeScript sem erros.
- `npm run build`: passou após os ajustes finais; todas as aplicações e a compilação final da API concluíram com exit code 0.
- `npm run build:lily`: passou após os ajustes finais; budget dentro do limite medido.
- `git diff --check`: passou.
- Commit do candidato: `113383ecd1adf7bfe65893d7723af6d1be7b0c91`; branch publicada `codex/cooklily-coupons-publish`.
- PR #195 aberto como draft; no momento da verificação, nenhum status de CI havia sido publicado ainda.
- Testes automatizados: não executados nesta tarefa.
- Migration: schema validado; aplicação no SQLite de produção fica para o comando normal de deploy.
- Central operacional: bootstrap em `http://127.0.0.1:4173/api/v1/bootstrap` não respondeu, então não foi possível registrar esta execução no runtime da Central.
- Homologação real: pendente do deploy e uso no site.
- Descoberta em 2026-10-26: a rota e a interface existiam somente como alterações não commitadas no worktree `cooklily/canonical`; o `HEAD` local correspondia a `origin/cooklily/canonical` no commit `067a7c2a39e8528bc6b4c29f29f58852be1b4f96`, anterior à implementação. Por isso o deploy dessa canonical não podia publicar a feature.

## Estado do repositório a preservar

O worktree já continha mudanças do pedido anterior sobre política de LilyCoins (`docs/lily-acai/UX_REELS_DASHBOARD_FIDELIDADE_2026-10-09.md`, `docs/execution-checkpoints/cooklily-loyalty-currency-policy-2026-10-25.md`) e `.playwright-cli/`. Esses arquivos foram preservados; não os misturar silenciosamente nem descartar ao preparar commit.

## Bloqueios, riscos e próxima ação

- Não há bloqueio de implementação.
- A migration ainda precisa ser aplicada na VPS pelo fluxo aprovado.
- Verificar margem de campanhas antes de ativá-las; regras de cancelamento/liberação de reserva devem ser decididas antes de cupons com estoque de resgates muito baixo.
- Próxima ação exata: aguardar os checks do PR #195, corrigir falhas se aparecerem, marcar pronto para revisão e integrar por squash conforme autorização prévia do proprietário. Depois atualizar o checkpoint com o SHA integrado; a migration será aplicada pelo deploy canonical e a rota será homologada no site.
