# CookLily: editor progressivo do catálogo administrativo

- status: completed
- owner: AG-DEV
- branch: `codex/fix-admin-catalog-reveal`
- base_branch: `cooklily/canonical`
- base_sha_verified: `cc61c25d99ae48b8d38d42265ef65db5489f0e88`
- head_sha_verified: `eb71d7afcc78c4a5385a1879b01d97ecbc29353f`
- pull_requests: PR #284 merged (`cc61c25`); PR #285 merged (`7d6fa3d`); corrective PR #288 merged (`eb71d7a`)
- last_verified_at: 2026-10-30 18:30 America/Sao_Paulo
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
- O primeiro deploy da implementação inicial reprovou o budget Linux (JS gzip 189.16/189.00 KiB) e fez rollback automático para `97f1dfb6953168f5de4feb399f28ff2268df1324`; nenhum migration real foi iniciado.
- A correção de margem do bundle foi integrada por PR #285 no SHA `7d6fa3d36b8b74f6dc0529b5279d407d7aadb3dd`. Deploy full em 30/10 às 19:43 BRT terminou com backup verificado, health interno/CookLily/fulfillment e external smoke OK. Budget Linux: JS gzip 188.98/189.00 KiB; `build_budget=ok`; evidência `/srv/carro-chefe/data/deploy-logs/deploy-20261030-194345-7d6fa3d36b8b.evidence`.
- Na homologação integrada mobile 390×844 do release `7d6fa3d`, o índice exibia 35 produtos e o modal do produto selecionado carregava seus campos, mas os cards tinham `opacity: 0` porque `CatalogProductCard` incluía `data-lily-reveal` sem o observador da página pública no painel. A falha foi reproduzida em DOM e screenshot.
- Correção: removido `data-lily-reveal` somente do card administrativo; teste impede reintrodução do atributo. PR #288 foi integrado por squash em `eb71d7afcc78c4a5385a1879b01d97ecbc29353f` após todos os checks de CI passarem.
- Deploy canônico `44e5250af91e205ca1c65e18c789d033d38681bf` concluído em 30/10/2026 18:24 BRT; backup verificado, sem migrations reais pendentes, readiness interno, saúde Lily/fulfillment e smoke HTTPS passaram. Budget Linux: JS gzip 188.95/189 KiB; JS+CSS gzip 224.29/225 KiB; `build_budget=ok`.
- Homologação pós-correção exclusivamente no navegador integrado do Codex: desktop 1365×900 e mobile 390×844. Em ambos, 35 cards administrativos calcularam `opacity: 1`, sem `data-lily-reveal`; abriu-se o editor de LilyMix e o detalhe carregou (campos de nome, descrição, categoria, status, link de prévia, capa e configuração). No mobile o modal mediu 337 px dentro do viewport de 390 px; largura do documento 375 px, sem overflow horizontal. No desktop a largura do documento foi 1350 px para viewport de 1365 px, sem overflow. Nenhum erro de console foi registrado. O modal foi fechado sem salvar alterações e o viewport foi restaurado ao padrão.

## Em andamento

- Implantar canonical contendo a correção de visibilidade.
- Repetir homologação desktop e mobile exclusivamente pelo navegador integrado do Codex, confirmando cards visíveis, modal de produto e ausência de overflow/regressões.

## Gates e testes

- CI: PR #284 aprovado (run `41114715751`), PR #285 aprovado e integrado, PR #288 aprovado e integrado.
- Build/deploy do SHA `7d6fa3d`: budget JS gzip 188.98/189.00 KiB no Linux, JS+CSS gzip 224.33/225.00 KiB; `build_budget=ok`.
- Correção PR #288: `npm run test:lily-ui` (24 arquivos/107 testes), `npm run check`, `npm test -- --maxWorkers=1` (80 arquivos, 419 aprovados e 3 ignorados), `npm run build` (JS gzip 188.75/189 KiB e JS+CSS gzip 224.07/225 KiB), `git diff --check` e CI completo passaram.
- Deploy e homologação desktop/mobile do SHA canônico `44e5250`: concluídos.

## Migrations

- Nenhuma esperada. Endpoints de índice e detalhe já existem.

## Bloqueios/riscos

- Evitar enviar todos os produtos, sabores, adicionais e mídias para a lista resumida; o índice existente é a fonte do card e o endpoint editor segue a única leitura de detalhes.
- Não publicar nem alterar produtos na conta; validar somente o comportamento de leitura do painel.

## Homologação/dependências externas

- Domínio de teste: `https://carrochefe.com/lilyacai/painel/cardapio`.
- Observação pré-correção: desktop 1365×900 carregava lista e editor; mobile 390×844 tinha cards invisíveis apesar do detalhe funcionar. A falha foi corrigida e retestada após deploy.
- Homologação final: navegador integrado do Codex, desktop 1365×900 e mobile 390×844; cards visíveis, editor do produto selecionado carregado, sem overflow horizontal nem erros de console.

## Próxima ação exata

Próximo item independente de credenciais: iniciar a modularização incremental de `apps/lily_acai/src/admin.tsx` (1.206 linhas), começando por extrair o formulário de edição do produto como módulo de catálogo coeso, com regressões cobertas e sem mudar comportamento.
