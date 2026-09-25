# Entrega 03 — Marca CookLily e rebranding integral

**Status:** implementação técnica concluída; homologação visual/manual pendente  
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
- [x] CI final concluído;
- [ ] QA visual manual mobile/desktop;
- [~] derivado web da logo versionado; originais completos e derivados de produto ainda não foram incorporados ao Git;
- [ ] entrega marcada como concluída;
- [x] nenhum deploy executado.

## Evidência pré-código

Os preflights de `apps/lily_acai` e `apps/api/src/modules/lily` foram executados antes da alteração de código e passaram no workflow temporário CookLily Preflight Once.

## Atualização tipográfica — 23/09/2026

O proprietário confirmou que as fontes da identidade CookLily são **Summer** e **Amsterdam Four**. O kit de marca e o frontend foram atualizados para usar esses nomes como tokens oficiais, com Summer no papel de display/`cook` e Amsterdam Four na assinatura `Lily`.

Os arquivos binários das fontes não estão no repositório e não foram obtidos de fontes externas. Até o recebimento dos arquivos licenciados, o CSS usa fallback seguro.


### Evidência da atualização tipográfica

- preflight do frontend: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/actions/runs/35919299845 — **success**;
- CI do commit `8623ba0a6b210cdcadb51b7db0de51211cab4121`: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/actions/runs/35919478610 — **success** em Node 20 e Node 24, incluindo checks, testes e builds;
- CodeQL do mesmo commit: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/actions/runs/35919478652 — **success**;
- PR temporário #59: usado somente para validação e fechado sem merge;
- deploy: **não executado**.

## Próxima entrega

Entrega 04 — landing, captação de telefone, WhatsApp, persistência canônica da atribuição e primeira publicação controlada.

## Evidência de validação

- preflight frontend/API: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/actions/runs/35916276396 — **success**;
- regeneração/verificação do manifesto: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/actions/runs/35917002720 — **success**;
- CI do head técnico `b6b855bda71462b1ef0722491fad99476c413cf5`: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/actions/runs/35917670078 — **success**;
- CodeQL do mesmo head: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/actions/runs/35917670105 — **success**;
- PR temporário #58: fechado sem merge e sem deploy.

O CI executou e aprovou Quality Node 20, Quality Node 24, testes, checks estáticos, builds de produção, Tool Health, Excel Recipe em Linux/Windows, Windows Supervisor e Workbook Snapshot.

## Testes não executados / pendências desta entrega

- QA visual manual em navegador real, mobile e desktop: **não executado**;
- prova de impressão do adesivo/QR em 4 × 8 cm: **não executada**;
- incorporação dos quatro binários originais completos ao Git: **não executada**; hashes/fontes estão documentados e o derivado web da logo foi versionado;
- deploy Hostinger/VPS: **não executado**, conforme escopo e ausência de autorização de publicação.
