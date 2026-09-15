# Excel Recipe V3A — transformações físicas seguras

## Status

Implementada nesta entrega sobre a V2. A V3A adiciona transformações físicas de linhas, colunas e ranges ao mesmo `anexos/financeiro/carro chefe.xlsm`, mantendo o modelo transacional, auditável e fail-closed das versões anteriores.

V3B (gráficos), V3C (PivotTable/PivotCache) e V3D (VBA) continuam **planejadas, não disponíveis**.

## Objetivo

A V3A permite que uma receita JSON altere a topologia física de uma worksheet sem fazer substituições cegas. Antes da escrita, o motor constrói uma transformação de coordenadas, escaneia dependências e produz um plano determinístico. A mutação só é aceita quando o plano está limpo e ainda corresponde exatamente ao estado interno do pacote.

## Operações disponíveis

| Operação | Finalidade |
| --- | --- |
| `structural.plan` | analisar uma transformação física sem exigir ausência de blockers |
| `structural.assert_clean` | gerar o mesmo plano e abortar se houver blocker |
| `sheet.insert_rows` | inserir linhas e deslocar conteúdo/referências suportadas |
| `sheet.delete_rows` | excluir linhas e contrair conteúdo/referências suportadas |
| `sheet.insert_columns` | inserir colunas físicas |
| `sheet.delete_columns` | excluir colunas físicas |
| `range.move` | mover um range retangular não sobreposto |
| `table.insert_column` | inserir coluna no meio de uma Table |
| `table.delete_column` | remover coluna de Table quando não houver dependência bloqueadora |
| `table.compact_rows` | remover fisicamente linhas lógicas vazias dentro da Table |

A primeira fase aceita **uma transformação física por receita**. Rename estrutural da V2 e transformação física V3A também não podem ser compostos na mesma receita.

## Fluxo obrigatório

Investigue primeiro com `structural.plan`:

```json
{
  "op": "structural.plan",
  "action": "sheet.insert_rows",
  "sheet": "Custos Fixos",
  "at": 12,
  "count": 1
}
```

Para escrever, use o mesmo alvo em `structural.assert_clean` imediatamente antes da transformação:

```json
{
  "op": "structural.assert_clean",
  "action": "sheet.insert_rows",
  "sheet": "Custos Fixos",
  "at": 12,
  "count": 1
},
{
  "op": "sheet.insert_rows",
  "sheet": "Custos Fixos",
  "at": 12,
  "count": 1
}
```

O segundo passo recalcula o estado interno do pacote. Se qualquer operação tiver modificado o workbook depois do plano, a execução falha como plano obsoleto.

## Transformador de coordenadas

`tools/excel_recipe/coordinates.py` implementa transformações puras e determinísticas para:

- inserção/exclusão de linha;
- inserção/exclusão de coluna;
- movimento de range;
- coluna local de Table;
- compactação de linhas de Table.

O transformador respeita os limites do Excel: 1.048.576 linhas e 16.384 colunas (`XFD`). Operações que ultrapassem esses limites falham antes da escrita.

Ranges são classificados como `unaffected`, `shifted`, `expanded`, `contracted`, `moved`, `partial` ou `removed`. Interseções parciais que não possam ser provadas seguras são blockers.

## Dependências regravadas

Quando a transformação é classificada como segura, a V3A atualiza deterministicamente:

- coordenadas físicas `<c r="...">` e `<row r="...">`;
- fórmulas A1 em células de qualquer worksheet;
- `ref` de fórmulas compartilhadas quando suportado;
- `Table.ref` e `autoFilter.ref`;
- fórmulas calculadas e de totais em Tables;
- nomes definidos do workbook, inclusive áreas de impressão/títulos quando expressos como nomes definidos;
- ranges e fórmulas de validação de dados;
- ranges e fórmulas de formatação condicional;
- `mergeCells` em transformações suportadas;
- hyperlinks internos e seus ranges;
- `dimension` e AutoFilter da worksheet;
- `topLeftCell` e splits simples de freeze panes;
- dimensões simples de colunas em inserção/exclusão global.

Fórmulas regravadas perdem o valor em cache e o workbook é marcado para recálculo completo na próxima abertura no Excel.

## Parser A1 conservador

O rewriter reconhece referências A1 de célula/range, com ou sem `$`, e referências qualificadas por sheet, inclusive nomes de sheet entre aspas simples. Conteúdo dentro de strings literais não é reescrito.

A V3A não tenta interpretar referências dinâmicas de `INDIRECT`/`ADDRESS` no contexto estrutural afetado. Também não regrava referências de linha/coluna inteira como `A:A` ou `1:1`; elas são detectadas e bloqueiam a transformação quando atingem a sheet alvo.

Referências externas de workbook são blockers.

## Tables

### Inserção de coluna

`table.insert_column` recebe `table`, `position`, `name` e opcionalmente `default` ou `formula`.

A operação desloca somente as células da Table necessárias, atualiza `tableColumns`, range e autofiltro e preenche cabeçalho/dados. Se houver conteúdo imediatamente à direita que seria sobrescrito, o plano bloqueia a operação.

### Exclusão de coluna

`table.delete_column` exige que a coluna exista e que não haja referência estruturada conhecida dependente dela. O scanner procura referências qualificadas e referências locais da própria Table. Dependência conhecida implica blocker; a ferramenta não tenta criar `#REF!` deliberadamente.

### Compactação

`table.compact_rows` considera vazia uma linha em que todas as colunas de negócio estejam vazias. Colunas calculadas são ignoradas para essa decisão. Tables com linha de totais ficam bloqueadas nesta versão.

