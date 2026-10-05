# Organização obrigatória do repositório

Este documento define a organização física do Carro Chefe e da operação isolada CookLily. O contrato machine-readable correspondente é `.repo/structure.json`; o mapa gerado é `docs/governanca/MAPA_REPOSITORIO.md`.

## Regra obrigatória

Todo agente, pessoa ou automação que criar, mover, renomear ou remover arquivo no repositório deve:

1. consultar o mapa antes da alteração;
2. reutilizar uma categoria existente sempre que ela representar o conteúdo;
3. não criar diretório novo na raiz por conveniência;
4. tratar `apps/`, `packages/`, `tools/`, `deploy/`, `docs/`, `mídias/`, `logos/`, `cardápio/`, `anexos/` e os diretórios de governança conforme sua finalidade;
5. preservar a separação física entre Carro Chefe e CookLily;
6. preservar originais visuais e binários; derivado nunca substitui original;
7. atualizar todas as referências quando um caminho mudar;
8. alterar `.repo/structure.json` quando a estrutura canônica realmente mudar;
9. executar `npm run repo:map`, `npm run repo:map:check` e `npm run policy:check` antes de concluir;
10. manter o mapa e a mudança estrutural na mesma PR.

O preflight de política executado pelos agentes valida o contrato e o mapa. Uma estrutura fora do contrato é falha de política e não pode ser integrada às linhas canônicas.

## Critério de colocação

| Conteúdo | Destino canônico |
|---|---|
| aplicação executável Carro Chefe | `apps/<app>/` |
| frontend CookLily | `apps/lily_acai/` |
| backend CookLily | `apps/api/src/modules/lily/` |
| banco isolado CookLily | `packages/lily-database/` |
| biblioteca/contrato/banco compartilhado | `packages/<pacote>/` |
| automação, CLI, supervisor, gerador ou verificador | `tools/<ferramenta>/` |
| configuração e scripts de deploy | `deploy/` |
| documentação humana | `docs/<categoria>/` |
| documentação CookLily nova | índice em `docs/cooklily/` e, enquanto durar a compatibilidade aprovada, conteúdo operacional em `docs/lily-acai/` |
| acervo bruto legado já catalogado | `mídias/files/` — somente preservação/compatibilidade |
| ativos CookLily | `mídias/cooklily/` |
| mídia tratada/catalogada do Carro Chefe | `mídias/produtos/<produto>/` |
| fotos/vídeos do espaço físico | `mídias/espaco/` |
| novos originais sem categoria específica | `mídias/originais/` |
| logos oficiais | `logos/` |
| materiais visuais de cardápio preservados | `cardápio/` |
| workbook e anexos operacionais | `anexos/<dominio>/` |
| regras de agentes | cadeia `AGENTS.md` já existente; não criar novo escopo sem atualizar a política |

## Documentação

Arquivos soltos diretamente em `docs/` ficam limitados a `README.md` e `AGENTS.md`. As categorias estáveis são:

- `docs/carro-chefe/` — fronteira e índice documental do Carro Chefe;
- `docs/cooklily/` — índice canônico da CookLily;
- `docs/lily-acai/` — caminho histórico físico da documentação CookLily, preservado por compatibilidade até migração transacional aprovada;
- `docs/execution-checkpoints/` — checkpoints duráveis de execuções longas;
- `docs/ferramentas/` — inventário, saúde, pendências e bloqueios de ferramentas;
- `docs/financeiro/` — planilhas, modelos e documentação financeira não transacional;
- `docs/fundacao/` — arquitetura e roadmap de alto nível;
- `docs/governanca/` — agentes, GitHub, decisões, mapa e organização;
- `docs/historico/` — snapshots e status antigos preservados por evidência;
- `docs/negocio/` — marca, cardápio, marketing e funis do Carro Chefe;
- `docs/operacao/` — operação física, compras e equipe;
- `docs/pre-lancamento/` — campanha e implementação de pré-lançamento do Carro Chefe;
- `docs/referencias/` — documentos externos ou artefatos de referência;
- `docs/tecnologia/` — arquitetura técnica, dados e ferramentas técnicas.

## Mídias

`mídias/` separa origem, operação e marca:

- `mídias/files/` — acervo bruto legado já referenciado por manifests e documentação; não receber novos conjuntos por padrão;
- `mídias/originais/` — destino de novos originais sem categoria mais específica;
- `mídias/produtos/` — catálogos e derivados por produto do Carro Chefe;
- `mídias/cooklily/` — ativos e fichas de mídia CookLily;
- `mídias/espaco/` — imagens e vídeos do imóvel/estrutura física, incluindo os originais migrados da antiga pasta `planta da estrutura/`.

A regra de inspeção visual de `mídias/AGENTS.md` continua obrigatória.

## Ferramentas

Ferramentas próprias ficam em uma pasta própria dentro de `tools/`. Arquivos executáveis soltos só permanecem quando são runtime transversal já estabelecido. O verificador de performance da CookLily foi consolidado em `tools/lily-build-budget/`; o mapa e sua validação ficam em `tools/repo-map/`.

## Legado

`planejamento/` e `site/` não recebem novas funcionalidades. `elementos gráficos/` e `cardápio/` conservam originais. `docs/lily-acai/` e `mídias/files/` são exceções documentadas de compatibilidade e não autorizam novos caminhos genéricos.

## Branches

Existem somente duas linhas canônicas de produto: `main` e `cooklily/canonical`. Trabalho em andamento usa branch temporária e PR. Evidência histórica consolidada usa apenas `history/evidence`; não criar múltiplas branches de arquivo morto. Gates temporários devem ser fechados sem merge quando a validação termina, salvo destino explicitamente documentado.

Antes de remover uma branch concluída ou substituída, confirme que seu head está alcançável por `history/evidence` ou por uma branch canônica. A exclusão da ref nunca pode apagar evidência única.
