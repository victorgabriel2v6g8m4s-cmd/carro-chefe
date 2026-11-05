# Missões, recompensas e ofertas CookLily

- status: in_progress
- owner: Codex
- branch: codex/cooklily-missions-rewards-direct-release
- base_branch: cooklily/canonical
- base_sha_verified: e4e7bc352d31b55b8da2dc37bfa77a4799cd2a65
- head_sha_verified: dbadbc0a182d934570ef4e333a31c1799a26d730 (working tree has uncommitted implementation changes)
- pull_requests: nenhum
- last_verified_at: 2026-11-04 America/Sao_Paulo
- interruption_state: resumed; product edits are now present but uncommitted; no deploy or production mutation occurred

## Objetivo

Implementar upload de avatar, CTAs e celebração de missões, convites/códigos no dashboard, missões encadeadas e sequência diária, entitlements gratuitos, recompensas por LilyCoins e ofertas segmentadas; centralizar componentes globais auditando duplicatas reais; preparar release CookLily pelo processo homologado.

## Fatos verificados antes da interrupção

- O worktree começou limpo em `e4e7bc352d31b55b8da2dc37bfa77a4799cd2a65`; seu HEAD continua nesse SHA e não há alterações de código agora.
- O fluxo canônico confirmado é staging, release candidata e promoção por administrador para `licalily.com/cook/`.
- Antes da limpeza, `npx prisma validate`, 6 testes focados, `npx tsc --noEmit -p tsconfig.json` passaram.
- Depois da inicialização do banco local isolado, `npm run test:runtime` passou: 86 arquivos, 447 testes aprovados, 3 ignorados.
- O `npm run build` antes da interrupção falhou no orçamento: JS 687.74 KiB / 650 KiB; gzip JS 216.73 / 207 KiB; CSS 205.58 / 200 KiB; JS+CSS gzip 258.39 / 248 KiB.
- Uma build do `HEAD` limpo em worktree temporário passou: JS 649.63 KiB, gzip JS 205.55 KiB, CSS 199.88 KiB, JS+CSS gzip 246.52 KiB.
- A remoção do worktree temporário removeu os arquivos rastreados modificados deste worktree. Eles foram restaurados ao `HEAD`. A migration de missão e os componentes da tentativa não estão presentes.
- O preparador local aplicou as 44 migrations atuais, incluindo a migration temporária, ao `.runtime/lily-acai.db` ignorado. Nenhuma migration foi aplicada em produção.
- Foi encontrada uma implementação relacionada em outro repositório/worktree CookLily, com alterações locais não commitadas; esse checkout não foi alterado nem integrado.

## Revalidação e progresso em 2026-11-04

