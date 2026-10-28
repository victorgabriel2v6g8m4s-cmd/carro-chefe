# CookLily — prévia da pesquisa e recompensa

- status: completed
- owner: AG-DEV
- branch: codex/fix-survey-public-link
- base_branch: cooklily/canonical
- base_sha_verified: b5c94423a556c35ee941e1a68733565540d06656
- head_sha_verified: 83c5571afa3d152ceaa47991c4f5c13a9e1eec03 (merge squash da correção do link público e release da canonical)
- pull_requests: #220 merged — https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/220; #221 merged — https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/221
- deployed_sha: 83c5571afa3d152ceaa47991c4f5c13a9e1eec03 (deploy `sudo cc deploy canonical` concluído em 2026-10-28)
- tests/gates: PR #220 CI 40703811809 e PR #221 CI 40706407469 passaram; deploy executou `npm run check`, suíte integral de `npm test`, `npm run build`/budget e tool-health sem falha; backup dos dois bancos verificado; migrações sem pendências; readiness e smoke HTTPS passaram. Link recém-copiado abriu prévia pública no IAB; CTA autenticado “Iniciar pesquisa” apareceu. Resposta de teste creditou 50 pontos (saldo de 2.260); a barra de crédito foi vista animando/preenchendo. Pesquisa cancelada após teste e o painel confirmou histórico/resultados preservados.
- migrations: nenhuma prevista
- blockers: Meta Developers ainda precisa salvar e confirmar cada callback no respectivo app/WABA; Carro Chefe continua sem credenciais de webhook próprias. Isto não bloqueia a entrega de pesquisa. A conta de homologação é VIP, então a barra de proximidade de nível/VIP fica oculta; o sistema de níveis configuráveis ainda não existe. A animação de confetes é breve e não foi capturada na evidência visual desta sessão.
- last_verified_at: 2026-10-28 America/Sao_Paulo
- next_action: iniciar a próxima entrega de níveis e Reels, conforme UX e políticas existentes no repositório; após essa entrega, retomar WhatsApp quando o template estiver aprovado no Meta. A configuração Meta usa dois apps distintos, um por operação.

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
14. [x] Abrir PR #221, aguardar CI, integrar e republicar na VPS em SHA `83c5571afa3d152ceaa47991c4f5c13a9e1eec03`.
15. [x] Testar link copiado já com token e responder com a conta de teste; confirmou 50 pontos, saldo atualizado e barra de crédito. A meta de nível foi corretamente omitida para a conta VIP. A captura de confetes transitórios não foi obtida.
16. [x] Cancelar a pesquisa descartável no painel; status `cancelled`, com histórico e resultados preservados; registrar checkpoint e limites.

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

Entrega concluída: PR #221 mergeado, deploy canonical e fluxo de link/resposta/recompensa testado no domínio real. Próxima ação exata: iniciar planejamento técnico da implementação conjunta de níveis configuráveis e experiência Reels, localizando e reconciliando os documentos existentes antes de editar código.

## Sequência aprovada pelo proprietário — registrada em 2026-10-28

1. Concluir este checkpoint, incluindo merge/deploy da correção do link público e homologação prática no domínio real.
2. Próxima entrega: implementar o sistema configurável de níveis e a UI de Reels conforme a documentação funcional já existente no repositório. Antes de codificar, reconciliar os dois documentos e as decisões mais recentes sobre pontos, LilyCoins e recompensas.
3. Em etapa posterior, preparar o template Meta para acompanhamento do pedido, validar a aprovação e homologar envio/status/eventos com consentimento e números de teste autorizados.
4. O painel WhatsApp completo e a conexão com LLM não fazem parte da próxima entrega. Para homologar o fluxo de pedido, manter o necessário: estado de configuração por operação, cadastro/associação de templates aprovados, fila e tentativas de envio, eventos de webhook e status correlacionados ao pedido, com logs minimizados e ação de teste controlada.
5. Entrega posterior do painel de atendimento: caixa de entrada compartilhada com atribuição/estado de conversa, histórico e metadados operacionais minimizados, controles de consentimento e escalonamento humano; assistência LLM deve ser opcional, com limites de escopo e caminho claro para solicitar gerente. Nunca fornecer à LLM segredos nem dados além do necessário.

## WhatsApp — limite do que foi verificado

- URLs independentes no domínio: CookLily em `https://carrochefe.com/api/v1/integrations/cooklily/whatsapp/webhook`; Carro Chefe em `https://carrochefe.com/api/v1/integrations/carro-chefe/whatsapp/webhook`.
- Em 2026-10-28, GET com token de teste incorreto retornou 403 para CookLily e 503 para Carro Chefe. A primeira resposta confirma rota ativa e Verify Token presente; a segunda confirma rota distinta, mas sem Verify Token próprio configurado. Nenhuma dessas consultas completa o handshake Meta.
- Não há evidência de acesso ao Meta Developers nesta execução; permanecem pendentes o salvamento/verificação dos callbacks na app/WABA de cada operação, assinatura do campo `messages` e teste real da Meta.
- A conexão de teste deve usar número de teste e credenciais temporárias de menor privilégio, guardadas somente no gerenciador de segredos da VPS. A homologação verifica webhook e status de template sem enviar mensagens a clientes reais.
