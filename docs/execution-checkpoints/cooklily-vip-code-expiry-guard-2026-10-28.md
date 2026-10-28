# Validade e resgate do convite VIP CookLily

- status: correção VIP e autenticação por chave implantadas; fluxo VIP real concluído com conta de teste; PR #205 corrige Origin ausente e permite handoff isolado no Edge; CI do último HEAD pendente
- owner: AG-DEV
- branch: `codex/agent-auth-origin-vip-flow`
- base_branch: `cooklily/canonical`
- base_sha_verified: `59e45f8c616d2b95be7c01760dd1fe4e366b776e`
- head_sha_verified: `8e63014fd81ad2e9277fd2bd9f45df1912341748`
- pull_requests: [PR #204](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/204) (merged), [PR #205](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/205) (open; CI pendente)
- ci_run: #811 / run ID `40632536335`, todos os sete jobs success para o HEAD que virou o merge `59e45f8...`; CI do PR #205 deve ser consultado para o HEAD `8e63014...`
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
- Merge PR #204: `59e45f8c616d2b95be7c01760dd1fe4e366b776e`. Deploy `sudo cc deploy canonical` em 2026-10-28 terminou com release SHA idêntico, migration `20261028120000_lily_agent_admin_auth`, testes 63/337, budget e checks externos verdes; evidência operacional em `/srv/carro-chefe/data/deploy-logs/deploy-20261028-043403-59e45f8c616d.evidence`.
- Fingerprint da chave agente provisionada na VPS: `SHA256:uI4S77+pEUl1/bza+GyE+giCANgi444HDzGef0Cz0+A`; status verificado `role=admin`, `account_status=active`, `identity=agent`, `key_status=active`. Não registrar chave privada nem senha neste checkpoint.
- Falha de homologação inicial: CLI enviada sem `Origin` e a API respondeu HTTP 403 pela proteção global de origem. Corrigido localmente com `Origin: https://carrochefe.com`; teste direcionado após fix PASS. PR #205 adiciona Origin e opção Windows para abrir handoff no Edge, evitando substituir a sessão de teste aberta no Chrome.
- Homologação real concluída: CLI corrigida completou desafio/assinatura/handoff no domínio; painel carregou como `Chat GPT Codex Agent`; gestão VIP mostrou três convites antigos expirados; agente emitiu convite ilimitado de teste sem validade, cliente resgatou em `perfil`, popup dourado apareceu, consentimento `cooklily-vip-2026-10-v1` foi registrado com autorização anterior do proprietário, e a inscrição mudou para `active` com `enrolledAt` persistido e coroa no avatar.
- Capturas sanitizadas fora do repositório: `C:\Users\valdi\.codex\visualizations\2026\10\28\agent-admin-panel.png`, `...\vip-terms-page.png`, `...\vip-active-membership.png`, `...\vip-crown.png`. A captura integral do perfil usada durante a depuração contém dados identificadores do cliente de teste; não anexar nem versionar.
- O convite usado foi emitido especificamente para homologação e resgatado; seu texto não foi persistido em docs/logs. O banco armazena somente hash.

## Integração, deploy e homologação

- PR #204 merged e deploy live em `59e45f8...`; PR #205 aguarda CI. A CLI com Origin foi exercida contra a produção e completou o fluxo; correção do CLI aguarda merge/deploy para ficar versionada/disponível na canonical.
- Conta de teste agora está inscrita no VIP (`active`) com consentimento gravado; não cancelar ou alterar sem pedido do proprietário.
- Pendência de política: os termos VIP publicados dizem que o prazo exato de retenção ainda precisa ser definido antes da entrada de participantes em produção; não anunciar/coletar participantes reais antes dessa decisão.

## Próxima ação exata

Consultar CI do PR #205 para `8e63014...`; se verde, revisar e fazer merge squash autorizado, depois rodar `sudo cc deploy canonical` e confirmar SHA/health. A homologação VIP real já passou; conferir que o code fix publicado permite reautenticação futura pela CLI. Em seguida, cumprir a solicitação pendente de substituir `@acai._lily` por `cook._lily` em todas as referências do site, com PR/CI/deploy e teste real separado. Registrar capturas finais e atualizar este checkpoint após cada marco.

