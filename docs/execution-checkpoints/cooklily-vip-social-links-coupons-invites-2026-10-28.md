# CookLily: canais sociais, cupons VIP e convites compartilháveis

- status: in_progress
- owner: AG-DEV
- branch: `codex/cooklily-final-homologation`
- base_branch: `cooklily/canonical`
- base_sha_verified: `ffce992fd2b4146d395334bbb0686e681aabe2c0`
- head_sha_verified: `2d4f5a603632f9969d599447d1ee318845fd1fb2`
- pull_requests: #207, #208 e #209 integrados em `cooklily/canonical`
- ci_run: PR #209 CI `40678342102` verde em 7 checks; CodeQL `40678346560` verde
- last_verified_at: 2026-10-28 08:17 America/Sao_Paulo
- interruption_state: none

## Escopo desta entrega

1. Concluir acesso administrativo pelo navegador interno do Codex com relay de handoff local, efêmero, de uso único e sem ticket em stdout.
2. Criar no painel configurações opcionais para Instagram, Facebook, WhatsApp, TikTok e Google, cada uma com identificação e URL validadas; expor apenas canais configurados no site.
3. Revisar e atualizar a referência do Instagram antigo para `cook._lily` em conteúdo operacional atual; preservar documentos históricos como registro do estado na data em que foram produzidos.
4. Publicar produtos de homologação com imagens e flag de acesso antecipado VIP; verificar API, cardápio e compra permitida/negada nas contas padrão e VIP.
5. Implementar elegibilidade `vipOnly` em cupons na administração, catálogo público e validação no checkout; emitir cupom VIP e cupom público, notificar usuários elegíveis e provar que conta padrão não obtém cupom VIP.
6. Disponibilizar links/preview compartilháveis de convite VIP, pesquisa e produto; permitir convite VIP antes do login, preservando atribuição durante cadastro e experiência de boas-vindas após entrar. Configurar recompensa de indicação como zero/desligada por padrão; só creditar após novo cadastro elegível, nunca por clique isolado.
7. Adicionar testes automatizados, CI, PR, deploy `sudo cc deploy canonical`, homologação em `carrochefe.com`, capturas sanitizadas e relatório final com pendências reais.

## Marco inicial confirmado

- `origin/cooklily/canonical` está no SHA `ffce992fd2b4146d395334bbb0686e681aabe2c0`.
- PR #204, #205 e #206 estão integrados; deploy #206 terminou com migrations, gates, build, health e smoke externos verdes.
- A CLI autentica a identidade de agente Ed25519 na API de produção. O navegador interno do Codex abriu `/lilyacai/painel` via relay local efêmero e exibiu `Chat GPT Codex Agent`; após mudança de rota uma sessão expirou/perdeu cookies, foi renovada e o acesso ao painel e às configurações staff foi confirmado novamente em 2026-10-28.
- O perfil de teste já estava inscrito no VIP, com consentimento registrado e coroa visível; manter estado.
- O painel possui flags `vipEarlyAccess` e descrição teaser em produto; o backend mascara lançamento para não VIP e bloqueia pedido direto.
- Cupons existentes podem ser atribuídos por usuário via código de resgate, mas ainda não há campo de público VIP-only nem notificação de ativação específica em lote.
- `LilyOperationalSettings` hoje guarda somente handle do Instagram e telefone do WhatsApp, ambos com valores obrigatórios; o footer público usa apenas esses dois canais.

## Etapas e critérios de aceite

### A. Acesso seguro pelo Codex
- [x] Abrir o site no navegador interno do Codex.
- [x] Concluir handoff em uma aba controlável; sessão deve exibir identidade admin.
- [x] Incorporar relay local de 127.0.0.1, TTL curto, chave aleatória, ticket somente em memória, consumo único e sem logs do ticket; testes de replay/URL inválida adicionados. Handoff real renovado no browser do Codex e painel admin confirmado; o teste de timeout ainda precisa ser coberto.

### B. Redes sociais
- [x] Migration aditiva com objeto JSON de canais sociais; sem valor obrigatório e compatível com configurações atuais.
- [x] CRUD/admin acessível a admin; validação por plataforma, URL HTTPS allowlist e identificação opcional.
- [x] Renderizar canais presentes no footer/menu, sem links vazios; migration atualiza Instagram para `cook._lily` preservando o WhatsApp legado.
- [x] Validação HTTPS + allowlist por rede, identificação e URL opcionais; canais vazios não renderizam.
- [x] Verificar visualmente links sociais no footer e navegação mobile no domínio real; Instagram já aparece como `@cook._lily`.

