# Mapa do repositório

> Gerado a partir de `.repo/structure.json` por `tools/repo-map/generate.mjs`. Não edite a árvore manualmente; altere o contrato e execute `npm run repo:map`.

## Regra operacional

Este mapa é parte do contrato de organização do Carro Chefe. Qualquer criação, movimentação ou remoção estrutural deve respeitar `.repo/structure.json` e atualizar este arquivo na mesma entrega. `npm run policy:check` e o preflight de agentes validam o mapa automaticamente.

## Categorias canônicas

| Caminho | Categoria | Finalidade |
|---|---|---|
| `apps/` | Aplicações | Aplicações executáveis: API, Central, site público e QR Lab. |
| `packages/` | Pacotes | Contratos, banco e UI compartilhados. |
| `tools/` | Ferramentas | Automação, políticas, Excel, supervisor, health checks e mapa. |
| `deploy/` | Infraestrutura | Configuração e exemplos de deploy; não é documentação geral. |
| `docs/` | Documentação | Decisões, arquitetura, operação, governança, histórico e referências. |
| `mídias/` | Mídias | Originais, catálogo de produtos e registros visuais do espaço. |
| `logos/` | Marca | Logotipos oficiais e elementos gráficos de marca. |
| `cardápio/` | Cardápio visual | Originais do cardápio preservados sob regras próprias. |
| `anexos/` | Anexos de dados | Arquivos binários de referência operacional, especialmente financeiro. |
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
│   ├── qr_manipulator/
│   └── site/
├── cardápio/
├── deploy/
│   ├── nginx/
│   └── systemd/
├── docs/
│   ├── ferramentas/
│   ├── financeiro/
│   ├── fundacao/
│   ├── governanca/
│   ├── historico/
│   ├── negocio/
│   ├── operacao/
│   ├── pre-lancamento/
│   ├── referencias/
│   └── tecnologia/
├── elementos gráficos/
├── logos/
├── mídias/
│   ├── espaco/
│   ├── files/
│   ├── originais/
│   └── produtos/
├── packages/
│   ├── contracts/
│   ├── database/
│   └── ui/
├── planejamento/
├── site/
├── tools/
│   ├── agent-policy/
│   ├── excel_recipe/
│   ├── excel_snapshot/
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
- `apps/`: subpastas permitidas = `api/`, `gestao/`, `qr_manipulator/`, `site/`; arquivos diretos permitidos = `AGENTS.md`.
- `deploy/`: subpastas permitidas = `nginx/`, `systemd/`; arquivos diretos permitidos = `README.md`.
- `docs/`: subpastas permitidas = `ferramentas/`, `financeiro/`, `fundacao/`, `governanca/`, `historico/`, `negocio/`, `operacao/`, `pre-lancamento/`, `referencias/`, `tecnologia/`; arquivos diretos permitidos = `AGENTS.md`, `README.md`.
- `mídias/`: subpastas permitidas = `espaco/`, `files/`, `originais/`, `produtos/`; arquivos diretos permitidos = `AGENTS.md`, `README.md`.
- `packages/`: subpastas permitidas = `contracts/`, `database/`, `ui/`; arquivos diretos permitidos = `AGENTS.md`.
- `tools/`: subpastas permitidas = `agent-policy/`, `excel_recipe/`, `excel_snapshot/`, `repo-map/`, `tool-health/`, `windows-supervisor/`; arquivos diretos permitidos = `AGENTS.md`, `agent-runtime.mjs`.

## Legado preservado

- `planejamento/` — Preservado até paridade e migração definitiva da V2.
- `site/` — Placeholder histórico; código público ativo fica em `apps/site/`.
- `cardápio/` — Mantido por regras locais e preservação do original; novos derivados devem ser catalogados em `mídias/`.
- `elementos gráficos/` — Originais de marca preservados; não criar novos arquivos soltos aqui.
- `mídias/files/` — Acervo bruto legado preservado porque manifests e referências históricas apontam para esses caminhos; não receber novos arquivos.

## Política de branches

- Canônicas: `main`, `cooklily/canonical`.
- Evidências históricas: `history/evidence`.
- Prefixos temporários aceitos: `feature/`, `feat/`, `fix/`, `chore/`, `docs/`, `gate/`, `dependabot/`.
- Branches temporárias existem apenas enquanto houver trabalho/PR ativo.
- Branches concluídas ou substituídas devem ter a evidência preservada em `history/evidence` antes de serem removidas.
- Gate branches nunca substituem uma branch canônica.
- Não criar nova branch histórica por assunto; usar `history/evidence`.

## Como alterar a estrutura

1. Leia este mapa e `docs/governanca/ORGANIZACAO_REPOSITORIO.md`.
2. Coloque o arquivo na categoria já existente. Não crie pasta de topo por conveniência.
3. Se a estrutura realmente precisar mudar, altere `.repo/structure.json` primeiro.
4. Execute `npm run repo:map` e depois `npm run repo:map:check`.
5. Atualize links, imports, manifests e documentação afetados na mesma PR.
6. Não marque a PR como pronta enquanto `npm run policy:check` ou o CI acusarem mapa desatualizado.
