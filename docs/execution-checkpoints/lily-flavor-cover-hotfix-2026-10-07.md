# Hotfix — upload de capa por sabor (2026-10-07)

## Sintoma

O deploy da `cooklily/canonical` em `4f5199ee57e6d272fb1845bcb4dd7bb85f79d16b` falhou no gate `static-checks` com `TS2552` em `apps/lily_acai/src/flavor-cover-admin.ts`: `HTMLSummaryElement` não existe nas tipagens DOM utilizadas pelo projeto.

## Impacto

A falha ocorreu antes de qualquer migration real. O deployer restaurou o checkout anterior (`f7a976d082293a20335fce4e7d0b726608e98e10`) e reutilizou as dependências no rollback.

## Correção

Trocar a tipagem do `querySelectorAll` de `HTMLSummaryElement` por `HTMLElement`, que corresponde às tipagens DOM disponíveis para `<summary>` no TypeScript usado pelo projeto.

## Validação esperada

- `npm run check` deve ultrapassar o erro `TS2552`;
- o deploy incremental deve reaproveitar os gates já cacheados e reexecutar apenas os fingerprints afetados;
- migrations reais continuam protegidas pelo fluxo fail-closed do deployer.
