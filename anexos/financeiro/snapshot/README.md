# Snapshot legível da planilha financeira

Este diretório é **gerado automaticamente** por `tools/excel_snapshot/export.py`. Não edite seus arquivos manualmente.

Fonte binária: `anexos/financeiro/carro chefe.xlsm`  
SHA-256 da fonte: `f14fa0e4c9658b43cb43e39599ef5c21ee04b27b59cd386d1919b6bd2768164a`  
Versão do gerador: `1.0.0`

## Conteúdo

- `manifest.json`: integridade da fonte e dos artefatos gerados;
- `workbook.json`: metadados, abas, nomes definidos e índice das tabelas;
- `formulas.json`: fórmulas e valores em cache salvos pelo Excel;
- `sheets/*.csv`: valores por aba para leitura e diff;
- `tables/*.json`: tabelas estruturadas em formato estável;
- `vba/index.json` e `vba/modules/*`: código-fonte VBA extraído estaticamente.

Resumo: 16 abas, 21 tabelas, 5820 fórmulas e 19 módulos VBA extraídos.

## Governança

O `.xlsm` continua sendo a fonte binária original desta representação. O snapshot não transforma valores legados, custos ou preços em parâmetros aprovados. O ERP continua destinado a ser a fonte transacional oficial conforme a governança do projeto.

A ferramenta **não executa macros**, não recalcula a planilha com o motor do Excel e não é dependência de runtime do site, API ou ERP.
