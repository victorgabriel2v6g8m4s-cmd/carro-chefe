# Organização obrigatória do repositório

Este documento define a organização física do Carro Chefe. O contrato machine-readable correspondente é `.repo/structure.json`; o mapa gerado é `docs/governanca/MAPA_REPOSITORIO.md`.

## Regra obrigatória

Todo agente, pessoa ou automação que criar, mover, renomear ou remover arquivo no repositório deve:

1. consultar o mapa antes da alteração;
2. reutilizar uma categoria existente sempre que ela representar o conteúdo;
3. não criar diretório novo na raiz por conveniência;
4. tratar `apps/`, `packages/`, `tools/`, `deploy/`, `docs/`, `mídias/`, `logos/`, `cardápio/`, `anexos/` e os diretórios de governança conforme sua finalidade;
5. preservar originais visuais e binários; derivado nunca substitui original;
6. atualizar todas as referências quando um caminho mudar;
7. alterar `.repo/structure.json` quando a estrutura canônica realmente mudar;
8. executar `npm run repo:map`, `npm run repo:map:check` e `npm run policy:check` antes de concluir;
9. manter o mapa e a mudança estrutural na mesma PR.

O preflight de política executado pelos agentes valida o contrato e o mapa. O CI aplica o mesmo gate. Uma estrutura fora do contrato é, portanto, uma falha de política e não pode ser integrada à `main`.

## Critério de colocação

| Conteúdo | Destino canônico |
|---|---|
| aplicação executável | `apps/<app>/` |
| biblioteca/contrato/banco compartilhado | `packages/<pacote>/` |
| automação, CLI, supervisor, gerador, verificador | `tools/<ferramenta>/` |
| configuração de deploy | `deploy/` |
| documentação humana | `docs/<categoria>/` |
| fotos e vídeos originais | `mídias/originais/` ou categoria específica de `mídias/` |
| mídia tratada/catalogada de produto | `mídias/produtos/<produto>/` |
| fotos/vídeos do espaço físico | `mídias/espaco/` |
| logos oficiais | `logos/` |
| materiais visuais de cardápio preservados | `cardápio/` |
| workbook e anexos operacionais | `anexos/<dominio>/` |
| regras de agentes | cadeia `AGENTS.md` já existente; não criar um novo escopo sem atualizar a política |

## Documentação

`docs/` deve ficar categorizado. Arquivos soltos na raiz de `docs/` são limitados a `README.md` e `AGENTS.md`. Novas categorias só são justificadas quando houver um domínio estável, não para acomodar um único arquivo.

Categorias canônicas atuais:

- `docs/ferramentas/` — inventário, saúde, pendências e bloqueios de ferramentas;
- `docs/financeiro/` — planilhas, modelos e documentação financeira não transacional;
- `docs/fundacao/` — arquitetura e roadmap de alto nível;
- `docs/governanca/` — agentes, GitHub, decisões, mapa e organização;
- `docs/historico/` — snapshots/status antigos preservados por evidência;
- `docs/negocio/` — marca, cardápio, marketing e funis;
- `docs/operacao/` — operação física, compras e equipe;
- `docs/pre-lancamento/` — campanha e implementação de pré-lançamento;
- `docs/referencias/` — documentos externos ou artefatos de referência;
- `docs/tecnologia/` — arquitetura técnica, dados e ferramentas técnicas.

## Mídias

`mídias/` separa origem de curadoria:

- `mídias/originais/` — arquivos recebidos sem tratamento; nomes originais podem ser preservados para rastreabilidade;
- `mídias/produtos/` — catálogos, seleção e derivados por produto;
- `mídias/espaco/` — imagens e vídeos do imóvel/estrutura física.

A regra de inspeção visual definida em `mídias/AGENTS.md` continua obrigatória.

## Legado

`planejamento/` e `site/` não recebem novas funcionalidades. Permanecem rastreados por compatibilidade/evidência até a migração formal. `elementos gráficos/` e `cardápio/` conservam originais e regras existentes; novos derivados devem seguir a organização de mídias.

## Branches

Existem somente duas linhas canônicas de produto: `main` e `cooklily/canonical`. Trabalho em andamento usa branch temporária e PR. Evidência histórica consolidada usa apenas `history/evidence`; não criar múltiplas branches de arquivo morto. Gates temporários devem ser fechados sem merge quando a validação termina, salvo se o PR declarar explicitamente outro destino.

Antes de remover uma branch concluída/superseded, confirme que seu head está alcançável pela branch `history/evidence` ou por uma branch canônica. A exclusão da ref não deve apagar evidência única.
