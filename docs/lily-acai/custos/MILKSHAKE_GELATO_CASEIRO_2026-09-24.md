# Precificação provisória — Milk-shake de Gelato Caseiro CookLily

**Data-base:** 2026-09-24  
**Nome comercial:** provisório; “Milk-shake de Gelato Caseiro” é somente nome de trabalho.

## Insumos informados

| Insumo | Compra | Custo |
| --- | ---: | ---: |
| Açúcar cristal | 5 kg | R$ 12,37 |
| Creme de leite | 4 × 200 g | R$ 11,96 |
| Leite integral | 1 L | R$ 5,99 |
| Liga neutra | 2 × 100 g | R$ 15,00 |
| Emustab | 200 g | R$ 15,90 |
| Café 3 Corações | 20 g | R$ 1,99 |
| Nutella original | 375 g | R$ 30,00 |
| Morango in natura | 295 g | R$ 10,00 |
| Maracujá in natura | 1 kg | R$ 15,00 |

Embalamento informado como o mesmo das batidas de açaí: garrafa R$ 1,00, canudo R$ 0,30 e sacola R$ 0,15. Para a versão de 300 ml, o custo da garrafa foi provisoriamente mantido em R$ 1,00 porque ainda não foi informado um custo específico de embalagem de 300 ml.

## Subreceita — base

Receita informada:

- 4 caixas de creme de leite (800 g);
- 300 g de açúcar;
- 2 colherzinhas de café de Emustab;
- 30 g de liga neutra;
- 750 ml de leite integral;
- rendimento: 2,5 L.

### Hipótese provisória do Emustab

O peso das duas colherzinhas não foi medido. Para permitir o custeio inicial, a planilha usa **5 g no total** como hipótese temporária. Isso não transforma 5 g em receita homologada. A primeira produção deve pesar as duas colherzinhas e substituir o valor.

Com 5 g provisórios:

| Componente | Custo no lote |
| --- | ---: |
| Creme de leite 800 g | R$ 11,96 |
| Açúcar 300 g | R$ 0,7422 |
| Leite integral 750 ml | R$ 4,4925 |
| Liga neutra 30 g | R$ 2,2500 |
| Emustab 5 g | R$ 0,3975 |
| **Lote 2,5 L** | **R$ 19,8422** |

Custo direto: **R$ 7,93688/L** ou **R$ 0,00793688/ml**.

## Subreceita — mistura de Nutella

- 375 g de Nutella original: R$ 30,00;
- 400 g de creme de leite: R$ 5,98;
- rendimento informado: 775 ml;
- custo do lote: **R$ 35,98**;
- custo por ml: **R$ 0,0464258065**.

A dosagem final foi informada em gramas enquanto o rendimento foi informado em ml. Para o primeiro custeio é usada a equivalência **1 g ≈ 1 ml**, que deve ser substituída pela densidade/peso real medido do lote.

## Regra de montagem para custeio

Interpretação usada: as quantidades de sabor fazem parte do **volume final nominal**.

### Café 500 ml

- 440 ml de base;
- 50 g/ml equivalentes de mistura de Nutella;
- 10 g de café.

### Café 300 ml

Escala de 60%:

- 264 ml de base;
- 30 g/ml equivalentes de mistura de Nutella;
- 6 g de café.

### Sabores de fruta

Para 500 ml:

- 390 ml de base;
- 50 g/ml equivalentes de mistura de Nutella;
- 60 g de fruta.

Para 300 ml:

- 234 ml de base;
- 30 g/ml equivalentes de mistura de Nutella;
- 36 g de fruta.

O balanço volumétrico é uma convenção inicial de custeio. A produção deve medir rendimento final real, incorporação de ar e volume após bater/congelar.

## Precificação calculada

Configuração vigente do workbook:

- despesas variáveis: 27,3%;
- margem da categoria quando não classificada: 30%;
- rateio de custo fixo: não incluído;
- preço definitivo: não preenchido automaticamente.

| Produto provisório | Ingredientes diretos | Embalamento | Custo total modelado | Preço calculado pela planilha |
| --- | ---: | ---: | ---: | ---: |
| Café 500 ml | R$ 6,81 | R$ 1,45 | **R$ 10,82** | **R$ 15,45** |
| Café 300 ml | R$ 4,09 | R$ 1,45 | **R$ 7,07** | **R$ 10,10** |

Esses valores não são preços finais de venda. O campo `Preço Definitivo` permanece vazio até decisão comercial.

## Sabores de fruta — custos confirmados

Custos informados pelo proprietário em 24/09/2026:

- morango: **R$ 10,00 por 295 g** = **R$ 33,8983/kg**;
- maracujá: **R$ 15,00/kg**.

Custo de fruta por produto:

| Sabor | 500 ml | 300 ml |
| --- | ---: | ---: |
| Morango | 60 g = **R$ 2,03** | 36 g = **R$ 1,22** |
| Maracujá | 60 g = **R$ 0,90** | 36 g = **R$ 0,54** |

