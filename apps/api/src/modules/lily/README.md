# Módulo API Lily Gourmet

Backend isolado da operação temporária Lily Gourmet.

## Namespace

`/api/v1/lily/*`

## Persistência

Somente `packages/lily-database`. É proibido usar o Prisma/client de `packages/database` para dados Lily.

## Entrega 2 implementada

Rotas disponíveis:

```text
GET  /api/v1/lily/public/health
GET  /api/v1/lily/public/config
POST /api/v1/lily/auth/register
POST /api/v1/lily/auth/login
GET  /api/v1/lily/auth/me
POST /api/v1/lily/auth/logout
```

A autenticação usa telefone normalizado, senha com scrypt, sessão aleatória armazenada somente como hash, cookie HttpOnly e CSRF próprio da sessão. Registro público sempre cria papel `customer`.

A Entrega 3 adicionará catálogo/mídia/admin sem misturar esse módulo com os dados Carro Chefe.
