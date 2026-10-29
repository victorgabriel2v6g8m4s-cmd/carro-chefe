# Performance e modularização CookLily

- status: in_progress
- owner: AG-DEV
- branch: codex/cooklily-performance-modularization
- base_branch: cooklily/canonical
- base_sha_verified: 7465a72c82802aa83c3e3322ebd2f90b84d93b9d
- head_sha_verified: e2fcb05ad426a0f3328321b1078be7bb3556e6ed
- pull_requests: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/262 (merged)
- last_verified_at: 2026-10-29
- interruption_state: none

## Concluído e persistido

- Preflight `npm run policy:preflight -- --agent AG-DEV --scope lily-performance-modularization`: PASS.
- Build base `npm run build:lily`: PASS, JS 789.02 KiB raw / 217.72 KiB gzip; CSS 170.69 KiB raw / 33.26 KiB gzip; JS+CSS gzip 250.97 KiB. Chunk de entrada 581.10 KiB e warning do Vite acima de 500 KiB.
- Roadmap atualizado em `docs/lily-acai/ROADMAP_COOKLILY.md` com etapas de painel progressivo, budgets de entrada/rotas/total, dashboard e fidelidade/temporadas.

## Em andamento

- Importação dinâmica para catálogo público e páginas do admin legado; spinner Suspense global.
- `AdminGate` agora autentica sem carregar o catálogo quando o módulo filho não pede `loadCatalog`.
- Ainda falta transformar `/painel/cardapio` em índice leve com configuração sob demanda por produto; isso exige separar dados e editor e adicionar contrato/API de detalhe.

## Gates e testes

- Build após a primeira divisão ampla: JS gzip 242.47 KiB e total gzip 276.34 KiB (reprovado); a divisão foi ajustada para limitar chunks.
- Build após ajuste de granularidade: PASS; JS raw 790.11 KiB / 800 KiB; JS gzip 219.72 KiB / 220 KiB; CSS raw 170.69 KiB / 174 KiB; CSS gzip 33.26 KiB / 34 KiB; total gzip 252.98 KiB / 254 KiB. Chunk de entrada 496.40 KiB.
- `npm run check`: PASS, Prisma generate/validate e TypeScript.
- `npm test`: PASS, 74 arquivos, 389 testes passaram e 3 foram ignorados; os testes de build budget também passaram.
- `npm run build`: PASS; inclui builds Gestão, Site, QR, Lily, budget Lily e TypeScript da API.
- `git diff --check`: PASS.
- Commit `40dfc8fd4b88869d3e5349600bda801f8f0114bf` publicado na branch da tarefa; PR #262 aberto em draft.
- PR #262 squash-merged depois de todos os 7 checks passarem. SHA integrado: `dda8051e3f271c6e8cc4da8384d700c9867647de`.
- CI: Quality Node 20/24, Tool Health Linux, Windows Supervisor, Excel Recipe Ubuntu/Windows e Workbook Snapshot: PASS.
- Testes de navegador desktop/mobile e domínio real ainda pendentes.

## Migrations

- Nenhuma.

## Bloqueios/riscos

- Margem atual do budget agregado é pequena (0.28 KiB JS gzip; 1.02 KiB combinado); o problema de aumento recorrente persiste e precisa de orçamento para entrada inicial e otimização de CSS/compartilhados.
- O editor de catálogo ainda carrega todo o payload administrativo. Para atender integralmente ao fluxo pedido, implementar endpoints separados para resumo/lista e detalhe de produto e substituir o editor sempre montado por detalhe carregado ao abrir.
- Sem mudanças de API neste marco; não afirmar redução de dados do catálogo ainda.

## Homologação/dependências externas

- Ainda não testado no domínio real. Usar exclusivamente a aba integrada do Codex quando houver deploy.
- PR integrado; SSH key fingerprint local conferido com a chave previamente autorizada pelo proprietário.
- Deploy concluído em `2026-10-29 23:36 UTC`, SHA `e2fcb05ad426a0f3328321b1078be7bb3556e6ed`; readiness e external smoke PASS; sem migrations pendentes; evidência `/srv/carro-chefe/data/deploy-logs/deploy-20261029-233151-e2fcb05ad426.evidence`.
- Homologação IAB iniciada nas rotas painel/fidelidade e painel/cardápio. Novas abas exibiram apenas o fallback transitório “Carregando página/painel”; leituras de aba existente falharam com `browser.user is unavailable`. Não foi possível validar desktop/mobile visualmente nem se usou navegador externo.

## Próxima ação exata

1. Publicar este checkpoint atualizado na canonical usando `tools/recovery/push-cooklily-checkpoint.ps1`.
2. Retomar a homologação no navegador integrado do Codex; observar as rotas carregadas, testar desktop/mobile, coletar falhas e corrigir até passar.
3. Executar a próxima fase do roadmap: separar catálogo admin em índice leve e detalhes carregados ao abrir um produto; medir de novo JS/CSS e refatorar os arquivos administrativos grandes por responsabilidade.
