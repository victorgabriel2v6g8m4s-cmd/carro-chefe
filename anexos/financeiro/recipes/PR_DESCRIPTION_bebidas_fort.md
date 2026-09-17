## Resumo

- cadastra 12 bebidas fotografadas no Fort Atacadista;
- atualiza o custo da Coca-Cola 2,5 L para R$ 11,79;
- corrige o SKU da Coca-Cola original em lata de 350 ml para 310 ml conforme etiqueta fotografada;
- vincula cada bebida aos insumos e à ficha de produto;
- deixa a planilha calcular o preço de venda com as configurações financeiras existentes;
- mantém `Preço Definitivo` sem override, pois não há regra comercial documentada de arredondamento;
- não cadastra a Fanta 600 ml porque a etiqueta visível na foto é de Sprite 510 ml, evitando associar custo incorreto.

## Validação

A receita `2026-09-17-bebidas-fort.json` foi validada e aplicada com `tools/excel_recipe`. O snapshot sincronizado passou em `tools/excel_snapshot/export.py --check`. O receipt confirma que o SHA do VBA permaneceu inalterado.
