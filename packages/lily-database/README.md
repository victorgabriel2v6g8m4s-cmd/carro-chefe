# Banco CookLily

Pacote Prisma/SQLite independente da operação CookLily.

## Isolamento

- variável: `LILY_DATABASE_URL`;
- produção planejada: `file:/srv/carro-chefe/data/lily-acai.db`;
- sem FK/view para o banco Carro Chefe.

## Modelos de identidade/leads

- `LilyUser`;
- `LilySession`;
- `LilyConsentRecord`;
- `LilyMarketingLead`.

`LilyMarketingLead` guarda telefone normalizado, consentimento/versionamento e atribuição canônica `la*`.

## Modelos do catálogo

Entrega 05:

- `LilyCategory`;
- `LilyMediaAsset`;
- `LilyProduct`;
- `LilyProductVariant`;
- `LilyFlavorComponent`;
- `LilyFlavorCompatibility`;
- `LilyProductFlavor`;
- `LilyAddon`;
- `LilyProductAddon`;
- `LilyProductMedia`;
- `LilyMixPriceTier`;
- `LilyCombo`;
- `LilyComboItem`;
- `LilyOffer`;
- `LilyAdminAudit`.

## Modelos de pedido — Entrega 06

- `LilyAddress`;
- `LilyOperationalSettings`;
- `LilyDeliveryZone`;
- `LilyOrder`;
- `LilyOrderItem`;
- `LilyOrderItemAddon`;
- `LilyOrderStatusEvent`.

Pedidos preservam snapshots comerciais e attribution `la*`. A configuração operacional nasce fechada.

## Migration de pedidos

`20260925100000_lily_orders`

Aplicada com sucesso nos gates Node 20 e Node 24 do SHA `da166683ab2d0e27acae23d9714ec8e824a02ac4`.

## Migration do catálogo

`20260924190000_lily_catalog`

A migration cadastra a base do cardápio inicial, incluindo categorias, sabores, produtos, variantes, adicionais, LilyMix e combos.

Ela foi aplicada com sucesso em banco SQLite limpo nos gates de CI Node 20 e Node 24.

## Comandos

```bash
npm run db:generate:lily
npm run db:validate:lily
npm run db:migrate:lily
npm run db:deploy:lily
npm run db:studio:lily
```

## Produção

Nunca executar reset ou seed de desenvolvimento no banco de produção.

Antes de aplicar migrations na VPS:

1. fazer backup do `lily-acai.db`;
2. publicar SHA imutável;
3. executar `npm run db:deploy:lily`;
4. realizar smoke;
5. manter rollback disponível.
