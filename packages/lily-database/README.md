# Persistência CookLily

Banco transacional dedicado à operação temporária CookLily.

## Regra central

Este pacote não substitui, estende nem compartilha tabelas com `packages/database`.

Datasource local padrão:

```text
file:./.runtime/lily-acai.db
```

Em produção, usar caminho persistente independente, por exemplo:

```text
file:/srv/carro-chefe/data/lily-acai.db
```

## Entrega 2

Schema e primeira migration implementam:

- `LilyUser`;
- `LilySession`;
- `LilyConsentRecord`.

Tokens de sessão ficam somente em hash; senhas ficam somente em hash; consentimentos são registros versionados por finalidade. Não existem relações com o schema do Carro Chefe.
