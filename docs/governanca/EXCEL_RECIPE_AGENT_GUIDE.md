# Guia de agentes — Excel Recipe

## Finalidade

Este guia define como agentes do Carro Chefe devem analisar, propor, executar e revisar alterações em workbooks `.xlsm` usando `tools/excel_recipe`. O core é reutilizável para workbooks compatíveis dentro do repositório; `anexos/financeiro/carro chefe.xlsm` é a integração padrão e possui probes reais próprios.

A ferramenta é um mecanismo de manutenção versionada. Ela não transforma planilha em banco de dados operacional, não substitui o ERP e não autoriza o agente a inventar informações de negócio.

## Responsabilidades

Agentes de domínio podem identificar a necessidade de mudança e fornecer dados aprovados de sua especialidade. Alterações no código do motor pertencem ao `AG-DEV`. Custos, margens e configuração financeira continuam sujeitos à validação de `AG-FINANCAS`; dados, contratos e linhagem ficam sob `AG-DADOS` quando aplicável.

Quem prepara uma receita é responsável por provar a origem dos valores e não ultrapassar o escopo efetivamente implementado.

## Documentos obrigatórios

Antes de escrever uma receita, leia:

- `AGENTS.md` e `REGRAS.md`;
- o `AGENTS.md` mais próximo;
- `tools/excel_recipe/README.md`;
- `docs/tecnologia/EXCEL_RECIPE_V1.md`;
- `docs/tecnologia/EXCEL_RECIPE_V2.md` quando houver rename/refactor;
- `docs/tecnologia/EXCEL_RECIPE_V3A.md` quando houver transformação física;
- `docs/tecnologia/EXCEL_RECIPE_V3B.md` quando drawing/chart puder ser afetado;
- `docs/tecnologia/EXCEL_RECIPE_GENERIC_ENGINE_PLAN.md` para limites do eixo de reutilização;
- o snapshot correspondente, quando a integração possuir snapshot versionado.

`docs/tecnologia/EXCEL_RECIPE_V3_PLAN.md` distingue capacidades disponíveis de V3C/V3D planejadas. Não trate uma capacidade descrita apenas no roadmap como disponível.

## Procedimento obrigatório

Parta da `main` atual e crie uma branch exclusiva. Não edite o workbook diretamente pela interface do GitHub e não crie cópias permanentes do tipo `v2.xlsm` como estratégia de manutenção.

Use snapshot/inventário para localizar Table, coluna, fórmula ou célula. Prefira nomes de Table e chaves estáveis a coordenadas absolutas sempre que o domínio oferecer identificadores melhores.

A receita deve fixar `expected_sha256` do workbook e, quando houver VBA, deve preferencialmente fixar `expected_vba_sha256`. Inclua `assert.table`, `assert.row` ou `assert.cell` quando puderem impedir aplicação sobre estrutura inesperada.

Valide primeiro:

```bash
python -m tools.excel_recipe validate <receita.json>
```

Para rename V2 ou transformação V3:

```bash
python -m tools.excel_recipe plan <receita.json>
```

Só aplique após revisar plano/dry-run:

```bash
python -m tools.excel_recipe apply <receita.json>
```

Depois, revise workbook, snapshot configurado e receipt. Se SHA, assert, scanner, firewall, snapshot ou CI falhar, investigue; nunca remova a proteção apenas para fazer a receita passar.

## Workbook genérico G1

`workbook.path` pode apontar para outro `.xlsm` compatível dentro do repositório. Para workbooks genéricos, snapshot é opt-in por `workbook.snapshot.output`; receipt padrão é derivado do diretório do próprio workbook.

O core não pode depender de nomes de abas, Tables ou IDs do Carro Chefe. Probes que mencionam `Custos Fixos`, `Fluxo de Caixa` ou outras abas reais são gates da integração Carro Chefe, não requisitos do motor genérico.

## Escolha de operação V1

Para modificar registro por chave estável, prefira `table.upsert_rows` ou `table.update_rows`. Para inserir registros sem substituir, use `table.append_rows`.

`table.delete_rows` é exclusão lógica: limpa conteúdo sem remover fisicamente a linha. Se a intenção for remover fisicamente vazios de uma Table, use `table.compact_rows` com plano limpo.

Para fórmulas, prefira `formula.set` quando a fórmula final é conhecida. Use `formula.copy` com `translate_relative_refs: true` apenas quando tradução A1 relativa for realmente desejada. Para fórmula de coluna de Table, use `table.set_formula_column`.

## Rename V2

Para investigar rename de Table/coluna, use `dependency.scan`. Para autorizar escrita, execute `dependency.assert_clean` para o mesmo alvo imediatamente antes de `table.rename` ou `table.rename_column`.

O motor aceita um rename estrutural por receita. Não simule rename com várias edições manuais de células/fórmulas.

No `dependency_report`, revise `table`, `column`, `source_sha256`, `vba_sha256`, `plan_sha256`, contagens e `occurrences`. Qualquer blocker encerra a tentativa.

## Transformações físicas V3A/V3B

Operações físicas disponíveis:

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

