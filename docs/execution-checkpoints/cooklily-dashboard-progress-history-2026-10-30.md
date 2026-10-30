# CookLily: gráficos semanais/mensais e histórico de pontos no dashboard

- status: in_progress
- owner: AG-DEV
- branch: `codex/lily-dashboard-budget-fix`
- base_branch: `cooklily/canonical`
- base_sha_verified: `2fae845472cc0bb2700957997324edce6c491a31`
- head_sha_verified: `2fae845472cc0bb2700957997324edce6c491a31` (base; UI trim not committed)
- pull_requests: PR #293 merged as `2fae845472cc0bb2700957997324edce6c491a31`; budget-fix PR not yet opened
- last_verified_at: 2026-10-30 America/Sao_Paulo
- interruption_state: none

## Entrega

Implementar o próximo subitem desbloqueado de fidelidade: alternância dos gráficos no dashboard entre a série diária dos últimos sete dias e a série mensal dos últimos seis meses. O histórico de pontos permanece como item seguinte do roadmap.

## Concluído e persistido

- PR #293 foi integrado por squash na branch canônica como `2fae845472cc0bb2700957997324edce6c491a31`.
- A tentativa de deploy desse SHA falhou no gate Linux do budget: JS gzip `189,08/189 KiB` (+0,08 KiB); o deploy fez rollback automático para o release `54d8b3600273366d46d47ef682f0ba503eca3712` antes de executar migrations reais.
- Rebuild local após simplificação do painel passou: JS gzip `188,87/189 KiB`, CSS gzip `35,32/36 KiB`, JS+CSS gzip `224,19/225 KiB`.
- `npm run check` passou e `npm run test:lily-ui` passou (25 arquivos/109 testes).
- `npm test` concluiu seus prechecks e ficou sem progresso ao entrar no Vitest completo; foi interrompido após inspeção do processo. A confirmação completa permanece pendente no CI.

## Em andamento

- Reduzir o custo do componente dos gráficos para recuperar margem no budget e validar no CI Linux antes de nova publicação.
- Abrir PR de correção de budget contra a base canônica atual.
- Após merge e CI verde, publicar o SHA exato e homologar a alternância no navegador integrado do Codex em desktop e mobile.

## Gates e testes

- Preflight AG-DEV frontend: passou contra a base `2fae845`.
- `npm run test:lily-ui`: 25 arquivos/109 testes passaram.
- `npm run check`: passou.
- `npm run build`: passou localmente; JS gzip 188,87/189 KiB, JS+CSS gzip 224,19/225 KiB.
- PR #293: CI Quality Node 20/24, Tool Health Linux, Windows Supervisor, Workbook Snapshot e Excel Recipe Linux/Windows passaram.
- Deploy de `2fae845`: rollback confirmado por violação de 0,08 KiB no budget JS gzip; release anterior preservado.
- `npm test` nesta correção: prechecks passaram, Vitest completo não emitiu progresso e foi interrompido; CI completo da nova PR pendente.
- Novo merge, deploy e homologação desktop/mobile: pendentes.

## Migrations

- Nenhuma prevista; serão usados os eventos existentes.

## Bloqueios/riscos

- Não há dependência de credenciais ou configurações externas identificada.
- História de pontos não está nesta fatia; permanece como próxima pendência independente.

## Homologação/dependências externas

- Deploy deve seguir o runbook CookLily. Homologação de UI usar exclusivamente o navegador integrado do Codex.

## Próxima ação exata

Revisar/commitar a redução de bundle, abrir PR de correção contra `cooklily/canonical`, aguardar CI completo; somente se o gate Linux confirmar folga no budget, integrar por squash, publicar o SHA canônico pela CLI `cc` e homologar no navegador integrado desktop e mobile.
