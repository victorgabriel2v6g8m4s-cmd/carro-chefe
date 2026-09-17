# Excel Recipe

Motor transacional para aplicar **roteiros JSON** ao mesmo arquivo `anexos/financeiro/carro chefe.xlsm`, sem depender do Excel Desktop e sem regravar partes OOXML que a receita não autorizou.

A versão corrente é **V3B**. Ela preserva V1/V2/V3A e acrescenta suporte fail-closed a DrawingML e referências de gráficos clássicos durante transformações físicas.

## Uso

```bash
python -m tools.excel_recipe validate anexos/financeiro/recipes/minha-receita.json
python -m tools.excel_recipe plan anexos/financeiro/recipes/minha-receita.json
python -m tools.excel_recipe apply anexos/financeiro/recipes/minha-receita.json
python -m tools.excel_recipe.sync
```

`validate`/`plan` não persistem alterações. `apply --dry-run` percorre o candidato transacional sem substituir o workbook. `--no-snapshot` existe para testes automatizados e não deve ser usado em manutenção normal.

## Segurança permanente

Toda receita fixa o SHA-256 da fonte e, enquanto VBA permanecer imutável, `expected_vba_sha256`. A escrita usa candidato temporário, reabre o pacote, valida o firewall e o VBA, e somente depois substitui a fonte. Falha de snapshot restaura o workbook anterior.

Não existe `force: true` para dependências desconhecidas. O motor não executa VBA, não executa Excel Desktop e não considera recálculo posterior uma prova de integridade.

## Capacidades

### V1 — edição transacional

Células/fórmulas, CRUD de registros, criação/redimensionamento de Tables, colunas simples, fórmulas calculadas e asserts.

### V2 — dependências e rename

- `dependency.scan`;
- `dependency.assert_clean`;
- `table.rename`;
- `table.rename_column`.

### V3A — estrutura física

- `structural.plan` / `structural.assert_clean`;
- `sheet.insert_rows` / `sheet.delete_rows`;
- `sheet.insert_columns` / `sheet.delete_columns`;
- `range.move`;
- `table.insert_column` / `table.delete_column`;
- `table.compact_rows`.

Uma transformação física por receita. Rename V2 e transformação física não são compostos no mesmo roteiro.

### V3B — DrawingML e charts

A V3B não adiciona novos nomes de operação; ela amplia o planner/executor das operações V3A quando a sheet possui objetos visuais suportados.

Suporta:

- `oneCellAnchor` e `twoCellAnchor` DrawingML;
- deslocamento/expansão/contração de anchors quando a transformação é determinística;
- referências A1 em `c:f` de charts clássicos, incluindo séries, categorias, valores e títulos vinculados;
- charts clássicos em allowlist: area, bar, bubble, doughnut, line, ofPie, pie, radar, scatter, stock e surface, incluindo variantes 3D previstas;
- alteração de coordenadas somente quando a forma/cardinalidade do range do chart é preservada;
- allowlist exata de `xl/drawings/*.xml` e `xl/charts/*.xml` efetivamente regravados.

Permanece fail-closed para:

- VML, ActiveX, OLE/controls;
- `absoluteAnchor` e anchors desconhecidos;
- PivotChart/PivotTable/PivotCache;
- `externalData`;
- tipo de chart desconhecido/extensão sem rewriter;
- mudança que alteraria o número de pontos do cache;
- referência afetada fora de `c:f`;
- referências estruturadas de chart em alteração física de coluna de Table;
- VBA que precisaria mudar, Power Query/conexões e demais blockers V3A.

Detalhes formais: `docs/tecnologia/EXCEL_RECIPE_V3B.md`.

## Fluxo estrutural

Investigue primeiro:

```json
{
  "op": "structural.plan",
  "action": "sheet.insert_rows",
  "sheet": "Custos Fixos",
  "at": 12,
  "count": 1
}
```

Para aplicar:

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

O plano carrega `source_sha256`, `package_state_sha256`, `vba_sha256` e `plan_sha256`. Mutação intermediária invalida o plano.

## Charts e caches

A V3B regrava somente a referência, não reconstrói cache. Assim:

- `C4:C6` → `C5:C7`: permitido;
- `D4:D6` → `E4:E6`: permitido;
- `C4:C6` → `C4:C7`: blocker, pois a cardinalidade muda.

Essa regra evita produzir um chart cujo cache tenha tamanho incompatível com a série declarada.

## Receipt

Receipts ficam em `anexos/financeiro/recipes/receipts/<id>.receipt.json`.

Além dos campos V3A, transformações V3B registram:

- `rewritten_drawing_anchors`;
- `rewritten_chart_references`.

## Probes reais

```bash
python -m tools.excel_recipe.probe_v3a_real
python -m tools.excel_recipe.probe_v3b_real
```

O V3B encontra deterministicamente um cenário real limpo que percorre escrita de DrawingML/chart em candidato temporário, mantém um cenário VML bloqueado, verifica os hashes esperados e comprova que o workbook versionado permaneceu intacto.

## Documentação relacionada

- `docs/tecnologia/EXCEL_RECIPE_V1.md` — fundação transacional;
- `docs/tecnologia/EXCEL_RECIPE_V2.md` — dependências e renames;
- `docs/tecnologia/EXCEL_RECIPE_V3A.md` — estrutura física;
- `docs/tecnologia/EXCEL_RECIPE_V3B.md` — DrawingML/charts;
- `docs/tecnologia/EXCEL_RECIPE_V3_PLAN.md` — roadmap V3C/V3D;
- `docs/governanca/EXCEL_RECIPE_AGENT_GUIDE.md` — procedimento obrigatório;
- `anexos/financeiro/recipes/README.md` — recipes e receipts.

## Testes

```bash
python -m unittest discover -s tools/excel_recipe/tests -p "test_*.py" -v
python -m tools.excel_recipe validate tools/excel_recipe/examples/noop-carro-chefe.json
python -m tools.excel_recipe validate tools/excel_recipe/examples/probe-carro-chefe-real.json
python -m tools.excel_recipe plan tools/excel_recipe/examples/probe-v2-tabela18.json
python -m tools.excel_recipe.probe_v3a_real
python -m tools.excel_recipe.probe_v3b_real
```
