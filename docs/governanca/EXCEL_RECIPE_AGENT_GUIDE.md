# Guia de agentes — Excel Recipe

## Finalidade

Este guia define como agentes do Carro Chefe devem analisar, propor, executar e revisar alterações em `anexos/financeiro/carro chefe.xlsm` usando `tools/excel_recipe`.

A ferramenta é um mecanismo de manutenção versionada. Ela não transforma a planilha em banco de dados operacional, não substitui o ERP e não autoriza o agente a inventar informações de negócio.

## Responsabilidades

Agentes de domínio podem identificar a necessidade de mudança e fornecer dados aprovados de sua especialidade. Alterações no código do motor pertencem ao `AG-DEV`. Custos, margens e configuração financeira continuam sujeitos à validação de `AG-FINANCAS`; dados, contratos e linhagem ficam sob `AG-DADOS` quando aplicável.

Quem prepara uma receita é responsável por provar a origem dos valores e por não ultrapassar o escopo da versão disponível.

## Documentos obrigatórios

Antes de escrever uma receita, leia:

- `AGENTS.md` e `REGRAS.md`;
- o `AGENTS.md` mais próximo;
- `tools/excel_recipe/README.md`;
- `docs/tecnologia/EXCEL_RECIPE_V1.md`;
- `docs/tecnologia/EXCEL_RECIPE_V2.md`;
- `docs/tecnologia/EXCEL_RECIPE_V3A.md` quando houver transformação física;
- o snapshot atual em `anexos/financeiro/snapshot/`.

`docs/tecnologia/EXCEL_RECIPE_V3_PLAN.md` contém também V3B/V3C/V3D. Essas fases continuam planejadas; não trate uma capacidade descrita apenas no roadmap como disponível.

## Procedimento obrigatório

Parta da `main` atual e crie uma branch exclusiva. Não edite a planilha diretamente pela interface do GitHub e não crie arquivos permanentes como `carro chefe v2.xlsm`.

Use o snapshot para localizar tabela, coluna, fórmula ou célula. Prefira nomes de Table e chaves estáveis a coordenadas absolutas sempre que o domínio oferecer esse identificador.

A receita deve fixar `expected_sha256` do workbook e, enquanto VBA permanecer imutável, `expected_vba_sha256`. Inclua `assert.table`, `assert.row` ou `assert.cell` quando puderem impedir aplicação sobre estrutura inesperada.

Valide primeiro:

```bash
python -m tools.excel_recipe validate <receita.json>
```

Quando houver rename V2 ou transformação V3A, gere/revise o plano:

```bash
python -m tools.excel_recipe plan <receita.json>
```

Só aplique depois de revisar plano/dry-run:

```bash
python -m tools.excel_recipe apply <receita.json>
```

Depois, revise `.xlsm`, snapshot e receipt. Se SHA, assert, scanner, firewall, snapshot ou CI falhar, investigue; não remova a proteção para “fazer passar”.

## Escolha de operação V1

Para modificar registro por chave estável, prefira `table.upsert_rows` ou `table.update_rows`. Para inserir registros sem substituir, use `table.append_rows`.

`table.delete_rows` é exclusão lógica: limpa conteúdo sem remover fisicamente a linha. Se a intenção for remover fisicamente os vazios de uma Table, a V3A oferece `table.compact_rows`, desde que o plano esteja limpo.

Para fórmulas, prefira `formula.set` quando a fórmula final é conhecida. Use `formula.copy` com `translate_relative_refs: true` apenas quando tradução A1 relativa for realmente desejada. Para fórmula de coluna de Table, use `table.set_formula_column`.

## Rename V2

Para investigar rename de tabela/coluna, use `dependency.scan`. Para autorizar escrita, a receita deve executar `dependency.assert_clean` para o mesmo alvo imediatamente antes de `table.rename` ou `table.rename_column`.

O motor aceita um rename estrutural por receita. Não simule rename com várias edições manuais de células/fórmulas.

No `dependency_report`, revise `table`, `column`, `source_sha256`, `vba_sha256`, `plan_sha256`, contagens e `occurrences`. Qualquer `blocker` encerra a tentativa.

## Transformações físicas V3A

A V3A disponibiliza:

- `sheet.insert_rows` / `sheet.delete_rows`;
- `sheet.insert_columns` / `sheet.delete_columns`;
- `range.move`;
- `table.insert_column` / `table.delete_column`;
- `table.compact_rows`.

Toda transformação física deve usar primeiro `structural.plan` para investigação e, na receita de escrita, `structural.assert_clean` imediatamente antes da operação correspondente.