- HEAD/base continuam `dbadbc0a` / `e4e7bc35`; não há PR nem deploy desta alteração. A árvore tem mudanças não commitadas em `whatsapp.ts`, `whatsapp-template-renderer.ts`, `whatsapp-template-presets.ts`, seus testes e o editor/tipos do painel WhatsApp.
- Ajustado o renderer dos templates operacionais para fornecer resumo de itens, total BRL e ETA, além dos parâmetros de botões URL dinâmicos. A validação permite apenas BODY/FOOTER e até três botões URL/QUICK_REPLY em hosts CookLily aprovados.
- Meta/WABA verificados: cinco templates `UTILITY`, `pt_BR`, status `APPROVED`: pedido recebido, pagamento confirmado, saiu para entrega, entregador chegou e pedido entregue. O painel do site ainda não tem esses registros operacionais ativos no banco de staging.
- `npm run check` passou após corrigir o tipo do payload de componentes.
- Testes focados do ciclo operacional: 68 passaram em 6 arquivos; testes WhatsApp isolados: 10 passaram.
- `npm run test:runtime` passou: 84 arquivos, 444 testes aprovados, 3 ignorados; gates de validação do deploy passaram (14/14).
- `npm run build` passou e o orçamento CookLily permaneceu dentro dos limites: JS 649,74/650 KiB; JS gzip 205,62/207 KiB; CSS 199,88/200 KiB; JS+CSS gzip 246,60/248 KiB.
- Após a seleção de credenciais MP TEST, os testes focados `mercado-pago-provider.test.ts` e `whatsapp.test.ts` passaram: 18 testes. `npm run test:runtime` repetido passou: 84 arquivos, 447 testes aprovados, 3 ignorados. `npm run check`, `npx tsc --noEmit -p tsconfig.json` e `git diff --check` passaram.
- `npm run build` repetido passou: JS 649,74/650 KiB; JS gzip 205,62/207 KiB; CSS 199,88/200 KiB; JS+CSS gzip 246,60/248 KiB. Limite raw de JS está a 0,26 KiB do teto.
- A configuração de cancelamento foi iniciada no schema e na tela de fulfillment: `customerCancellationEnabled` (padrão falso) e janela em minutos (padrão 15, limites 1–1440). A migration `20261104190000_lily_customer_cancellation` existe; ainda não há endpoint/CTA de cancelamento nem integração de estorno para cliente.
- A migration foi aplicada somente ao banco local ignorado `.runtime/lily-acai.db` via `tools/prepare-local-lily-test-db.mjs`; não foi aplicada em staging nem produção.
- `npm run check` passou após regenerar o Prisma Client. `npm run test:runtime` passou após atualizar o banco local: 84 arquivos, 447 testes aprovados, 3 ignorados; gates de validação 14/14.
- `npm run build:lily` falhou no orçamento raw de JS: 650,30/650 KiB (+0,30 KiB). JS gzip 205,73/207 KiB, CSS raw 199,88/200 KiB, CSS gzip 40,98/42 KiB e JS+CSS gzip 246,71/248 KiB permanecem dentro. A build completa também para por esse gate.
- A conexão remota `mercadopago` foi registrada em `~/.codex/config.toml`; OAuth completou o callback e `codex mcp list` mostra o servidor habilitado com OAuth. As ferramentas ainda não foram carregadas no catálogo desta conversa; nenhuma chamada ao MCP foi executada.
- Provider Mercado Pago alterado para usar explicitamente credenciais com sufixo `_TEST` quando `MERCADO_PAGO_ENVIRONMENT=test`, incluindo Public Key e segredo de webhook. O modo inválido e credencial TEST ausente não usam chaves produtivas. A configuração de teste documentada.
- Homologação do painel de login no navegador integrado: o campo ao vivo formata o telefone nacional sem exibir `+55`. O código local atual inclui `+55`; `normalizeLilyPhone()` aceita tanto telefone nacional quanto `+55`, então a omissão visual por si só não explica credenciais inválidas. O staging está na release `52de0f5`, enquanto a produção pública está em `6149304-r2`.
- Contas verificadas sem expor telefones/hash: staging contém só um admin ativo com `agentIdentity=1`; a rota de login por senha rejeita deliberadamente toda conta com `agentIdentity`, pois deve usar a chave do agente. A base pública tem contas humanas adicionais. Isso torna a divergência de banco/identidade a causa mais provável para a tentativa no staging; falta o titular indicar se usava a conta agente ou uma conta humana específica.
- O titular informou que criou `MERCADO_PAGO_ACCESS_TOKEN_TEST` e `MERCADO_PAGO_PUBLIC_KEY_TEST` no ambiente geral e confirmou que o segredo de webhook existente na VPS é o de teste. Esses valores não foram exibidos nem gravados no repositório.
- Depois que o titular concluiu a validação adicional no painel MP Developers, o Access Token de Teste foi copiado sem exibição no chat. Credenciais TEST foram isoladas em `/etc/cooklily/staging.env`; o arquivo está com modo `0640`, proprietário `root:cooklily`, e somente o serviço de staging foi reiniciado. Uma primeira tentativa de escrita falhou antes de alterar o arquivo; a formatação foi restaurada antes de gravar as credenciais e o serviço foi verificado ativo.
- O staging declara `MERCADO_PAGO_ENVIRONMENT=test` e recebe somente as chaves `_TEST`; credenciais sem sufixo permanecem exclusivas do ambiente de produção. O código local foi adaptado para exigir seleção explícita do modo e não usar credenciais de produção como fallback no modo de teste.
- O titular confirmou o telefone próprio terminado em `4851` para diagnóstico. A conta não foi criada nem alterada.
- Cartões de teste foram confirmados na documentação oficial, mas ainda não foi criado pedido, pagamento, estorno ou mensagem real.
- A tentativa de autenticação local do agente no staging usando wrapper temporário para inserir o cookie de roteamento foi rejeitada pela revisão automática; wrapper removido e nenhuma sessão criada. Não repetir nem contornar essa rejeição.
- Gap adicional encontrado: o código ainda não tinha endpoint/CTA de cancelamento pelo cliente. Foram implementados o controle do prazo no painel, a ação guest protegida por capability token e o estorno via provider, aguardando testes de provider e homologação real.

