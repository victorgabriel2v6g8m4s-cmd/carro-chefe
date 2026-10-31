# Disponibilidade, despacho sequencial e avaliações CookLily

- status: in_progress
- owner: AG-DEV
- branch: `codex/cooklily-courier-dispatch-ratings`
- base_branch: `cooklily/canonical`
- base_sha_verified: `6da73bcdb064786cef80f7dd1269c7c6790206d2`
- head_sha_verified: `1e75ed4aea972f5d4d24b19edb43df75d098523f` (última revisão CI do PR #300; duas correções de teste locais aguardam commit)
- pull_requests: [#300](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/300) — open, draft
- last_verified_at: 2026-10-31
- interruption_state: retomada após pausa solicitada pelo proprietário; efeitos revistos no Git

## Concluído e persistido

- A decisão de integração PR #299 foi confirmada na branch atual: merge canônico `6da73bcdb064786cef80f7dd1269c7c6790206d2`.
- Diretivas locais da API Lily, frontend e banco revisadas; `policy:preflight` é opcional conforme a regra canônica atualizada.
- Código de disponibilidade, geolocalização operacional com expiração em 90 s, dispatcher sequencial por proximidade, decisão de restaurante, checklist, configurações de oferta/coleta, integração com outbox e avaliações está implementado no working tree.
- Migration aditiva `20261031000000_lily_dispatch_ratings` e testes para schema/distância/availability/reviews foram criados.
- Guia de configuração do proprietário, ADR e relatório da entrega foram criados/atualizados.
- Commit `fa33f16` persiste a implementação, migration, testes, roadmap e instruções.
- Commit `1bba4ac` registra o checkpoint pós-commit; branch foi publicada e PR #300 draft aberto contra a base canônica verificada.

## Em andamento

- Revisar/validar os fluxos de API, testes de integração e concorrência.
- Validar migration em banco isolado compatível.
- Executar gates de projeto/CI, abrir PR, integrar, deployar e homologar no domínio com navegador integrado em desktop/mobile.

## Gates e testes

- `tsc --noEmit -p tsconfig.json`: passou em 2026-10-31.
- Vitest focado `courier-dispatch.test.ts` + `order-reviews.test.ts`: 4/4 passaram em 2026-10-31.
- Prisma validate com `packages/lily-database/prisma.config.ts`: passou.
- `git diff --check`: passou na revisão atual.
- A migration foi aplicada em SQLite em memória via Python stdlib, sobre schema-base gerado da canonical — sucesso, 81 tabelas.
- `prisma migrate deploy` no banco SQLite descartável `.runtime/lily-courier-validation-20261031.db`: falhou com saída vazia `Schema engine error:` no runtime Windows; repetir em CI/Linux.
- Suite de integração dependente de `better-sqlite3` falha antes dos casos; binding nativo Windows ausente neste worktree.
- Tool-health/deploy-validation: 18 testes passaram, quatro testes SQLite falharam ao carregar o binding.
- Build Vite site/Lily: sucesso; Lily mede 606.38 KiB JS raw, 192.33 KiB JS gzip, 179.20 KiB CSS raw, 35.36 KiB CSS gzip e 52.11 KiB entrypoint JS gzip.
- Teste de orçamento: 4/4 passou; limites agregados foram ajustados modestamente; entrypoint e maior chunk mantêm os limites anteriores.
- Typecheck raiz/API, Prisma validate/generate e build TypeScript API: passaram.
- CI e CodeQL ainda pendentes.
- CI run `41165306551` no head `1e75ed4`: static checks passaram; Windows Supervisor e Excel Recipe em Linux/Windows passaram; qualidade Node 20/22/24 falhou em dois testes antigos (contagem do starter pack WhatsApp e aceite explícito do restaurante), já corrigidos no working tree e aguardando novo CI. Tool Health Linux também falhou em `app-lily`; o build Vite e orçamento executados localmente passaram, causa Linux ainda precisa de nova evidência no CI.
- A suíte de integração local para os dois testes corrigidos não inicia neste Windows porque o binding nativo `better-sqlite3` está ausente; não executar `pnpm approve-builds` nem reconstruir o binding neste ambiente. Validar os ajustes no runner Linux do PR.

## Migrations

- Nova migration `packages/lily-database/prisma/migrations/20261031000000_lily_dispatch_ratings/migration.sql`.
- Adiciona disponibilidade/localização e índices de courier; timeout/coordenadas de coleta; campos de oferta/decisão/checklist/reembolso no pedido; tabela `LilyOrderReview` com unicidade por pedido.
- Executar `prisma migrate deploy` em CI/Linux ou ambiente Prisma suportado antes de qualquer deploy.

## Bloqueios/riscos

- Coordenadas de produção precisam ser preenchidas pelo proprietário/staff em `/lilyacai/painel/entrega` antes do despacho.
- ETA externo é opcional para operação; precisa da configuração existente de provider para ser mostrado.
- Rejeição de pedido pago marca reembolso pendente, mas a equipe financeira ainda confirma o estorno no provedor.
- Ainda falta o procedimento operacional completo para cliente ausente, devolução e reclamações; ver guia.
- Homologação depende do navegador integrado disponível e contas de teste apropriadas.

## Homologação/dependências externas

- GPS em tempo real para cliente está fora da versão 1.
- Deploy e homologação não iniciados.
- Usar exclusivamente navegador integrado Codex; verificar desktop e mobile sem abrir Chrome/Edge externo.
- Não usar pedidos reais ou cobrar pagamentos reais para homologar.

## Próxima ação exata

Commitar e enviar as duas correções de teste; então reexecutar CI, obter o detalhe da falha Linux de `app-lily`, e só integrar PR #300 quando todos os gates obrigatórios passarem.
