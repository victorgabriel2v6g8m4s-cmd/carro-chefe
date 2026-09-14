# AGENTS — Pacotes compartilhados

## Região

Bibliotecas internas consumidas pelas aplicações. Pacotes expõem contratos mínimos e não conhecem detalhes das apps.

## Regras locais

- Fluxo permitido: `apps → packages`; import inverso é proibido.
- Cada pacote possui API pública explícita; não exporte internals por conveniência.
- Evite dependência circular, `any`, side effects de import e dependência nova para função trivial.
- Mudança pública exige impacto nos consumidores, compatibilidade e teste de contrato.

## Pronto

- [ ] API pública e owner estão claros.
- [ ] Testes unitários/contrato cobrem comportamento observável e falhas.
- [ ] Typecheck e builds consumidores passam.
