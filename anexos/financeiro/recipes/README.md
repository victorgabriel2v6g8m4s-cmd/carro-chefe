# Receitas de edição da planilha

Este diretório guarda os roteiros JSON aplicados ao `anexos/financeiro/carro chefe.xlsm` e seus receipts de auditoria.

Cada receita deve ter `id` único, partir do SHA-256 exato da planilha na branch base, fixar `expected_vba_sha256` enquanto o VBA for imutável e usar `assert.*` para estruturas críticas antes de mudanças sensíveis. Uma receita aplicada não deve ser reaplicada sobre outra versão do workbook.

Receitas representam **intenção**, não snapshots inteiros. Prefira operações por tabela/chave estável a coordenadas absolutas quando houver identificador adequado. Não invente IDs, preços, custos, quantidades, fórmulas ou nomes ausentes da fonte analisada.

Fluxo normal: analisar snapshot → criar receita na branch → `validate` → revisar plano → `apply` → revisar workbook/snapshot/receipt → integrar somente após os gates previstos.

## Rename V2

Para `table.rename`/`table.rename_column`, execute `dependency.assert_clean` para o mesmo alvo. Revise todas as ocorrências; qualquer blocker encerra o refactor.

## Transformações V3A/V3B

Para `sheet.insert_rows`, `sheet.delete_rows`, `sheet.insert_columns`, `sheet.delete_columns`, `range.move`, `table.insert_column`, `table.delete_column` ou `table.compact_rows`, investigue com `structural.plan` e use `structural.assert_clean` imediatamente antes da mutação correspondente.

Apenas **uma transformação física por receita**. Não combine com rename V2 e não simule uma operação bloqueada com edições manuais de células/XML.

A V3B usa as mesmas operações, mas pode atravessar DrawingML/charts quando o plano classificar as dependências visuais como `rewritable`. Isso inclui `oneCellAnchor`, `twoCellAnchor` e referências A1 `c:f` de charts clássicos suportados cuja cardinalidade de cache seja preservada.

Continuam blockers, entre outros: VML, ActiveX/OLE, `absoluteAnchor`, PivotChart/pivôs, `externalData`, tipos/extensões de chart não suportados, mudança no número de pontos do cache, referências afetadas fora de `c:f`, VBA que precisaria mudar e conexões não suportadas.

## Receipts

Receipts ficam em `anexos/financeiro/recipes/receipts/` e são gerados pelo motor. Nunca edite manualmente.

Para V3, o receipt registra plano/hash, transformação, parts alteradas e contagens. Quando V3B regrava objetos visuais, também registra:

- `rewritten_drawing_anchors`;
- `rewritten_chart_references`.

Consulte `tools/excel_recipe/README.md`, `docs/tecnologia/EXCEL_RECIPE_V1.md`, `docs/tecnologia/EXCEL_RECIPE_V2.md`, `docs/tecnologia/EXCEL_RECIPE_V3A.md`, `docs/tecnologia/EXCEL_RECIPE_V3B.md` e `docs/governanca/EXCEL_RECIPE_AGENT_GUIDE.md`.