## Revalidação em 2026-11-04 — build/cancelamento

- Branch e SHA base/HEAD permanecem `codex/cooklily-missions-rewards-direct-release`, `e4e7bc352d31b55b8da2dc37bfa77a4799cd2a65` e `dbadbc0a182d934570ef4e333a31c1799a26d730`; todas as alterações continuam não commitadas. Nenhum deploy foi feito.
- As migrations `20261104190000_lily_customer_cancellation` e `20261104202000_lily_customer_order_cancellation` foram aplicadas só ao `.runtime/lily-acai.db` local. A segunda adiciona estado do cancelamento por pedido.
- `orders.test.ts` passou 18/18, incluindo janela ativa/inativa, expiração e repetição idempotente de cancelamento guest sem pagamento. Nenhum estorno sandbox foi executado ainda.
- `npm run check` passou. `npm run test:runtime` passou após as últimas mudanças: 84 arquivos, 450 testes aprovados, 3 ignorados; gates de deploy 14/14. Testes focados: orders 18/18, WhatsApp 10/10 e provider MP 9/9.
- `npm run build` falhou no budget CookLily: JS raw 651,12/650,00 KiB (+1,12 KiB); gzip JS 205,93/207 KiB; inicial gzip 58,82/110 KiB; maior chunk 70,53/280 KiB; CSS raw 199,88/200 KiB; CSS gzip 40,98/42 KiB; JS+CSS gzip 246,91/248 KiB. O teste com Terser também aumentou o JS raw e foi revertido; dependência removida. Não elevar os budgets para contornar.
- O MCP da Meta listou exatamente cinco templates da CookLily aprovados (`UTILITY`, `pt_BR`): pedido recebido, pagamento confirmado, saiu para entrega, entregador chegou e pedido entregue. Não há templates aprovados para `cancelled` e `refunded`; nenhum template extra foi criado nem mensagem enviada.
- Ajustada a cópia do preset local de cancelamento para não sugerir atendimento humano. A lista da Meta continua sendo a autoridade de publicação; o preset local não equivale a template aprovado.
- Encontrado e corrigido no renderer o parâmetro das URLs dinâmicas: pagamentos, tracking e carrinho recebiam o `orderNumber` apesar das rotas esperarem o `order.id`. Teste de renderer/WhatsApp passou 10/10. Ainda há dois gaps: tracking guest exige um capability token em `sessionStorage` que a URL do WhatsApp não transporta, e o parâmetro `?editar=` não é consumido pelo carrinho. Portanto, os botões aprovados ainda não comprovam tracking guest nem edição do pedido de outra aba.
- A tentativa de reduzir bundle via Terser e targets `es2022`/`esnext` não resolveu raw JS (e `es2022` ainda elevou CSS raw); essas mudanças não foram mantidas. Build padrão permanece com JS raw 651,12/650 KiB.
- O fluxo de missões completo ainda não está implementado: falta criação/administração de missão por etapas, mídia, público com operadores E/OU/EXCETO, dependências, aprovações, notificações/CTAs e missões diárias/recompensas recorrentes conforme escopo; recompensas por produto/oferta/VIP e ofertas segmentadas também precisam ser fechadas e homologadas.

