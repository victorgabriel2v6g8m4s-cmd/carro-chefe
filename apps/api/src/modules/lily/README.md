# Módulo API CookLily

Backend isolado da operação temporária CookLily.

## Namespace

`/api/v1/lily/*`

## Persistência

Somente `packages/lily-database`. É proibido usar o banco do Carro Chefe para dados CookLily.

## Rotas implementadas

### Público

```text
GET  /api/v1/lily/public/health
GET  /api/v1/lily/public/config
POST /api/v1/lily/public/leads
```

### Autenticação

```text
POST /api/v1/lily/auth/register
POST /api/v1/lily/auth/login
GET  /api/v1/lily/auth/me
POST /api/v1/lily/auth/logout
```

A autenticação usa telefone normalizado, scrypt, sessão aleatória persistida somente como hash, cookie HttpOnly e CSRF próprio. Registro público sempre cria `customer`.

## Leads

`POST /public/leads` não cria conta nem senha. Exige opt-in de marketing, normaliza telefone, deduplica por telefone e grava somente no Lily DB.

Tracking aceita `la_*` e `cc_*` na entrada e persiste apenas `laQr`, `laCampaign` e `laVariant`.

## Próximo escopo

Entrega 05 adicionará catálogo, mídia e admin com papel `staff`.
