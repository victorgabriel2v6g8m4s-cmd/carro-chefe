# Performance e modularização CookLily

- status: in_progress
- owner: AG-DEV
- branch: codex/cooklily-aggregate-gzip-20
- base_branch: cooklily/canonical
- base_sha_verified: 4f1d09a5d5f5255bad8f2f816c285e34abdebafa
- head_sha_verified: 72102e64957917fd5851cb34ae80139725d8f187
- pull_requests: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/262 (merged), https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/263 (merged; squash 5bda800b622bb69ab03b84f0ebc487a6a1663e3a), https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/264 (open draft; CI pending)
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
- Build pós-iteração: JS total 563.47 KiB raw / 178.57 KiB gzip; maior chunk 61.42 KiB; grafo JS inicial estático 40.93 KiB gzip. Em relação ao checkpoint anterior (790.11 KiB raw / 219.72 KiB gzip total; entrada 581.10 KiB raw / 138 KiB gzip), reduções aproximadas: total raw 28.7%, total gzip 18.7%, maior chunk raw 89.4% e JS inicial gzip 70.3%. A meta de 50% foi atingida no chunk de entrada; a meta de 20% foi atingida no grafo inicial gzip. O agregado de todos os chunks ainda está abaixo de 20% de redução e permanece explicitamente reportado.
- Critério desta execução: reduzir ao menos 50% no maior chunk/entrada e 20% no JS gzip transferido na carga inicial. A medição final ficou em 89,4% no maior chunk (581,10 → 61,42 KiB raw) e 70,3% no grafo inicial gzip (138,00 → 40,93 KiB). O agregado gzip de todos os 35 assets reduziu 18,7% (219,72 → 178,57 KiB); esse indicador não é confundido com o gzip da carga inicial.
- Experimentos após homologação: `minShareCount: 3` e `4` resultaram em 180,45 e 180,86 KiB gzip total; `minify: "esbuild"` resultou em 182,94 KiB. Todos pioraram frente a 178,57 KiB e foram descartados; a configuração versionada e implantada permaneceu inalterada.
- Experimento Terser com três passes não pôde ser executado porque a dependência opcional `terser` não está instalada; o build falhou antes de emitir assets e a configuração experimental foi removida sem instalar nova dependência.
- Budget reforçado: mede assets totais, grafo inicial pelo manifest e maior chunk; limites de 600 KiB raw total, 185 KiB gzip total, 110 KiB gzip inicial e 280 KiB para o maior chunk.

## Gates e testes

- Build após a primeira divisão ampla: JS gzip 242.47 KiB e total gzip 276.34 KiB (reprovado); a divisão foi ajustada para limitar chunks.
- Build após ajuste de granularidade: PASS; JS raw 790.11 KiB / 800 KiB; JS gzip 219.72 KiB / 220 KiB; CSS raw 170.69 KiB / 174 KiB; CSS gzip 33.26 KiB / 34 KiB; total gzip 252.98 KiB / 254 KiB. Chunk de entrada 496.40 KiB.
- `npm run check`: PASS, Prisma generate/validate e TypeScript.
- `npm test`: PASS, 74 arquivos, 389 testes passaram e 3 foram ignorados; os testes de build budget também passaram.
- `npm run build`: PASS; inclui builds Gestão, Site, QR, Lily, budget Lily e TypeScript da API.
- Nova iteração `8c228f8e34b194ba877571148eed2043bc25f9d5`: `npm test` PASS (74 arquivos, 389 passaram, 3 ignorados); `npm run check` PASS; `npm run build` PASS; `git diff --check` PASS; preflight AG-DEV PASS.
- Correção de navegação `0da01989ee6a4cf6ae085d6ebc847467d37b592a`: os links de raiz não ficam mais ativos fora da Home; `npm run test:lily-ui` PASS (21 arquivos, 96 testes); `npm run build:lily` PASS com 40.93 KiB gzip inicial; aguardando CI completo deste HEAD.
- CI PR #263 após correção: 7/7 checks PASS em 2026-10-30; PR squash-merged na canonical em `5bda800b622bb69ab03b84f0ebc487a6a1663e3a`.
- `git diff --check`: PASS.
- Commit `40dfc8fd4b88869d3e5349600bda801f8f0114bf` publicado na branch da tarefa; PR #262 aberto em draft.
- PR #262 squash-merged depois de todos os 7 checks passarem. SHA integrado: `dda8051e3f271c6e8cc4da8384d700c9867647de`.
- CI: Quality Node 20/24, Tool Health Linux, Windows Supervisor, Excel Recipe Ubuntu/Windows e Workbook Snapshot: PASS.
- Deploy final concluído em 2026-10-29 local / 2026-10-30 UTC, release SHA `6bfcf79279998614454c72e462b87cbcc43a053f`; previous SHA `e2fcb05ad426a0f3328321b1078be7bb3556e6ed`; readiness passou na tentativa 6 e external smoke passou na tentativa 1. Core e Lily tinham 12 e 38 migrations, sem pendências; backups foram verificados. Evidência `/srv/carro-chefe/data/deploy-logs/deploy-20261030-001300-6bfcf7927999.evidence`; log `/srv/carro-chefe/data/deploy-logs/deploy-20261030-001300-6bfcf7927999.log`.
- Homologação no domínio real via exclusivamente Codex IAB: `/lilyacai/painel/fidelidade` carregou em 1365×900 e 390×844; console sem `error` ou `warn`. A primeira tentativa de reconectar às abas antigas falhou, mas a nova aba integrada carregou a tela e concluiu a validação visual. Não houve correções necessárias.
- `npm run build:lily`: PASS após restaurar as experimentações, 35 assets JS, 563.47 KiB raw / 178.57 KiB gzip total, 40.93 KiB gzip inicial, chunk máximo 61.42 KiB; `npm run test:lily-budget`: 4/4 PASS; `git diff --check`: PASS. CI #263 7/7 PASS; deploy `6bfcf79` em produção.

