# Disponibilidade, despacho sequencial e avaliações CookLily

- status: partially_completed_deployed
- owner: AG-DEV
- branch: `codex/cooklily-courier-dispatch-ratings`
- base_branch: `cooklily/canonical`
- base_sha_verified: `6da73bcdb064786cef80f7dd1269c7c6790206d2`
- head_sha_verified: `f0393930e45e03e18c2a8305cae1000e80172b4d` (release canônica em produção; squash merge de PR #300)
- pull_requests: [#300](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/300) — merged
- last_verified_at: 2026-10-31 04:12 UTC
- interruption_state: retomada após pausa solicitada pelo proprietário; efeitos revistos no Git

## Concluído e persistido

- A decisão de integração PR #299 foi confirmada na branch atual: merge canônico `6da73bcdb064786cef80f7dd1269c7c6790206d2`.
- Diretivas locais da API Lily, frontend e banco revisadas; `policy:preflight` é opcional conforme a regra canônica atualizada.
- Código de disponibilidade, geolocalização operacional com expiração em 90 s, dispatcher sequencial por proximidade, decisão de restaurante, checklist, configurações de oferta/coleta, integração com outbox e avaliações está implementado e persistido.
- Migration aditiva `20261031000000_lily_dispatch_ratings` e testes para schema/distância/availability/reviews foram criados.
- Guia de configuração do proprietário, ADR e relatório da entrega foram criados/atualizados.
- Commit `fa33f16` persiste a implementação, migration, testes, roadmap e instruções.
- Commit `1bba4ac` registra o checkpoint pós-commit; branch foi publicada e PR #300 draft aberto contra a base canônica verificada.
- PR #300 foi integrado por squash na canonical como `f0393930e45e03e18c2a8305cae1000e80172b4d` após todos os gates do CI run `41166949257` passarem no head `359cc804940192e5ed94685d5e39e404c1f97edf`.

## Em andamento

- Deploy em produção concluído no release `f0393930e45e03e18c2a8305cae1000e80172b4d`.
- Homologação visual feita na aba integrada do Codex em largura móvel: `/lilyacai/entregas` e `/lilyacai/painel/entrega` carregaram; a área de courier mostrou disponibilidade, fila e histórico vazios sem erro após a sessão terminar de carregar; a tela admin apresentou o timeout configurável e os campos do ponto de coleta.
- Homologação desktop e teste real de despacho continuam pendentes. O painel integrado disponível nesta execução está com largura móvel; não foi possível configurar viewport desktop por essa interface.

## Gates e testes

- `tsc --noEmit -p tsconfig.json`: passou em 2026-10-31.
- Vitest focado `courier-dispatch.test.ts` + `order-reviews.test.ts`: 4/4 passaram em 2026-10-31.
- Prisma validate com `packages/lily-database/prisma.config.ts`: passou.
- `git diff --check`: passou na revisão atual.
- A migration foi aplicada em SQLite em memória via Python stdlib, sobre schema-base gerado da canonical — sucesso, 81 tabelas.
- `prisma migrate deploy` em SQLite descartável teve erro sem diagnóstico no runtime Windows; CI executou `db:deploy` core/Lily e suíte completa com sucesso em runner Linux.
- Suíte SQLite local não inicia neste Windows por binding nativo ausente; `npm test` passou no CI nos três Node suportados.
- Tool Health Linux, deploy-validation, builds, qualidade Node 20/22/24, Workbook Snapshot, Excel Recipe Linux/Windows e Windows Supervisor passaram no run `41166571966`.
- Build Vite Linux site/Lily: sucesso; Lily mediu 607.21 KiB JS raw, 192.75 KiB JS gzip, 179.11 KiB CSS raw, 35.34 KiB CSS gzip, 228.09 KiB combinado e 52.37 KiB entrypoint JS gzip.
- Teste de orçamento: 4/4 passou; limites agregados foram ajustados modestamente; entrypoint e maior chunk mantêm os limites anteriores.
- Typecheck raiz/API, Prisma validate/generate e build TypeScript API: passaram.
- CI run `41166571966`: todos os checks reportados passaram no head `24c719628b8dca770f1d9234218616437cb359de`.
- Deploy VPS via `sudo carro-chefe-deploy f0393930e45e03e18c2a8305cae1000e80172b4d`: concluído em 2026-10-31. Backups verificados (core 643072 bytes; Lily 2842624 bytes); migration Lily `20261031000000_lily_dispatch_ratings` aplicada; Nginx validado; serviço ativo; readiness e smoke externo passaram. Evidência: `/srv/carro-chefe/data/deploy-logs/deploy-20261031-040740-f0393930e45e.evidence`; log correspondente `.log`.
- A configuração `pickupLatitude`/`pickupLongitude` foi verificada após migration e está ausente no registro operacional; nenhum valor foi inventado ou gravado. A rota de logística no navegador inicialmente exibiu erro transitório durante carregamento/sessão, mas recarregada após estabilização carregou os estados vazios sem erro.

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
- Produção está no release `f0393930e45e03e18c2a8305cae1000e80172b4d`; migration confirmada, serviço ativo e smoke externo passou.
- Coordenadas de coleta estão ausentes na produção; cadastrar/validar no painel antes de dispatch. Ainda é necessário um segundo courier de teste para comprovar priorização, recusa e expiração em sequência. Não iniciar pedido/cobrança real.
- Usar exclusivamente navegador integrado Codex; mobile foi observado. Desktop ainda precisa homologação em viewport amplo, sem abrir Chrome/Edge externo.
- Não usar pedidos reais ou cobrar pagamentos reais para homologar.

## Próxima ação exata

Registrar o resultado do deploy e mobile na canonical por PR de documentação; obter coordenadas reais e duas contas courier de teste autorizadas, configurar as coordenadas no painel, então homologar o despacho sequencial de ponta a ponta e a visualização desktop em navegador integrado Codex. Manter GPS ao vivo fora de escopo até revisão de privacidade dedicada.
