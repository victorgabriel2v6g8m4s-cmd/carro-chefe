# Módulo API CookLily

Backend isolado da operação CookLily.

## Namespace

`/api/v1/lily/*`

## Persistência

Somente `packages/lily-database`. É proibido usar o banco do Carro Chefe para dados CookLily.

## Rotas públicas

```text
GET  /api/v1/lily/public/health
GET  /api/v1/lily/public/config
POST /api/v1/lily/public/leads
GET  /api/v1/lily/public/catalog
GET  /api/v1/lily/public/catalog/search
GET  /api/v1/lily/public/products/:slug
GET  /api/v1/lily/public/media/:id
POST /api/v1/lily/public/configure-item
```

## Autenticação

```text
POST /api/v1/lily/auth/register
POST /api/v1/lily/auth/login
GET  /api/v1/lily/auth/me
POST /api/v1/lily/auth/logout
```

A autenticação usa telefone normalizado, scrypt, sessão aleatória persistida somente como hash, cookie HttpOnly e CSRF próprio. Registro público sempre cria `customer`.

## Admin

`/api/v1/lily/admin/*` exige:

- sessão Lily;
- role `staff` ou `admin`;
- CSRF em mutações;
- validação Zod;
- auditoria.

Administra categorias, produtos, variantes, sabores, compatibilidades, adicionais, LilyMix, combos, ofertas e mídia.

## Catálogo

`catalog.ts` implementa a Entrega 05.

O configurador público é a autoridade para:

- disponibilidade;
- tamanho;
- LilyMix de até 3 sabores;
- compatibilidade;
- tiers;
- modificadores premium;
- adicionais;
- limites;
- ofertas;
- preço final da configuração.

O navegador não deve ser tratado como autoridade de preço.

## Pedidos — Entrega 06

Rotas:

```text
POST /api/v1/lily/orders/quote
POST /api/v1/lily/orders
GET  /api/v1/lily/customer/orders
GET  /api/v1/lily/customer/orders/:id
```

O servidor recota produto/combo antes de criar pedido e compara `configurationHash` + preço esperado. Pedido stale é rejeitado.

Criação exige `Idempotency-Key`; retry idêntico retorna o pedido existente, enquanto reuso da chave com payload diferente retorna conflito.

Guest pode criar pedido com telefone obrigatório. Quando há sessão, o pedido é vinculado ao usuário e a mutação exige CSRF. Histórico é sempre filtrado pelo titular.

Pedidos da Entrega 06 nascem em `awaiting_payment`; pagamento pertence à Entrega 07.

## Fulfillment e endereços

`fulfillment.ts` administra abertura de pedidos, retirada, entrega, horários, pedido mínimo, taxa fixa e regiões.

`addresses.ts` oferece CRUD de endereços somente para o titular autenticado, com CSRF em mutações.

## Leads

`POST /public/leads` não cria conta nem senha. Exige opt-in de marketing, normaliza telefone, deduplica por telefone e grava somente no Lily DB.

Tracking aceita `la_*` e `cc_*` na entrada e persiste apenas `laQr`, `laCampaign` e `laVariant`.

## Mídia

Uploads administrativos:

- JPEG/PNG/WebP;
- máximo 10 MB;
- nome físico aleatório;
- SHA-256;
- diretório Lily separado.

## Validação Entrega 05

SHA técnico: `9e9c2e194076aa5a8dd3262e73528ac3689c8896`

- Node 20: 94 testes + build — success;
- Node 24: 94 testes + build — success;
- CodeQL — success.

## Validação Entrega 06

SHA técnico: `da166683ab2d0e27acae23d9714ec8e824a02ac4`

- 21 arquivos de teste;
- 105 testes aprovados;
- Node 20/24: success;
- build: success;
- CodeQL: success.

## Próximo escopo

Entrega 07 integra pagamento/reconciliação sobre pedidos `awaiting_payment`.
