# CookLily — liberar endpoint de missões no Nginx

- status: in_progress
- owner: AG-DEV
- branch: codex/fix-lily-missions-nginx
- base_branch: cooklily/canonical
- base_sha_verified: 4cb5e9f1216ac5789fe55fa117ba9d3e23a988b2
- head_sha_verified: pending commit
- pull_requests: none
- deployed_sha: 4cb5e9f1216ac5789fe55fa117ba9d3e23a988b2
- tests/gates: policy preflight PASS; `npm run test:deploy-validation` PASS (11 tests); `npm test` PASS on disposable migrated DB (66 files, 352 passed, 3 skipped); `npm run check` PASS; `npm run build` PASS; `git diff --check` PASS. Real-domain failure reproduced and isolated to Nginx allowlist.
- migrations: none
- blockers: none
- last_verified_at: 2026-10-28 America/Sao_Paulo
- next_action: review and commit the Nginx fix, open PR against `cooklily/canonical`, wait for CI, integrate, deploy, and recheck authenticated missions API and Dashboard in IAB.

## Evidência e causa

- SHA `4cb5e9f1216ac5789fe55fa117ba9d3e23a988b2` está integrado e ativo na VPS.
- O Dashboard autenticado renderiza nível/saldo, mas informa falha parcial. CDP `Network.responseReceived` mostrou HTTP 404 em `/api/v1/lily/missions`; perfil, fidelidade, pedidos, sessão e notificações retornaram 200.
- A rota GET existe em `apps/api/src/modules/lily/surveys/routes.ts` e é registrada em `apps/api/src/app.ts`; o bloqueio vem da regra Nginx restritiva, que não permite esse path.

## Próximas ações

1. [x] Reproduzir no domínio real e identificar o endpoint ausente.
2. [x] Ajustar helper/template/precheck Nginx e teste de idempotência/ordem.
3. [x] Executar testes e gates de build.
4. [ ] Abrir PR contra `cooklily/canonical`; integrar após checks verdes.
5. [ ] Deploy autorizado e confirmar endpoint HTTP autenticado sem 404, Dashboard sem erro e screenshot via navegador integrado do Codex.
