# Excel Recipe

Motor transacional para aplicar **roteiros JSON** ao mesmo arquivo `anexos/financeiro/carro chefe.xlsm`, sem depender do Excel Desktop e sem regravar partes do pacote OOXML que a receita não autorizou.

A V2 mantém todas as garantias da V1 e acrescenta scanner determinístico de dependências e refactors estruturais conservadores para renomear tabelas e colunas.

## Uso normal

Validar uma receita sem alterar arquivos:

```bash
python -m tools.excel_recipe validate anexos/financeiro/recipes/minha-receita.json
```

Gerar o plano/dry-run de um refactor:

```bash
python -m tools.excel_recipe plan anexos/financeiro/recipes/meu-refactor.json
```

Aplicar e regenerar snapshot + receipt:

```bash
python -m tools.excel_recipe apply anexos/financeiro/recipes/minha-receita.json
```

Depois que a alteração for mergeada na `main`, sincronizar o computador local:

```bash
python -m tools.excel_recipe.sync
```

`--dry-run` pode ser usado em `apply`. `--no-snapshot` existe para testes automatizados e não deve ser usado em manutenção normal.

## Princípios de segurança

O `.xlsm` continua sendo um único arquivo versionado. Toda receita exige SHA-256 exato da fonte e deve fixar `expected_vba_sha256` enquanto VBA permanecer imutável.

VBA, ActiveX, gráficos, pivôs e mídias continuam imutáveis. O motor calcula SHA-256 de cada parte do pacote antes/depois e aborta se qualquer parte fora da allowlist mudar.

A escrita é atômica: cria um candidato temporário, reabre e valida o pacote, confere o VBA e só então substitui a fonte. Uma aplicação bem-sucedida regenera `anexos/financeiro/snapshot/` e grava receipt auditável. Se o snapshot falhar, o workbook original é restaurado.

O motor nunca executa VBA nem recalcula fórmulas. Fórmulas reescritas têm cache removido e o workbook é marcado para recálculo completo quando for aberto no Excel.

## Operações

Além das operações V1 de células, fórmulas, CRUD de registros, criação/redimensionamento de Tables e asserts, a V2 adiciona:

| Operação | Finalidade |
| --- | --- |
| `dependency.scan` | produz relatório de impacto sem exigir ausência de blockers |
| `dependency.assert_clean` | produz o plano e falha se existir dependência bloqueadora |
| `table.rename` | renomeia tabela e referências regraváveis conhecidas |
| `table.rename_column` | renomeia coluna, cabeçalho e referências regraváveis conhecidas |

A V2 permite apenas **um refactor estrutural por receita**. Isso mantém o plano auditável e impede que um segundo rename seja analisado sobre uma topologia já alterada pela primeira operação.

## Fluxo obrigatório para refactor

Para investigar impacto, use uma receita com `dependency.scan`. O relatório classifica cada ocorrência como `rewritable` ou `blocker` e inclui `plan_sha256`, SHA da fonte, SHA do estado interno do pacote e SHA do VBA.

Para efetivamente renomear, a mesma receita deve conter `dependency.assert_clean` antes do rename correspondente:

```json
{
  "schema_version": 1,
  "id": "renomear-tabela-exemplo",
  "workbook": {
    "path": "anexos/financeiro/carro chefe.xlsm",
    "expected_sha256": "<sha256-da-main>",
    "expected_vba_sha256": "<sha256-do-vbaProject.bin>"
  },
  "operations": [
    {
      "op": "dependency.assert_clean",
      "table": "TabelaAntiga"
    },
    {
      "op": "table.rename",
      "table": "TabelaAntiga",
      "new_name": "TabelaNova"
    }
  ]
}
```

Para coluna, informe `column` no `dependency.assert_clean` e use `table.rename_column`. O refactor confere que o pacote não sofreu outra mutação desde o plano; se o estado divergir, falha como plano obsoleto.

## O que o scanner entende

A V2 classifica fórmulas de células, `calculatedColumnFormula`, `totalsRowFormula`, nomes definidos, fórmulas de validação de dados e formatação condicional. Referências estruturadas qualificadas podem ser reescritas globalmente; referências de coluna não qualificadas só são consideradas seguras dentro da própria tabela-alvo.

O código VBA é lido apenas pelo snapshot textual e comparado ao SHA do `vbaProject.bin`. Ocorrências em VBA bloqueiam o refactor. Ocorrências em gráficos, PivotTables/PivotCaches, links externos, QueryTables, conexões ou ActiveX também bloqueiam porque essas partes ainda não são regravadas.

Se o snapshot VBA estiver ausente ou não corresponder ao workbook, o rename estrutural é bloqueado.

## Semântica da V1 preservada

`table.delete_rows` continua sendo exclusão lógica: limpa registros sem deslocar linhas físicas. Inserção/exclusão arbitrária de linhas ou colunas no meio da worksheet continua fora do escopo.

Valores monetários devem usar decimal textual, por exemplo `{ "type": "decimal", "value": "12.34" }`.

## Receipt

Após sucesso, o motor gera por padrão:

```text
anexos/financeiro/recipes/receipts/<id>.receipt.json
```

O receipt registra hashes da fonte e do VBA antes/depois, partes OOXML modificadas, operações aplicadas e, quando houver scan/assert de dependências, o relatório e `plan_sha256` usados. Receipts são gerados pelo motor e não devem ser editados manualmente.

## Limites deliberados

A V2 ainda não edita VBA/ActiveX, não regrava séries de gráficos, PivotTable/PivotCache, Power Query ou conexões externas, não faz refactor quando encontra dependência ambígua e não oferece `force: true` para ignorar blockers.

## Documentação relacionada

- `docs/tecnologia/EXCEL_RECIPE_V1.md`: fundação transacional.
- `docs/tecnologia/EXCEL_RECIPE_V2.md`: scanner e refactors estruturais.
- `docs/tecnologia/EXCEL_RECIPE_V2_PLAN.md`: escopo/decisões que originaram a V2.
- `docs/governanca/EXCEL_RECIPE_AGENT_GUIDE.md`: procedimento obrigatório para agentes.
- `anexos/financeiro/recipes/README.md`: organização das receitas e receipts.

## Testes

```bash
python -m unittest discover -s tools/excel_recipe/tests -p "test_*.py" -v
python -m tools.excel_recipe validate tools/excel_recipe/examples/noop-carro-chefe.json
python -m tools.excel_recipe validate tools/excel_recipe/examples/probe-carro-chefe-real.json
python -m tools.excel_recipe plan tools/excel_recipe/examples/probe-v2-tabela18.json
```
