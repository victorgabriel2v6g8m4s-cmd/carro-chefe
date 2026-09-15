# Excel Recipe V1

Motor transacional para aplicar **roteiros JSON** ao mesmo arquivo `anexos/financeiro/carro chefe.xlsm`, sem depender do Excel Desktop e sem regravar partes do pacote OOXML que a receita não autorizou.

## Princípios

- o `.xlsm` continua sendo um único arquivo versionado;
- a receita exige SHA-256 exato da fonte e pode exigir SHA-256 exato do `vbaProject.bin`;
- VBA, ActiveX, gráficos, pivôs e mídias são imutáveis na V1;
- alterações são feitas diretamente nas partes XML necessárias do pacote OOXML;
- qualquer parte alterada fora da allowlist da operação faz o firewall abortar;
- a escrita é atômica: primeiro é criado/validado um candidato temporário, só depois ele substitui a fonte;
- por padrão, uma aplicação bem-sucedida regenera `anexos/financeiro/snapshot/` e grava um receipt auditável;
- o motor nunca executa VBA e nunca recalcula fórmulas: ele marca recálculo completo na próxima abertura do Excel.

## Uso

Validar/simular uma receita sem alterar arquivos:

```bash
python -m tools.excel_recipe validate anexos/financeiro/recipes/minha-receita.json
```

Aplicar:

```bash
python -m tools.excel_recipe apply anexos/financeiro/recipes/minha-receita.json
```

`--dry-run` também pode ser usado no comando `apply`. `--no-snapshot` existe para testes automatizados e não deve ser o fluxo normal de manutenção.

## Operações V1

| Operação | Finalidade |
| --- | --- |
| `cell.set` | escrever valor em célula |
| `cell.clear` | limpar conteúdo preservando estilo |
| `formula.set` | escrever fórmula e remover cache antigo |
| `formula.copy` | copiar fórmula; tradução A1 relativa é **opt-in** |
| `table.append_rows` | inserir registros usando primeiro espaço lógico vazio |
| `table.upsert_rows` | atualizar por chave ou inserir se a chave não existir |
| `table.update_rows` | atualizar registros por filtro explícito |
| `table.delete_rows` | excluir logicamente registros limpando suas células |
| `table.create` | criar Table Part em intervalo explícito |
| `table.resize` | expandir/reduzir apenas o final das linhas |
| `table.drop` | remover a definição de tabela; células ficam por padrão |
| `table.add_column` | adicionar coluna somente à direita da tabela |
| `table.set_formula_column` | definir fórmula calculada de uma coluna |
| `assert.cell` | precondição de célula |
| `assert.table` | precondição de range/colunas de tabela |
| `assert.row` | precondição de registro |
| `workbook.recalculate_on_open` | marcar recálculo completo ao abrir |

### Semântica de exclusão

`table.delete_rows` **não desloca linhas físicas** e não compacta a worksheet. Na V1 ele limpa o registro encontrado e mantém a faixa da tabela. Isso evita quebrar referências externas, validações, gráficos ou VBA por deslocamento estrutural invisível.

### Fórmulas

`formula.copy` só traduz referências A1 quando `translate_relative_refs: true` é informado explicitamente. A tradução não pretende fazer refactor de nomes definidos, referências estruturadas, gráficos, pivôs ou VBA. Para fórmulas complexas, prefira `formula.set` ou `table.set_formula_column`.

## Exemplo de upsert

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
      "expected_columns": ["ID", "item", "Preço", "Qtd.", "Medida"]
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

O exemplo acima é ilustrativo; valores operacionais reais não devem ser inventados.

## Valores tipados

Além de `string`, número, boolean e `null` JSON, a V1 aceita:

```json
{ "type": "decimal", "value": "12.34" }
{ "type": "integer", "value": 5 }
{ "type": "string", "value": "texto" }
{ "type": "boolean", "value": true }
{ "type": "blank", "value": null }
```

Para dinheiro, prefira `decimal` textual.

## Receipt

Após sucesso, a receita gera por padrão:

```text
anexos/financeiro/recipes/receipts/<id>.receipt.json
```

Ele registra SHA da fonte antes/depois, SHA do VBA antes/depois, partes OOXML modificadas e operações efetivamente aplicadas. Timestamp variável é omitido; a data vem do histórico Git.

## Sincronização segura do computador local

Depois que uma alteração for mergeada na `main`:

```bash
python -m tools.excel_recipe.sync
```

O comando exige que você esteja em `main`, recusa sincronizar se o `.xlsm` tiver alteração local e usa somente `git fetch` + `git merge --ff-only`. Ele nunca executa `reset --hard`, `stash`, `checkout --force` ou cria cópias da planilha.

## Limites deliberados da V1

Não são suportados: renomear tabela/coluna com cascata, inserir/excluir linha ou coluna física no meio da worksheet, editar VBA/ActiveX, alterar pivôs/gráficos, refresh de Power Query ou recálculo headless. Esses recursos exigem mapa de dependências e entram em versões futuras.

## Testes

```bash
python -m unittest discover -s tools/excel_recipe/tests -p "test_*.py" -v
python -m tools.excel_recipe validate tools/excel_recipe/examples/noop-carro-chefe.json
```
