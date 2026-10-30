# CookLily: modularização das telas administrativas do catálogo

- status: in_progress
- owner: AG-DEV
- branch: `codex/lily-admin-modules-continued`
- base_branch: `cooklily/canonical`
- base_sha_verified: `f3e83f8`
- head_sha_verified: `f3e83f8` (mudanças locais ainda não commitadas)
- pull_requests: nenhum aberto
- last_verified_at: 2026-10-30 19:03 America/Sao_Paulo
- interruption_state: none

## Entrega

Concluir a primeira reorganização focada do painel de catálogo, deixando `admin.tsx` como composição de páginas e extraindo formulários e editores por responsabilidade, preservando contratos, carregamento progressivo e comportamento.

## Concluído e persistido

- PR #289 e release `3cc9869` modularizaram o editor de produto, formatadores, tipos e campos de alergênicos; deploy e homologação constam em `cooklily-admin-catalog-modularization-2026-10-30.md`.
- Inventário das responsabilidades administrativas restantes: criação de produtos, categorias, sabores/adicionais e compatibilidade, combos/ofertas, configurações globais e índice/filtros.
- Extraídos os componentes listados para módulos coesos sob `features/admin/catalog/`; utilitários de autosave e editor de alergênicos também foram isolados.
- `admin.tsx` foi reduzido a 111 linhas e preserva o acesso lazy aos cadastros globais e ao detalhe por produto.
- Auditoria dirigida encontrou outros arquivos grandes fora do painel (catálogo público, API, entrada principal e páginas); o item amplo do roadmap continua parcial.

## Em andamento

- Abrir PR, passar CI, integrar, implantar e homologar a página do cardápio administrativo nos tamanhos desktop/mobile.

## Gates e testes

- Preflight AG-DEV em `apps/lily_acai/src/features/admin`: passou, manifesto `24d8c85aea46ed391826fb0e89daad9df54cce974cadfd30f1bc6008f8d1e7a5`.
- `npm run test:lily-ui`: passou, 25 arquivos/109 testes.
- `npm run check`: passou.
- `npm test -- --maxWorkers=1`: passou, 81 arquivos/421 testes, 3 ignorados.
- `npm run build`: passou; 188.59 KiB JS gzip e 223.91 KiB JS+CSS gzip, budgets OK.
- `git diff --check`: passou.
- CI, merge, deploy e homologação desta fatia ainda pendentes.

## Migrations

- Nenhuma.

## Bloqueios/riscos

- Garantir que os formulários permaneçam lazy e não alterem configuração até interação explícita.
- Revalidar visualmente o editor/listagem após deploy.

## Homologação/dependências externas

- Sem credenciais ou serviços externos necessários.
- Usar somente o navegador integrado do Codex; em desktop e mobile conferir 35 cards, abrir o editor de produto e abrir cadastros globais sem salvar alterações.

## Próxima ação exata

Revisar diff, registrar PR, aguardar todos os checks e integrar antes de executar deploy.