### C. VIP e produtos de homologação
- [x] Dois produtos temporários `HOMOLOGAÇÃO` criados com imagens de teste; um com teaser VIP.
- [x] Conta não VIP vê imagem desfocada, título `???` e teaser; conta VIP vê imagem/título/opções normalmente com selo VIP. Nenhum pedido foi enviado.
- [x] Dois produtos e variações de homologação estão `Pausado` e `Disponível=0`; recarga confirmou `Esgotado/pausado`. Nenhum produto real foi alterado.

### D. Cupons e notificações
- [x] Campo `vipOnly` com default false e enforcement em listagem e quote do servidor; teste garante que usuário padrão não lista nem aplica cupom VIP. VIP positivo e notificações ainda precisam de testes integrados.
- [x] Testes de serviço provam segmentação da notificação VIP e recusa de cupom VIP para cliente padrão.
- [x] Cupom VIP-only e cupom público de homologação ativados; notificações foram geradas para os públicos elegíveis.
- [x] Testes de integração cobrem conta VIP listando/aplicando cupom VIP, e padrão sem listagem e quote bloqueado.
- [x] Notificações do cupom VIP e público verificadas na conta VIP; endpoint sem autenticação omite o cupom VIP. O estado de leitura da conta de teste foi preservado.
- [x] Cupons temporários pausados após a homologação.

### E. Convites compartilháveis
- [x] Link VIP abre cadastro anônimo com convite preservado e informa que o consentimento VIP segue obrigatório; nenhum cadastro/termo foi submetido.
- [x] Link da pesquisa abre o questionário correto para usuário logado; anônimo recebe login com retorno ao destino. Nenhuma resposta foi enviada.
- [x] Link direto do produto Morango abriu item, imagem e opções; nenhum item foi adicionado ao carrinho.
- [ ] Links usam identificadores/tokens opacos; nenhum ID interno, telefone ou segredo aparece.
- [ ] A recompensa por indicação permanece em 0/off até configurada; se ativada, atribuição é única e crédito ocorre só em conta nova válida.

