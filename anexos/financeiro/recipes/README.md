# Receitas de edição da planilha

Este diretório guarda os roteiros JSON aplicados ao `anexos/financeiro/carro chefe.xlsm` e seus receipts de auditoria.

- cada receita deve ter `id` único;
- sempre partir do SHA-256 exato da planilha na branch base;
- usar `expected_vba_sha256` quando a receita não pretende editar VBA (toda a V1);
- incluir `assert.*` para estruturas críticas antes de operações destrutivas;
- uma receita aplicada não deve ser reaplicada sobre outra versão do workbook;
- o receipt é gerado pelo motor, não editado manualmente.

Consulte `tools/excel_recipe/README.md` e `docs/EXCEL_RECIPE_V1.md`.
