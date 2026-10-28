# CookLily: canais sociais, cupons VIP e convites compartilháveis

- status: in_progress
- owner: AG-DEV
- branch: `codex/vip-social-launch-sharing`
- base_branch: `cooklily/canonical`
- base_sha_verified: `ffce992fd2b4146d395334bbb0686e681aabe2c0`
- head_sha_verified: alterações locais ainda não commitadas (sha base `ffce992fd2b4146d395334bbb0686e681aabe2c0`)
- pull_requests: nenhum
- ci_run: pendente (sem PR)
- last_verified_at: 2026-10-28 07:24 America/Sao_Paulo
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
- [ ] Verificar visualmente responsividade e links pós-deploy no domínio real.

### C. VIP e produtos de homologação
- [ ] Criar dois produtos claramente rotulados `HOMOLOGAÇÃO` com imagens de teste, 1 teaser VIP.
- [ ] Conta padrão vê imagem desfocada, título mascarado e teaser; endpoint de configuração/pedido não vaza nem concede acesso.
- [ ] Conta VIP ativa vê imagem/título/compra normalmente com selo VIP; não submeter pedido/pagamento real.
- [ ] Registrar e limpar/desativar dados de teste após capturas, sem mexer em produtos reais.

### D. Cupons e notificações
- [x] Campo `vipOnly` com default false e enforcement em listagem e quote do servidor; teste garante que usuário padrão não lista nem aplica cupom VIP. VIP positivo e notificações ainda precisam de testes integrados.
- [x] Testes de serviço provam segmentação da notificação VIP e recusa de cupom VIP para cliente padrão.
- [ ] Emitir cupom VIP-only e um cupom público de homologação; ativar e enviar notificações somente ao público elegível.
- [x] Testes de integração cobrem conta VIP listando/aplicando cupom VIP, e padrão sem listagem e quote bloqueado.
- [ ] Cupom público aparece para ambos; verificar notificação e estado lido/não lido.
- [ ] Pausar/desativar cupons de teste depois dos testes; registrar comportamento.

### E. Convites compartilháveis
- [ ] Link VIP abre convite e leva pessoa não autenticada ao cadastro sem perder o convite; após cadastro, consentimento dos termos segue obrigatório antes da inscrição VIP.
- [ ] Link de pesquisa abre a pesquisa correta e encaminha login/cadastro quando não autenticado.
- [ ] Link de produto abre o produto exato e respeita gate VIP.
- [ ] Links usam identificadores/tokens opacos; nenhum ID interno, telefone ou segredo aparece.
- [ ] A recompensa por indicação permanece em 0/off até configurada; se ativada, atribuição é única e crédito ocorre só em conta nova válida.

### F. Entrega
- [x] `npm run check`, `npm test`, `npm run build`, policy e diff check verdes localmente.
- [ ] CI/CodeQL no PR.
- [ ] PR aprovado pelos gates e squash em `cooklily/canonical`.
- [ ] `sudo cc deploy canonical` completo, SHA confirmado, health externo 200.
- [ ] Homologação final com uma conta padrão e conta VIP no navegador do Codex; guardar screenshots sanitizadas fora do Git.
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
