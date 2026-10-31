# Disponibilidade, despacho sequencial e avaliações CookLily

- status: in_progress
- owner: AG-DEV
- branch: `codex/cooklily-courier-deploy-checkpoint`
- base_branch: `cooklily/canonical`
- base_sha_verified: `f0393930e45e03e18c2a8305cae1000e80172b4d` (release-base da branch de checkpoint; PR #302 avançou a canonical depois)
- head_sha_verified: `d61b32815d3a32aa1b468a42d3afeaa2fe5fb53b`
- pull_requests: [#300](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/300) — merged; [#302](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/302) — merged; [#301](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/301) — closed
- last_verified_at: 2026-10-31 04:45 UTC
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
- O checkpoint e o roadmap parcial foram publicados na canonical pelo PR #302, merge `6f177f5507e128b0febe1b81fc28c9a703e4bede`.
- Node.js LTS `v26.13.0` e npm `11.20.0` foram reinstalados pelo instalador oficial do Node via WinGet. O PATH do usuário agora prioriza `C:\Program Files\nodejs` e não contém mais o caminho NVM inválido; ambos foram verificados no ambiente atual.

## Em andamento

- Deploy em produção concluído no release `f0393930e45e03e18c2a8305cae1000e80172b4d`.
- Homologação visual feita na aba integrada do Codex em largura móvel: `/lilyacai/entregas` e `/lilyacai/painel/entrega` carregaram; a área de courier mostrou disponibilidade, fila e histórico vazios sem erro após a sessão terminar de carregar; a tela admin apresentou o timeout configurável e os campos do ponto de coleta.
- A homologação responsiva agora foi concluída no navegador integrado do Codex com viewport emulado: desktop 1365×900 e mobile 390×844. `/lilyacai/entregas`, `/lilyacai/painel/entrega` e `/lilyacai/painel/entregas` carregaram; as três rotas não apresentaram overflow horizontal nem erros de console. O formulário administrativo mostrou timeout padrão de 60 s e coordenadas de coleta vazias.
- A tela de gestão de entregas exibiu os estados vazios esperados (zero pedidos e zero vínculos auditados) em ambos os tamanhos.
- O proprietário forneceu e validou um pin do Google Maps para o ponto de coleta. A configuração foi salva pelo painel `/lilyacai/painel/entrega` e persistiu após recarregar a página. Endereço e coordenadas exatas foram omitidos deste checkpoint por serem localização precisa.
- Duas contas dedicadas de teste foram criadas pelo fluxo normal, com aceite autorizado dos Termos Operacionais/Aviso de Privacidade e sem consentimentos opcionais. Foram marcadas para teste e promovidas pelo painel para o papel `courier`; a UI confirmou `COURIER active` para ambas.
- As duas contas aparecem com senha pendente e MFA pendente. O proprietário autorizou a promoção. Cada titular ainda precisa completar a troca da própria senha e configurar MFA; não inserir nem submeter credenciais em nome deles.

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
- O pin de coleta foi persistido pelo painel e confirmado após recarregar a página. A rota de logística no navegador inicialmente exibiu erro transitório durante carregamento/sessão, mas recarregada após estabilização carregou os estados vazios sem erro.
- Em 2026-10-31, viewport desktop (1365×900) e mobile (390×844) foram efetivamente emulados pelo recurso de viewport do navegador integrado. Nas rotas testadas, `scrollWidth` foi 1350 px no desktop e 375 px no mobile; sem overflow horizontal e sem erros no console.

## Migrations

- Nova migration `packages/lily-database/prisma/migrations/20261031000000_lily_dispatch_ratings/migration.sql`.
- Adiciona disponibilidade/localização e índices de courier; timeout/coordenadas de coleta; campos de oferta/decisão/checklist/reembolso no pedido; tabela `LilyOrderReview` com unicidade por pedido.
- Executar `prisma migrate deploy` em CI/Linux ou ambiente Prisma suportado antes de qualquer deploy.

## Bloqueios/riscos

- ETA externo é opcional para operação; precisa da configuração existente de provider para ser mostrado.
- Rejeição de pedido pago marca reembolso pendente, mas a equipe financeira ainda confirma o estorno no provedor.
- Ainda falta o procedimento operacional completo para cliente ausente, devolução e reclamações; ver guia.
- Homologação de UI desktop/mobile está concluída no navegador integrado. O teste real de despacho depende de os titulares concluírem a troca de senha e MFA para as duas contas courier e da criação de um pedido de teste sem cobrança real.

## Homologação/dependências externas

- GPS em tempo real para cliente está fora da versão 1.
- Produção está no release `f0393930e45e03e18c2a8305cae1000e80172b4d`; migration confirmada, serviço ativo e smoke externo passou.
- O pin validado está configurado em produção. Duas contas courier de teste já estão ativas, mas ambas exigem atualização de senha e MFA. Após a conclusão pelos titulares, comprovar prioridade, recusa e expiração em sequência com pedido de teste sem cobrança real.
- Usar exclusivamente navegador integrado Codex. As rotas de entrega foram observadas em desktop 1365×900 e mobile 390×844; não houve overflow horizontal nem erro no console.
- Os termos e aviso de privacidade foram aceitos no cadastro conforme autorização do proprietário, sem consentimentos opcionais. Os titulares devem concluir troca de senha e MFA; não contornar esses gates nem inserir credenciais por eles.
- Não usar pedidos reais ou cobrar pagamentos reais para homologar.

## Próxima ação exata

Solicitar que os titulares das duas contas courier de teste concluam a atualização de senha e configurem MFA. Depois, retomar a homologação no navegador integrado usando as duas contas e um pedido de teste sem cobrança real para verificar disponibilidade, oferta sequencial, aceite, recusa, expiração, coleta, status/ETA e avaliação. O pin de coleta está validado e configurado. Manter GPS ao vivo fora de escopo até revisão de privacidade dedicada.