## Estado atual

- Mudanças de template, seleção isolada das credenciais MP TEST, configuração/endpoint/migrations de cancelamento e documentação ainda não commitadas nem implantadas como release; staging contém as variáveis de ambiente TEST configuradas.
- Nenhuma mensagem WhatsApp real foi enviada; nenhum pedido/cobrança/estorno de produção foi criado.
- A homologação automatizada com mocks passa, mas não substitui a homologação real da integração e da interface.
- O login por senha no staging não está acessível com a única conta presente (identidade agente); a conta terminada em `4851` não foi encontrada/criada no staging. O painel continua sem sessão administrativa humana de teste.
- A build completa segue bloqueada pelo limite raw de JS em 1,12 KiB; nenhum deploy foi executado.

## Gates e testes

- Corrigir pelo menos 1,12 KiB do JS raw sem elevar o budget; depois repetir `npm run check`, runtime e build.
- Adicionar teste de estorno Mercado Pago sandbox, com idempotency key, valor total confirmado e falha/pending sem avançar o pedido.

## Migrations

- Criada `20261104190000_lily_customer_cancellation`; validada por Prisma e aplicada apenas ao banco local ignorado. Nenhuma migration foi aplicada em staging ou produção.
- Criada `20261104202000_lily_customer_order_cancellation`; validada por Prisma e aplicada apenas ao banco local ignorado. Nenhuma migration foi aplicada em staging ou produção.

## Bloqueios/riscos

- Acesso administrativo humano de teste no staging continua pendente. O painel MP de teste foi validado e os segredos TEST estão isolados no ambiente do staging, porém nenhuma transação foi executada.
- `staging.env` também está sem credenciais WhatsApp; somente envio ao número próprio previamente autorizado poderia ser usado para homologação real.
- Teste de estorno pelo provider, chamadas concorrentes no cancelamento e cancelamento de pedido já pago continuam pendentes.
- Templates de cancelamento/estorno não estão aprovados na Meta; evitar enfileirar/simular envio real como sucesso até aprovação.
- Links dinâmicos de WhatsApp precisam funcionar com capability token seguro em nova aba e a ação de editar pedido precisa carregar o checkout sem expor dados ou mudar o pedido silenciosamente.
- Implementar e validar resgates de combo/oferta/VIP, limite recorrente por missão e oferta aplicada a múltiplos itens antes de declarar suporte completo.
- A interface da página de tracking oferece CTA guest de cancelamento, mas não passou ainda por build dentro do budget ou homologação visual real.
- A promoção pública depende dos gates, homologação ponta a ponta, acesso válido ao painel e fluxo de release do administrador.

## Critério obrigatório de homologação ponta a ponta

Além dos fluxos de missões/recompensas, a homologação da entrega deve percorrer a sequência de pedido com dados e meios estritamente de teste, sem cobrança ou estorno financeiro real:

1. Cliente fecha pedido e recebe no WhatsApp a confirmação de recebimento, resumo do pedido, ação para pagar e ação para editar.
2. Validar pagamento aprovado no sandbox e a mensagem de confirmação com ações de acompanhar e cancelar, respeitando a janela configurada.
3. Validar cancelamento dentro da janela e fora dela; quando houver pagamento capturado, confirmar que o estorno é solicitado/idempotente e que o pedido só informa estorno concluído após confirmação autoritativa do provedor.
4. Confirmar que pedido pago aparece na cozinha; preparar, marcar pronto, embalar/conferir e liberar para despacho.
5. Percorrer despacho sequencial dos entregadores disponíveis, aceite, chegada à coleta, confirmação de coleta, saída para entrega, chegada ao cliente e conclusão com códigos/estados esperados.
6. Confirmar as mensagens WhatsApp de cada etapa operacional, sem duplicidade e com opt-in válido; verificar templates aprovados na Meta antes de qualquer envio real.
7. Executar também recusa/timeout e falhas controladas de pagamento/estorno, registrar reconciliação e conferir que a operação não avança incorretamente.

