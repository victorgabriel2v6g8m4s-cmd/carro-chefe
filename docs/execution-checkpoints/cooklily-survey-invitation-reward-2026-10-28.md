# CookLily — prévia da pesquisa e recompensa

- status: in_progress
- owner: AG-DEV
- branch: codex/fix-survey-public-link
- base_branch: cooklily/canonical
- base_sha_verified: b5c94423a556c35ee941e1a68733565540d06656
- head_sha_verified: 3d9171dd18d61f7aa423a8b9a0acb209dbf59060 (reparo do link público commitado; checkpoint desta etapa está em andamento)
- pull_requests: #220 merged — https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/220; PR do reparo do link público ainda não aberto
- deployed_sha: b5c94423a556c35ee941e1a68733565540d06656 (deploy concluído em 2026-10-28; novas rotas Nginx instaladas)
- tests/gates: PR #220 CI run 40703811809 passou em Node 20/24 e jobs auxiliares; `npm test` local PASS (65 arquivos, 351 aprovados, 3 ignorados); `npm run check`, `npm run build`/budget, `npm run policy:check` e `git diff --check` PASS. Helper Nginx e teste Fastify WhatsApp direcionados PASS; callback CookLily com token inválido retorna 403 (rota + token configurado), callback Carro Chefe retorna 503 (rota existente, credenciais ainda ausentes). CI do reparo do link público ainda pendente.
- migrations: nenhuma prevista
- blockers: credenciais Meta próprias do Carro Chefe ainda não configuradas; não bloqueiam CookLily nem o deploy. Sessão admin ativa no navegador integrado do Codex. Pesquisa de teste foi publicada e notificou contas ativas; falta responder e depois cancelar a pesquisa.
- last_verified_at: 2026-10-28 America/Sao_Paulo
- next_action: concluir correção da função de salvar/link público, rodar gates, abrir PR, integrar e publicar; então testar o link copiado, completar a pesquisa com conta de teste, verificar pontos/progresso/recompensa, cancelar a pesquisa e registrar capturas/evidências.

## Objetivo

Garantir que qualquer pessoa que abra o link público da pesquisa veja primeiro a prévia com seus benefícios. Visitante sem sessão recebe opções de entrar/criar conta; pessoa autenticada recebe `Iniciar pesquisa`. Exibir pontos em destaque verde sutil e assegurar que a tela final anime o crédito de pontos, com confetes moderados e indicador de próximo nível somente quando o backend fornecer uma meta real configurada.

## Roteiro por etapas

1. [x] Confirmar deploy de WhatsApp Cloud API na canonical: PR #219 mergeado em `b840497951b3fc207f087b84b5c87703a4fcd6e8`; gates, backups, migrações, readiness e HTTPS smoke passaram na VPS.
2. [x] Confirmar via IAB que `/painel/whatsapp` carrega e exige sessão staff; nenhuma janela externa do navegador foi aberta.
3. [x] Encontrar causa da falha de UX: `SurveyRespondPage` só buscava a prévia pública quando a sessão era nula; usuário autenticado chamava `/start` automaticamente e entrava no formulário.
4. [x] Corrigir fluxo para buscar prévia independentemente da sessão e iniciar participação somente após ação explícita do usuário autenticado.
5. [x] Destacar pontos anunciados com fundo verde claro e brilho suave, respeitando `prefers-reduced-motion`.
6. [x] Extrair a tela de recompensa, manter barra animada, incluir explosão breve de confetes e renderizar barra de proximidade ao acesso VIP por pontos quando há limite configurado; o alvo é consultado no banco ao iniciar e fica oculto sem configuração ou para membro VIP ativo/convidado.
7. [x] Executar gates completos e revisão do diff; corrigir problemas encontrados.
8. [x] Verificar callback Meta: o painel exibia URL genérica inexistente e o domínio respondia 404; corrigir a URL para CookLily e adicionar ao helper/precheck do deploy as duas rotas exatas e independentes, uma para CookLily e outra para Carro Chefe.
9. [x] Abrir PR #220, aprovar CI, integrar e executar `sudo cc deploy canonical`; readiness, smoke HTTPS e backups passaram em `b5c94423a556c35ee941e1a68733565540d06656`.
10. [x] Confirmar no IAB o callback CookLily no painel e consultar os dois callbacks no domínio real; CookLily sai do 404 e rejeita token falso com 403; Carro Chefe sai do 404 e retorna 503 por ausência de credenciais próprias.
11. [x] Criar/publicar pesquisa descartável: título “Pesquisa de homologação CookLily — 28/10/2026”, 1 pergunta curta, 50 pontos; painel confirmou “Pesquisa publicada. A notificação foi enviada às contas CookLily ativas.”
12. [x] Abrir a prévia autenticada com token público e confirmar benefício de até 50 pontos e botão “Iniciar pesquisa”.
13. [x] Corrigir bug confirmado: o salvamento local descartava `publicToken`, então “Copiar link público” copiava o ID interno e levava a “Pesquisa não encontrada”. A linha agora mantém o token retornado pelo servidor; novo helper cria o link codificado e testes cobrem criação, atualização e fallback.
14. [ ] Abrir PR do reparo, aguardar CI, integrar e republicar na VPS.
15. [ ] Testar link copiado já com token, responder com conta de teste e registrar tela de pergunta, saída/aviso e tela de recompensa; conferir saldo e barra de progresso.
16. [ ] Cancelar a pesquisa descartável no painel e atualizar checkpoint com SHA, evidências e limites.

