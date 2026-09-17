# Excel Recipe Engine

Motor transacional para aplicar **roteiros JSON** a workbooks Excel OOXML `.xlsm`, sem depender do Excel Desktop e sem regravar partes do pacote que a receita não autorizou.

O eixo estrutural corrente é **V3B**. O eixo de reutilização corrente é **G1**: o core pode operar em qualquer `.xlsm` compatível dentro do repositório, enquanto `anexos/financeiro/carro chefe.xlsm` permanece como integração padrão do projeto.

## Uso normal

Validar/simular uma receita sem alterar arquivos:

```bash
python -m tools.excel_recipe validate caminho/receita.json
```

Gerar plano/dry-run:

```bash
python -m tools.excel_recipe plan caminho/receita.json
```

Aplicar:

```bash
python -m tools.excel_recipe apply caminho/receita.json
```

Se a receita tiver snapshot configurado, `apply` o atualiza depois da escrita candidata e antes de publicar o receipt. Falha no snapshot restaura o workbook anterior.

Sync seguro por workbook:

```bash
python -m tools.excel_recipe.sync --workbook "anexos/clientes/a/financeiro.xlsm"
```

Sem `--workbook`, o comportamento legado protege `anexos/financeiro/carro chefe.xlsm`.

`--dry-run` pode ser usado em `apply`. `--no-snapshot` existe para testes/diagnóstico e não deve ser usado para contornar um snapshot obrigatório da integração normal.

## Workbook genérico — G1

A receita aponta o arquivo diretamente:

```json
{
  "schema_version": 1,
  "id": "ajuste-generico",
  "workbook": {
    "path": "anexos/clientes/a/financeiro.xlsm",
    "expected_sha256": "<sha256>",
    "expected_vba_sha256": "<sha256-vba>"
  },
  "operations": [
    {
      "op": "cell.set",
      "sheet": "Dados",
      "cell": "B2",
      "value": "Exemplo"
    }
  ]
}
```

Para workbooks diferentes do financeiro padrão do Carro Chefe, snapshot é **opt-in**:

```json
{
  "workbook": {
    "path": "anexos/clientes/a/financeiro.xlsm",
    "expected_sha256": "<sha256>",
    "snapshot": {
      "enabled": true,
      "output": "anexos/clientes/a/snapshot"
    }
  }
}
```

Quando `receipt_path` é omitido:

```text
<diretório-do-workbook>/recipes/receipts/<id>.receipt.json
```

Para `anexos/financeiro/carro chefe.xlsm`, continuam os defaults históricos:

- snapshot: `anexos/financeiro/snapshot`;
- receipts: `anexos/financeiro/recipes/receipts/`;
- SHA/VBA/firewall/rollback inalterados.

## Princípios de segurança

Toda receita exige SHA-256 exato da fonte e pode fixar `expected_vba_sha256`. VBA nunca é executado.

O motor calcula SHA-256 das partes do pacote antes/depois e aborta se qualquer parte alterada não estiver explicitamente autorizada. A escrita é atômica: candidato temporário → reabertura/validação → conferência VBA/firewall → substituição → snapshot opcional → receipt. Falha de pós-processamento restaura o workbook anterior.

O motor não tenta reproduzir o cálculo do Excel. Fórmulas regravadas perdem caches obsoletos quando aplicável e o workbook é marcado para recálculo completo ao abrir.

Paths de source, receipt e snapshot permanecem dentro do root autorizado do repositório no G1.

## Capacidades por geração

### V1 — edição transacional

Inclui células/fórmulas, CRUD de registros, criação/redimensionamento de Tables, colunas à direita, fórmulas calculadas e asserts.

### V2 — dependências e rename

| Operação | Finalidade |
| --- | --- |
| `dependency.scan` | inventariar referências de tabela/coluna |
| `dependency.assert_clean` | exigir zero blockers |
| `table.rename` | renomear Table com cascata suportada |
| `table.rename_column` | renomear coluna/cabeçalho com cascata suportada |

### V3A — transformação física

| Operação | Finalidade |
| --- | --- |
| `structural.plan` | produzir plano físico determinístico sem escrever |
| `structural.assert_clean` | exigir zero blockers e fixar o plano |
| `sheet.insert_rows` | inserir linhas físicas |
| `sheet.delete_rows` | excluir linhas físicas |
| `sheet.insert_columns` | inserir colunas físicas |
| `sheet.delete_columns` | excluir colunas físicas |
| `range.move` | mover range retangular não sobreposto |
| `table.insert_column` | inserir coluna em posição explícita dentro de Table |
| `table.delete_column` | excluir coluna de Table quando dependências permitem |
| `table.compact_rows` | remover fisicamente registros lógicos vazios |

V3 mantém **uma transformação física por receita** e não a mistura com rename V2 na mesma receita.

### V3B — DrawingML e ChartML

V3B não adiciona operações; ela amplia o planner/rewriter das operações V3A quando existem objetos suportados.

Promovido:

