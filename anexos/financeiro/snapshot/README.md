# Bootstrap do snapshot XLSM

Este diretório será substituído automaticamente pela primeira execução de:

```bash
python tools/excel_snapshot/export.py
```

Enquanto o primeiro snapshot ainda não foi materializado, `BOOTSTRAP_REQUIRED.json` trava o bootstrap ao SHA-256 exato do `anexos/financeiro/carro chefe.xlsm` atualmente versionado. O CI executa o exportador integralmente em temporário e só aceita o bootstrap se esse hash continuar igual.

Depois da primeira exportação, este README e o marcador serão substituídos pelos arquivos gerados (`manifest.json`, `workbook.json`, `formulas.json`, `sheets/`, `tables/` e `vba/`).
