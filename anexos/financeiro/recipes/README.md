# Receitas de edição da planilha

Este diretório guarda os roteiros JSON aplicados ao `anexos/financeiro/carro chefe.xlsm` e seus receipts de auditoria.

Cada receita deve ter `id` único, partir do SHA-256 exato da planilha na branch base, fixar `expected_vba_sha256` enquanto o VBA for imutável e usar `assert.*` para estruturas críticas antes de qualquer mudança sensível. Uma receita aplicada não deve ser reaplicada sobre outra versão do workbook; o hash de precondição existe para impedir isso.

Receitas representam **intenção**, não snapshots inteiros. Prefira operações por tabela/chave estável a coordenadas absolutas quando houver uma Table adequada. Não invente IDs, preços, custos, quantidades, fórmulas ou nomes de coluna ausentes da fonte analisada.

O fluxo normal é: analisar `anexos/financeiro/snapshot/`, criar a receita na branch da entrega, executar `validate`, revisar o resultado/plano, executar `apply`, revisar snapshot/receipt e só então integrar a branch.

## Rename V2

Para `table.rename` ou `table.rename_column`, execute primeiro `dependency.assert_clean` para o mesmo alvo. Use `python -m tools.excel_recipe plan <receita.json>` e revise todas as ocorrências. Qualquer `blocker` encerra o refactor. A V2 permite apenas um rename estrutural por receita.

`dependency.scan` pode ser usado isoladamente para investigar impacto sem modificar o workbook.

## Transformação física V3A

Para `sheet.insert_rows`, `sheet.delete_rows`, `sheet.insert_columns`, `sheet.delete_columns`, `range.move`, `table.insert_column`, `table.delete_column` ou `table.compact_rows`, investigue com `structural.plan` e use `structural.assert_clean` imediatamente antes da operação de escrita correspondente.

A V3A permite apenas **uma transformação física por receita** e não a combina com rename V2. O plano precisa ter zero blockers e deve continuar ligado ao mesmo `package_state_sha256` até a mutação.

Não simule uma operação estrutural bloqueada usando várias edições de célula. Drawing/VML/ActiveX, gráficos, pivôs, VBA que precisaria ser regravado, conexões e sintaxes não suportadas devem continuar bloqueando até a fase específica do motor existir.

## Receipts

Receipts ficam em `anexos/financeiro/recipes/receipts/` e são gerados pelo motor. Nunca os edite manualmente. Para V3A, o receipt inclui o `structural_plan`, `plan_sha256`, transformação normalizada, partes alteradas e contagem de elementos movidos/regravados.

Consulte `tools/excel_recipe/README.md`, `docs/tecnologia/EXCEL_RECIPE_V1.md`, `docs/tecnologia/EXCEL_RECIPE_V2.md`, `docs/tecnologia/EXCEL_RECIPE_V3A.md` e, para agentes, `docs/governanca/EXCEL_RECIPE_AGENT_GUIDE.md`.


## CookLily — gelato/milk-shake provisório

`cooklily-milkshake-gelato-2026-09-24.json` cadastra os insumos comprados, a base, a mistura de Nutella e as versões de café 500 ml/300 ml. Hipóteses provisórias (Emustab, equivalência g/ml e embalagem 300 ml) estão documentadas em `docs/lily-acai/custos/MILKSHAKE_GELATO_CASEIRO_2026-09-24.md`.