Critério de aceite: registrar evidência de cada etapa, estados de pedido/pagamento/estorno, eventos de cozinha/entrega e mensagens recebidas; corrigir falhas e repetir o cenário afetado. Se uma configuração externa, aprovação de template ou sandbox estiver indisponível, marcar a etapa como bloqueada/inconclusiva e não declarar homologação integral nem publicar release público.

## Próxima ação exata anterior (substituída pela retomada abaixo)

Este procedimento refletia o estado anterior à autorização de +10% no orçamento JS e foi substituído pelo plano atualizado no fim do checkpoint.

## Retomada 2026-11-04 — links assinados, edição e autoría de missões

- O HEAD-base permanece `dbadbc0a182d934570ef4e333a31c1799a26d730`; ainda sem commit, PR ou deploy.
- O proprietário autorizou elevar o limite de build em 10%. Os limites JS raw/gzip, JS inicial, chunk máximo, CSS raw/gzip e combinado foram aumentados em exatamente 10% (com arredondamento para cima em bytes). Build medido após a primeira rodada de mudanças passou com 659,72/715 KiB JS raw, 208,26/227,70 KiB JS gzip, 59,29/121 KiB inicial, 70,57/308 KiB maior chunk, 199,88/220 KiB CSS raw, 40,98/46,20 KiB CSS gzip e 249,24/272,80 KiB JS+CSS gzip.
- Criada migration Lily `20261104220000_lily_mission_authoring` com instruções, público, recompensas adicionais, CTA, tipo/prazo de aprovação, cadência, limites e visibilidade do próximo período. Prisma validou o schema; a migration foi aplicada ao banco temporário novo `.runtime/lily-validation-clean.db` após 46 migrations.
- O banco default `.runtime/lily-acai.db` está divergente e registra uma migration não presente nesta branch, com colunas de uma tentativa de outra worktree. A migration local falhou ali por coluna duplicada. Nenhum dado foi alterado manualmente e nenhum banco remoto foi tocado; gates foram executados com `LILY_DATABASE_URL=file:./.runtime/lily-validation-clean.db`.
- Implementado CRUD admin básico de missão com etapas JSON e anexos ativos da biblioteca, segmento simples (todos/padrão/VIP/manual), níveis, recompensas JSON, CTA, aprovação automática/manual, periodicidade, limites e notificação in-app na publicação. A listagem e o claim passaram a validar audiência por status da conta, VIP e nível.
- Missões automáticas passaram a usar chave por período e a respeitar limites diário/semanal/mensal; o dashboard mostra CTA configurado. Missão `manual` está fechada para auto-claim enquanto não houver submissão de evidências e fila de revisão.
- Links de botões WhatsApp agora levam token HMAC com expiração de 90 dias, derivado por HKDF da chave CookLily já existente. O app armazena a capability em sessionStorage e remove o token da URL após abertura. Pagamento/tracking em navegador novo aceitam token específico de pedido autenticado ou guest; APIs de histórico de conta continuam exigindo sessão/ownership.
- Adicionado carregamento do pedido pendente através de `?editar=<token>` e fluxo de substituição atômica: cria o novo pedido e cancela o anterior apenas dentro da janela ativa, sem cobrança iniciada, mantendo identidade/telefone, liberando reserva de cupons e suprimindo notificações antigas pendentes. O cancelamento/estorno continuam disponíveis somente no site, conforme decidido; nenhum template foi criado para essas ações.
- Ajustado o endpoint de cancelamento para capability assinada em pedidos de conta e de convidado, respeitando CSRF quando a sessão do próprio titular está presente.
- Testes focados iniciais passaram 38/38 para orders/WhatsApp/MP; após corrigir duas incompatibilidades de schema, `orders.test.ts` + `loyalty.test.ts` passaram 28/28. O runtime completo passou depois: 84 arquivos, 453 aprovados, 3 ignorados; validação de deploy 14/14. Ainda devem ser repetidos após os ajustes de cadência/audiência mais recentes.
- `npm run check` passou antes dos ajustes recentes de cadência/audiência. O build passou antes das últimas mudanças somente no backend e dashboard; precisa ser repetido.
- Consulta atual ao Meta WhatsApp Manager confirma os mesmos cinco templates `UTILITY`, `pt_BR`, `APPROVED`: pedido recebido, pagamento confirmado, saiu para entrega, entregador chegou e pedido entregue. Nenhuma mensagem real foi enviada nesta retomada.
- Lacunas relevantes: missões manuais ainda não aceitam comprovantes nem possuem fila para staff aprovar/rejeitar; etapas obrigatórias não são aplicadas no claim; operadores E/OU/EXCETO arbitrários ainda não existem; recompensas adicionais (produto/cupom/oferta/VIP) são armazenadas mas ainda não geram entitlements no dashboard/conta; missões futuras e sequência diária não estão integradas; gestão de ofertas com targeting, disparo, selo customizável e preço pessoal não foi implementada nem homologada.
- Sem deploy ou sessão humana administrativa no staging. O navegador integrado mostra WhatsApp Web e painéis externos autenticados; a rota pública `licalily.com/cook` segue na versão anterior. Não ocorreu homologação em ambos os viewports, transação de sandbox, cozinha/courier ou envio WhatsApp real.

