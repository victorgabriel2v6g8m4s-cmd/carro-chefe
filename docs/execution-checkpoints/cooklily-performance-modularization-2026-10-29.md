# Performance e modularização CookLily

- status: in_progress
- owner: AG-DEV
- branch: codex/cooklily-performance-modularization
- base_branch: cooklily/canonical
- base_sha_verified: 7465a72c82802aa83c3e3322ebd2f90b84d93b9d
- head_sha_verified: 7465a72c82802aa83c3e3322ebd2f90b84d93b9d (alterações locais ainda sem commit)
- pull_requests: nenhum
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
- Testes de navegador desktop/mobile e domínio real ainda pendentes.

## Migrations

- Nenhuma.

## Bloqueios/riscos

- Margem atual do budget agregado é pequena (0.28 KiB JS gzip; 1.02 KiB combinado); o problema de aumento recorrente persiste e precisa de orçamento para entrada inicial e otimização de CSS/compartilhados.
- O editor de catálogo ainda carrega todo o payload administrativo. Para atender integralmente ao fluxo pedido, implementar endpoints separados para resumo/lista e detalhe de produto e substituir o editor sempre montado por detalhe carregado ao abrir.
- Sem mudanças de API neste marco; não afirmar redução de dados do catálogo ainda.

## Homologação/dependências externas

- Ainda não testado no domínio real. Usar exclusivamente a aba integrada do Codex quando houver deploy.
- Nenhum deploy executado neste checkpoint.

## Próxima ação exata

1. Fazer revisão final e commit da mudança de carregamento/roadmap.
2. Abrir PR para canonical, aguardar CI e integrar em squash; atualizar os SHAs neste checkpoint.
3. Deploy do SHA integrado e homologar navegação por rota no navegador integrado do Codex em desktop e mobile.
4. Executar a próxima fase do roadmap: separar catálogo admin em índice leve e detalhes carregados ao abrir um produto; medir de novo JS/CSS e refatorar os arquivos administrativos grandes por responsabilidade.
