# Validade e resgate do convite VIP CookLily

- status: PR aberta; correção candidata; CI #808 em execução; homologação de produção parcial
- owner: AG-DEV
- branch: `codex/vip-expiry-guard`
- base_branch: `cooklily/canonical`
- base_sha_verified: `5a5cccd4a8e307ed5fcb2ab2396a41b8130e9388`
- head_sha_verified: `c9ccc6dd3adf4b9c308ade9d1ce436fbea53711d`
- pull_requests: [PR #204](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/204) (rascunho)
- ci_run: aguardando workflow de sincronização da PR para o head atual
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

## Integração, deploy e homologação

- PR #204 aberta em rascunho; CI #808 em execução.
- Deploy VPS: pending; executar `sudo cc deploy canonical` depois da integração aprovada e gates verdes.
- Pós-deploy: conferir SHA, serviço, Nginx e health checks; abrir novamente o domínio e repetir jornada desktop/mobile.
- Conta de teste: sessão autenticada no navegador. Ela não tem permissão staff/admin; código completo não é recuperável do hash. Necessário que staff reative um convite vencido sem prazo ou emita um novo; o código pode ser preenchido no perfil de teste sem ser compartilhado no chat. Proprietário autorizou consentimento dos termos nesta conta; submeter somente quando o convite pendente habilitar o fluxo.

## Próxima ação exata

Concluir CI #808, integrar e implantar após gates aprovados. Depois usar o convite de teste que o proprietário disponibilizar e submeter no perfil. O consentimento dos termos nesta conta já foi explicitamente autorizado; concluir inscrição, conferir coroa/acesso VIP, capturar as telas e fechar o relatório. Em seguida, executar a atualização do Instagram solicitada separadamente.

