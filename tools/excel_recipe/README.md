# Excel Recipe Engine

Motor transacional para aplicar **roteiros JSON** a workbooks Excel OOXML `.xlsm`, sem depender do Excel Desktop e sem regravar partes do pacote que a receita não autorizou.

O eixo estrutural corrente é **V3A**. O eixo de reutilização corrente é **G1**: o core pode operar em qualquer `.xlsm` compatível dentro do repositório, enquanto `anexos/financeiro/carro chefe.xlsm` permanece apenas como integração padrão do projeto.

## Uso normal

Validar/simular uma receita sem alterar arquivos:

```bash
python -m tools.excel_recipe validate caminho/receita.json
```

Gerar o plano/dry-run:

```bash
python -m tools.excel_recipe plan caminho/receita.json
```

Aplicar:

```bash
python -m tools.excel_recipe apply caminho/receita.json
```

Se a receita tiver snapshot configurado, `apply` o atualiza depois da escrita candidata e antes de publicar o receipt. Falha no snapshot restaura o workbook anterior.

Depois do merge em `main`, o sync seguro também aceita workbook explícito:

```bash
python -m tools.excel_recipe.sync --workbook "anexos/clientes/a/financeiro.xlsm"
```

Sem `--workbook`, o comportamento legado protege `anexos/financeiro/carro chefe.xlsm`.

`--dry-run` pode ser usado em `apply`. `--no-snapshot` existe para testes/diagnóstico e não deve ser usado para contornar um snapshot obrigatório da integração normal.

## Workbook genérico

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

Para workbooks diferentes do financeiro padrão do Carro Chefe, o snapshot é **opt-in**. Se desejado:

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

Quando `receipt_path` é omitido, o receipt fica no diretório lógico do próprio workbook:

```text
<diretório-do-workbook>/recipes/receipts/<id>.receipt.json
```

Assim, `anexos/financeiro/carro chefe.xlsm` mantém exatamente o default histórico `anexos/financeiro/recipes/receipts/`.

## Compatibilidade Carro Chefe

Para `anexos/financeiro/carro chefe.xlsm`, receitas existentes continuam com os defaults anteriores:

- snapshot: `anexos/financeiro/snapshot`;
- receipts: `anexos/financeiro/recipes/receipts/`;
- SHA/VBA/firewall/rollback inalterados.

O workbook real continua sendo usado em probes de integração, mas não define o contrato do core.

## Princípios de segurança

Toda receita exige SHA-256 exato da fonte e pode fixar `expected_vba_sha256`. VBA nunca é executado.

O motor calcula SHA-256 das partes do pacote antes/depois e aborta se qualquer parte fora da allowlist mudar. Partes protegidas continuam fail-closed.

A escrita é atômica: candidato temporário → reabertura/validação → conferência do VBA/firewall → substituição → snapshot opcional → receipt. Se o pós-processamento falhar, o workbook anterior é restaurado.

O motor não tenta reproduzir o cálculo do Excel. Fórmulas regravadas perdem caches obsoletos e o workbook é marcado para recálculo completo ao abrir quando necessário.

Paths de source, receipt e snapshot precisam permanecer dentro do root autorizado do repositório nesta geração.

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

A V3A aceita apenas **uma transformação física por receita** e não a mistura com rename V2 na mesma receita.

## Fluxo V3A

Investigação:

```json
{
  "op": "structural.plan",
  "action": "sheet.insert_rows",
  "sheet": "Custos Fixos",
  "at": 12,
  "count": 1
}
```

Aplicação:

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

A mutação verifica se o estado interno do pacote ainda é exatamente o que originou o plano. Qualquer alteração intermediária invalida a execução.

## Dependências V3A

A V3A regrava fórmulas A1 suportadas, Tables, nomes definidos, validações, formatação condicional, merges, hyperlinks internos, freeze pane, autofiltros, dimensions e ranges simples conhecidos.

Ela bloqueia em vez de adivinhar quando encontra referências externas, `INDIRECT`/`ADDRESS` relevantes, `A:A`/`1:1`, ranges parciais não classificados, VBA que precisaria ser atualizado, Drawing/VML/ActiveX/OLE, gráficos, pivôs, QueryTables ou conexões.

`range.move` também bloqueia fórmula dentro da própria origem e destino com valor. Célula XML de destino existente mas vazia é sobrescrita deterministicamente para evitar refs duplicadas.

## Tables

`table.insert_column` pode inserir coluna no meio da Table, desde que a faixa de expansão esteja livre. `table.delete_column` exige que a coluna não tenha dependências estruturadas bloqueadoras. `table.compact_rows` remove linhas lógicas vazias ignorando colunas calculadas para decidir vazio; Tables com totals row permanecem bloqueadas nesta fase.

`table.delete_rows` da V1 continua disponível e mantém sua semântica de exclusão lógica. Use `table.compact_rows` quando a intenção for compactação física e o plano estiver limpo.

## Receipt

O receipt registra source antes/depois, VBA antes/depois, partes alteradas, operações aplicadas e o `snapshot_output` efetivo (`null` quando não configurado).

Receipts são gerados pelo motor e não devem ser editados manualmente.

## Probes reais do Carro Chefe

O gate canônico da V3A continua:

```bash
python -m tools.excel_recipe.probe_v3a_real
```

Ele executa em dry-run uma transformação limpa em `Custos Fixos`, comprova um blocker VML real em `configurações`, fixa os `plan_sha256` esperados e verifica que o workbook versionado não foi modificado.

Esses probes pertencem à integração do Carro Chefe; workbooks genéricos não dependem deles para funcionar.

## Limites deliberados

G1 aceita `.xlsm` compatíveis dentro do repositório. `.xlsx`, `.xls`, `.xlsb`, `.ods` e execução fora do boundary do repositório ainda não fazem parte do contrato atual.

V3A ainda não regrava Drawing/VML/ActiveX, séries/anchors de gráficos, PivotTable/PivotCache, Power Query/conexões ou VBA. Também não suporta múltiplas transformações físicas na mesma receita, `range.move` de células-fórmula na origem, referências inteiras `A:A`/`1:1` nem recálculo headless compatível com Excel.

Esses limites são blockers, não convites a workaround manual.

## Documentação relacionada

- `docs/tecnologia/EXCEL_RECIPE_GENERIC_ENGINE_PLAN.md` — arquitetura G1–G4 do motor reutilizável.
- `docs/tecnologia/EXCEL_RECIPE_V1.md` — fundação transacional.
- `docs/tecnologia/EXCEL_RECIPE_V2.md` — grafo e renames.
- `docs/tecnologia/EXCEL_RECIPE_V3A.md` — contrato operacional de transformação física.
- `docs/tecnologia/EXCEL_RECIPE_V3_PLAN.md` — roadmap V3B/V3C/V3D.
- `docs/governanca/EXCEL_RECIPE_AGENT_GUIDE.md` — procedimento obrigatório para agentes.
- `anexos/financeiro/recipes/README.md` — integração de recipes/receipts do Carro Chefe.

## Testes

```bash
python -m unittest discover -s tools/excel_recipe/tests -p "test_*.py" -v
python -m tools.excel_recipe validate tools/excel_recipe/examples/noop-carro-chefe.json
python -m tools.excel_recipe validate tools/excel_recipe/examples/probe-carro-chefe-real.json
python -m tools.excel_recipe plan tools/excel_recipe/examples/probe-v2-tabela18.json
python -m tools.excel_recipe.probe_v3a_real
```
