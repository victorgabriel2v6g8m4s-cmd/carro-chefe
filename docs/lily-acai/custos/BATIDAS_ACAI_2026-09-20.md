# Custos iniciais — batidas de açaí Lily

Data-base: 2026-09-20.

## Fonte dos custos

Valores transcritos dos cupons fiscais fornecidos pelo proprietário:

| Item | Embalagem de compra | Custo |
| --- | ---: | ---: |
| Açaí Polpa Amazônia | 3 L | R$ 59,90 |
| Leite em pó Piracanjuba | 400 g | R$ 19,98 |
| Leite Italac desnatado | 1 L | R$ 5,99 |
| Creme de leite Piracanjuba | 200 g | R$ 3,89 |
| Leite condensado Italac | 395 g | R$ 5,75 |
| Refresco em pó Frisco | 1 sachê | R$ 0,85 |
| Garrafa Lily | 500 ml | R$ 1,00/un. |
| Canudo Lily | unidade | R$ 0,30/un. |
| Sacola plástica Lily | unidade | R$ 0,15/un. |

O cupom apresenta duas linhas de refresco Frisco a R$ 0,85/un.; a associação das duas linhas aos sabores morango e maracujá vem da informação operacional fornecida pelo proprietário, pois o sabor não está legível no cupom.

## Receita cadastrada

Cada batida de 500 ml usa 50 g de leite em pó, 50 ml de leite desnatado, 390 ml de açaí e uma porção de moussie equivalente aos 50 g informados, além de uma garrafa, um canudo e uma sacola.

Cada lote de moussie usa 1 creme de leite de 200 g, 1 leite condensado de 395 g, 100 ml de água e 1 sachê de refresco, com rendimento informado de 750 ml.

## Hipótese de conversão do moussie

A receita informa o consumo final em 50 g, mas o rendimento do lote em 750 ml. Como ainda não foi informada a densidade/peso final real do moussie, a precificação inicial usa provisoriamente **1 g ≈ 1 ml**, resultando em 15 porções por lote.

Essa hipótese precisa ser substituída por medição real do peso do lote pronto assim que a produção padronizar o preparo.

## Água

Os 100 ml de água são registrados na ficha técnica, mas sem custo direto inventado. A planilha já possui água dentro das despesas variáveis (2% no snapshot usado nesta alteração), portanto o preço do insumo água fica vazio e o custo é absorvido pelo modelo de despesas variáveis.

## Conferência manual da base

- moussie: R$ 3,89 + R$ 5,75 + R$ 0,85 = **R$ 10,49 por lote**;
- porção inicial do moussie: R$ 10,49 / 15 = **R$ 0,6993**;
- açaí (390 ml): **R$ 7,7870**;
- leite em pó (50 g): **R$ 2,4975**;
- leite desnatado (50 ml): **R$ 0,2995**;
- ingredientes diretos por batida: **R$ 11,2833**;
- embalagem por batida: **R$ 1,45**.

Com a configuração atual do workbook (27,3% de despesas variáveis), o custo total modelado fica em aproximadamente **R$ 16,97 por garrafa**. Com a margem atualmente configurada de 30% e sem ratear custos fixos do Carro Chefe, o preço calculado pela lógica vigente fica em aproximadamente **R$ 24,24**.

Nenhum `Preço Definitivo` foi preenchido automaticamente. O valor final de venda continua sendo uma decisão comercial.

## Rastreabilidade

A alteração é executada exclusivamente por `tools/excel_recipe` a partir de:
`anexos/financeiro/recipes/lily-acai-batidas-2026-09-20.json`.

O receipt gerado pelo motor e o snapshot atualizado são a evidência técnica da aplicação.

## Evidência da aplicação

Aplicação concluída na branch `lily-acai` pelo motor `tools/excel_recipe` v3.2.1.

- workflow final: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/actions/runs/35526628211
- commit do workbook: `f79d8f91c309b38c506161821e0863941d7217d0`
- SHA-256 do workbook antes: `62ceecb5d1349c4b27c37a901bae00aa1ac63884f5d5fe7f3990ad6f33073b70`
- SHA-256 do workbook depois: `569d0f24b078a2355da1edf82d2b15dc1fefd3e0bce710ac40d7dc94da2308ea`
- SHA-256 do projeto VBA antes/depois: `b8fa98985cdd1abd7d2d05b1cb7efabf79a8b83399136039dd040a4d6604b0cf` (inalterado)
- `policy:preflight`: passou
- `excel_recipe validate`: passou na execução final
- `excel_recipe plan`: passou
- `excel_recipe apply`: passou
- verificação do snapshot regenerado: passou
- receipt: `anexos/financeiro/recipes/receipts/lily-acai-batidas-2026-09-20.receipt.json`

Duas execuções anteriores foram bloqueadas em `validate`, sem alterar o workbook: a primeira porque a tabela Ingredientes possui linha de totais e não aceita `append_rows`; a segunda porque a asserção lia o valor calculado do snapshot em vez da fórmula OOXML real da coluna de ID da Precificação. As duas causas foram corrigidas antes da aplicação final.
