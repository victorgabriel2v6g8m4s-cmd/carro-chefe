# Bebidas Fort — 17/09/2026

## Origem

Cadastro preparado a partir das fotografias de gôndola e etiquetas de preço fornecidas pelo proprietário em 17/09/2026. Os valores abaixo são custos de compra por unidade observados nas etiquetas. Quando havia preço condicionado a clube ou quantidade mínima, foi usado o preço normal de varejo, coerente com os valores já cadastrados na planilha.

## Itens cadastrados

| Produto | Custo observado | Preço de venda calculado pela planilha* |
| --- | ---: | ---: |
| Coca-Cola Original PET 2,5 L | R$ 11,79 | R$ 23,17 |
| Coca-Cola Original Lata 310 ml | R$ 3,19 | R$ 6,27 |
| Coca-Cola Zero Lata 350 ml | R$ 3,89 | R$ 7,64 |
| Guaraná Antarctica Lata 350 ml | R$ 3,39 | R$ 6,66 |
| Guaraná Funada PET 2 L | R$ 6,29 | R$ 12,36 |
| Cerveja Original Pilsen Garrafa 300 ml | R$ 4,79 | R$ 9,41 |
| Cerveja Brahma Chopp Pilsen Lata 350 ml | R$ 3,99 | R$ 7,84 |
| Cerveja Amstel Puro Malte Lata 350 ml | R$ 4,09 | R$ 8,04 |
| Cerveja Heineken Long Neck 330 ml | R$ 6,98 | R$ 13,72 |
| Cerveja Skol Pilsen Lata 269 ml | R$ 3,09 | R$ 6,07 |
| Coca-Cola Zero PET 600 ml | R$ 5,49 | R$ 10,79 |
| Fanta Laranja PET 2 L | R$ 9,49 | R$ 18,65 |

\* Valores de referência arredondados para centavos para revisão humana. A planilha calcula `Preço de Venda` a partir de custo total, despesas variáveis e margem configurada. `Preço Definitivo` continua sem override para estes novos itens, de modo a não inventar uma política comercial de arredondamento que não está definida no arquivo.

## Ajustes de cadastro existentes

- `Coca Cola 2,5`: custo atualizado de R$ 11,19 para R$ 11,79 conforme a fotografia atual.
- `Coca Cola Lata 350`: descrição corrigida para `Coca Cola Lata 310`, pois a etiqueta fotografada identifica o SKU como 310 ml.

## Item deliberadamente não cadastrado

A fotografia com garrafas de Fanta 600 ml mostra uma etiqueta de gôndola identificada como **Sprite 510 ml Lemon Fresh Zero**, por R$ 2,99. Como produto e etiqueta não correspondem, esse valor não foi atribuído à Fanta 600 ml.

## Auditoria

A alteração foi executada por `tools/excel_recipe` com SHA-256 exato do workbook e do VBA. A receita é `2026-09-17-bebidas-fort.json`; o receipt correspondente é gerado em `recipes/receipts/`. O VBA permaneceu byte a byte com o mesmo SHA-256, e o snapshot passou na verificação de sincronização após a aplicação.