A V3 mantém somente **uma transformação física por receita** e não mistura transformação física com rename V2 na mesma receita.

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

`rewritable` significa que existe regra determinística implementada e testada. `blocker` significa que o motor não consegue provar a alteração. Aprovação humana não transforma blocker em regravável.

O plano é ligado ao estado interno do pacote. Mutação entre `structural.assert_clean` e a operação invalida o plano; refaça o plano em vez de retirar o assert.

### V3B — DrawingML/ChartML

V3B permite atravessar desenhos/gráficos somente nas famílias promovidas:

- `oneCellAnchor`;
- `twoCellAnchor` com `editAs` ausente ou `twoCell`;
- `absoluteAnchor` preservado;
- objetos DrawingML conhecidos em anchors suportados;
- ChartML clássico com referências `c:f` A1 suportadas.

Charts são dependências globais. Um gráfico ancorado em outra aba ainda pode referenciar a aba transformada e, nesse caso, deve aparecer em `occurrences`/`parts_impacted`.

Ao revisar um plano V3B, confirme que `xl/drawings/*.xml` e `xl/charts/*.xml` aparecem apenas quando efetivamente afetados. A saída do planner é a autorização; não adicione partes manualmente à allowlist.

### Regras específicas

Para inserção/exclusão global de colunas que atravesse uma Table, use `table.insert_column`/`table.delete_column`; não contorne com `sheet.*columns`.

`range.move` exige origem/destino não sobrepostos. Fórmula na própria origem ou valor existente no destino é blocker.

`table.insert_column` deve ter posição/nome explícitos e só passa se a expansão for segura. `table.delete_column` bloqueia com referência estruturada dependente. `table.compact_rows` só deve ser usado quando a intenção de remover fisicamente linhas lógicas vazias for clara.

## Blockers atuais

Entre outros, pare diante de:

- VBA que precisaria ser regravado;
- VML;
- ActiveX/OLE;
- `chartEx`;
- SmartArt/diagramas/relationships ainda não modelados;
- `twoCellAnchor` com `editAs` ainda não promovido;
- marker DrawingML que seria removido;
- fórmula `c:f` não regravável sem ambiguidade;
- PivotTable/PivotCache;
- Power Query, QueryTable, link/conexão externa atingidos;
- `INDIRECT`/`ADDRESS` no contexto estrutural afetado;
- referência inteira `A:A` ou `1:1` atingida;
- range parcialmente intersectado sem regra segura;
- limite de linha/coluna do Excel;
- plano obsoleto.

Não existe `force: true` genérico.

## V3C/V3D continuam indisponíveis

PivotTable/PivotCache permanecem V3C planejada. Reescrita de VBA permanece V3D planejada e separada do OOXML comum.

Não simule essas capacidades usando várias operações V1/V2/V3. Só promova quando houver código, testes, probe real, documentação e CI verde na `main`.

## Dados e precisão

Não invente preços, custos, fornecedores, quantidades, datas, margens, IDs ou fórmulas. Se o pedido não contém um valor e ele não pode ser obtido de fonte oficial versionada, registre a lacuna.

Para dinheiro, use decimal textual. Preserve grafia, unidades e IDs da fonte versionada. Antes de atualizar uma linha, confirme que a chave identifica exatamente um registro.

## Revisão antes do PR

Quando houver aplicação real, o PR deve conter a receita, o mesmo workbook atualizado, snapshot regenerado quando configurado e receipt. Não versione temporários, backups ou caches.

A descrição deve registrar intenção, fonte dos dados, partes/tabelas afetadas, hashes de base, limites conhecidos e comandos executados. Para V2, registre `plan_sha256`; para V3, registre transformação, `parts_impacted`, contagens e ausência de blockers.

Alteração inesperada em VBA, ActiveX/OLE, VML, pivôs, mídia ou outro part fora da allowlist é bloqueadora. Alteração de chart/drawing só é válida quando prevista pelo plano V3B.

## Sincronização

Depois do merge em `main`:

```bash
python -m tools.excel_recipe.sync
```

Para outro workbook:

```bash
python -m tools.excel_recipe.sync --workbook caminho/arquivo.xlsm
```

Se houver edição local do workbook selecionado, o sync deve parar. Nunca instrua `reset --hard`, overwrite manual ou cópia paralela como solução automática para divergência.

## Checklist rápido

Antes do PR/merge confirme: branch partiu da `main`; receita aponta para SHA correto; VBA SHA foi fixado quando aplicável; asserts são proporcionais ao risco; `validate` passou; plano foi revisado; não há blockers; a operação consumiu o mesmo `plan_sha256`; snapshot/receipt estão coerentes; partes não autorizadas não mudaram; CI está verde.

Para mudança no motor estrutural, execute:

```bash
python -m tools.excel_recipe.probe_v3a_real
python -m tools.excel_recipe.probe_v3b_real
```

## Regra de parada

Se a alteração exigir recurso fora da versão atual, se o scanner apontar blocker ou se o motor não puder provar que somente as partes permitidas mudam, a entrega deve parar sem substituir o workbook. Segurança e auditabilidade têm precedência sobre concluir a alteração a qualquer custo.
