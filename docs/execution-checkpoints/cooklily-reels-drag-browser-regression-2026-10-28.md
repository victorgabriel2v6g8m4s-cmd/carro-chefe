# CookLily Reels — regressão de gesto encontrada em homologação

- status: in_progress
- owner: AG-DEV
- branch: codex/reels-drag-homologation-fix
- base_branch: cooklily/canonical
- base_sha_verified: 8628a8ce7d21b4bd18ab230d6936310ec8e639ff
- head_sha_verified: 8628a8ce7d21b4bd18ab230d6936310ec8e639ff
- pull_requests: none
- deployed_sha: 8628a8ce7d21b4bd18ab230d6936310ec8e639ff
- tests/gates: deployed gates passed (359 tests, build, readiness, external smoke). Initial browser test found downward drag escaped to product detail. Fix preflight PASS; `npm run check` PASS; `npm run test:lily-ui` PASS (16 files, 72 tests); isolated `npm test` PASS (67 files, 356 passed, 3 skipped); `npm run build` PASS, 216.99/217 KiB.
- migrations: none
- blockers: none for code delivery. An initial unisolated `npm test` run used `.runtime/lily-acai.db` and failed because its schema lacks `loyaltyRoundingMode`; tests cleaned test data in that local runtime DB. A post-run SQLite backup is preserved at ignored path `.runtime/lily-acai-preserved-20261028-1442.db`; the untouched original state cannot be established from the repo. Subsequent tests used the isolated `.runtime/lily-acai-check.db`.
- discovered_issue: production IAB drag `[250,150] -> [250,500]` navigated from `/lilyacai/reels` to `/lilyacai/cardapio?produto=rosa-nutt`; must suppress native image drag/click and reliably commit vertical gesture.
- last_verified_at: 2026-10-28 America/Sao_Paulo
- next_action: review diff, commit, open draft PR, pass CI, merge canonical, deploy, then repeat up/down drag, keyboard and cart verification in Codex IAB.