## Estado nesta retomada

- Estado: `in_progress`.
- Gate retomado em 04/11/2026: `npm run check` passou depois de corrigir nullability no conjunto de reivindicações de missão. `npm run test:deploy-validation` passou 14/14; suíte focada de pedidos, fidelidade, WhatsApp, Mercado Pago e pesquisas passou 53/53; `npm run test:runtime` passou 84 arquivos, 453 aprovados e 3 ignorados. `npm run build` concluiu site/API e CookLily dentro do orçamento: JS bruto 660,04/715 KiB, JS gzip 208,32/227,70 KiB, inicial 59,28/121 KiB, maior chunk 70,57/308 KiB, CSS bruto 199,88/220 KiB, CSS gzip 40,98/46,20 KiB e JS+CSS gzip 249,30/272,80 KiB. `git diff --check` não apontou whitespace inválido.
- Regressão encontrada e corrigida na substituição de pedido: a transação de escrita consultava configurações em outra conexão SQLite dentro do callback transacional, levando a timeout/deadlock; a configuração passou a ser lida antes da transação. O teste de edição por link assinado passou e a suíte focada subsequente passou 53/53.
- Estado do Git verificado: branch `codex/cooklily-missions-rewards-direct-release`, HEAD-base `dbadbc0a182d934570ef4e333a31c1799a26d730`, canonical remoto `e4e7bc352d31b55b8da2dc37bfa77a4799cd2a65`, sem commits de implementação, PR ou deploy até este checkpoint. A VPS respondeu no SSH autorizado com serviço ativo e Nginx `ok`, mas `sudo cc status` executado fora do checkout registrou que não encontrou repositório; repetir via `/srv/carro-chefe/current` antes de publicar.
- Continuam pendentes as lacunas de missão/recompensas/ofertas listadas acima e a homologação real. A consulta prévia ao Meta confirmou 5 templates aprovados; ainda não houve envio. Nenhuma transação real de cartão/Pix ou estorno foi feita.
- Próxima ação exata: avançar o CRUD de missões para submissão privada de comprovação e fila de análise, integrar concessão de recompensas no saldo/conta e revisar o targeting de ofertas; repetir os gates ao mudar código. Para homologar tracking/WhatsApp, criar release revisada no fluxo GitHub e deployar primeiro no domínio de teste `carrochefe.com/lilyacai`; depois validar browser desktop/mobile, MP TEST e o telefone próprio autorizado antes de qualquer release público.
- Proibição de declarar homologação completa ou publicar release público enquanto as lacunas acima ou gates relevantes estiverem abertas.

