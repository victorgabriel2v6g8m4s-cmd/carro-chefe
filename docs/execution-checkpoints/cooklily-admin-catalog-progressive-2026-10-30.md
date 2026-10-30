# CookLily: editor progressivo do catálogo administrativo

- status: awaiting_corrective_ci
- owner: AG-DEV
- branch: `codex/cooklily-admin-catalog-budget`
- base_branch: `cooklily/canonical`
- base_sha_verified: `cc61c25d99ae48b8d38d42265ef65db5489f0e88`
- head_sha_verified: `693835d85e50e0d2cec3a1a5b8a8790e1a0262fb`
- pull_requests: PR #284 merged (`cc61c25`); PR #285 draft https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/285
- last_verified_at: 2026-10-30 16:44 America/Sao_Paulo
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
- PR #284 CI passou em todos os jobs do run `41114715751`; merged em `cc61c25d99ae48b8d38d42265ef65db5489f0e88`.
- Deploy VPS iniciado em 30/10/2026; gate de build reprovou: JS gzip 189.16/189.00 KiB. Rollback automático confirmado para `97f1dfb6953168f5de4feb399f28ff2268df1324`; nenhum migration real foi iniciado e o domínio continua na versão anterior.

## Em andamento

- Acompanhar CI do PR #285; integrar após verde.
- Repetir deploy e homologar desktop/mobile exclusivamente pelo navegador integrado do Codex.

## Gates e testes

- CI: PR #284 aprovado (run `41114715751`), merged. PR #285 criado como draft; CI pendente.
- Antes do ajuste corretivo: todos os gates locais passaram, budget Windows 188.97/189 KiB. Deploy Linux mostrou variação de +0.19 KiB; a implementação está sendo reduzida para ter margem cross-platform.
- Ajuste corretivo local: simplificada abertura/fechamento do modal e card; `npm run test:lily-ui` (107), `npm run check`, `npm test -- --maxWorkers=1` (419 aprovados, 3 ignorados), `npm run build` e `git diff --check` passaram. Budget Windows: JS gzip 188.79/189 KiB, JS+CSS gzip 224.11/225 KiB.
- Novo PR corretivo/CI e novo deploy Linux são necessários para confirmar margem multiplataforma.
- Navegador desktop/mobile: pendente de um deploy bem-sucedido.

## Migrations

- Nenhuma esperada. Endpoints de índice e detalhe já existem.

## Bloqueios/riscos

- Evitar enviar todos os produtos, sabores, adicionais e mídias para a lista resumida; o índice existente é a fonte do card e o endpoint editor segue a única leitura de detalhes.
- Não publicar nem alterar produtos na conta; validar somente o comportamento de leitura do painel.

## Homologação/dependências externas

- Domínio de teste: `https://carrochefe.com/lilyacai/painel/cardapio`.
- Usar exclusivamente o navegador integrado do Codex, em desktop e mobile, após deploy.

## Próxima ação exata

Aguardar todos os checks do PR #285; então marcar pronto, integrar, implantar, confirmar o budget Linux e homologar no navegador integrado do Codex em desktop e mobile.
