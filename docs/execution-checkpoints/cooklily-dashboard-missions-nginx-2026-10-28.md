# CookLily — liberar endpoint de missões no Nginx

- status: completed
- owner: AG-DEV
- branch: codex/fix-lily-missions-nginx
- base_branch: cooklily/canonical
- base_sha_verified: 4cb5e9f1216ac5789fe55fa117ba9d3e23a988b2
- head_sha_verified: 5c9e3f09a80792ca43da964c923814c5a9a36e2f
- pull_requests: PR #224 merged at `9f781326f93191c83c0f1e0fd2044d1a53110578`; later release ac4528f52d9462623e821f62a633ec11370dded7 — https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/224
- deployed_sha: ac4528f52d9462623e821f62a633ec11370dded7
- tests/gates: PR CI green; `npm run test:deploy-validation` PASS (11 tests); full suite PASS on disposable migrated DB (67 files, 354 passed, 3 skipped); `npm run check` PASS; `npm run build` PASS; external smoke PASS; `git diff --check` PASS.
- migrations: none
- blockers: none
- last_verified_at: 2026-10-28 America/Sao_Paulo
- next_action: none; endpoint returned and Dashboard rendered without the partial-failure alert in authenticated IAB.

## Evidência e causa

- SHA `9f781326f93191c83c0f1e0fd2044d1a53110578` integrated the Nginx allowlist fix; current active release is `ac4528f52d9462623e821f62a633ec11370dded7`.
- O Dashboard autenticado renderiza nível/saldo, mas informa falha parcial. CDP `Network.responseReceived` mostrou HTTP 404 em `/api/v1/lily/missions`; perfil, fidelidade, pedidos, sessão e notificações retornaram 200.
- A rota GET existe em `apps/api/src/modules/lily/surveys/routes.ts` e é registrada em `apps/api/src/app.ts`; o bloqueio vem da regra Nginx restritiva, que não permite esse path.

## Próximas ações

1. [x] Reproduzir no domínio real e identificar o endpoint ausente.
2. [x] Ajustar helper/template/precheck Nginx e teste de idempotência/ordem.
3. [x] Executar testes e gates de build.
4. [x] PR #224 merged after CI passed.
5. [x] Deployed and checked the authenticated Dashboard in Codex IAB; levels, balance, missions and research shortcuts loaded without the previous alert.
