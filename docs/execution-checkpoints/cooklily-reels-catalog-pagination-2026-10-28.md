# CookLily — corrigir carregamento do catálogo em Reels

- status: in_progress
- owner: AG-DEV
- branch: codex/fix-lily-reels-catalog-pagination
- base_branch: cooklily/canonical
- base_sha_verified: 9f781326f93191c83c0f1e0fd2044d1a53110578
- head_sha_verified: work in progress
- pull_requests: pending
- deployed_sha: 9f781326f93191c83c0f1e0fd2044d1a53110578
- tests/gates: policy preflight PASS; focused Reels tests PASS (2); `npm run check` PASS; `npm run build` PASS; full suite rerun on disposable migrated DB in progress. First full-suite attempt without `LILY_DATABASE_URL` used stale runtime SQLite and failed; do not treat it as code regression.
- migrations: none
- blockers: production Reels renders “Entrada inválida” because UI requests 100 products while API accepts at most 40 per page.
- last_verified_at: 2026-10-28 America/Sao_Paulo
- next_action: finish full suite on `.runtime/lily-acai-check.db`, inspect diff, push PR, wait CI, integrate, deploy canonical and verify Reels in Codex IAB.

## Evidence and implementation

- API validation in `apps/api/src/modules/lily/catalog.ts` caps `limit` at 40.
- `ReelsPage` previously requested `limit: 100` on initial load and when resetting the sequence to catalog, producing HTTP 400 and “Entrada inválida”.
- `apps/lily_acai/src/features/reels/catalog.ts` now pages with `limit: 40`, follows `nextOffset`, guards against a non-advancing offset and returns published/available or VIP-locked items.
- Focused test covers multiple pages, filter behavior and a non-advancing API offset.