## Retomada 2026-11-05 — comprovantes de missão e configuração visual de ofertas

- Estado Git verificado: branch `codex/cooklily-missions-rewards-direct-release`; commit implementado anteriormente `f5c8ae178cbb6f2dc96f9f044b96804607e5fed6`; PR #327 aberto em rascunho para `cooklily/canonical`. Os trabalhos abaixo estão no working tree, ainda não commitados.
- Adicionado upload de comprovante de missão manual (JPEG/PNG/WebP, assinatura do arquivo verificada, 5 MiB, armazenamento privado fora de `/media`) e fila de revisão staff protegida por sessão/MFA/CSRF. Aprovação/rejeição é idempotente, notifica o usuário e credita pontos/LilyCoins e moedas do nível em uma transação; a resposta da fila minimiza PII e não inclui telefone.
- O servidor verifica público, nível, pré-requisitos e limites em submissão manual. A publicação de missão continua notificando alvos in-app; claims automáticos já validam pré-requisitos e limites diários/semanais/mensais. O botão para mostrar o próximo período segue armazenado, mas a UI não afirma futuro indisponível como disponível.
- Adicionado `badgeLabel`/`badgeColor` para ofertas, migration `20261105001000_lily_offer_badge`, controles no editor admin e selo customizado no catálogo. Ofertas ainda são configuradas por produto/variante; campanha segmentada em lote, regra `E/OU/EXCETO` e automação de ofertas para público ainda não estão implementadas.
- Corrigido o teto global multipart para preservar uploads existentes de mídia até 50 MiB; o endpoint novo de provas mantém seu limite local de 5 MiB.
- Migrations de submissões (`20261105000000_lily_mission_submissions`) e selo (`20261105001000_lily_offer_badge`) aplicadas somente ao `.runtime/lily-validation-clean.db`; status Prisma mostrou todas as 48 migrations aplicadas. Nenhum banco da VPS foi alterado.
- Gates locais concluídos após aplicar a migration isolada: `npm run check` passou; `npm run test:deploy-validation` passou 14/14; testes focados passaram 70/70; `npm run test:runtime` passou 84 arquivos, 454 aprovados e 3 ignorados; `npm run build` passou com JS raw 664,64/715 KiB, JS gzip 209,60/227,70 KiB, JS inicial gzip 59,36/121 KiB, maior chunk 70,57/308 KiB, CSS raw 199,88/220 KiB, CSS gzip 40,98/46,20 KiB e JS+CSS gzip 250,58/272,80 KiB. `git diff --check` passou.
- A primeira CI do PR #327 falhou por `tools/lily-build-budget.test.mjs`, que ainda exigia teto gzip inferior ao antigo e testava métricas fora dos limites anteriores. O contrato de budget foi atualizado para afirmar que cada limite respeita o teto antigo +10%, e os quatro testes locais passaram. A nova CI após o commit ainda está pendente.
- Durante a primeira tentativa focada, o script `test:runtime -- --run <paths>` acrescentou os caminhos ao glob de toda a API; foi interrompido depois de observar falhas por schema incompleto. A migration que faltava foi aplicada ao banco descartável e os seis arquivos focados foram rodados diretamente com Vitest, terminando verdes (70 testes). O runtime integral subsequente passou.
- Sem deploy, merge, interação em navegador, mensagem WhatsApp real, pedido/cobrança ou estorno nesta retomada. Os testes de pedidos/estorno seguem usando doubles/test provider.
- Pendências de escopo para a próxima iteração: recompensa de missão tipo produto/cupom/oferta/VIP ainda não vira entitlement e ação `Peça Agora`; sequência diária com configuração/popup; regras de segmentação com `E/OU/EXCETO`; visualizador do próximo período e limite de missões exibidas; campanhas de ofertas para público selecionado em lote; homologação em browser desktop/mobile, pagamento/estorno real somente TEST e mensagem WhatsApp ao destinatário com opt-in. Não declarar o sistema completo até fechar ou delimitar essas pendências e registrar evidência.
- Próxima ação exata: finalizar checklist/CI da continuação do PR #327, integrar `cooklily/canonical` quando os checks estiverem verdes, deploy apenas na rota de teste `carrochefe.com/lilyacai`, homologar links de tracking e edição de pedido no navegador integrado desktop/mobile, depois testar WhatsApp real apenas com o destinatário autorizado. Em paralelo, continuar implementando os itens de missão/recompensa/oferta listados como pendentes; não publicar `/cook` antes do aceite de homologação.

