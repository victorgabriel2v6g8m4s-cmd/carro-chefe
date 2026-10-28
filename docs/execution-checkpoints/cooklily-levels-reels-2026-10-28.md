# CookLily — níveis configuráveis, LilyCoins e Reels

- status: completed
- owner: AG-DEV
- branch: codex/cooklily-levels-reels
- base_branch: cooklily/canonical
- base_sha_verified: 83c5571afa3d152ceaa47991c4f5c13a9e1eec03
- head_sha_verified: ac4528f52d9462623e821f62a633ec11370dded7
- pull_requests: documentation PR #222 merged — https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/222; implementation PR #223 integrated at `4cb5e9f1216ac5789fe55fa117ba9d3e23a988b2`; follow-up Reels fix PR #225 merged — https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/225
- deployed_sha: ac4528f52d9462623e821f62a633ec11370dded7
- tests/gates: PR CI green; `npm test` PASS on disposable migrated DB (67 files, 354 passed, 3 skipped); `npm run check` PASS; `npm run build` PASS; production deploy validation 67 files/357 passed; external smoke PASS; `git diff --check` PASS.
- migrations: `20261028200000_lily_levels_coins` applied in production; 31 Lily migrations present.
- blockers: Meta template has not been submitted/approved; no Meta/WhatsApp MCP tool named `whatsapp_business_tools` is configured in this task, and no matching VPS executable was found. This does not block the deployed levels/Reels delivery.
- last_verified_at: 2026-10-28 America/Sao_Paulo
- next_action: owner completes Meta app/WABA callback and webhook subscription in the documented guide, submits the Utility template, and shares the approved status before WhatsApp send tests. Levels/Reels delivery is deployed and visually checked on mobile IAB; likes/comments remain unavailable by product-scope decision.

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

1. [x] Auditar schema, eventos de pontos, missões existentes, APIs de perfil/ranking, mídia do catálogo, personalização/carrinho e rotas/estilos atuais de Reels.
2. [x] Definir configuração/admin de níveis versionada, thresholds individuais e regra de arredondamento; compatibilizar com contas e ledger existentes.
3. [x] Implementar ledger idempotente de LilyCoins, concessões por avanço de nível, indicação, missão e pedido, saldo e reivindicação transacional de recompensa.
4. [x] Expor APIs autenticadas/autorizadas para configuração, perfil de fidelidade e recompensas; cobrir sessão/CSRF, idempotência, limite de resgates e saldo insuficiente.
5. [x] Implementar painel admin de níveis/recompensas e configuração de LilyCoins por missão, sem reintroduzir o fluxo de criação de missão.
6. [x] Implementar Dashboard com nível, avanço, saldo de LilyCoins, recompensa disponível, reivindicação e pedidos/missões; rounding configurável aplica-se aos pontos de pedidos.
7. [x] Implementar Reels com capa/carrossel, vídeo, gestos, modos de sequência, salvar local, compartilhar, carrinho e bloqueio VIP desfocado. Curtidas/comentários persistentes permanecem explicitamente indisponíveis por dependerem de requisitos de conta/moderação ainda não decididos.
8. [x] `npm run check`, `npm run build`, teste focal da progressão e `npm test` passaram; suíte completa executada na cópia descartável migrada: 66 arquivos, 352 testes aprovados e 3 ignorados. `git diff --check` passou.
9. [x] PR #223 integrado, follow-up #225 corrigiu paginação, release `ac4528f52d9462623e821f62a633ec11370dded7` implantado; IAB confirmou Reels com produto, mídia, sequências e avanço entre produtos, além do Dashboard sem erro de missões.

## Evidências, riscos e decisões técnicas