## range.move

`range.move` trabalha com origem retangular e célula superior esquerda de destino. Origem e destino não podem se sobrepor.

Na V3A:

- células com fórmula dentro da origem bloqueiam o move;
- destino com valor não vazio bloqueia o move;
- células XML existentes porém vazias no destino são substituídas deterministicamente, evitando refs duplicadas;
- referências A1 externas que apontam para células/ranges integralmente movidos são regravadas;
- ranges que cruzam apenas parte da origem são blockers.

Essa restrição deliberada evita tentar reproduzir todas as regras implícitas de cut/paste do Excel sem um modelo completo de dependências.

## Blockers fail-closed

A transformação não é aplicada quando o scanner encontra, entre outros:

- `vbaProject.bin` sem snapshot textual correspondente;
- referências VBA estáticas à aba/estrutura alvo;
- Drawing/VML/OLE/control ancorado na worksheet alvo;
- gráfico que contém referência atingida;
- PivotTable ou PivotCache afetado;
- external link, QueryTable ou conexão atingida;
- fórmula dinâmica relevante (`INDIRECT`/`ADDRESS`);
- referência inteira `A:A`/`1:1` atingida;
- range parcial não regravável;
- Table que seria cortada/removida por uma operação global inadequada;
- tentativa de alterar colunas internas de uma Table usando `sheet.insert_columns/delete_columns` em vez das operações específicas de Table;
- overflow dos limites do Excel.

Não existe `force: true` para ignorar esses blockers.

## VBA, gráficos e pivôs

VBA continua imutável. O motor valida o SHA do `vbaProject.bin` e usa o snapshot textual apenas para detectar possíveis referências. Nunca executa macros.

Drawing/VML e objetos ancorados continuam bloqueando transformações da sheet porque o rewriter de anchors pertence à V3B. Gráficos e pivôs só são inspecionados para bloquear impacto; reescrita fica respectivamente para V3B e V3C.

## Segurança transacional

Todas as garantias anteriores continuam válidas:

1. SHA-256 exato da fonte;
2. SHA do VBA quando aplicável;
3. plano ligado ao hash do estado interno do pacote;
4. candidato temporário;
5. firewall de partes imutáveis;
6. validação/reabertura do pacote candidato;
7. substituição atômica somente após sucesso;
8. regeneração do snapshot;
9. rollback do workbook se o snapshot falhar;
10. receipt determinístico de auditoria.

O `.xlsm` continua existindo uma única vez no repositório; a ferramenta não cria versões paralelas permanentes.

## Receipt V3A

Além dos campos já existentes, a operação aplicada registra:

- ação estrutural;
- transformação normalizada;
- `plan_sha256` consumido;
- quantidade de células movidas/removidas;
- quantidade de referências regravadas;
- confirmação de zero blockers no plano aceito.

O próprio `structural_plan` contém ocorrências, partes impactadas, SHA da fonte, SHA do VBA e SHA do estado interno do pacote.

## Validação sintética

A suíte V3A cobre:

- insert/delete de linhas;
- insert/delete global de colunas;
- inserção e exclusão de coluna no meio de Table;
- compactação física de linha lógica vazia;
- `range.move` e destino XML previamente vazio;
- fórmula cross-sheet;
- Table ref/fórmula;
- nome definido;
- data validation;
- conditional formatting;
- merge;
- hyperlink;
- freeze pane;
- limites máximos do Excel;
- blocker de drawing;
- referência estruturada dependente;
- referência A1 de linha/coluna inteira;
- invalidação de plano após mutação intermediária.

## Probes no workbook real

O CI executa os probes em Ubuntu e Windows.

O cenário limpo usa `Custos Fixos`, inserindo uma linha em `12` num candidato temporário. O plano esperado é:

```text
6ff7e0adc6ceb252b3fd6157479c78789e9f8f31eabd9d3ae1a303f5d34fe999
```

Ele precisa ter zero blockers, alterar no candidato pelo menos `xl/worksheets/sheet9.xml`, `xl/tables/table12.xml` e `xl/workbook.xml`, consumir exatamente o mesmo `plan_sha256` na mutação e deixar o workbook versionado intacto após o dry-run.

O cenário deliberadamente bloqueado usa `configurações`, linha `12`. O plano esperado é:

```text
1a35ffee13b35644aae0547608405921966d0c57d9c25a8cae113ce2144982a2
```

Ele deve encontrar exatamente o blocker VML (`vmlDrawing`) da worksheet. Os hashes do plano precisam ser idênticos em Linux e Windows.

## Limitações deliberadas

A V3A não pretende reproduzir todo o motor de refactor do Excel. Continuam fora do escopo:

- reescrita de anchors de Drawing/VML/ActiveX;
- criação/edição de gráficos;
- PivotTable/PivotCache;
- Power Query e conexões;
- edição de VBA;
- `range.move` de fórmulas na própria origem;
- refs de linha/coluna inteira;
- operações estruturais múltiplas na mesma receita;
- recálculo headless compatível com Excel.

Quando um desses casos participa da transformação, o comportamento correto é bloquear.

## Próximas fases

- **V3B:** parser/rewriter de Drawing e gráficos, incluindo anchors e séries suportadas.
- **V3C:** PivotTable/PivotCache em escopo isolado e somente com round-trip comprovado.
- **V3D:** eventual subsistema VBA separado, sem execução automática de macros.

Consulte `EXCEL_RECIPE_V3_PLAN.md` para o roadmap completo e `../governanca/EXCEL_RECIPE_AGENT_GUIDE.md` para o procedimento obrigatório de agentes.
