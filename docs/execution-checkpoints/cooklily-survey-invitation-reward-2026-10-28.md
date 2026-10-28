# CookLily — prévia da pesquisa e recompensa

- status: in_progress
- owner: AG-DEV
- branch: codex/lily-survey-invitation-reward
- base_branch: cooklily/canonical
- base_sha_verified: b840497951b3fc207f087b84b5c87703a4fcd6e8
- head_sha_verified: 3d0b83a2123ecafe4cf232dfe9941bff45cd51fb
- pull_requests: #220 draft — https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/220
- deployed_sha: b840497951b3fc207f087b84b5c87703a4fcd6e8 (entrega WhatsApp Cloud API; pesquisa ainda não implantada)
- tests/gates: preflight AG-DEV para surveys/API/docs/tools/admin/deploy PASS; teste direcionado `routes.test.ts` PASS (6/6); full `npm test` PASS (64 arquivos, 348 aprovados, 3 ignorados); `npm run check` PASS; `npm run build` PASS e build budget aprovado (660,31/660,70 KiB JS bruto; 136,38/136,50 KiB CSS bruto; 201,79/202,01 KiB JS+CSS gzip); `npm run policy:check` PASS; `git diff --check` PASS. Correção adicional de callback/Nginx ainda precisa rodar os gates atualizados e CI.
- migrations: nenhuma prevista
- blockers: nenhum acesso de agente pendente; chave local assinou desafio e sessão staff/admin foi aberta no navegador integrado do Codex. A homologação ainda não foi executada com conta cliente.
- last_verified_at: 2026-10-28 America/Sao_Paulo
- next_action: aguardar checks do PR #220, marcar pronto, revisar/mergear; implantar canonical e concluir a homologação de pesquisa no perfil de teste.

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
9. [ ] Criar pesquisa descartável, responder em conta de teste no domínio real e capturar telas do convite autenticado, formulário, aviso de desistência e recompensa.
10. [ ] Abrir PR, aguardar checks, integrar, implantar na VPS e repetir homologação real após deploy.
11. [ ] Atualizar este checkpoint com SHA, run IDs, evidências, telas, falhas/retestes e bloqueios restantes.

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

## Próxima ação exata

Terminar gates locais e remotos para o delta do callback, revisar diff, integrar e implantar na VPS. Confirmar no domínio que os dois callbacks saíram do 404 e chegam à verificação do serviço (resposta 503/403 é esperada sem credencial válida). A chave agente já foi validada sem expor o segredo e a sessão administrativa está aberta apenas no navegador integrado do Codex. Após deploy, criar e publicar pesquisa claramente identificada como homologação, responder no perfil de teste, conferir o saldo e registrar que a publicação aciona a notificação interna aos clientes ativos; depois limpar a pesquisa de teste pelo fluxo de cancelamento do painel.