Precificação resultante pelo mesmo modelo financeiro:

| Produto provisório | Ingredientes diretos | Embalamento | Custo total modelado | Preço calculado |
| --- | ---: | ---: | ---: | ---: |
| Morango 500 ml | **R$ 7,45** | R$ 1,45 | **R$ 11,70** | **R$ 16,71** |
| Morango 300 ml | **R$ 4,47** | R$ 1,45 | **R$ 7,60** | **R$ 10,86** |
| Maracujá 500 ml | **R$ 6,32** | R$ 1,45 | **R$ 10,14** | **R$ 14,48** |
| Maracujá 300 ml | **R$ 3,79** | R$ 1,45 | **R$ 6,66** | **R$ 9,52** |

Os valores de “Preço calculado” continuam sendo saída do modelo vigente, não preço comercial aprovado. `Preço Definitivo` permanece vazio.

## Pendências de validação

1. pesar as duas colherzinhas de Emustab;
2. pesar/medir o lote final da mistura de Nutella para obter densidade real;
3. confirmar embalagem e custo específicos de 300 ml;
4. medir rendimento real após processamento;
5. definir nome comercial definitivo;
6. definir processo, tempo, temperatura, armazenamento/validade;
7. validar alergênicos pelos rótulos dos insumos usados no lote real.

## Rastreabilidade

Receita-base Excel: `anexos/financeiro/recipes/cooklily-milkshake-gelato-2026-09-24.json`.

Receita complementar de frutas: `anexos/financeiro/recipes/cooklily-milkshake-gelato-frutas-2026-09-24.json`.

O workbook só é alterado pelo motor `tools/excel_recipe`, com SHA da fonte, hash VBA, asserts, snapshot e receipt.


## Evidência da aplicação no Excel

Execução: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/actions/runs/36023722134

Resultado:

- `validate`: passou;
- `plan`: passou;
- `apply`: passou;
- snapshot: regenerado;
- receipt: gerado;
- SHA-256 do workbook antes: `569d0f24b078a2355da1edf82d2b15dc1fefd3e0bce710ac40d7dc94da2308ea`;
- SHA-256 do workbook depois: `7bd4a3defe4173f361c07ca4ee98da43654bd8f9d0724f5ad9ee1374965701c1`;
- VBA antes/depois: `b8fa98985cdd1abd7d2d05b1cb7efabf79a8b83399136039dd040a4d6604b0cf`;
- commit gerado pelo motor: `27305cbc60807c3ff2d75bbc35bf009220ecb6a7`.

A primeira execução foi abortada com rollback automático porque o runner não tinha `openpyxl` para gerar o snapshot. Nenhum workbook dessa tentativa foi persistido. O workflow foi corrigido para instalar `tools/excel_snapshot/requirements.txt` e a segunda execução concluiu transacionalmente.


## Validação final da branch

Head técnico validado:

`ef36e28be56b924764812753c3256e3a969a5782`

Evidências:

- CI completo: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/actions/runs/36024776435 — **success**;
- CodeQL: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/actions/runs/36024775974 — **success**;
- Excel Recipe Linux: **success**;
- Excel Recipe Windows: **success**;
- Workbook Snapshot: **success**;
- Quality Node 20: **success**;
- Quality Node 24: **success**;
- Tool Health Linux: **success**;
- PR temporário #61: fechado sem merge e sem publicação.

A alteração dos dados do workbook mudou legitimamente seu SHA e, por consequência, os hashes determinísticos dos probes reais V3A/V3B. Os fixtures foram atualizados somente para refletir o novo artefato-base; a lógica do motor não foi alterada.


## Evidência da aplicação dos sabores de fruta

Execução transacional: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/actions/runs/36041200580

- `validate`: passou;
- `plan`: passou;
- `apply`: passou;
- morango cadastrado no ID `96`;
- maracujá cadastrado no ID `97`;
- SKUs `2112` a `2115` criados;
- snapshot regenerado;
- receipt: `anexos/financeiro/recipes/receipts/cooklily-milkshake-gelato-frutas-2026-09-24.receipt.json`;
- SHA-256 antes: `7bd4a3defe4173f361c07ca4ee98da43654bd8f9d0724f5ad9ee1374965701c1`;
- SHA-256 depois: `b14b1e32c1774b1781847ab2afc97c8d504aec90a4a317bfccaa70293e2b977d`;
- VBA antes/depois: `b8fa98985cdd1abd7d2d05b1cb7efabf79a8b83399136039dd040a4d6604b0cf`;
- commit do workbook: `ca18149a2cb772c5e42eb47116d48c0963545f20`.

O custo de morango e maracujá deixou de ser pendência. Os valores de venda calculados continuam sendo referência do modelo, não preço definitivo.
