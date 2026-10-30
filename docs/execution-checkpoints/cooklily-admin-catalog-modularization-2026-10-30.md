# CookLily: modularização do editor do catálogo administrativo

- status: in_progress
- owner: AG-DEV
- branch: `codex/lily-admin-catalog-modularization`
- base_branch: `cooklily/canonical`
- base_sha_verified: `8526d5d0e6ec18b7495e78b4c146aa1f25c68a3d`
- head_sha_verified: `cec18f8ea63f43696b8c6b2d34208ca3d7c8d0c0`
- pull_requests: PR #289 merged by squash; CI passed on Node 20/24 and all required jobs
- last_verified_at: 2026-10-30 18:46 America/Sao_Paulo
- interruption_state: none

## Entrega

Iniciar a modularização incremental prevista no roadmap para `apps/lily_acai/src/admin.tsx` (1.206 linhas), isolando o fluxo de edição de produto em módulos de catálogo coesos, sem alterar comportamento nem contratos.

## Concluído e persistido

- O editor progressivo anterior está homologado no domínio real em desktop e mobile; PR #288 corrigiu cards invisíveis e o checkpoint correspondente está concluído.
- Preflight de AG-DEV passou para `apps/lily_acai/src/features/admin/catalog-editor`, manifesto `24d8c85aea46ed391826fb0e89daad9df54cce974cadfd30f1bc6008f8d1e7a5`.
- Preflight repetido após a edição para `apps/lily_acai/src/features/admin/catalog`, mesmo manifesto.
- Inventário dirigido: `admin.tsx` tem 1.206 linhas; `ProductEditor`, `ProductEditorForm`, `ProductVariantEditor` e formatação de preços são responsabilidades de catálogo elegíveis para extração.
- Primeira fatia extraída: `ProductEditor`/formulário/variações em `features/admin/catalog/ProductEditor.tsx`; resumo de produto em `types.ts`; formatação monetária em `product-money.ts`; controle compartilhado de alergênicos em `features/admin/AllergenAdminFields.tsx`.
- `admin.tsx` agora compõe e usa esses módulos; as outras telas administrativas permanecem inalteradas.
- Roadmap atualizado com a homologação de #284/#285/#288 e marca a auditoria modular como parcial, sem declarar concluída a reestruturação ampla.
- Commit `cec18f8ea63f43696b8c6b2d34208ca3d7c8d0c0` integrou a primeira fatia modular em `cooklily/canonical` via PR #289.

## Em andamento

- Extrair o editor e os tipos/formatadores diretamente relacionados para `features/admin/catalog/`.
- Manter o autosave, leitura progressiva, campos e persistência idênticos.
- Atualizar testes estruturais para apontarem ao novo módulo e cobrir formatadores puros.

## Gates e testes

- `npm run test:lily-ui`: passou após a refatoração, 25 arquivos/109 testes.
- `npm run check`: passou, geração/validação Prisma e TypeScript.
- `npm test -- --maxWorkers=1`: passou, 80 arquivos/420 testes, 3 ignorados.
- `npm run build`: passou; bundle CookLily 188.70/189 KiB JS gzip, 224.02/225 KiB JS+CSS gzip, budget OK.
- `git diff --check`: passou.
- CI e merge do PR #289 passaram; deploy e homologação dessa fatia ainda pendentes.

## Migrations

- Nenhuma esperada.

## Bloqueios/riscos

- Preservar os limites de lazy loading do índice do catálogo e carregamento do detalhe somente ao abrir um produto.
- O budget CookLily de gzip tem margem pequena; confirmar no build Linux antes do deploy.

## Homologação/dependências externas

- Sem credenciais ou serviços externos necessários.
- Após integração e deploy, retestar `/lilyacai/painel/cardapio` no navegador integrado do Codex em desktop e mobile; abrir um produto sem salvar alterações.

## Próxima ação exata

Publicar este checkpoint no canonical e executar `sudo cc deploy canonical`; depois homologar o modal de edição em desktop e mobile pelo navegador integrado.