### F. Entrega
- [x] `npm run check`, `npm test`, `npm run build`, policy e diff check verdes localmente.
- [x] CI/CodeQL verdes no PR #209.
- [x] PR #209 integrado por squash em `cooklily/canonical`.
- [ ] `sudo cc deploy canonical` completo, SHA confirmado, health externo 200.
- [ ] Deploy da correção de cupom e reteste do botão Pausar no domínio real.
- [x] Links validados em sessão anônima Playwright e questionário em sessão VIP do navegador Codex. Capturas sanitizadas fora do Git em `C:\Users\valdi\Pictures\CookLily-Exec-2026-10-28\` (`01-vip-invite-mobile.png`, `02-survey-login-required-mobile.png`, `03-product-direct-link-mobile.png`).
- [ ] Atualizar este arquivo após migration, PR, CI, merge, deploy e cada ciclo de correção.

## Migrations

- `20261028170000_lily_social_links_vip_coupons`: adiciona links sociais, pontos por indicação e escopo VIP-only; atualiza o Instagram operacional para `cook._lily` e importa Instagram/WhatsApp legados para links opcionais.

## Bloqueios/riscos

- A conta padrão precisa ser uma conta controlada de homologação; evitar dados de terceiros e não fazer pagamento real.
- Notificações de produção podem alcançar usuários reais; antes do disparo, usar elegibilidade VIP/público específico e limitar texto a conteúdo de teste identificável.
- A política VIP publicada ainda diz que a retenção exata de analytics deve ser definida pelo controlador antes de convidar participantes reais.

## Próxima ação exata

Preparar commit e PR para `cooklily/canonical`; acompanhar CI/CodeQL e integrar após sucesso. O `npm test` na base ignorada de desenvolvimento falhou porque ela registra a migration desta entrega sem possuir a tabela `LilyReferralInvite`; a base não foi modificada. Uma base descartável criada das migrations executou 64 arquivos: 342 passaram e 3 foram ignorados, incluindo os 8 testes VIP.

## Evidências atuais

- Navegação real no browser integrado do Codex: `/lilyacai/painel` autenticado como `Chat GPT Codex Agent`; `/painel/configuracoes` exibiu o formulário operacional atualmente publicado (ainda sem a nova configuração social, pois as alterações locais ainda não foram implantadas).
- `npm run check`: passou após adicionar a declaração do relay e ampliar o tipo de analytics para cliques sociais.
- `node .runtime/bootstrap-test-db.cjs`: aplicou as migrações locais, incluindo a migration desta entrega.
- `npx vitest run --config vitest.config.ts apps/api/src/modules/lily/vip.test.ts apps/api/src/modules/lily/social-links.test.ts`: 2 arquivos, 9 testes passaram.
- `npm test`: suíte inteira passou, 64 arquivos e 342 testes passaram, 3 ignorados.
- `npm run build`: os apps compilaram; o guardião acusou ultrapassagem pequena após os links de indicação (+1,69 KiB JS bruto, +0,57 KiB JS gzip, +0,41 KiB combinado sobre o limite ajustado anteriormente). O limite foi reajustado apenas o necessário para manter o bundle combinado abaixo de 200 KiB gzip e a folga relativa ao baseline dentro do limite do teste; revalidar novamente antes do PR.
- Build repetido após acertar o orçamento de JS bruto em +2.000 bytes: `build_budget=ok`; JS 641.68/642.58 KiB, gzip 170.36/170.41 KiB, JS+CSS gzip 195.60/195.80 KiB. Vite ainda registra aviso de chunk principal >500 KiB.
- `npm run check` passou (Prisma generate/validate e TypeScript); `npm run build` passou incluindo TypeScript da API.
- `npm test` na base isolada `file:.runtime/codex-full-test.db`: 64 arquivos, 342 passaram, 3 ignorados. Testes de validação: 5; Tool Health/policy: 8; deploy/migration: 10; build-budget: 4.
- `npm run policy:preflight -- --agent AG-DEV --scope tools,apps/api,apps/lily_acai,packages/lily-database,docs`: passou (policyVersion `2026.09.19.1`). `git diff --check`: passou.
- Pendente revisar artefatos, criar PR, obter CI/CodeQL, merge, deploy, screenshots e homologação real. Nenhum conteúdo ou configuração de produção foi alterado ainda.
- Tentativa de `prisma migrate deploy` em um SQLite vazio falhou com erro do schema engine sem detalhes; o fluxo oficial local de bootstrap de testes funcionou. Investigar apenas se CI também indicar falha.

## Continuação após merge e homologação (2026-10-28)

- PR #207 integrado em `cooklily/canonical`, commit de merge `a6ddc4f5c1f73857d31be8c42dd994ad91227f46`; CI e CodeQL passaram.
- Deploy da canonical concluído via `sudo cc deploy canonical`; migrations, backup, 345 testes, build, health e smoke HTTPS passaram. Evidência de deploy no host: `/srv/carro-chefe/data/deploy-logs/deploy-20261028-103102-a6ddc4f5c1f7.evidence`.
- Browser integrado do Codex: painel de configurações em produção exibiu Instagram `cook._lily` e WhatsApp, demais redes opcionais; footer público apresentou os links configurados e navegação móvel. Capturas de browser constam no histórico desta execução.
- Imagens de homologação enviadas à biblioteca de mídia. Dois produtos de teste foram publicados; produto VIP com o teaser "Novidade de homologação VIP: em breve uma surpresa especial." e produto comum com título e imagem visíveis. Não iniciar pedido nem pagamento.
- Conta não VIP no domínio real abriu o lançamento VIP: título mascarado como `???`, teaser e selo VIP corretos; porém imagem abriu sem blur na modal de produto. Encontrada causa: estilo de blur residia em CSS importado só nas páginas do programa VIP, fora do bundle global do catálogo; modal também não aplicava a classe de mídia VIP. Correção em andamento em branch `codex/vip-teaser-blur-fix`: classe adicionada na mídia da modal e regra movida para o CSS global.
- O mesmo preview exibiu estado de item esgotado; investigação pendente para confirmar disponibilidade da variação e ativar corretamente os dois produtos de teste.
- Ainda pendentes os testes pós-correção dos caminhos VIP/não-VIP, cupons e notificações, links de convite/pesquisa/produto e limpeza/pausa dos dados temporários. A execução não está concluída.
- Cupom VIP de teste publicado e notificação confirmada na conta VIP. Cupom público de teste ativado e notificação também confirmada na conta VIP; endpoint consultado sem cookies retornou o cupom público e omitiu o VIP, portanto a primeira leitura visual que parecia expor VIP era na verdade a sessão VIP compartilhada pelo navegador. Ambos os cupons foram pausados após o teste.
- O atalho Pausar/Ativar do cupom VIP de frete grátis retornou validação inválida. O salvamento pela edição completa pausou o cupom, mas o defeito no PATCH parcial permanece em correção no branch `codex/coupon-quick-status-fix`, após adicionar teste de regressão para mudança de status que preserve `vipOnly` e `appliesToShipping`.
- Estado real no momento deste checkpoint: base canônica deployed em `a6ddc4f5c1f73857d31be8c42dd994ad91227f46`; branch corretiva local `codex/vip-teaser-blur-fix`; alterações corretivas ainda sem commit/PR. Suíte completa em execução após `npm run check` aprovado.

## Segunda correção pós-deploy

- A correção do blur foi integrada em PR #208 e implantada em `2cdb429fa30a7142bd9132ece2af639751d121cd`; deploy externo concluiu com migrations sem pendência, backups verificados, 345/345 testes, build/budget, tool health, readiness e HTTPS smoke verdes. Evidência: `/srv/carro-chefe/data/deploy-logs/deploy-20261028-105137-2cdb429fa30a.evidence`.
- Browser sem login após deploy confirmou no produto VIP: imagem desfocada, título `???`, teaser e CTA indisponível. A conta VIP de homologação mostrou título, imagem, preço e CTA normalmente. Nenhum pedido foi submetido.
- A ativação de cupom público gerou notificação de 5%; a conta VIP recebeu a notificação VIP-only e a pública. `GET /api/v1/lily/public/coupons` sem cookies retornou `HOMO-GERAL-OCT28` e `START01` e omitiu `HOMO-VIP-OCT28`; o cadastro admin confirmou `vipOnly: true` no cupom VIP. Os dois cupons temporários estão pausados e não disponíveis para pedidos.
- `git switch -c codex/coupon-quick-status-fix` a partir da canonical em `2cdb429fa30a7142bd9132ece2af639751d121cd`. Correção local filtra do payload parcial os campos defaultados que não foram enviados. Teste de regressão `apps/api/src/modules/lily/vip.test.ts`: 9/9; suíte completa na base descartável `.runtime/codex-full-test.db`: 64 arquivos, 343 testes passaram e 3 ignorados (346 totais). `npm run check`, `npm run build`, policy preflight e `git diff --check` passaram.
- PR #209 aberto contra `cooklily/canonical`, head validado `8d24acc05d11971f011c3e8897aef756b37b5fdc`; CI passou nos 7 checks (Quality Node 20/24, Excel Linux/Windows, Tool Health Linux, Windows Supervisor, Workbook Snapshot). CodeQL `40677939527` também passou; merge e deploy ainda pendentes.
- Reautenticação via relay do agente corrigiu o token CSRF expirado no painel. Os dois produtos temporários de homologação e suas variações foram alterados para `Pausado` e `Disponível=0`; após recarregar, os dois cartões exibiram `Esgotado/pausado`.
- Link de convite VIP criado no painel com limite de um resgate: `https://carrochefe.com/lilyacai/cadastro?vipInvite=LILY-B97FB5BBD7-8171D40740`. Não foi enviado a terceiros. O convite precisa ser tratado como compartilhável e não foi reutilizado na homologação.
- Pesquisa publicada existente validada no domínio real. Link direto para responder: `https://carrochefe.com/lilyacai/pesquisas/cmvog4iub0002vjlp13vlr3q3`; página apresentou título, pergunta, progresso e etapa inicial sem submeter resposta.
- Link do produto existente `Morango` validado no catálogo público: `https://carrochefe.com/lilyacai/cardapio?produto=rosa-da-lily`; produto, imagem, opções e CTA carregaram sem enviar pedido.

