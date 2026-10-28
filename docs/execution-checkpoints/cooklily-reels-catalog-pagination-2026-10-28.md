# CookLily — corrigir carregamento do catálogo em Reels

- status: completed
- owner: AG-DEV
- branch: codex/fix-lily-reels-catalog-pagination
- base_branch: cooklily/canonical
- base_sha_verified: 9f781326f93191c83c0f1e0fd2044d1a53110578
- head_sha_verified: ac4528f52d9462623e821f62a633ec11370dded7
- pull_requests: PR #225 merged — https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/225
- deployed_sha: ac4528f52d9462623e821f62a633ec11370dded7
- tests/gates: PR #225 CI PASS; focused Reels tests PASS (2); `npm run check` PASS; `npm run build` PASS; full suite PASS on disposable migrated DB (67 files, 354 passed, 3 skipped); production deploy validation PASS (67 files, 357 tests); external smoke PASS; `git diff --check` PASS.
- migrations: none
- blockers: none. The first IAB navigation reused the cached old bundle; a full reload loaded the deployed bundle and resolved this.
- last_verified_at: 2026-10-28 America/Sao_Paulo
- next_action: none; deployed real-domain behavior is confirmed in mobile IAB.

## Evidence and implementation

- API validation in `apps/api/src/modules/lily/catalog.ts` caps `limit` at 40.
- `ReelsPage` previously requested `limit: 100` on initial load and when resetting the sequence to catalog, producing HTTP 400 and “Entrada inválida”.
- `apps/lily_acai/src/features/reels/catalog.ts` now pages with `limit: 40`, follows `nextOffset`, guards against a non-advancing offset and returns published/available or VIP-locked items.
- Focused test covers multiple pages, filter behavior and a non-advancing API offset.
- PR #225 merged at `ac4528f52d9462623e821f62a633ec11370dded7`; deploy evidence: `/srv/carro-chefe/data/deploy-logs/deploy-20261028-161301-ac4528f52d94.evidence`.
- Mobile IAB showed product media, product title/description, controls, and footer navigation. Random/related sequences and next-product navigation were exercised. Dashboard showed level, LilyCoins, and missions with no prior load error.
