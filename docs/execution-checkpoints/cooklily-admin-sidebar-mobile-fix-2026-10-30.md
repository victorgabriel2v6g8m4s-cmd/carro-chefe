# CookLily: rótulos da navegação administrativa no mobile

- status: in_progress
- owner: AG-DEV
- branch: `codex/admin-sidebar-mobile-labels`
- base_branch: `cooklily/canonical`
- base_sha_verified: `15247e25f9ea3c5d262bcf3391af4a9eec8509a3`
- head_sha_verified: `35543fcfaee261de8f80672b4e1e118c47b2a5df`
- pull_requests: PR #282 merged by squash, https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/282
- last_verified_at: 2026-10-30 15:38 America/Sao_Paulo
- interruption_state: none

## Entrega

Corrigir a barra lateral global do painel CookLily para que, em viewport mobile, a navegação expandida sempre mostre os nomes dos módulos mesmo quando o usuário mantém persistido o modo recolhido do desktop.

## Concluído e persistido

- PR #281 foi integrado em `cooklily/canonical`; base verificada em `15247e25f9ea3c5d262bcf3391af4a9eec8509a3`.
- A homologação visual no domínio real encontrou rótulos ocultos ao abrir a navegação mobile. A causa foi uma regra de estado desktop recolhido com especificidade maior que o override mobile.
- Commit `e2d50bf0b76ec895d6db5d69a0c52f546027befb` eleva a especificidade das regras dos rótulos ao estado `.is-mobile-open` e adiciona asserção estrutural para cobrir a regressão.
- PR #282 foi integrado por squash em `cooklily/canonical`, merge SHA `35543fcfaee261de8f80672b4e1e118c47b2a5df`.
- `npm run check`, `npm run test:lily-ui` (24 arquivos/106 testes), `npm run build` e `git diff --check` passaram.
- Suíte completa serial `npm test -- --maxWorkers=1`: 80 arquivos, 418 testes passaram, 3 ignorados. Execução padrão paralela registrou 8 falhas em suites de API com estado SQLite compartilhado; a execução serial passou integralmente.
- Build CookLily: JS gzip 188.41/189 KiB, inicial 52.05/110 KiB, maior chunk 70.94/280 KiB, CSS gzip 35.25/36 KiB, total JS+CSS 223.66/225 KiB.

## Em andamento

- CI run `41107970880`: todos os jobs passaram (Quality Node 20/24, Tool Health Linux, Windows Supervisor, Workbook Snapshot, Excel Recipe Ubuntu/Windows).
- Deploy canonical e reteste no navegador integrado do Codex, desktop e mobile ainda pendentes.

## Gates e testes

- Preflight: `npm run policy:preflight -- --agent AG-DEV --scope lily/admin-navigation`, hash `24d8c85aea46ed391826fb0e89daad9df54cce974cadfd30f1bc6008f8d1e7a5`.
- Checks de CI do PR #282: todos passaram no run `41107970880`.
- A homologação final do fix no domínio real é dependência de deploy e permanece pendente.

## Migrations

- Nenhuma migration necessária.

## Bloqueios/riscos

- `gh pr checks` falhou com erro transitório GraphQL; estado consultado pelo endpoint REST de check-runs.
- A suíte paralela do projeto falhou em testes de API usando estado compartilhado; a suíte serial completa passou. Não há relação com a alteração CSS.

## Homologação/dependências externas

- Domínio: `https://carrochefe.com/lilyacai/painel`.
- A primeira homologação mobile mostrou a falha; desktop anteriormente exibia corretamente sidebar expandida/recolhida.
- Repetir desktop e mobile após deploy. Usar exclusivamente o navegador integrado do Codex.

## Próxima ação exata

Executar o deploy canonical autorizado no VPS. Em seguida, homologar a navegação mobile expandida com rótulos visíveis e a navegação desktop expandida/recolhida; corrigir e repetir se surgir nova falha.
