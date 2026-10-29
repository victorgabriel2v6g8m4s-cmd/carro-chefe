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

## Testes locais

`npm test` e `npm run test:api` aplicam `prisma migrate deploy` ao banco padrão `.runtime/lily-acai.db` antes de executar os testes, quando nenhuma URL de banco foi definida no ambiente. O arquivo é o mesmo banco local CookLily do checkout e permanece ignorado pelo Git; a preparação é incremental e não recria nem limpa o banco.

Quando `LILY_DATABASE_URL` estiver definido explicitamente, o hook não escolhe nem migra outro destino: CI e deploy continuam responsáveis por preparar seus bancos de teste/snapshot antes dos gates.

## Produção

Nunca executar reset ou seed de desenvolvimento no banco de produção.

Antes de aplicar migrations na VPS:

1. fazer backup do `lily-acai.db`;
2. publicar SHA imutável;
3. executar `npm run db:deploy:lily`;
4. realizar smoke;
5. manter rollback disponível.


## MFA privilegiado

Migration `20260927160000_lily_staff_mfa`.

`LilyUser` registra estado de enrollment, segredo cifrado e hashes de recovery codes. `LilySession.mfaVerifiedAt` diferencia sessão autenticada por senha de sessão privilegiada com segundo fator confirmado.

O banco nunca persiste segredo TOTP em texto puro nem recovery code bruto. A chave de cifra pertence ao ambiente de produção e não ao banco/Git.

## Identidade administrativa de agente

Migration `20261028120000_lily_agent_admin_auth` adiciona uma chave pública Ed25519 por conta CookLily dedicada ao agente, desafios temporários, handoffs persistidos somente por hash e a associação da sessão com a chave usada. A identidade vinculada não aceita login por senha; a chave privada permanece no computador local/ssh-agent. `LilyAdminAudit.actorType`, `agentKeyId` e `agentKeyFingerprint` identificam as ações do agente. Revogar a chave invalida todas as sessões associadas sem apagar a trilha de auditoria.
