# Performance e modularização CookLily

- status: in_progress
- owner: AG-DEV
- branch: codex/cooklily-bundle-budget-50
- base_branch: cooklily/canonical
- base_sha_verified: 0869e749c3e87eaeecfedcee76efe702edf35a8d
- head_sha_verified: 8c228f8e34b194ba877571148eed2043bc25f9d5
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
- Nova iteração: rotas de página carregadas sob demanda, runtime React compatível do Lily substituído por Preact, React Router substituído por uma camada Wouter local e medição do grafo JS inicial adicionada ao budget.
- Build pós-iteração: JS total 563.42 KiB raw / 178.57 KiB gzip; maior chunk 61.42 KiB; grafo JS inicial estático 40.90 KiB gzip. Em relação ao checkpoint anterior (790.11 KiB raw / 219.72 KiB gzip total; entrada 581.10 KiB raw / 138 KiB gzip), reduções aproximadas: total raw 28.7%, total gzip 18.7%, maior chunk raw 89.4% e JS inicial gzip 70.4%. A meta de 50% foi atingida no chunk de entrada; a meta de 20% foi atingida no grafo inicial gzip. O agregado de todos os chunks ainda está abaixo de 20% de redução e permanece explicitamente reportado.
- Budget reforçado: mede assets totais, grafo inicial pelo manifest e maior chunk; limites de 600 KiB raw total, 185 KiB gzip total, 110 KiB gzip inicial e 280 KiB para o maior chunk.

## Gates e testes

- Build após a primeira divisão ampla: JS gzip 242.47 KiB e total gzip 276.34 KiB (reprovado); a divisão foi ajustada para limitar chunks.
- Build após ajuste de granularidade: PASS; JS raw 790.11 KiB / 800 KiB; JS gzip 219.72 KiB / 220 KiB; CSS raw 170.69 KiB / 174 KiB; CSS gzip 33.26 KiB / 34 KiB; total gzip 252.98 KiB / 254 KiB. Chunk de entrada 496.40 KiB.
- `npm run check`: PASS, Prisma generate/validate e TypeScript.
- `npm test`: PASS, 74 arquivos, 389 testes passaram e 3 foram ignorados; os testes de build budget também passaram.
- `npm run build`: PASS; inclui builds Gestão, Site, QR, Lily, budget Lily e TypeScript da API.
- Nova iteração `8c228f8e34b194ba877571148eed2043bc25f9d5`: `npm test` PASS (74 arquivos, 389 passaram, 3 ignorados); `npm run check` PASS; `npm run build` PASS; `git diff --check` PASS; preflight AG-DEV PASS.
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

1. Criar PR draft da branch `codex/cooklily-bundle-budget-50`, aguardar todos os checks e integrar na `cooklily/canonical`.
2. Atualizar este checkpoint após CI/merge, fazer deploy na VPS e validar o domínio real em desktop e mobile exclusivamente na aba integrada do Codex.
3. Corrigir qualquer falha visual/funcional observada, repetir teste, build, merge/deploy e homologação. Só marcar `completed` após as metas permanecerem dentro do budget e a homologação visual passar.
