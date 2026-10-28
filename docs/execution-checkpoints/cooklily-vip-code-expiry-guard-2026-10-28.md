# Validade e resgate do convite VIP CookLily

- status: execução ampliada; correção VIP local validada; autenticação de agente implementada localmente e em verificação; PR #204 ainda contém somente o HEAD previamente validado até o próximo commit/push; homologação de produção parcial
- owner: AG-DEV
- branch: `codex/vip-expiry-guard`
- base_branch: `cooklily/canonical`
- base_sha_verified: `5a5cccd4a8e307ed5fcb2ab2396a41b8130e9388`
- head_sha_verified: `0e28aebfdd0213c0528d60fa8e3204659a1e6e5d` (último commit/PR confirmado; alterações subsequentes estão no working tree e ainda não têm SHA)
- pull_requests: [PR #204](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/204) (rascunho)
- ci_run: #810 / run ID `40629075558`, Node 20 e 24 e demais jobs verificados como success para `0e28aebfdd0213c0528d60fa8e3204659a1e6e5d`
- last_verified_at: 2026-10-28
- interruption_state: none

## Objetivo e jornada a homologar

1. Cliente já autenticado abre o perfil e encontra no rodapé a seção discreta “Resgate seu código”.
2. Digita o convite e resgata. Um código de cupons credita os cupons associados à conta; um código VIP cria associação `invited` e abre o popup de convite dourado.
3. O popup celebra por dois segundos e permite fechar. O link dos termos abre a página com benefícios, analytics obrigatórios do programa, retenção, cancelamento e saída do VIP.
4. O cliente consente expressamente os termos; retorna ao perfil e só então o botão “Inscrever-me no VIP” fica habilitado.
5. Ao inscrever-se, o backend muda a associação para `active`; a conta passa a exibir coroa VIP e recebe acesso antecipado e benefícios. Cancelamento posterior revoga o acesso e mantém apenas registros mínimos exigidos.

Consentimento legal não será submetido pelo agente sem autorização específica no momento da ação.

## Diagnóstico de produção

- Em 2026-10-28, consulta minimizada à tabela `LilyVipCode` mostrou os três convites VIP mais recentes como `active`, com `redemptionCount=0`, mas todos com `endsAt=2026-10-11T02:59:00Z`, anteriores à criação (27 e 28 de outubro). O resgate rejeita corretamente qualquer código cuja validade tenha acabado.
- O perfil da conta de teste autenticada no domínio real mostrava 2.210 pontos, sem associação VIP ativa, e o controle de resgate discreto no fim da página.
- A seção foi expandida; captura da tela mostrou apenas o campo “Código” e o botão “Resgatar”.
- A página publicada `/lilyacai/vip/termos` informa os analytics próprios requeridos, retenção e cancelamento. Ela também declara que o prazo específico de retenção ainda precisa ser definido pelo controlador antes de convidar participantes; isso é uma pendência de conteúdo/política, não foi alterada nesta correção técnica.
- O sistema guarda hash dos convites, portanto nenhum dos códigos completos já emitidos pode ser recuperado do banco. Os códigos da VPS não foram modificados.

## Correção em andamento

- Rejeitar na API a emissão ou reativação de códigos com validade passada.
- Impedir datas passadas no formulário de administração e explicar que campo vazio significa validade sem prazo.
- Identificar códigos vencidos mesmo quando o status salvo ainda é `active`.
- Dar ao staff ação explícita, auditada e reversível operacionalmente para reativar código vencido sem validade; não aplicar isso automaticamente aos códigos de produção.
- Cobrir emissão vencida, reativação sem vencimento e resgate integrado em testes.

## Gates e verificações

- Preflight `AG-DEV` para `apps/lily_acai`, `apps/api/src/modules/lily` e checkpoints: PASS.
- `npm run check`: PASS no Windows.
- Teste direcionado `vip.test.ts`: PASS — 5 testes, incluindo emissão, bloqueio de validade passada, reativação sem prazo, resgate, consentimento e inscrição. As migrações isoladas foram aplicadas às bases descartáveis locais com o driver SQLite porque o Prisma Migrate local falhou sem diagnóstico no Windows.
- `npm run check`: PASS; `npm test`: PASS — 62 arquivos, 331 aprovados, 3 ignorados; `npm run build`: PASS, orçamento CookLily verde; `npm run policy:check`: PASS; `git diff --check`: PASS.
- Após ajustar a exibição para nunca oferecer reativação de códigos `disabled`: teste VIP direcionado 5/5, `npm run check` e `npm run build` PASS novamente; budget continua verde.
- Navegador real: autenticação da conta de teste confirmada; perfil e seção de resgate inspecionados. Página de termos aberta e conteúdo examinado. Ainda não houve código válido disponível para submeter; portanto popup, consentimento, inscrição, coroa e acesso VIP não foram homologados visualmente.
- Capturas visíveis nesta sessão: perfil com seção de resgate expandida e página de termos/cancelamento. A captura da conta contém apenas a seção inferior; dados identificadores não foram incluídos.
- Painel VIP em produção: a sessão da conta de teste abre o painel, mas recebe “Acesso restrito à equipe CookLily” e não pode emitir nem reativar convites.

## Ampliação aprovada nesta entrega — autenticação de agente administrativo

- O proprietário solicitou identidade de agente separada da senha/MFA humana, mas com permissões funcionais equivalentes a admin para operar UI, catálogo, testes e segurança.
- Desenho implementado localmente: chave Ed25519 exclusiva do agente, desafio assinado com OpenSSH, ticket de troca de uso único com vida curta e sessão de navegador `HttpOnly` curta. Sem chave privada, senha humana ou TOTP no site/chat.
- A identidade de agente deve ser uma conta CookLily admin dedicada; bloquear login por senha nessa conta quando vinculada à chave. Revogar chave encerra sessões relacionadas imediatamente.
- Mutations continuam exigindo CSRF; toda auditoria deverá indicar tipo `agent` e ID/fingerprint da chave. Nenhum privilégio de Carro Chefe fora de `/lilyacai` ou `/api/v1/lily` será criado.
- Provisionamento precisa ser explícito na VPS, aceitando somente conta ativa com papel `admin`, public key Ed25519 válida e sem segredo privado.
- A sessão de agente é de 2h; desafio ~2 min; handoff de navegador ~1 min; assinatura fixa na namespace `cooklily-agent-auth`; desafios e handoffs são de uso único e rate limited.
- Migration versionada `20261028120000_lily_agent_admin_auth`: identidade de agente, chave pública, desafio, handoff hash-only, sessão vinculada e atribuição de auditoria/fingerprint. `npm run db:deploy:lily` aplicou a migration no SQLite local em 2026-10-28.
- API: desafio de 2 min, até 5 tentativas, assinatura OpenSSH namespace fixa, ticket de uso único de 60 s, sessão admin de 2 h, respostas `no-store`, rate limits e verificação da chave ainda ativa a cada requisição.
- Provisionador VPS `lily-agent-key register|status|revoke`: aceita só chave pública Ed25519 e conta existente admin/ativa; cadastro encerra sessões anteriores e bloqueia senha da conta vinculada; revogação invalida sessões e apaga desafios/handoffs.
- CLI local `tools/lily-agent-auth.mjs login`: assina via `ssh-agent`, não imprime nem salva ticket e abre a página de handoff. A página remove o fragmento da URL antes de trocar o ticket por sessão.
- Preflight AG-DEV executado após atualização das instruções regionais para API Lily, banco, tools, frontend, scripts de deploy e docs: todos exit 0. `npm run policy:build` gerou manifesto `sha256:8a48a5329c3bd25e806dd7cccb39fa4edfb988287c279ddc166c37d4c7325d74`.
- `npm run check`: PASS após a implementação inicial (corrigido o tipo de conta criada); repetir depois do último ajuste.
- Teste direcionado `agent-auth.test.ts`: PASS — assinatura OpenSSH, senha recusada para conta de agente, chave desconhecida/assinatura inválida, desafio/ticket expirados, replay, sessão de admin, CSRF obrigatório, auditoria com fingerprint e revogação imediata. Repetir depois do último ajuste.
- `agent-auth.test.ts` + `deploy-scripts.test.ts`: PASS — 12 testes, 3 ignorados no Windows.
- A validação local `bash -n` acionou `C:\Windows\System32\bash.exe` (stub/WSL) e foi interrompida; sintaxe Bash permanece gate do CI Linux.
- `git diff --check`: PASS; avisos apenas de conversão automática LF/CRLF do Git no Windows.

## Integração, deploy e homologação

- PR #204 aberta em rascunho; run #810 está verde no HEAD anterior (`0e28aeb...`). A PR será atualizada para incluir a autenticação de agente e revalidada antes de integrar.
- Deploy VPS: pending; executar `sudo cc deploy canonical` depois da integração aprovada e gates verdes.
- Pós-deploy: conferir SHA, serviço, Nginx e health checks; abrir novamente o domínio e repetir jornada desktop/mobile.
- Conta de teste: sessão autenticada no navegador. Ela não tem permissão staff/admin; código completo não é recuperável do hash. Necessário que staff reative um convite vencido sem prazo ou emita um novo; o código pode ser preenchido no perfil de teste sem ser compartilhado no chat. Proprietário autorizou consentimento dos termos nesta conta; submeter somente quando o convite pendente habilitar o fluxo.

## Próxima ação exata

Executar `npm run check`, suíte completa e `npm run build`, corrigir achados, atualizar PR #204 e esperar CI completo. Revisar e integrar quando os gates estiverem verdes. Depois executar deploy autorizado, gerar/carregar a chave exclusiva no ssh-agent, provisionar só a chave pública para a conta admin dedicada e homologar o painel no domínio real com capturas sem ticket/segredos. Resgatar o convite VIP quando o proprietário enviar o código, concluir consentimento já autorizado, validar inscrição/coroa/acesso VIP com capturas. O usuário pediu a atualização do Instagram somente depois de fechar a tarefa VIP.