## Integração e primeiro deploy de teste — 2026-11-05

- PR #327 foi aprovado pelos checks CI (Node 20/22/24 e os demais jobs) e integrado via squash em `cooklily/canonical`, merge SHA `4228ceae71da635cc355588e4acb3bdc84df5531`.
- A primeira execução `sudo cc deploy canonical --full` abortou na fase `environment`, antes de qualquer migration ou escrita no banco, pois o deploy script exigia `LILY_DATABASE_URL` em `/srv/carro-chefe/data/*`. O próprio ambiente protegido da VPS aponta o banco CookLily para `/srv/cooklily/data/cooklily.db` e uploads para `/srv/cooklily/data/uploads`, separando-os do banco Carro Chefe. O checkout foi restaurado automaticamente ao SHA anterior `3239865631a1e40a0a32bc69b59e93e69cfa4f8b`; serviço permanece ativo e Nginx `ok`. O canonical atual é `4228ceae`.
- Nenhuma migration de produção foi iniciada no deploy abortado; bases e uploads permaneceram intactos. A correção para validar o volume de dados CookLily apropriado está em desenvolvimento local e ainda precisa de PR/CI/merge antes do retry.
- Implementada lógica compartilhada de público segmentado com regras em sequência (`and`, `or`, `except`) sobre classe, nível e usuário. A mesma avaliação é usada na publicação/notificação, listagem, claim e submissão manual; a UI admin armazena regras serializadas e os testes verificam combinações E/OU/EXCETO.
- Após essa alteração local: `npm run check` passou; testes direcionados de fidelidade/catálogo/pesquisas 32/32; `npm run test:deploy-validation` 14/14; `npm run test:runtime` 84 arquivos, 455 aprovados e 3 ignorados; `npm run build` passou com JS raw 664,97/715 KiB, JS gzip 209,71/227,70 KiB, inicial gzip 59,36/121 KiB, chunk 70,57/308 KiB, CSS raw 199,88/220 KiB, gzip CSS 40,98/46,20 KiB e combinado 250,68/272,80 KiB.
- Head canônico `4228ceae`; branch local contém mudanças ainda não commitadas para ajustar o volume de deploy e habilitar regras de público. PR seguinte ainda não aberto. Sem homologação de browser/WhatsApp nem teste de pagamento até a nova publicação no domínio de teste.
- Próxima ação exata: criar PR para a correção do volume e segmentação, aguardar CI, integrar e repetir `sudo cc deploy canonical --full`; se o deploy concluir, conferir SHA e migrações, então testar `carrochefe.com/lilyacai` no navegador integrado desktop/mobile e realizar envio de WhatsApp real ao destinatário de teste com opt-in previamente confirmado. Continuar o fechamento de recompensas/entitlements e ofertas após o deploy.
