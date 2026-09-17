# Guia de agentes — Excel Recipe

## Finalidade

Este guia define como agentes do Carro Chefe devem analisar, propor, executar e revisar alterações em `anexos/financeiro/carro chefe.xlsm` usando `tools/excel_recipe`.

A ferramenta é um mecanismo de manutenção versionada. Ela não transforma a planilha em banco de dados operacional, não substitui o ERP e não autoriza o agente a inventar informações de negócio.

## Responsabilidades

Agentes de domínio podem identificar a necessidade de mudança e fornecer dados aprovados. Alterações no motor pertencem ao `AG-DEV`. Custos, margens e configuração financeira continuam sujeitos a `AG-FINANCAS`; dados, contratos e linhagem ficam sob `AG-DADOS` quando aplicável.

Quem prepara uma receita é responsável por provar a origem dos valores e por não ultrapassar o escopo da versão disponível.

## Documentos obrigatórios

Antes de escrever receita, leia:

- `AGENTS.md` e `REGRAS.md`;
- o `AGENTS.md` mais próximo;
- `tools/excel_recipe/README.md`;
- `docs/tecnologia/EXCEL_RECIPE_V1.md`;
- `docs/tecnologia/EXCEL_RECIPE_V2.md`;
- `docs/tecnologia/EXCEL_RECIPE_V3A.md` para transformação física;
- `docs/tecnologia/EXCEL_RECIPE_V3B.md` quando drawings/charts puderem ser atingidos;
- snapshot atual em `anexos/financeiro/snapshot/`.

`EXCEL_RECIPE_V3_PLAN.md` também descreve V3C/V3D. Capacidade apenas planejada não está disponível.

## Procedimento obrigatório

Parta da `main` atual e crie branch exclusiva. Não edite a planilha diretamente pela interface do GitHub e não crie cópias permanentes como `carro chefe v2.xlsm`.

Use o snapshot para localizar tabela, coluna, fórmula ou célula. Prefira nomes de Table e chaves estáveis a coordenadas absolutas quando houver identificador de domínio.

A receita deve fixar `expected_sha256` e, enquanto VBA permanecer imutável, `expected_vba_sha256`. Use `assert.table`, `assert.row` ou `assert.cell` quando puderem impedir aplicação sobre estrutura inesperada.

Fluxo:

```bash
python -m tools.excel_recipe validate <receita.json>
python -m tools.excel_recipe plan <receita.json>
python -m tools.excel_recipe apply <receita.json>
```

Revise `.xlsm`, snapshot e receipt. Se SHA, assert, scanner, firewall, snapshot ou CI falhar, investigue; não remova proteção para “fazer passar”.

## V1 — dados e fórmulas

Para registro por chave estável, prefira `table.upsert_rows`/`table.update_rows`; para inserir sem substituir, `table.append_rows`.

`table.delete_rows` é exclusão lógica. Para remover fisicamente linhas lógicas vazias use `table.compact_rows` somente com plano V3 limpo.

Para fórmulas, prefira `formula.set` quando a expressão final é conhecida. `formula.copy` com tradução relativa só deve ser usado quando a intenção for realmente relativa.

## V2 — rename

Use `dependency.scan` para investigação e `dependency.assert_clean` imediatamente antes de `table.rename` ou `table.rename_column`.

O motor aceita um rename estrutural por receita. Qualquer `blocker` encerra a tentativa. Não simule rename com edições manuais em cascata.

## V3A/V3B — transformações físicas

Operações:

- `sheet.insert_rows` / `sheet.delete_rows`;
- `sheet.insert_columns` / `sheet.delete_columns`;
- `range.move`;
- `table.insert_column` / `table.delete_column`;
- `table.compact_rows`.

A V3B não cria novos nomes de operação. Ela amplia o mesmo planner/executor para drawings e charts suportados.

Toda transformação deve ser investigada com `structural.plan` e, para escrita, precedida por `structural.assert_clean` para exatamente a mesma ação e argumentos.

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

Aceita-se somente **uma transformação física por receita**, sem combinar rename V2 no mesmo roteiro.

### Revisão do `structural_plan`

Confira `action`, `target`, transformação normalizada, `source_sha256`, `package_state_sha256`, `vba_sha256`, `plan_sha256`, `parts_impacted`, contagens e lista completa de `occurrences`.