## Migrations

- Nenhuma.

## Bloqueios/riscos

- O agregado gzip de todos os chunks atingiu 18,7% de redução e ficou 1,3 p.p. abaixo de 20%; a carga inicial gzip, que é o critério de transferência inicial adotado, caiu 70,3%. Continuar reduzindo o agregado exigiria trabalho adicional e não é reportado como meta atingida.
- O editor de catálogo ainda carrega todo o payload administrativo. Para atender integralmente ao fluxo pedido, implementar endpoints separados para resumo/lista e detalhe de produto e substituir o editor sempre montado por detalhe carregado ao abrir.
- Sem mudanças de API neste marco; não afirmar redução de dados do catálogo ainda.

## Homologação/dependências externas

- PR integrado; SSH key fingerprint local conferido com a chave previamente autorizada pelo proprietário.
- O catálogo administrativo continua sem o fluxo de índice leve/detalhe por produto; não foi implementado neste ciclo de budget. Nenhuma mudança de contrato/API faz parte dos PRs desta entrega.

## Retomada solicitada em 2026-10-29

- O proprietário esclareceu que a redução de 20% precisa ser medida sobre a soma gzip dos 35 chunks, comparada ao baseline `219.72 KiB` (`224,993` bytes); o limite é estritamente menor que `179,995` bytes, ou no máximo `179,994` bytes inteiros. A medição anterior `178.57 KiB` (`182,855` bytes) não alcança a condição; é preciso reduzir pelo menos `2,861` bytes nesta medida.
- Depois de alcançar o limite agregado, iniciar o próximo item técnico de roadmap pendente nesta área: catálogo administrativo progressivo, com lista leve e detalhe/configuração do produto carregados sob demanda. Integrar, implantar na VPS, homologar no domínio em desktop/mobile pelo IAB, corrigir e repetir até aceite.
- Retomada começa em `cooklily/canonical` SHA `4f1d09a5d5f5255bad8f2f816c285e34abdebafa`; aplicação implantada continua `6bfcf79279998614454c72e462b87cbcc43a053f` até novo deploy.
- Verificação desta retomada: uma variante experimental de chunking emitiu 33 chunks JS com 181,443 bytes gzip (177.19 KiB), redução de 19.36%, e foi descartada por não atingir a meta. A configuração original, no rebuild limpo, emite 35 chunks JS: soma gzip exata 182,855 bytes (178.57 KiB), redução de 18.73%; falta reduzir 2,861 bytes para chegar ao máximo 179,994. Grafo inicial 41,912 bytes, chunk maior 62,891 bytes. `npm run test:lily-ui` PASS: 21 arquivos, 96 testes.
- Experimento Terser 5.51.2 com três passes, usando pacote local no `node_modules` ignorado, resultou em 181,999 bytes e foi descartado; configuração retornou ao minificador padrão. Reorganizar arquivos compartilhados de perfil/recorte e phone formatter não gerou economia relevante e foi revertido. Estratégia atual permanece com divisão por rotas e `shared-app minShareCount:2`; experimentos que tornavam o admin eager ou excediam chunk inicial/largest não foram aceitos.

## Próximo item autorizado pelo proprietário

- Em 2026-10-29, o proprietário autorizou iniciar o próximo item do roadmap antes de resolver a meta agregada de gzip. A meta continua pendente e não deve ser reportada como atingida.
- Implementação do catálogo progressivo em andamento: `/admin/catalog/index` retorna categorias e resumos de produto, `/admin/products/:id/editor` exige staff e retorna configuração de um produto, e `/admin/catalog` legado continua disponível para resumo geral/mídias e para a área de cadastros globais carregada só quando expandida.
- Interface com busca por nome/categoria, filtro de categoria, contagem de resultados e detalhe expansível; só dispara busca do editor ao abrir o produto. Nenhuma migration.
- Gates do item: `npm test` PASS (75 arquivos, 393 passaram, 3 skipped); `npm run check` PASS; `npm run build` PASS após retirar estilos CSS que excediam o budget; budget Lily PASS: JS 566.82 KiB raw / 179.47 KiB gzip, inicial 40.99 KiB, maior chunk 61.42 KiB; CSS 170.75 KiB raw / 33.88 KiB gzip; JS+CSS 213.35 KiB gzip; `git diff --check` PASS.
- Novos testes de contrato verificam dados reduzidos no índice, detalhe específico e bloqueio a clientes. `catalog.test.ts` PASS 16/16; UI PASS 21 arquivos, 97 testes.
- PR, CI, merge, deploy VPS e homologação integrada desktop/mobile ainda pendentes nesta etapa.
- PR #264 passou 7/7 checks no Actions run `40986990923` para o head `d1355e951b5f46d1bf6b62b5ff4c97cf4d536663`; Quality Node 20/24, Tool Health Linux, Windows Supervisor, Excel Recipe Ubuntu/Windows e Workbook Snapshot: PASS. PR pronta e mergeável; próximo passo é squash merge.

### Próxima ação exata

1. Abrir PR draft para `cooklily/canonical`, aguardar CI e integrar o catálogo progressivo após CI verde.
2. Implantar SHA integrado com `sudo cc deploy <sha-completo>` e registrar os dados reais do deploy.
3. Homologar o editor no domínio em desktop e mobile somente pelo Codex IAB; corrigir e repetir até aceite.
4. Retomar a redução agregada de gzip até o limite `<=179,994` bytes, depois de fechar este item, e atualizar o status do checkpoint com ambos os resultados.
