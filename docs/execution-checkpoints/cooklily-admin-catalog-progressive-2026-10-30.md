# CookLily: editor progressivo do catálogo administrativo

- status: awaiting_ci_and_homologation
- owner: AG-DEV
- branch: `codex/cooklily-admin-catalog-progressive`
- base_branch: `cooklily/canonical`
- base_sha_verified: `10669b2c30d741573d6bb91873f3f6da64393c07`
- head_sha_verified: `f482dbab41094cf60b116b1c4b9d55aab82b0956` (commit inicial; checkpoint será atualizado em cada marco durável)
- pull_requests: nenhum
- last_verified_at: 2026-10-30 16:24 America/Sao_Paulo
- interruption_state: none

## Entrega

Concluir o próximo item do roadmap CookLily que não exige configuração Meta/OpenAI: tornar a lista de produtos do painel visualmente consistente com o cardápio público e abrir o editor daquele produto em um modal, carregando seu detalhe sob demanda.

## Concluído no working tree

- Base canônica verificada no SHA `10669b2c30d741573d6bb91873f3f6da64393c07`; working tree limpo antes do trabalho.
- Confirmado que já existe índice resumido de produtos (`GET /api/v1/lily/admin/catalog/index`) e detalhe staff por produto (`GET /api/v1/lily/admin/products/:id/editor`), com teste de que o índice não carrega sabores/mídias e detalhe corresponde a apenas um produto.
- A implementação atual abre o detalhe num `<details>` inline e não reutiliza a mesma apresentação visual do produto público. Este checkpoint fecha o restante desse critério e preserva os endpoints progressivos já existentes.
- Preflight passou em `npm run policy:preflight -- --agent AG-DEV --scope lily/admin-catalog-progressive`, hash `24d8c85aea46ed391826fb0e89daad9df54cce974cadfd30f1bc6008f8d1e7a5`.
- O grid administrativo agora reaproveita o padrão visual `CatalogProductCard` (classes/imagem/preço/badges) e abre editor nativo modal com `showModal()`; o endpoint de detalhe segue chamado apenas no primeiro acionamento e mantém retry/feedback.
- Resumo da listagem continua sem dados de sabores e mídia; somente o GET de editor para o produto selecionado recebe dados completos.
- `npm run test:lily-ui`: 24 arquivos, 107 testes aprovados.
- `npm run check`: schemas Prisma e TypeScript aprovados.
- `npm test -- --maxWorkers=1`: 80 arquivos, 419 aprovados e 3 ignorados.
- `npm run build`: concluído; budget CookLily: JS gzip 188.97/189 KiB, CSS bruto 178.99/179 KiB, JS+CSS gzip 224.29/225 KiB.
- `git diff --check`: aprovado. Nenhuma migration.

## Em andamento

- Revisar/commit, abrir PR draft e acompanhar CI.
- Integrar a `cooklily/canonical`, fazer deploy e homologar desktop/mobile exclusivamente pelo navegador integrado do Codex.

## Gates e testes

- CI: não iniciado.
- `npm run check`, `npm test -- --maxWorkers=1`, `npm run build`, `npm run test:lily-ui` passaram localmente.
- Navegador desktop/mobile: pendente após deploy.

## Migrations

- Nenhuma esperada. Endpoints de índice e detalhe já existem.

## Bloqueios/riscos

- Evitar enviar todos os produtos, sabores, adicionais e mídias para a lista resumida; o índice existente é a fonte do card e o endpoint editor segue a única leitura de detalhes.
- Não publicar nem alterar produtos na conta; validar somente o comportamento de leitura do painel.

## Homologação/dependências externas

- Domínio de teste: `https://carrochefe.com/lilyacai/painel/cardapio`.
- Usar exclusivamente o navegador integrado do Codex, em desktop e mobile, após deploy.

## Próxima ação exata

Fazer revisão final e commit da implementação; criar PR draft para `cooklily/canonical`, aguardar CI, integrar, implantar e homologar no navegador integrado do Codex em desktop e mobile.
