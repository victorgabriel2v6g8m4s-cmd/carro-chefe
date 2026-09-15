# AGENTS — Excel Recipe

## Região

Ferramenta de edição transacional do workbook `anexos/financeiro/carro chefe.xlsm` por receitas JSON.

## Regras obrigatórias

- Leia `tools/AGENTS.md`, `tools/excel_recipe/README.md`, `docs/tecnologia/EXCEL_RECIPE_V1.md` e `docs/governanca/EXCEL_RECIPE_AGENT_GUIDE.md` antes de alterar o motor ou aplicar uma receita.
- Mudança no código desta ferramenta é responsabilidade de `AG-DEV`.
- Receitas devem usar o SHA-256 exato da fonte analisada; na V1, fixe também o SHA-256 do `vbaProject.bin`.
- Prefira nomes de tabela e chaves estáveis a coordenadas absolutas quando a estrutura permitir.
- Nunca invente dado operacional para completar uma receita.
- `validate` vem antes de `apply`; falha de SHA, assert, firewall, snapshot ou CI não pode ser ignorada.
- VBA, ActiveX, gráficos, pivôs e mídia são imutáveis na V1.
- Não implemente `force` genérico para contornar dependências ou partes imutáveis.
- Não versione temporários, backups, caches ou cópias alternativas do workbook.
- Toda operação nova deve declarar explicitamente quais partes OOXML pode modificar e ter teste de falha quando uma parte extra muda.
- Qualquer operação estrutural nova deve avaliar impacto em fórmulas, nomes definidos, Tables, validações, formatação condicional, gráficos, pivôs e VBA antes de ser considerada segura.

## Pronto

- [ ] happy path e entradas inválidas cobertos;
- [ ] SHA/precondição e rollback cobertos;
- [ ] firewall prova que partes não autorizadas permanecem idênticas;
- [ ] VBA permanece idêntico quando fora do escopo;
- [ ] snapshot é regenerado e `--check` passa;
- [ ] Linux e Windows cobertos no CI quando a operação participa do fluxo normal;
- [ ] documentação, schema e exemplos atualizados junto com a operação.
