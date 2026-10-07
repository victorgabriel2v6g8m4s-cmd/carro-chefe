# Hotfix TS2552 — painel de capas CookLily

## Falha observada

O deploy incremental da `cooklily/canonical` em `4f5199ee57e6d272fb1845bcb4dd7bb85f79d16b` falhou em `static-checks` com `TS2552: Cannot find name 'HTMLSummaryElement'`.

## Correção

Foi adicionada uma declaração DOM compatível no escopo do app CookLily, explicitando que `HTMLSummaryElement` herda de `HTMLElement`. Isso corrige apenas a tipagem de compilação; não altera comportamento em runtime.

## Segurança do deploy

A tentativa falhou antes das migrations reais. O deployer restaurou o checkout anterior e reutilizou dependências no rollback.
