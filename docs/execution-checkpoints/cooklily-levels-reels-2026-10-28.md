# CookLily — níveis configuráveis, LilyCoins e Reels

- status: in_progress
- owner: AG-DEV
- branch: codex/cooklily-levels-reels
- base_branch: cooklily/canonical
- base_sha_verified: 83c5571afa3d152ceaa47991c4f5c13a9e1eec03
- head_sha_verified: 83c5571afa3d152ceaa47991c4f5c13a9e1eec03
- pull_requests: none
- deployed_sha: 83c5571afa3d152ceaa47991c4f5c13a9e1eec03
- tests/gates: pending; no implementation changes yet
- migrations: pending
- blockers: none; latest owner policy distinguishes progression points from spendable LilyCoins and requires configurable level thresholds, level names/rewards, mission LilyCoin earnings and rounding.
- last_verified_at: 2026-10-28 America/Sao_Paulo
- next_action: inspect existing loyalty, survey, catalog/media and cart contracts; specify a backwards-compatible migration and configuration defaults; implement levels/LilyCoins, admin controls, customer progression/reward UI and the Reels experience in modular components.

## Objetivo e precedência de requisitos

Implementar o próximo pacote após a correção publicada do link de pesquisa: sistema configurável de níveis e a nova experiência de Reels descrita em `docs/lily-acai/UX_REELS_DASHBOARD_FIDELIDADE_2026-10-09.md`.

Decisões recentes do proprietário prevalecem sobre lacunas ou números tratados como pendentes no documento histórico:

- Pontos dão progressão de nível; LilyCoins são o saldo resgatável e diminuem quando uma recompensa é reivindicada.
- O cliente pode reivindicar uma recompensa ou continuar acumulando LilyCoins.
- Painel configura nomes/ordem/limiares dos níveis, benefícios, LilyCoins concedidas por nível e por missão, e regra de arredondamento.
- As definições legadas de 21 níveis e a curva inicial 200 / multiplicador 1,66 / Elite 10.000.000 são sugestões iniciais ainda configuráveis; não devem virar condicionais fixas nem prevalecer sobre a configuração administrável.
- A barra cumulativa do cliente representa o saldo de LilyCoins e o avanço visual até os marcos de recompensa.
- A implementação deve separar pontos de progressão, LilyCoins, recompensas e status de nível; não inferir equivalência monetária pública.
- Reels segue as decisões específicas no documento funcional, conciliadas com a navegação mobile mais recente: Início, Dashboard, Reels, Carrinho e Cardápio.

## Etapas e critérios

1. [ ] Auditar schema, eventos de pontos, missões existentes, APIs de perfil/ranking, mídia do catálogo, personalização/carrinho e rotas/estilos atuais de Reels.
2. [ ] Definir configuração/admin de níveis versionada, thresholds individuais e regra de arredondamento; compatibilizar com contas e ledger existentes.
3. [ ] Implementar ledger idempotente de LilyCoins, concessões por avanço de nível/missão, saldo e reivindicação transacional de recompensa.
4. [ ] Expor APIs autenticadas/autorizadas para configuração, perfil de fidelidade e recompensas; cobrir IDOR, CSRF, concorrência e saldo insuficiente.
5. [ ] Implementar painel admin de níveis/recompensas e configuração de LilyCoins por missão, com prévia/validação e auditoria.
6. [ ] Implementar página pública de progresso, marcos, saldo cumulativo e reivindicação, com animações acessíveis e estados sem configuração.
7. [ ] Implementar Reels modular: produto atual, carrossel de mídia ordenado com capa primeiro, player, gestos, ordenação, ações sociais aprovadas, compartilhar e integração correta com produto/carrinho.
8. [ ] Executar `npm run check`, `npm test`, `npm run build`, política, testes de migração, segurança e orçamento de bundle; revisar diff.
9. [ ] Abrir PR, aprovar CI, integrar; deploy canonical autorizado e homologar IAB em desktop/mobile. Corrigir e repetir até aceite; registrar screenshots/evidências.

## Evidências, riscos e decisões técnicas

- Schema atual tem `LilyLoyaltyEvent` (pontos), `LilyMission` (pontos e pré-requisitos) e `LilyOperationalSettings` com defaults de pontos por pedido/campanha/cupom; ainda não há carteira/ledger de LilyCoins nem configuração de níveis.
- Perfil e ranking derivam pontos dos eventos e pedidos; qualquer migração deve preservar esse contrato enquanto separa LilyCoins da progressão.
- O dashboard e Reels atuais são placeholders no módulo `SurveyPages.tsx`; extraí-los em componentes/serviços menores evita ampliar o arquivo já misto.
- O documento UX de 2026-10-09 marca dúvidas antigas sobre matemática e arredondamento; as decisões novas tornam thresholds e arredondamento configuráveis. Defaults legados devem ser editáveis e documentados.
- Política para reversão de pontos por cancelamento/fraude deve continuar auditável; resgate de LilyCoins nunca deve rebaixar um nível por si só.
- Recursos sociais de Reels que exijam login/moderação não podem ser simulados como persistentes; implementar apenas com contratos server-side adequados ou manter ações indisponíveis/ocultas até suportadas.
- O ciclo de entrega usa apenas o navegador integrado do Codex para homologação real; nunca Chrome/Edge externos.

## Histórico de marcos

- 2026-10-28: pesquisa/link público corrigidos, CI PR #221 passou, deploy `83c5571afa3d152ceaa47991c4f5c13a9e1eec03`, resposta real de teste concedeu 50 pontos; entrega seguinte direcionada para níveis e Reels.
