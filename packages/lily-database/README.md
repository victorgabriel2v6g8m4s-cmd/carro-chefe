# Persistência Lily Açaí

Banco transacional dedicado à operação temporária Lily Açaí.

## Regra central

Este pacote não substitui, estende nem compartilha tabelas com `packages/database`.

O datasource planejado em produção é independente, por exemplo:

```text
file:/srv/carro-chefe/data/lily-acai.db
```

O schema Prisma e a primeira migration serão implementados na Entrega 2.
