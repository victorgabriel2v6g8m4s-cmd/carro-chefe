# Guia de agentes — Excel Recipe

## Finalidade

Este guia define como agentes do Carro Chefe devem analisar, propor, executar e revisar alterações em `anexos/financeiro/carro chefe.xlsm` usando `tools/excel_recipe`.

A ferramenta é um mecanismo de manutenção versionada. Ela não transforma a planilha em banco de dados operacional, não substitui o ERP e não autoriza o agente a inventar informações de negócio.

## Responsabilidades

Agentes de domínio podem identificar a necessidade de mudança e fornecer os dados aprovados de sua especialidade. Alterações no código do motor pertencem ao `AG-DEV`. Alterações financeiras, custos, margens e configuração de ERP continuam sujeitas à validação de `AG-FINANCAS`; dados, contratos e linhagem ficam sob `AG-DADOS` quando aplicável.

Quem preparar uma receita é responsável por provar de onde vieram os valores e por não ultrapassar o escopo da operação suportada.

## Procedimento obrigatório

Antes de escrever a receita, leia `AGENTS.md`, `REGRAS.md`, o `AGENTS.md` mais próximo, `tools/excel_recipe/README.md`, `docs/tecnologia/EXCEL_RECIPE_V1.md`, `docs/tecnologia/EXCEL_RECIPE_V2.md` e o snapshot atual em `anexos/financeiro/snapshot/`.

Parta sempre da `main` atual e crie uma branch exclusiva da entrega. Não edite a planilha diretamente pela interface do GitHub nem gere arquivos paralelos como `carro chefe v2.xlsm`.

Use o snapshot para localizar a tabela, coluna, fórmula ou célula. Prefira operações por nome de tabela e chave estável a coordenadas absolutas. IDs existentes devem ser preservados; novos IDs só podem ser criados quando a regra de negócio os autorizar.

A receita deve fixar `expected_sha256` do workbook e, enquanto VBA estiver fora do escopo de edição, `expected_vba_sha256`. Inclua `assert.table`, `assert.row` ou `assert.cell` sempre que eles puderem impedir uma aplicação sobre estrutura inesperada.

Execute primeiro:

```bash
python -m tools.excel_recipe validate <receita.json>
```

Para receita estrutural da V2, gere e leia o plano antes da aplicação:

```bash
python -m tools.excel_recipe plan <receita.json>
```

Só aplique depois de revisar o dry-run/plano:

```bash
python -m tools.excel_recipe apply <receita.json>
```

Depois da aplicação, revise o `.xlsm`, o snapshot textual e o receipt. O diff deve refletir apenas a intenção solicitada. Se o firewall, SHA, assert, scanner, snapshot ou CI falhar, não contorne a proteção: investigue a causa.

## Escolha de operação

Para modificar um registro identificado por chave estável, prefira `table.upsert_rows` ou `table.update_rows`. Para inserir registros novos sem substituir existentes, use `table.append_rows`. `table.delete_rows` é limpeza lógica, não remoção física da linha.

Para fórmulas, prefira `formula.set` quando a fórmula final é conhecida. Use `formula.copy` com `translate_relative_refs: true` apenas quando a tradução A1 relativa for realmente desejada. Para coluna calculada de Table, prefira `table.set_formula_column`.

A V2 permite renome de tabela e coluna somente pelo fluxo de dependências. Para investigar impacto, use `dependency.scan`. Para autorizar a escrita, a receita deve executar `dependency.assert_clean` para o mesmo alvo imediatamente antes de `table.rename` ou `table.rename_column`. O motor aceita apenas um refactor estrutural por receita.

Nunca substitua esse fluxo por várias edições manuais de fórmulas/células para simular um rename. Se o scanner encontrar blocker em VBA, gráfico, PivotTable/PivotCache, ActiveX, link externo, QueryTable, conexão ou referência de coluna ambígua, o refactor deve parar.

## Como revisar um plano V2

No `dependency_report`, confira o `table`/`column` alvo, `source_sha256`, `vba_sha256`, `plan_sha256`, `rewritable_count`, `blocker_count` e a lista completa de `occurrences`.

Uma ocorrência `rewritable` significa que o motor conhece aquele contexto e sabe regravá-lo. Uma ocorrência `blocker` significa que o motor detectou dependência que não sabe alterar com segurança. Não existe aprovação humana ou `force: true` que transforme automaticamente um blocker em seguro; a capacidade precisa ser implementada e testada primeiro.

O plano é ligado ao estado interno do pacote. Qualquer mutação entre `dependency.assert_clean` e o rename invalida o plano. Essa falha deve ser tratada recriando a receita sobre a base correta, não removendo a precondição.

## Dados e precisão

Não invente preços, custos, fornecedores, quantidades, datas, margens, IDs ou fórmulas. Se o pedido não contém um valor e ele não pode ser obtido de fonte oficial versionada, registre a lacuna em vez de adivinhar.

Para valores monetários, use `decimal` textual. Preserve grafia, unidades e IDs do snapshot. Antes de atualizar uma linha, confirme que a chave identifica exatamente um registro.

## Revisão antes do PR

O PR deve conter a receita, o mesmo `.xlsm` atualizado, o snapshot regenerado e o receipt correspondente quando houver aplicação real. Não versione temporários, backups ou caches.

A descrição do PR deve registrar intenção, fonte dos dados, tabelas/partes afetadas, hashes de base, limites conhecidos e comandos de validação executados. Em refactor V2, registre também o `plan_sha256`, contagem de ocorrências e ausência de blockers. Alterações inesperadas em VBA, ActiveX, gráficos, pivôs ou mídia são bloqueadoras.

## Sincronização do proprietário

Depois do merge em `main`, a atualização local recomendada é:

```bash
python -m tools.excel_recipe.sync
```

Se houver edição local do `.xlsm`, o sync deve parar. O agente nunca deve instruir `reset --hard`, sobrescrita manual do arquivo ou criação de cópias como solução automática para divergência.

## Checklist rápido para agentes

Antes de abrir ou atualizar o PR, confirme: a branch partiu da `main` atual; a receita aponta para o SHA correto; o VBA SHA foi fixado; há asserts proporcionais ao risco; `validate` passou; se houver refactor, `plan` foi revisado e não há blockers; `apply` ou `--dry-run` produziu apenas as mudanças esperadas; snapshot e receipt foram revisados; nenhuma parte imutável mudou; e os checks do CI estão verdes.

## Regra de parada

Se a alteração desejada exigir recurso fora da versão atual, se o scanner apontar dependência bloqueadora ou se o motor não conseguir provar que somente as partes permitidas foram modificadas, a entrega deve parar sem substituir o workbook. Segurança e auditabilidade têm precedência sobre completar a edição a qualquer custo.
