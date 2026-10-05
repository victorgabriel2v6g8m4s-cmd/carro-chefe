# Mapa do repositório

> Gerado a partir de `.repo/structure.json` por `tools/repo-map/generate.mjs`. Não edite a árvore manualmente; altere o contrato e execute `npm run repo:map`.

## Regra operacional

Este mapa é parte do contrato de organização do Carro Chefe. Qualquer criação, movimentação ou remoção estrutural deve respeitar `.repo/structure.json` e atualizar este arquivo na mesma entrega. `npm run policy:check` e o preflight de agentes validam o mapa automaticamente.

## Categorias canônicas

| Caminho | Categoria | Finalidade |
|---|---|---|
| `apps/` | Aplicações | Aplicações executáveis: API, Central, site público, QR Lab e frontend CookLily. |
| `packages/` | Pacotes | Contratos, bancos e UI compartilhados; CookLily usa persistência isolada em lily-database. |
| `tools/` | Ferramentas | Automação, políticas, Excel, budget CookLily, supervisor, health checks e mapa. |
| `deploy/` | Infraestrutura | Nginx, systemd, scripts e validações de deploy. |
| `docs/` | Documentação | Decisões, arquitetura, operação, CookLily, governança, histórico e referências. |
| `mídias/` | Mídias | Acervo bruto, produtos, CookLily e registros visuais do espaço. |
| `logos/` | Marca | Logotipos oficiais e elementos gráficos de marca. |
| `cardápio/` | Cardápio visual | Originais do cardápio preservados sob regras próprias. |
| `anexos/` | Anexos de dados | Arquivos binários e receitas de referência operacional/financeira. |
| `planejamento/` | Legado operacional | Implementação legada preservada até paridade da arquitetura V2. |
| `site/` | Legado de site | Placeholder histórico; novas implementações pertencem a apps/site/. |
| `.agent-policy/` | Governança de agentes | Manifesto e cápsulas de política. |
| `.codex/` | Configuração de agentes | Perfis e configuração Codex. |
| `.github/` | Governança GitHub | CI, templates e automações do repositório. |

## Estrutura controlada

```text
.
├── .agent-policy/
├── .codex/
├── .github/
├── .repo/
├── anexos/
│   └── financeiro/
├── apps/
│   ├── api/
│   ├── gestao/
│   ├── lily_acai/
│   ├── qr_manipulator/
│   └── site/
├── cardápio/
├── deploy/
│   ├── nginx/
│   ├── scripts/
│   ├── systemd/
│   └── validation/
├── docs/
│   ├── carro-chefe/
│   ├── cooklily/
│   ├── execution-checkpoints/
│   ├── ferramentas/
│   ├── financeiro/
│   ├── fundacao/
│   ├── governanca/
│   ├── historico/
│   ├── lily-acai/
│   ├── negocio/
│   ├── operacao/
│   ├── pre-lancamento/
│   ├── referencias/
│   └── tecnologia/
├── elementos gráficos/
├── logos/
├── mídias/
│   ├── cooklily/
│   ├── espaco/
│   ├── files/
│   ├── originais/
│   └── produtos/
├── packages/
│   ├── contracts/
│   ├── database/
│   ├── lily-database/
│   └── ui/
├── planejamento/
├── site/
├── tools/
│   ├── agent-policy/
│   ├── excel_recipe/
│   ├── excel_snapshot/
│   ├── lily-build-budget/
│   ├── repo-map/
│   ├── tool-health/
│   └── windows-supervisor/
├── .env.example
├── .gitattributes
├── .gitignore
├── AGENTS.md
├── NOTICE.md
├── README.md
├── REGRAS.md
├── package-lock.json
├── package.json
├── prisma.config.ts
├── tsconfig.json
├── vitest.config.ts
```

## Diretórios gerenciados

- `anexos/`: subpastas permitidas = `financeiro/`; arquivos diretos permitidos = nenhum.
- `apps/`: subpastas permitidas = `api/`, `gestao/`, `lily_acai/`, `qr_manipulator/`, `site/`; arquivos diretos permitidos = `AGENTS.md`.
- `deploy/`: subpastas permitidas = `nginx/`, `scripts/`, `systemd/`, `validation/`; arquivos diretos permitidos = `README.md`.
- `docs/`: subpastas permitidas = `carro-chefe/`, `cooklily/`, `execution-checkpoints/`, `ferramentas/`, `financeiro/`, `fundacao/`, `governanca/`, `historico/`, `lily-acai/`, `negocio/`, `operacao/`, `pre-lancamento/`, `referencias/`, `tecnologia/`; arquivos diretos permitidos = `AGENTS.md`, `README.md`.
- `mídias/`: subpastas permitidas = `cooklily/`, `espaco/`, `files/`, `originais/`, `produtos/`; arquivos diretos permitidos = `AGENTS.md`, `README.md`.
- `packages/`: subpastas permitidas = `contracts/`, `database/`, `lily-database/`, `ui/`; arquivos diretos permitidos = `AGENTS.md`.
- `tools/`: subpastas permitidas = `agent-policy/`, `excel_recipe/`, `excel_snapshot/`, `lily-build-budget/`, `repo-map/`, `tool-health/`, `windows-supervisor/`; arquivos diretos permitidos = `AGENTS.md`, `agent-runtime.mjs`.

## Legado preservado

- `planejamento/` — Preservado até paridade e migração definitiva da V2.
- `site/` — Placeholder histórico; código público ativo fica em apps/site/.
- `cardápio/` — Mantido por regras locais e preservação do original; novos derivados devem ser catalogados em mídias/.
- `elementos gráficos/` — Originais de marca preservados; não criar novos arquivos soltos aqui.
- `mídias/files/` — Acervo bruto legado preservado porque manifests e referências históricas apontam para esses caminhos; não receber novos arquivos.
- `docs/lily-acai/` — Caminho físico histórico da documentação CookLily preservado por compatibilidade; docs/cooklily/ é o índice canônico.

## Política de branches

- Canônicas: `main`, `cooklily/canonical`.
- Evidências históricas: `history/evidence`.
- Prefixos temporários aceitos: `feature/`, `feat/`, `fix/`, `chore/`, `docs/`, `gate/`, `dependabot/`.
- Branches temporárias existem apenas enquanto houver trabalho/PR ativo.
- Branches concluídas ou substituídas devem ter a evidência preservada em history/evidence antes de serem removidas.
- Gate branches nunca substituem uma branch canônica.
- Não criar nova branch histórica por assunto; usar history/evidence.

## Como alterar a estrutura

1. Leia este mapa e `docs/governanca/ORGANIZACAO_REPOSITORIO.md`.
2. Coloque o arquivo na categoria já existente. Não crie pasta de topo por conveniência.
3. Se a estrutura realmente precisar mudar, altere `.repo/structure.json` primeiro.
4. Execute `npm run repo:map` e depois `npm run repo:map:check`.
5. Atualize links, imports, manifests e documentação afetados na mesma PR.
6. Não marque a PR como pronta enquanto `npm run policy:check` ou o CI acusarem mapa desatualizado.
