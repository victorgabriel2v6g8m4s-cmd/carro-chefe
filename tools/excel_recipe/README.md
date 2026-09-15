# Excel Recipe

Motor transacional para aplicar **roteiros JSON** ao mesmo arquivo `anexos/financeiro/carro chefe.xlsm`, sem depender do Excel Desktop e sem regravar partes do pacote OOXML que a receita não autorizou.

A versão corrente é **V3A**. Ela preserva V1/V2 e acrescenta transformações físicas controladas de linhas, colunas, ranges e Tables, sempre precedidas por um plano estrutural fail-closed.

## Uso normal

Validar/simular uma receita sem alterar arquivos:

```bash
python -m tools.excel_recipe validate anexos/financeiro/recipes/minha-receita.json
```

Gerar o plano/dry-run:

```bash
python -m tools.excel_recipe plan anexos/financeiro/recipes/minha-receita.json
```

Aplicar e regenerar snapshot + receipt:

```bash
python -m tools.excel_recipe apply anexos/financeiro/recipes/minha-receita.json
```

Depois do merge em `main`, sincronizar o computador local sem overwrite destrutivo:

```bash
python -m tools.excel_recipe.sync
```

`--dry-run` pode ser usado em `apply`. `--no-snapshot` existe para testes automatizados e não deve ser usado em manutenção normal.

## Princípios de segurança

O `.xlsm` continua sendo um único arquivo versionado. Toda receita exige SHA-256 exato da fonte e deve fixar `expected_vba_sha256` enquanto VBA permanecer imutável.

VBA, ActiveX, gráficos, pivôs e mídias permanecem protegidos por firewall. O motor calcula SHA-256 das partes do pacote antes/depois e aborta se qualquer parte fora da allowlist mudar.

A escrita é atômica: candidato temporário → reabertura/validação → conferência do VBA/firewall → substituição. Uma aplicação real regenera o snapshot e grava receipt. Se o snapshot falhar, o workbook anterior é restaurado.

O motor nunca executa VBA e não tenta reproduzir o cálculo do Excel. Fórmulas regravadas perdem caches obsoletos e o workbook é marcado para recálculo completo ao abrir.

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

Receipts ficam por padrão em:

```text
anexos/financeiro/recipes/receipts/<id>.receipt.json
```

Além dos hashes e partes alteradas, operações V3A registram transformação normalizada, `plan_sha256`, células movidas/removidas e referências regravadas. Receipts são gerados pelo motor e não devem ser editados manualmente.

## Probes reais

O gate canônico da V3A é:

```bash
python -m tools.excel_recipe.probe_v3a_real
```

Ele executa em dry-run uma transformação limpa em `Custos Fixos`, comprova um blocker VML real em `configurações`, fixa os `plan_sha256` esperados e verifica que o workbook versionado não foi modificado.

## Limites deliberados

V3A ainda não regrava Drawing/VML/ActiveX, séries/anchors de gráficos, PivotTable/PivotCache, Power Query/conexões ou VBA. Também não suporta múltiplas transformações físicas na mesma receita, `range.move` de células-fórmula na origem, referências inteiras `A:A`/`1:1` nem recálculo headless compatível com Excel.

Esses limites são blockers, não convites a workaround manual.

## Documentação relacionada

- `docs/tecnologia/EXCEL_RECIPE_V1.md` — fundação transacional.
- `docs/tecnologia/EXCEL_RECIPE_V2.md` — grafo e renames.
- `docs/tecnologia/EXCEL_RECIPE_V3A.md` — contrato operacional atual de transformação física.
- `docs/tecnologia/EXCEL_RECIPE_V3_PLAN.md` — roadmap V3B/V3C/V3D.
- `docs/governanca/EXCEL_RECIPE_AGENT_GUIDE.md` — procedimento obrigatório para agentes.
- `anexos/financeiro/recipes/README.md` — organização de recipes/receipts.

## Testes

```bash
python -m unittest discover -s tools/excel_recipe/tests -p "test_*.py" -v
python -m tools.excel_recipe validate tools/excel_recipe/examples/noop-carro-chefe.json
python -m tools.excel_recipe validate tools/excel_recipe/examples/probe-carro-chefe-real.json
python -m tools.excel_recipe plan tools/excel_recipe/examples/probe-v2-tabela18.json
python -m tools.excel_recipe.probe_v3a_real
```
