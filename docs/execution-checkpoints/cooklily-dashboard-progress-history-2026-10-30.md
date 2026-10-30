# CookLily: gráficos semanais/mensais e histórico de pontos no dashboard

- status: in_progress
- owner: AG-DEV
- branch: `codex/lily-dashboard-budget-fix-round2`
- base_branch: `cooklily/canonical`
- base_sha_verified: `21d2549c3360d97e6abfa47927f7cb926c69779f`
- head_sha_verified: `21d2549c3360d97e6abfa47927f7cb926c69779f` (base; second correction not committed)
- pull_requests: PR #293 merged as `2fae845472cc0bb2700957997324edce6c491a31`; PR #294 merged as `21d2549c3360d97e6abfa47927f7cb926c69779f`, but deploy failed its Linux gzip budget gate; PR #295 not yet opened
- last_verified_at: 2026-10-30 America/Sao_Paulo
- interruption_state: none

## Entrega

Implementar o próximo subitem desbloqueado de fidelidade: alternância dos gráficos no dashboard entre a série diária dos últimos sete dias e a série mensal dos últimos seis meses. O histórico de pontos permanece como item seguinte do roadmap.

## Concluído e persistido

- PR #293 foi integrado por squash na branch canônica como `2fae845472cc0bb2700957997324edce6c491a31`.
- PR #294 foi integrada por squash, mas o deploy de `21d2549c3360d97e6abfa47927f7cb926c69779f` falhou no gate Linux: JS gzip `189,07/189 KiB` (+0,07 KiB). Nenhuma migration real foi iniciada e o rollback preservou o release `54d8b3600273366d46d47ef682f0ba503eca3712`.
- A VPS usa Node `22.22.1`/zlib `1.3.1`; CI antes só testava Node 20 e 24, que passaram. A diferença de compressão explica por que o gate de deploy continuou falhando.
- A segunda correção elimina o cálculo repetido do máximo do radar, evita parse de coordenadas SVG e torna os valores dos gráficos legíveis individualmente por tecnologia assistiva.
- `npm run build:lily` local em Node 22 Windows passou para a segunda correção; JS gzip `188,80/189 KiB`, JS+CSS gzip `224,12/225 KiB`. A reprodução precisa do Linux Node 22 será feita pelo CI.
- `npm run check` passou após a correção de tipos do radar e `npm run test:lily-ui` passou (25 arquivos/109 testes). CI Node 20/24 e Vitest Linux na VPS passaram na correção anterior (82 arquivos/425 testes); a execução local Windows foi interrompida após o worker Vitest encerrar sem emitir resultado.

## Em andamento

- Validar no CI com Node 22 em Linux, igual ao runtime da VPS, além de Node 20/24.
- Abrir PR #295 contra `cooklily/canonical`; aguardar suites e orçamento gzip para todos os runtimes.
- Após merge e CI verde com margem no Node 22, publicar o SHA exato e homologar a alternância no navegador integrado do Codex em desktop e mobile.

## Gates e testes

- Preflight AG-DEV frontend e `.github/workflows/ci.yml`: passou contra a base `21d2549`.
- `npm run test:lily-ui`: 25 arquivos/109 testes passaram.
- `npm run check`: passou.
- `npm run build:lily` com Node 22 em Windows: JS gzip 188,80/189 KiB, JS+CSS gzip 224,12/225 KiB.
- PR #293: CI Quality Node 20/24, Tool Health Linux, Windows Supervisor, Workbook Snapshot e Excel Recipe Linux/Windows passaram.
- Deploy de `2fae845`: rollback confirmado por violação de 0,08 KiB no budget JS gzip; release anterior preservado.
- CI da PR #294: todas as verificações Node 20/24, incluindo testes e builds, passaram; deploy Linux Node 22 excedeu o budget por 0,07 KiB.
- Segunda correção local: `npm run check`, `npm run test:lily-ui` (25 arquivos/109 testes), `npm run build` em Node 24 e `npm run build:lily` em Node 22 Windows passaram. O `npm test` local foi interrompido após o worker Vitest encerrar sem emitir resultado; CI Linux deve confirmar a suíte completa.
- CI Node 22 Linux para a segunda correção: pendente.
- PR #295, novo deploy e homologação desktop/mobile: pendentes.

## Migrations

- Nenhuma prevista; serão usados os eventos existentes.

## Bloqueios/riscos

- Não há dependência de credenciais ou configurações externas identificada.
- História de pontos não está nesta fatia; permanece como próxima pendência independente.

## Homologação/dependências externas

- Deploy deve seguir o runbook CookLily. Homologação de UI usar exclusivamente o navegador integrado do Codex.

## Próxima ação exata

Abrir a PR #295 com o segundo corte, cobertura CI Node 22 e checkpoint; aguardar Quality Node 20/22/24 e confirmar margem no build Linux Node 22. Só então integrar por squash, publicar o SHA canônico pela CLI `cc` e homologar no navegador integrado desktop e mobile.