- `oneCellAnchor`;
- `twoCellAnchor` com `editAs` ausente/`twoCell`;
- preservação de `absoluteAnchor`;
- objetos `graphicFrame`, `pic`, `sp`, `cxnSp`, `grpSp` em anchors suportados;
- ChartML clássico e referências `c:f` regraváveis pelo parser A1;
- charts tratados como dependências globais, mesmo quando ancorados em outra sheet;
- allowlist dinâmica de `xl/drawings/*.xml` e `xl/charts/*.xml` somente para parts realmente regravados.

Continuam blockers: VML, ActiveX/OLE, chartEx, SmartArt/diagramas não modelados, `twoCellAnchor` em modos ainda não suportados, pivôs, conexões, VBA que precisaria mudar e fórmulas ambíguas.

## Fluxo estrutural

Investigação:

```json
{
  "op": "structural.plan",
  "action": "sheet.insert_rows",
  "sheet": "Fluxo de Caixa",
  "at": 12,
  "count": 1
}
```

Aplicação:

```json
{
  "op": "structural.assert_clean",
  "action": "sheet.insert_rows",
  "sheet": "Fluxo de Caixa",
  "at": 12,
  "count": 1
},
{
  "op": "sheet.insert_rows",
  "sheet": "Fluxo de Caixa",
  "at": 12,
  "count": 1
}
```

A mutação verifica se o estado interno do pacote ainda é exatamente o que originou o plano. Qualquer alteração intermediária invalida a execução.

## Dependências suportadas

O motor regrava, quando determinístico: fórmulas A1, Tables, nomes definidos, validações, formatação condicional, merges, hyperlinks internos, freeze pane, autofiltros, dimensions/ranges simples e, na V3B, anchors DrawingML e ChartML clássico suportado.

Ele bloqueia em vez de adivinhar diante de referências externas, `INDIRECT`/`ADDRESS` relevantes, `A:A`/`1:1`, ranges parciais não classificados, VBA afetado, VML/ActiveX/OLE, chartEx, pivôs, QueryTables ou conexões.

## Tables

`table.insert_column` pode inserir coluna no meio da Table quando a faixa de expansão está livre. `table.delete_column` exige ausência de dependências estruturadas bloqueadoras. `table.compact_rows` remove linhas lógicas vazias ignorando colunas calculadas para decidir vazio; Tables com totals row permanecem bloqueadas.

`table.delete_rows` da V1 continua sendo exclusão lógica.

## Receipt

O receipt registra source antes/depois, VBA antes/depois, partes alteradas, operações aplicadas e `snapshot_output` efetivo. Operações estruturais registram transformação, `plan_sha256`, células movidas/removidas e referências regravadas.

Receipts são gerados pelo motor e não devem ser editados manualmente.

## Probes reais do Carro Chefe

V3A:

```bash
python -m tools.excel_recipe.probe_v3a_real
```

V3B:

```bash
python -m tools.excel_recipe.probe_v3b_real
```

O probe V3B usa `Fluxo de Caixa`, onde o workbook real possui `drawing2.xml` com `chart1.xml` e `chart2.xml`, e exige que uma transformação limpa regrave anchor e chart. Também confirma blockers VML/ActiveX reais em `ingredientes` e que o workbook fonte não foi modificado.

Esses probes são gates da integração Carro Chefe; workbooks genéricos não dependem dos nomes dessas abas para funcionar.

## Limites deliberados

G1 aceita `.xlsm` compatíveis dentro do repositório. `.xlsx`, `.xls`, `.xlsb`, `.ods` e execução fora do boundary do repositório continuam fora do contrato atual.

V3B ainda não regrava VML, ActiveX/OLE, chartEx, PivotTable/PivotCache, Power Query/conexões ou VBA. Não há múltiplas transformações físicas na mesma receita, recálculo headless compatível com Excel ou reconstrução manual de cache de chart.

Esses limites são blockers, não convites a workaround manual.

## Documentação relacionada

- `docs/tecnologia/EXCEL_RECIPE_GENERIC_ENGINE_PLAN.md` — arquitetura G1–G4 do motor reutilizável.
- `docs/tecnologia/EXCEL_RECIPE_V1.md` — fundação transacional.
- `docs/tecnologia/EXCEL_RECIPE_V2.md` — grafo e renames.
- `docs/tecnologia/EXCEL_RECIPE_V3A.md` — transformação física base.
- `docs/tecnologia/EXCEL_RECIPE_V3B.md` — DrawingML e ChartML.
- `docs/tecnologia/EXCEL_RECIPE_V3_PLAN.md` — roadmap V3C/V3D.
- `docs/governanca/EXCEL_RECIPE_AGENT_GUIDE.md` — procedimento obrigatório para agentes.

## Testes

```bash
python -m unittest discover -s tools/excel_recipe/tests -p "test_*.py" -v
python -m tools.excel_recipe validate tools/excel_recipe/examples/noop-carro-chefe.json
python -m tools.excel_recipe plan tools/excel_recipe/examples/probe-v2-tabela18.json
python -m tools.excel_recipe.probe_v3a_real
python -m tools.excel_recipe.probe_v3b_real
```
