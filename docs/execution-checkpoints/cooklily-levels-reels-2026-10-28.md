# CookLily — níveis configuráveis, LilyCoins e Reels

- status: in_progress
- owner: AG-DEV
- branch: codex/cooklily-levels-reels
- base_branch: cooklily/canonical
- base_sha_verified: 83c5571afa3d152ceaa47991c4f5c13a9e1eec03
- head_sha_verified: 4930d08 plus uncommitted delivery changes (docs PR #222 cherry-picked after merge to keep this feature branch current)
- pull_requests: documentation PR #222 merged — https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/222
- deployed_sha: 83c5571afa3d152ceaa47991c4f5c13a9e1eec03
- tests/gates: policy preflight PASS; `npm test` PASS on disposable migrated DB (66 files, 352 passed, 3 skipped); sequential `npm run check` PASS; sequential `npm run build` PASS; `git diff --check` PASS. Parallel check/build initially collided while regenerating the same Prisma Client; sequential reruns passed.
- migrations: `20261028200000_lily_levels_coins` added; schema check PASS; disposable database uses this migration SQL for integration tests; production deployment pending PR integration.
- blockers: no technical blocker. Real-domain deployment/homologation and Meta template approval are external follow-ups. Existing `.runtime/lily-acai.db` predates this migration; tests must use a disposable migrated copy until it is refreshed through normal deployment.
- last_verified_at: 2026-10-28 America/Sao_Paulo
- next_action: review final diff, commit and open PR against cooklily/canonical; wait for CI, integrate and deploy, then capture desktop/mobile IAB screenshots for Dashboard, Reels, and research invitation flow.

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
7. [~] Implementar Reels com capa/carrossel, vídeo, gestos, modos de sequência, salvar local, compartilhar, carrinho e bloqueio VIP desfocado. Curtidas/comentários persistentes permanecem pendentes por dependerem de requisitos de conta/moderação ainda não decididos.
8. [x] `npm run check`, `npm run build`, teste focal da progressão e `npm test` passaram; suíte completa executada na cópia descartável migrada: 66 arquivos, 352 testes aprovados e 3 ignorados. `git diff --check` passou.
9. [ ] Abrir PR, aprovar CI, integrar; deploy canonical autorizado e homologar IAB em desktop/mobile. Corrigir e repetir até aceite; registrar screenshots/evidências.

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
- 2026-10-28: suíte completa aprovada em DB descartável migrado (352 passed, 3 skipped); `check`, `build` e `diff --check` verdes em execução sequencial. Revalidado o link público: token H3s1 inválido/obsoleto; link atual da pesquisa publicada abre o gate e mostra “Iniciar pesquisa” com sessão autenticada. CI, integração, deploy e evidência visual dos módulos seguem pendentes.

## Homologação e dependências externas

- Passo a passo Meta e texto inicial do template: `docs/lily-acai/WHATSAPP_META_SETUP_E_PEDIDO_2026-10-28.md`.
- O template não foi cadastrado nem enviado à Meta; o proprietário precisa executar as etapas no WhatsApp Manager e aguardar `Approved` antes do envio de teste.
- Próxima ação exata: revisar o diff final, abrir PR da branch atual; acompanhar CI; integrar conforme autorização anterior; aplicar deploy; testar no navegador IAB a tela de login/convite da pesquisa e as rotas de Dashboard/Reels, capturando imagens desktop e mobile.