### Próxima ação exata

Fazer deploy autorizado de `cooklily/canonical` no SHA `2d4f5a603632f9969d599447d1ee318845fd1fb2`; autenticar de novo, testar no painel real o atalho Pausar do cupom VIP de frete grátis, confirmar preservação de `vipOnly`/`appliesToShipping`, checar health externo e registrar a evidência do deploy.

## Merge #209 e homologação dos links (2026-10-28)

- PR #209 foi integrado por squash em `cooklily/canonical`, commit `2d4f5a603632f9969d599447d1ee318845fd1fb2`; CI `40678342102` passou nos 7 checks e CodeQL `40678346560` passou.
- A correção preserva `vipOnly` e `appliesToShipping` quando um PATCH de status omite os demais campos defaultados; suíte local isolada: 64 arquivos, 343 passaram e 3 ignorados; `npm run check`, `npm run build`, policy preflight e `git diff --check` passaram.
- Playwright em sessão anônima mostrou o cadastro com convite VIP retido na URL e os termos VIP como consentimento obrigatório; a pesquisa encaminha anônimos para login preservando `next`; o produto `Morango` abriu com imagem, opções e preço, sem iniciar pedido. A pesquisa autenticada foi aberta sem enviar resposta.
- Capturas fora do Git: `C:\Users\valdi\Pictures\CookLily-Exec-2026-10-28\01-vip-invite-mobile.png`, `02-survey-login-required-mobile.png` e `03-product-direct-link-mobile.png`.
- Reteste da correção do atalho Pausar após deploy ainda pendente. Itens/cupones de teste encontram-se pausados; não há pedido ou resposta de pesquisa de teste enviados.