`rewritable` significa que existe regra determinística implementada e testada. `blocker` significa que o motor não consegue provar segurança. Aprovação humana não converte blocker em regravável.

O plano é ligado ao estado interno do pacote. Qualquer mutação intermediária invalida o plano.

### Regras V3A

Para colunas dentro de Table use `table.insert_column`/`table.delete_column`; não contorne com `sheet.*columns`.

`range.move` exige origem/destino não sobrepostos. Fórmula na origem ou valor no destino é blocker.

`table.delete_column` bloqueia dependências estruturadas que não podem ser removidas com segurança. `table.compact_rows` só deve ser usado quando a intenção de compactação física estiver clara.

### Regras V3B

Quando `structural_plan` listar `drawing_anchor` ou `chart_formula` como `rewritable`, o motor conhece aquele contexto e incluirá apenas as parts visuais necessárias na allowlist.

A V3B pode regravar:

- `oneCellAnchor` e `twoCellAnchor`;
- referências A1 em `c:f` de charts clássicos suportados;
- títulos vinculados, categorias e valores representados por esse modelo;
- deslocamentos que **preservem a cardinalidade** do range de chart.

Exemplo: `C4:C6` → `C5:C7` pode ser promovido; `C4:C6` → `C4:C7` deve permanecer blocker porque exigiria cache com outro número de pontos.

Pare diante de:

- `absoluteAnchor`/anchor desconhecido;
- VML, ActiveX, OLE ou control;
- PivotChart/PivotTable/PivotCache;
- `externalData`;
- tipo/extensão de chart não suportado;
- referência afetada fora de `c:f`;
- mudança de cardinalidade de cache;
- referência estruturada de chart em alteração física de coluna de Table.

Não use edição manual do XML ou de células para contornar esses blockers.

## Blockers gerais

Também continuam bloqueadores:

- VBA que precisaria ser regravado;
- Power Query, QueryTable, link/conexão externa atingidos;
- `INDIRECT`/`ADDRESS` no contexto afetado;
- `A:A`/`1:1` atingido;
- interseção parcial sem regra segura;
- limite de linha/coluna do Excel;
- plano obsoleto.

Não existe `force: true` genérico.

## V3C/V3D continuam indisponíveis

PivotTable/PivotCache e edição VBA pertencem às fases planejadas V3C/V3D. Não simule essas capacidades por XML manual nem por várias operações V1/V2/V3.

## Dados e precisão

Não invente preços, custos, fornecedores, quantidades, datas, margens, IDs ou fórmulas. Se um valor não estiver no pedido nem em fonte oficial versionada, registre a lacuna.

Para dinheiro, use decimal textual. Preserve grafia, unidades e IDs do snapshot. Confirme unicidade da chave antes de atualizar registro.

## Revisão antes do PR

Em aplicação real, o PR deve conter a receita, o **mesmo** `.xlsm` atualizado, snapshot regenerado e receipt. Não versione temporários, backups ou caches.

Registre intenção, fonte dos dados, partes afetadas, hashes, `plan_sha256`, `parts_impacted`, contagens, blockers verificados como zero e comandos de validação.

Em V3B, confira explicitamente as parts `xl/drawings/` e `xl/charts/` alteradas e os campos `rewritten_drawing_anchors`/`rewritten_chart_references` do receipt. Qualquer part visual não prevista é falha de firewall/revisão.

## Probes para mudanças no motor

```bash
python -m tools.excel_recipe.probe_v3a_real
python -m tools.excel_recipe.probe_v3b_real
```

Mudança no motor só está pronta quando a suíte, os probes multiplataforma e os checks gerais estiverem verdes.

## Sincronização

Depois de merge autorizado na `main`:

```bash
python -m tools.excel_recipe.sync
```

Se houver edição local do `.xlsm`, o sync deve parar. Nunca instrua `reset --hard`, overwrite manual ou cópia paralela da planilha como solução automática.

## Regra de parada

Se a alteração exigir recurso fora da versão corrente, houver blocker ou o motor não puder provar que somente as parts permitidas mudam, pare sem substituir o workbook. Segurança e auditabilidade têm precedência sobre concluir a edição a qualquer custo.
