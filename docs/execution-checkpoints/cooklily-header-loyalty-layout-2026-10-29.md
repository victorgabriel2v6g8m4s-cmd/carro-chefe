# Header CookLily: saldo, progresso de nível e ações

- status: completed
- owner: AG-DEV
- branch: codex/lily-mobile-header-circles
- base_branch: cooklily/canonical
- base_sha_verified: 8987a0e1c80e42484d41da0277c108947a90fb12
- head_sha_verified: b262d41d67a00b07a037db1698513eece070ede8
- pull_requests: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/261 (merged)
- last_verified_at: 2026-10-29 22:48 UTC
- interruption_state: none

## Objetivo

Deixar logo e saldo LilyCoins no grupo esquerdo do header, barra de nível maior e centralizada, e as ações no grupo direito; validar mobile e desktop no domínio real após merge/deploy.

## Concluído e persistido

- `npm run policy:preflight -- --agent AG-DEV --scope lily-header-layout`: PASS.
- PR #261 integrado por squash à `cooklily/canonical`, SHA `b262d41d67a00b07a037db1698513eece070ede8`.
- Header organizado em três áreas: marca + saldo à esquerda, progresso de nível ao centro e notificações/carrinho/perfil/menu à direita. No mobile, a barra ocupa o espaço flexível entre as laterais; em desktop, fica centralizada na grade.
- Deploy incremental concluído na VPS em `b262d41d67a00b07a037db1698513eece070ede8`; evidência `/srv/carro-chefe/data/deploy-logs/deploy-20261029-224301-b262d41d67a0.evidence`; log `/srv/carro-chefe/data/deploy-logs/deploy-20261029-224301-b262d41d67a0.log`.
- Backup verificado antes do deploy: banco core `/srv/carro-chefe/data/backups/carro-chefe-pre-b262d41d67a0-20261029-224301.db` (643072 bytes, 12 migrations); Lily `/srv/carro-chefe/data/backups/lily-acai-pre-b262d41d67a0-20261029-224301.db` (2478080 bytes, 38 migrations).
- Homologação somente leitura em `https://carrochefe.com/lilyacai/painel/fidelidade`, pela aba integrada Codex. A 390×844, logo+saldo ocupam a área esquerda, progresso fica entre eles e as ações, barra mede aproximadamente 83 px e a página não tem overflow horizontal. A 1440×900, a barra mede 176 px e seu centro está no centro da grade; ações permanecem à direita e sem overflow.
- Viewport temporário restaurado após os testes. Nenhuma configuração de fidelidade foi salva ou alterada.

## Gates e testes

- Local: `npm run check` PASS; suite focada `npx vitest run --config vitest.config.ts apps/lily_acai/src/structure.test.ts` PASS (29/29); `npm run build` PASS, budget CookLily PASS; `git diff --check` PASS.
- Local suite completa executada: 73 arquivos passaram e o teste estrutural do header inicialmente falhou por expectativa CSS desatualizada; a expectativa foi corrigida e o teste focado passou. A CI posterior validou a suite completa já corrigida.
- PR #261, execução CI `40967552640`: Quality Node 20 e 24, Tool Health Linux, Windows Supervisor, Excel Recipe Linux/Windows e Workbook Snapshot PASS.
- VPS: `npm run check`, 74 arquivos/392 testes, build e budget CookLily PASS; tool health 12/12 verificações aplicáveis PASS; readiness e external smoke PASS. Nginx syntax OK; migrations core (12) e Lily (38), sem pendências.
- Warning Vite de chunk acima de 500 kB é informativo; os limites agregados do bundle permanecem PASS.

## Migrations

- Nenhuma migration criada. Produção confirmou 12 migrations core e 38 Lily, sem pendências.

## Bloqueios/riscos

- Nenhum bloqueio conhecido. Variáveis SSH locais não estavam configuradas; conexão foi feita com os dados e chave autorizados previamente pelo proprietário. Fingerprint da chave confirmado antes do deploy.

## Homologação/dependências externas

- Domínio real aberto no navegador integrado Codex já autenticado. Desktop e mobile verificados visualmente e com medidas DOM somente leitura.

## Próxima ação exata

Nenhuma. Entrega integrada, implantada e homologada.

