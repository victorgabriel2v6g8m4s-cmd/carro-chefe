# CookLily: gráficos semanais/mensais e histórico de pontos no dashboard

- status: candidate
- owner: AG-DEV
- branch: `codex/lily-dashboard-progress-history`
- base_branch: `cooklily/canonical`
- base_sha_verified: `ea16f4a`
- head_sha_verified: `6824540c6a131e4757dd9ad54db4efaff033f0a6`
- pull_requests: PR #293 open against `cooklily/canonical`; all listed CI checks passed on this head
- last_verified_at: 2026-10-30 19:45 America/Sao_Paulo
- interruption_state: none

## Entrega

Implementar o próximo subitem desbloqueado de fidelidade: alternância dos gráficos no dashboard entre a série diária dos últimos sete dias e a série mensal dos últimos seis meses. O histórico de pontos permanece como item seguinte do roadmap.

## Concluído e persistido

- Roadmap canônico consultado em `ea16f4a`; o próximo item de fidelidade sem dependência de configuração externa é melhorar gráficos e histórico do dashboard.
- Contrato existente fornece 6 meses de categorias; a série diária pode ser calculada com os eventos já consultados, sem migration.

## Em andamento

- Exibir no dashboard um controle acessível Semanal/Mensal para os gráficos de desempenho.
- Calcular sete buckets diários em UTC no backend e manter a série mensal existente, sem migration.

## Gates e testes

- Preflight AG-DEV frontend e API: passou em `ea16f4a`.
- Teste direcionado API: 2 arquivos/11 testes passaram.
- `npm run test:lily-ui`: 25 arquivos/109 testes passaram.
- `npm test`: 82 arquivos, 422 passaram e 3 ignorados.
- `npm run check`: passou.
- `npm run build`: passou; JS gzip 188,89/189 KiB, JS+CSS gzip 224,21/225 KiB.
- CI no PR #293: Quality Node 20/24, Tool Health Linux, Windows Supervisor, Workbook Snapshot e Excel Recipe Linux/Windows passaram.
- Merge, deploy e homologação no navegador integrado desktop/mobile: pendentes.

## Migrations

- Nenhuma prevista; serão usados os eventos existentes.

## Bloqueios/riscos

- Não há dependência de credenciais ou configurações externas identificada.
- História de pontos não está nesta fatia; permanece como próxima pendência independente.

## Homologação/dependências externas

- Deploy deve seguir o runbook CookLily. Homologação de UI usar exclusivamente o navegador integrado do Codex.

## Próxima ação exata

Integrar PR #293 por squash; publicar o SHA canônico pela CLI `cc`; homologar no navegador integrado desktop e mobile; então marcar o roadmap concluído ou corrigir os problemas encontrados.
