# CookLily: gráficos semanais/mensais e histórico de pontos no dashboard

- status: in_progress
- owner: AG-DEV
- branch: `codex/dashboard-progress-homologation` (checkpoint de homologação)
- base_branch: `cooklily/canonical`
- base_sha_verified: `73721de10915dfb25abd75407346e9e75d868f82`
- head_sha_verified: `73721de10915dfb25abd75407346e9e75d868f82` (base deste registro; alteração documental em andamento)
- pull_requests: PR #293 integrada em `2fae845472cc0bb2700957997324edce6c491a31`; PR #294 integrada em `21d2549c3360d97e6abfa47927f7cb926c69779f`, mas o primeiro deploy excedeu o budget Linux; PR #295 integrada por squash em `73721de10915dfb25abd75407346e9e75d868f82`
- last_verified_at: 2026-10-30 America/Sao_Paulo
- interruption_state: none

## Entrega

Implementar alternância dos gráficos do dashboard entre a série diária dos últimos sete dias e a série mensal dos últimos seis meses. O histórico de pontos permanece como próximo item do roadmap.

## Concluído e persistido

- PR #293 implementou a alternância e foi integrada em `2fae845472cc0bb2700957997324edce6c491a31`.
- PR #294 foi integrada em `21d2549c3360d97e6abfa47927f7cb926c69779f`, mas o deploy falhou no budget Linux de JS gzip (`189,07/189 KiB`) e reverteu para `54d8b3600273366d46d47ef682f0ba503eca3712` antes de aplicar migrations reais.
- PR #295 ajustou o custo do radar, melhorou a leitura assistiva dos gráficos e incluiu Node 22 no CI para reproduzir o runtime da VPS. Foi integrada por squash como `73721de10915dfb25abd75407346e9e75d868f82`.
- O release `73721de10915dfb25abd75407346e9e75d868f82` foi implantado na VPS em 2026-10-30. `cc status` confirmou `current_sha` e `canonical_sha` iguais ao release, serviço ativo e Nginx OK.
- O deploy executou validação completa, backup verificado, migrations de preflight e health/smoke. Os bancos operacionais não tinham migrations pendentes. Build CookLily na VPS passou: JS gzip `188,98/189 KiB`, JS+CSS gzip `224,33/225 KiB`.
- No navegador integrado do Codex em `https://carrochefe.com/lilyacai/dashboard`, a conta autenticada mostrou Semanal com os sete dias e Mensal com seis meses; alternar entre eles atualizou rótulos e valores dos gráficos.

## Em andamento

- A homologação visual responsiva em viewport móvel permanece pendente. O navegador integrado disponível nesta execução abriu o site em viewport desktop; os controles acessíveis não oferecem emulação ou ajuste de viewport. Não foi usado navegador externo, conforme as regras do projeto.
- A visualização desktop e a alternância semanal/mensal foram verificadas no domínio de produção.

## Gates e testes

- Preflight AG-DEV das alterações de frontend e `.github/workflows/ci.yml` passou na base `21d2549`.
- `npm run check` passou; `npm run test:lily-ui` passou (25 arquivos/109 testes); `npm run build` Node 24 passou.
- CI PR #295: Quality Node 20, Node 22 e Node 24, Tool Health Linux, Windows Supervisor, Workbook Snapshot e Excel Recipe Linux/Windows passaram.
- Deploy completo no VPS: 82 arquivos e 425 testes passaram; checks estáticos, build e budget passaram. Build observado no runtime Node 22: JS gzip `188,98/189 KiB`, JS+CSS gzip `224,33/225 KiB`.
- Verificação de produção: SHA confirmado por `cc status`; serviço ativo; Nginx OK; readiness e smoke externo `ok`.
- Homologação visual desktop: alternância semanal/mensal e séries confirmadas por estado acessível e captura do navegador integrado.
- Homologação móvel: pendente por falta de controle de viewport móvel no navegador integrado desta sessão.

## Migrations

- A funcionalidade usa eventos existentes e não adicionou migration.
- No deploy do release, todas as migrations acumuladas do canonical já estavam aplicadas nos bancos operacionais; nenhuma migration ficou pendente.

## Bloqueios/riscos

- Falta homologar a interface em viewport móvel. A regra do projeto proíbe substituir o navegador integrado por Chrome/Edge externos.
- O histórico de pontos não está nesta entrega e continua sendo o próximo item independente do roadmap.

## Homologação/dependências externas

- Deploy de produção concluído no release `73721de10915dfb25abd75407346e9e75d868f82`.
- Para fechar este item, repetir a verificação responsiva móvel quando o navegador integrado oferecer viewport móvel; depois disso, atualizar o roadmap e iniciar o histórico de pontos.

## Próxima ação exata

Executar homologação do dashboard em viewport móvel usando exclusivamente o navegador integrado do Codex; corrigir eventuais falhas, repetir desktop/mobile e só então marcar este item como concluído. Depois iniciar o histórico de pontos no dashboard.
