# Entrega 03 — Marca CookLily e rebranding integral

**Status:** em andamento  
**Deploy:** não

## Decisões fechadas em 23/09/2026

- nome definitivo: **CookLily**;
- wordmark: **cookLily**;
- paleta/tokens aprovados;
- fotos de morango e maracujá recebidas com nomes únicos;
- QR legado `cc_*` permanece compatível e é normalizado para `la_*`;
- namespaces técnicos `lily-acai` permanecem inalterados.

## Implementação desta etapa

- tema CSS centralizado sob `--cl-*`;
- nome CookLily aplicado às páginas públicas/auth/privacidade;
- meta title/description/theme-color atualizados;
- hero provisório alinhado ao kit sem inventar preço/oferta;
- morango e maracujá documentados como sabores confirmados;
- parser frontend aceita `la_*` e `cc_*`, com precedência de `la_*`;
- parser backend aplica a mesma normalização;
- contrato de aliases exposto em `/api/v1/lily/public/config`;
- persistência de banco fica para a Entrega 04, junto do modelo de lead/atribuição.

## Critérios

- [x] naming decidido;
- [x] tokens aprovados;
- [x] acervo inicial catalogado;
- [x] fotos renomeadas verificadas;
- [x] tema aplicado no código;
- [x] aliases de tracking implementados com testes;
- [ ] CI final concluído;
- [ ] QA visual manual mobile/desktop;
- [ ] binários originais/derivados organizados no Git;
- [ ] entrega marcada como concluída;
- [x] nenhum deploy executado.

## Evidência pré-código

Os preflights de `apps/lily_acai` e `apps/api/src/modules/lily` foram executados antes da alteração de código e passaram no workflow temporário CookLily Preflight Once.

## Próxima entrega

Entrega 04 — landing, captação de telefone, WhatsApp, persistência canônica da atribuição e primeira publicação controlada.
