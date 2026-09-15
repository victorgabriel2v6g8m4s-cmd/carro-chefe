# Excel Recipe

Motor transacional para aplicar **roteiros JSON** ao mesmo arquivo `anexos/financeiro/carro chefe.xlsm`, sem depender do Excel Desktop e sem regravar partes do pacote OOXML que a receita não autorizou.

## Uso normal

Validar/simular uma receita sem alterar arquivos:

```bash
python -m tools.excel_recipe validate anexos/financeiro/recipes/minha-receita.json
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

O `.xlsm` continua sendo um único arquivo versionado. Toda receita exige SHA-256 exato da fonte e, enquanto VBA for imutável, deve fixar também o SHA-256 de `xl/vbaProject.bin`.

VBA, ActiveX, gráficos, pivôs e mídias são imutáveis na V1. O motor altera diretamente apenas as partes XML necessárias, calcula hashes de todas as entradas antes/depois e aborta se qualquer parte fora da allowlist mudar.

A escrita é atômica: cria um candidato temporário, reabre e valida o pacote, confere novamente o VBA e só então substitui a fonte. Uma aplicação bem-sucedida regenera `anexos/financeiro/snapshot/` e grava receipt auditável. Se o snapshot falhar, o workbook original é restaurado.

O motor nunca executa VBA nem recalcula fórmulas. Fórmulas alteradas têm cache removido e o workbook é marcado para recálculo completo quando for aberto no Excel.

## Operações V1

| Operação | Finalidade |
| --- | --- |
| `cell.set` | escrever valor em célula |
| `cell.clear` | limpar conteúdo preservando estilo |
| `formula.set` | escrever fórmula e remover cache antigo |
| `formula.copy` | copiar fórmula; tradução A1 relativa é opt-in |
| `table.append_rows` | inserir registros usando espaço lógico vazio |
| `table.upsert_rows` | atualizar por chave ou inserir |
| `table.update_rows` | atualizar registros por filtro explícito |
| `table.delete_rows` | excluir logicamente registros, sem deslocar linhas |
| `table.create` | criar Table Part em intervalo explícito |
| `table.resize` | expandir/reduzir apenas o final das linhas |
| `table.drop` | remover definição de tabela; células ficam por padrão |
| `table.add_column` | adicionar coluna somente à direita |
| `table.set_formula_column` | definir fórmula calculada de coluna |
| `assert.cell` | precondição de célula |
| `assert.table` | precondição de range/colunas |
| `assert.row` | precondição de registro |
| `workbook.recalculate_on_open` | marcar recálculo completo ao abrir |

## Semântica de exclusão

`table.delete_rows` não desloca linhas físicas nem compacta a worksheet. Ele limpa o registro encontrado e mantém a faixa da tabela. Operações estruturais que precisem mover células dependem do mapa de dependências previsto para a V2.

## Exemplo mínimo

```json
{
  "schema_version": 1,
  "id": "2026-09-15-atualizar-insumo",
  "workbook": {
    "path": "anexos/financeiro/carro chefe.xlsm",
    "expected_sha256": "<sha256-da-main>",
    "expected_vba_sha256": "<sha256-do-vbaProject.bin>"
  },
  "operations": [
    {
      "op": "assert.table",
      "table": "insumos",
      "expected_columns": ["ID", "item", "Preço"]
    },
    {
      "op": "table.upsert_rows",
      "table": "insumos",
      "key": ["ID"],
      "rows": [
        {
          "ID": "ING-EXEMPLO",
          "item": "Exemplo",
          "Preço": { "type": "decimal", "value": "12.34" }
        }
      ]
    }
  ]
}
```

O exemplo é ilustrativo; agentes não devem inventar valores operacionais.

## Valores tipados

Além de `string`, número, boolean e `null` JSON, a V1 aceita objetos tipados como `decimal`, `integer`, `string`, `boolean` e `blank`. Para dinheiro, prefira decimal textual, por exemplo `{ "type": "decimal", "value": "12.34" }`.

## Receipt

Após sucesso, o motor gera por padrão:

```text
anexos/financeiro/recipes/receipts/<id>.receipt.json
```

O receipt registra hashes da fonte e do VBA antes/depois, partes OOXML modificadas e operações aplicadas. Ele é gerado pelo motor e nunca deve ser editado manualmente.

## Limites deliberados

A V1 não suporta renome de tabela/coluna com cascata, inserção/exclusão física no meio da worksheet, edição de VBA/ActiveX, alteração de pivôs/gráficos, refresh de Power Query ou recálculo headless. Consulte `docs/tecnologia/EXCEL_RECIPE_V2_PLAN.md` para a próxima evolução.

## Documentação relacionada

`docs/tecnologia/EXCEL_RECIPE_V1.md` descreve arquitetura e garantias. `docs/governanca/EXCEL_RECIPE_AGENT_GUIDE.md` é o manual obrigatório para agentes. `anexos/financeiro/recipes/README.md` define a organização das receitas. As regras locais herdadas para o código vêm de `tools/AGENTS.md`.

## Testes

```bash
python -m unittest discover -s tools/excel_recipe/tests -p "test_*.py" -v
python -m tools.excel_recipe validate tools/excel_recipe/examples/noop-carro-chefe.json
python -m tools.excel_recipe validate tools/excel_recipe/examples/probe-carro-chefe-real.json
```
