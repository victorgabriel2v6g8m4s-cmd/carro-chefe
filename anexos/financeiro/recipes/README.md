# Receitas de edição da planilha

Este diretório guarda os roteiros JSON aplicados ao `anexos/financeiro/carro chefe.xlsm` e seus receipts de auditoria.

Cada receita deve ter `id` único, partir do SHA-256 exato da planilha na branch base, fixar `expected_vba_sha256` enquanto o VBA for imutável e usar `assert.*` para estruturas críticas antes de qualquer mudança sensível. Uma receita aplicada não deve ser reaplicada sobre outra versão do workbook; o próprio hash de precondição existe para impedir isso.

Receitas devem representar **intenção**, não snapshots inteiros de planilha. Prefira operações por tabela/chave estável a coordenadas absolutas quando houver uma Table adequada. Não invente IDs, preços, custos, quantidades, fórmulas ou nomes de coluna ausentes da fonte analisada.

O fluxo esperado é: analisar `anexos/financeiro/snapshot/`, criar a receita na branch da entrega, executar `validate`, revisar o plano, executar `apply`, revisar o diff do snapshot e o receipt e só então integrar a branch.

Receipts ficam em `anexos/financeiro/recipes/receipts/` e são gerados pelo motor. Nunca os edite manualmente.

Consulte `tools/excel_recipe/README.md`, `docs/tecnologia/EXCEL_RECIPE_V1.md` e, para agentes, `docs/governanca/EXCEL_RECIPE_AGENT_GUIDE.md`.
