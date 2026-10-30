# CookLily: rótulos da navegação administrativa no mobile

- status: completed
- owner: AG-DEV
- branch: `codex/admin-sidebar-mobile-labels`
- base_branch: `cooklily/canonical`
- base_sha_verified: `15247e25f9ea3c5d262bcf3391af4a9eec8509a3`
- head_sha_verified: `1eee1fe23ac6fed44702aa5d65a589e73f61827d`
- pull_requests: PR #282 merged by squash, https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/282; PR #283 roadmap reconciliation merged by squash, https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/283
- last_verified_at: 2026-10-30 15:53 America/Sao_Paulo
- interruption_state: none

## Entrega

Corrigir a barra lateral global do painel CookLily para que, em viewport mobile, a navegação expandida sempre mostre os nomes dos módulos mesmo quando o usuário mantém persistido o modo recolhido do desktop.

## Concluído e persistido

- PR #281 foi integrado em `cooklily/canonical`; base verificada em `15247e25f9ea3c5d262bcf3391af4a9eec8509a3`.
- A homologação visual no domínio real encontrou rótulos ocultos ao abrir a navegação mobile. A causa foi uma regra de estado desktop recolhido com especificidade maior que o override mobile.
- Commit `e2d50bf0b76ec895d6db5d69a0c52f546027befb` eleva a especificidade das regras dos rótulos ao estado `.is-mobile-open` e adiciona asserção estrutural para cobrir a regressão.
- PR #282 foi integrado por squash em `cooklily/canonical`, merge SHA `35543fcfaee261de8f80672b4e1e118c47b2a5df`.
- Checkpoint pré-deploy foi publicado sozinho em `cooklily/canonical` no commit `97f1dfb6953168f5de4feb399f28ff2268df1324`.
- Deploy full concluído na VPS no release `97f1dfb6953168f5de4feb399f28ff2268df1324`; sem migrations pendentes, health interno e externo passaram, Nginx válido e serviço ativo. Log: `/srv/carro-chefe/data/deploy-logs/deploy-20261030-183746-97f1dfb69531.log`.
- Reteste no navegador integrado do Codex após deploy: no mobile 390×844, menu administrativo expandido mostra todos os rótulos (Visão geral, Cardápio, Pesquisas, Cupons e ofertas, Programa VIP, Níveis e LilyCoins, Mídias, Entrega e retirada, Configurações da loja e demais links; menu tem rolagem própria). No desktop 1365×900, sidebar expandida mostra ícones e rótulos, e alternar para recolhida mostra somente ícones como esperado. Capturas foram observadas no navegador integrado; viewport temporário foi restaurado.
- `docs/lily-acai/ROADMAP_COOKLILY.md` atualizado: navegação global marcada como concluída, release e checkpoints atuais registrados.
- PR #283 foi integrado por squash em `cooklily/canonical`, merge SHA `1eee1fe23ac6fed44702aa5d65a589e73f61827d`; CI run `41109519793` passou em todos os jobs.
- `npm run check`, `npm run test:lily-ui` (24 arquivos/106 testes), `npm run build` e `git diff --check` passaram.
- Suíte completa serial `npm test -- --maxWorkers=1`: 80 arquivos, 418 testes passaram, 3 ignorados. Execução padrão paralela registrou 8 falhas em suites de API com estado SQLite compartilhado; a execução serial passou integralmente.
- Build CookLily: JS gzip 188.41/189 KiB, inicial 52.05/110 KiB, maior chunk 70.94/280 KiB, CSS gzip 35.25/36 KiB, total JS+CSS 223.66/225 KiB.

## Em andamento

- CI run `41107970880`: todos os jobs passaram (Quality Node 20/24, Tool Health Linux, Windows Supervisor, Workbook Snapshot, Excel Recipe Ubuntu/Windows).
- Não há trabalho pendente nesta entrega. A sequência seguinte do roadmap já prioriza pagamentos/ERP; o atendimento IA segue dependente de configurações e gates do proprietário, documentados em `docs/lily-acai/WHATSAPP_IA_GUIA_DE_CONFIGURACAO.md`.

## Gates e testes

- Preflight: `npm run policy:preflight -- --agent AG-DEV --scope lily/admin-navigation`, hash `24d8c85aea46ed391826fb0e89daad9df54cce974cadfd30f1bc6008f8d1e7a5`.
- Checks de CI do PR #282: todos passaram no run `41107970880`.
- Homologação final visual concluída no domínio real após deploy, exclusivamente no navegador integrado do Codex.

## Migrations

- Nenhuma migration necessária.

## Bloqueios/riscos

- `gh pr checks` falhou com erro transitório GraphQL; estado consultado pelo endpoint REST de check-runs.
- A suíte paralela do projeto falhou em testes de API usando estado compartilhado; a suíte serial completa passou. Não há relação com a alteração CSS.

## Homologação/dependências externas

- Domínio: `https://carrochefe.com/lilyacai/painel`.
- Mobile: menu aberto mostrou os rótulos dos links com rolagem interna, sem quebra horizontal visível.
- Desktop: barra expandida e recolhida verificadas no viewport 1365×900.
- Navegador: integrado do Codex exclusivamente; viewport restaurado ao padrão após o teste.

## Próxima ação exata

Nenhuma para esta entrega. Próximo trabalho deve seguir a prioridade documentada no roadmap (fluxo financeiro/ERP) ou continuar a implantação do agente somente após o proprietário concluir as etapas e gates do guia.