Exemplo:

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

A V3A aceita somente **uma transformação física por receita** e não permite misturar transformação física com rename V2 na mesma receita.

### Como revisar `structural_plan`

Confira obrigatoriamente:

- `action` e `target`;
- transformação normalizada;
- `source_sha256`;
- `package_state_sha256`;
- `vba_sha256`;
- `plan_sha256`;
- `parts_impacted`;
- `rewritable_count`;
- `blocker_count`;
- lista completa de `occurrences`.

`rewritable` significa que existe regra determinística implementada e testada para aquele contexto. `blocker` significa que a ferramenta não consegue provar a alteração. Aprovação humana não transforma blocker em regravável.

O plano é ligado ao estado interno do pacote. Mutação entre `structural.assert_clean` e a operação invalida o plano; refaça a receita em vez de retirar o assert.

### Regras específicas

Para inserção/exclusão global de colunas que atravesse uma Table, use as operações específicas `table.insert_column`/`table.delete_column`; não tente contornar a proteção com `sheet.*columns`.

`range.move` exige origem/destino não sobrepostos. Fórmula na própria origem ou valor existente no destino é blocker. Não use várias `cell.set` para imitar um move quando o planner bloqueia.

`table.insert_column` deve ter posição/nome explícitos e só passa se a expansão for segura. `table.delete_column` bloqueia quando há referência estruturada dependente. `table.compact_rows` só deve ser usado quando a intenção de remover fisicamente linhas lógicas vazias for clara.

### Blockers V3A

Entre outros, pare diante de:

- VBA que precisaria ser regravado;
- Drawing/VML/ActiveX/OLE na sheet alvo;
- gráfico/pivô afetado;
- Power Query, QueryTable, link/conexão externa atingidos;
- `INDIRECT`/`ADDRESS` no contexto estrutural afetado;
- referência inteira `A:A` ou `1:1` atingida;
- range parcialmente intersectado sem regra segura;
- limite de linha/coluna do Excel;
- plano obsoleto.

Não existe `force: true` genérico.

## V3B/V3C/V3D continuam indisponíveis

Se o pedido exigir reescrever anchors/séries de gráfico, PivotTable/PivotCache ou VBA, consulte `EXCEL_RECIPE_V3_PLAN.md`, mas **não simule a capacidade** usando edições V1/V2/V3A.

O agente deve registrar a necessidade e encaminhar evolução ao `AG-DEV`. Só use a nova operação quando houver código, schema, testes, probe real, documentação e CI verde na `main`.

## Dados e precisão

Não invente preços, custos, fornecedores, quantidades, datas, margens, IDs ou fórmulas. Se o pedido não contém um valor e ele não pode ser obtido de fonte oficial versionada, registre a lacuna.

Para dinheiro, use `decimal` textual. Preserve grafia, unidades e IDs do snapshot. Antes de atualizar uma linha, confirme que a chave identifica exatamente um registro.

## Revisão antes do PR

Quando houver aplicação real, o PR deve conter a receita, o **mesmo** `.xlsm` atualizado, snapshot regenerado e receipt. Não versione temporários, backups ou caches.

A descrição deve registrar intenção, fonte dos dados, partes/tabelas afetadas, hashes de base, limites conhecidos e comandos executados. Para V2, registre `plan_sha256`; para V3A, registre também transformação, `parts_impacted`, contagens e ausência de blockers.

Qualquer alteração inesperada em VBA, ActiveX, gráficos, pivôs ou mídia é bloqueadora.

## Sincronização do proprietário

Depois do merge em `main`:

```bash
python -m tools.excel_recipe.sync
```

Se houver edição local do `.xlsm`, o sync deve parar. Nunca instrua `reset --hard`, overwrite manual ou criação de cópias da planilha como solução automática para divergência.

## Checklist rápido

Antes do PR/merge confirme: branch partiu da `main` atual; receita aponta para SHA correto; VBA SHA foi fixado; asserts são proporcionais ao risco; `validate` passou; plano aplicável foi revisado; não há blockers; a operação consumiu o mesmo `plan_sha256`; snapshot/receipt estão coerentes; partes imutáveis não mudaram; CI está verde.

Para mudança no próprio motor V3A, execute também:

```bash
python -m tools.excel_recipe.probe_v3a_real
```

## Regra de parada

Se a alteração exigir recurso fora da versão atual, se o scanner apontar blocker ou se o motor não puder provar que somente as partes permitidas mudam, a entrega deve parar sem substituir o workbook. Segurança e auditabilidade têm precedência sobre concluir a alteração a qualquer custo.