- Schema atual tem `LilyLoyaltyEvent` (pontos), `LilyMission` (pontos e pré-requisitos) e `LilyOperationalSettings` com defaults de pontos por pedido/campanha/cupom; ainda não há carteira/ledger de LilyCoins nem configuração de níveis.
- Perfil e ranking derivam pontos dos eventos e pedidos; qualquer migração deve preservar esse contrato enquanto separa LilyCoins da progressão.
- O dashboard e Reels atuais são placeholders no módulo `SurveyPages.tsx`; extraí-los em componentes/serviços menores evita ampliar o arquivo já misto.
- O documento UX de 2026-10-09 marca dúvidas antigas sobre matemática e arredondamento; as decisões novas tornam thresholds e arredondamento configuráveis. Defaults legados devem ser editáveis e documentados.
- Política para reversão de pontos por cancelamento/fraude deve continuar auditável; resgate de LilyCoins nunca deve rebaixar um nível por si só.
- Recursos sociais de Reels que exijam login/moderação não podem ser simulados como persistentes; implementar apenas com contratos server-side adequados ou manter ações indisponíveis/ocultas até suportadas.
- O ciclo de entrega usa apenas o navegador integrado do Codex para homologação real; nunca Chrome/Edge externos.
- O score total atual da CookLily é 686.03 KiB JS bruto, 185.03 KiB JS gzip, 140.80 KiB CSS bruto e 211.97 KiB JS+CSS gzip. O limite foi atualizado para refletir esta entrega: 700 KiB, 190 KiB, 148 KiB e 217 KiB, respectivamente; o build permanece abaixo dos limites com pequena margem e rotas principais lazy-loaded.
- O teste `npm test` contra o banco runtime original falhou em 109 testes porque o SQLite local não tem a coluna nova `LilyOperationalSettings.loyaltyRoundingMode` (P2022). O banco local não foi alterado. A suíte aprovada usou uma cópia descartável com a migration de níveis aplicada.
- O link de pesquisa informado (`H3s1-jO7...`) respondeu “Pesquisa não encontrada” também na prévia pública da API; o token não corresponde a uma pesquisa publicada atual. O link copiado pelo controle da pesquisa publicada “Nos conte o que você gosta!” abriu a tela pública de benefícios e, com sessão admin autenticada, apresentou “Iniciar pesquisa”. A configuração dessa pesquisa está com `showPoints=false` e `points=null`, portanto não exibe pontos por configuração.

## Histórico de marcos

- 2026-10-28: pesquisa/link público corrigidos, CI PR #221 passou, deploy `83c5571afa3d152ceaa47991c4f5c13a9e1eec03`, resposta real de teste concedeu 50 pontos; entrega seguinte direcionada para níveis e Reels.
- 2026-10-28: implementadas APIs/schema/admin/Dashboard de níveis e LilyCoins, ledger de nível/indicação/missão/pedido, e Reels com teaser VIP; adicionada orientação Meta para callbacks próprios CookLily/Carro Chefe e minuta de template transacional. `check` e `build` passaram; aprovação Meta, merge, deploy e homologação real ainda pendentes.
- 2026-10-28: release `ac4528f52d9462623e821f62a633ec11370dded7` implantado com PRs #223, #224 e #225. IAB mobile exibiu os Reels (Morango e Maracujá), alternou sequências e avançou produtos; Dashboard exibiu nível/saldo e missões sem mensagem de falha. Capturas visuais foram registradas no histórico desta entrega. Uma recarga completa foi necessária para substituir o bundle antigo em cache após o deploy.

## Homologação e dependências externas

- Passo a passo Meta e texto inicial do template: `docs/lily-acai/WHATSAPP_META_SETUP_E_PEDIDO_2026-10-28.md`.
- O template não foi cadastrado nem enviado à Meta; siga `docs/lily-acai/WHATSAPP_META_SETUP_E_PEDIDO_2026-10-28.md` e aguarde `Approved` antes do envio de teste.
- A prova de UI desta execução foi mobile em IAB; uma validação desktop adicional não foi feita nesta etapa. Testes automatizados e build passaram.
