# Tracking CookLily — compatibilidade de parâmetros

## Decisão

Rotas CookLily sob `/lilyacai/*` — ou rota equivalente futura da mesma aplicação — aceitam duas famílias de parâmetros:

| Campo canônico | Preferido | Alias legado |
|---|---|---|
| QR | `la_qr` | `cc_qr` |
| campanha | `la_campaign` | `cc_campaign` |
| variação | `la_variant` | `cc_variant` |

O uso de `cc_*` nas primeiras artes CookLily foi um erro de nomenclatura e não invalida QRs já produzidos.

## Normalização

1. ler primeiro `la_*`;
2. se ausente/vazio, aceitar o `cc_*` correspondente;
3. sanitizar e limitar o valor;
4. trabalhar/persistir somente no formato canônico CookLily.

Exemplo:

`?cc_qr=LILY1&cc_campaign=adesivos`

vira o modelo interno:

`laQr=LILY1`, `laCampaign=adesivos`, `laVariant=null`.

Se `la_qr=A` e `cc_qr=B` coexistirem, vence `la_qr=A`. A mesma precedência vale para campanha e variação.

## Persistência

A Entrega 04 criará os campos canônicos de atribuição junto do lead:

- `laQr`;
- `laCampaign`;
- `laVariant`.

Não criar colunas paralelas `ccQr`, `ccCampaign` ou `ccVariant`; `cc_*` é somente alias de entrada.

## Estado na Entrega 03

Já existem parsers equivalentes no frontend e backend, com testes para namespace canônico, aliases e precedência. O frontend pode manter temporariamente o modelo canônico em `sessionStorage` para não perder a origem durante a navegação. Isso não é persistência de banco.

Tracking não deve carregar telefone, nome, endereço ou texto livre.

## QR do adesivo existente

`CL-IMP-001` contém:

`https://carrochefe.com/lilyacai/cardapio?cc_qr=LILY1&cc_campaign=adesivos`

Esse QR permanece compatível. Novas artes devem preferir `la_qr`, `la_campaign` e `la_variant`.
