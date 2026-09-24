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

## Próximo escopo

Entrega 06 consumirá as configurações validadas deste módulo para carrinho, endereço, entrega/retirada e criação do pedido.