## Requisitos prévios localizados

- `docs/execution-checkpoints/lily-survey-reward-feedback-2026-10-25.md`: pontos são creditados pelo servidor e idempotentes; barra acessível animada e sem barra quando não há pontuação.
- `docs/execution-checkpoints/cooklily-survey-admin-ux-2026-10-25.md`: prévia pública preserva login/cadastro; níveis e catálogo de recompensas não existem no schema/configuração, portanto `progressTarget` é `null` e indicadores de nível devem ficar ocultos.
- `docs/lily-acai/UX_REELS_DASHBOARD_FIDELIDADE_2026-10-09.md`: especifica progressão configurável, barras/marcos e exibição de recompensas quando existir configuração; não autoriza inventar limiares.

## Evidência e limitações atuais

- Código em andamento: `apps/lily_acai/src/features/surveys/SurveyPages.tsx`, novo `SurveyReward.tsx` e `styles.css`.
- `POST /api/v1/lily/surveys/:id/start` é protegido por sessão + CSRF, registra visualização/participação e consulta o saldo, o limite configurado de acesso VIP por pontos e o status de membro. Sem limite ou se já estiver convidado/ativo, devolve `progressTarget: null`.
- O alvo progressivo exibe a meta VIP configurada como benefício por pontos; não há uma tabela de ranks configuráveis no sistema. Não rotular esta meta como nível/rank.
- O limite de build foi revisto com base no tamanho medido do novo chunk lazy: JS bruto 674.000→676.560 bytes, CSS bruto 139.264→139.776 bytes e combinado gzip 206.600→206.856 bytes. O total comprimido observado (201,79 KiB) permanece abaixo do teto revisado (202,01 KiB); a página principal permanece inalterada e o chunk de pesquisa carrega sob demanda. A advertência genérica Vite de chunk principal acima de 500 kB já existia e não impediu o build.
- O usuário autorizou anteriormente criar e responder pesquisa de teste; submissão será limitada a dados descartáveis, sem dados pessoais.
- A checagem pública em 2026-10-28 encontrou 404 nos callbacks esperados porque o helper do deploy só autorizava rotas listadas e os dois callbacks Meta não estavam na lista do helper/precheck, apesar de constarem no exemplo Nginx. Corrigido no branch: painel mostra `/api/v1/integrations/cooklily/whatsapp/webhook`; helper passa a instalar ambos os callbacks independentes antes do deny genérico; precheck exige os dois. Os testes de deploy e de rotas Fastify passaram após a correção. Handshake válido depende ainda de Verify Token/App Secret e associação de cada WABA/número no Meta, indisponíveis no repositório.
- Não registrar segredos de agente no checkpoint, browser, terminal capturado, screenshots ou Git.
- Evidência visual da prévia com recompensa e CTA foi capturada via IAB; token de pesquisa foi mantido fora deste checkpoint. O ID do registro é `cmvs7d0jy00008zlpa9xnmv6g`; o link copiado incorretamente usando o ID retornou 404. O endpoint admin confirmou que há `publicToken` independente, e a prévia funciona ao usar esse token.

## Próxima ação exata

Reparar preservação do publicToken no estado após salvar, validar helper e componentes, executar gates completos, abrir PR e aguardar CI. Após merge, executar deploy canonical; usar “Copiar link público” na pesquisa de homologação e confirmar que abre a prévia com o token. Responder como conta de teste sem dados pessoais, conferir crédito e UI da recompensa, depois cancelar a pesquisa de teste. Somente após esta entrega iniciar a implementação configurável de níveis solicitada pelo proprietário.
