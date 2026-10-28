# CookLily Reels — regressão de gesto encontrada em homologação

- status: in_progress
- owner: AG-DEV
- branch: codex/reels-desktop-mouse-drag
- base_branch: cooklily/canonical
- base_sha_verified: 8628a8ce7d21b4bd18ab230d6936310ec8e639ff
- head_sha_verified: 46c0201ed6ce1b1b39ed0e95de4f4e98a6c790aa (code changes uncommitted at checkpoint update)
- pull_requests: PR #230 merged; PR #231 merged and deployed; PR #232 pending creation for explicit desktop mouse handling
- deployed_sha: 46c0201ed6ce1b1b39ed0e95de4f4e98a6c790aa
- tests/gates: deployed gates passed (359 tests, build, readiness, external smoke). PR #231 prevents drag click leakage; live retest confirms it stays on `/lilyacai/reels`, but the mouse drag did not change the active reel. New explicit mouse down/up handling is implemented. Preflight PASS; `npm run check` PASS; `npm run test:lily-ui` PASS (16 files, 72 tests); isolated `npm test` PASS (67 files, 356 passed, 3 skipped); full `npm run build` PASS, 216.98/217 KiB.
- migrations: none
- blockers: none for code delivery. An initial unisolated `npm test` run used `.runtime/lily-acai.db` and failed because its schema lacks `loyaltyRoundingMode`; tests cleaned test data in that local runtime DB. A post-run SQLite backup is preserved at ignored path `.runtime/lily-acai-preserved-20261028-1442.db`; the untouched original state cannot be established from the repo. Subsequent tests used the isolated `.runtime/lily-acai-check.db`.
- discovered_issue: production IAB drag `[250,150] -> [250,500]` first navigated from `/lilyacai/reels` to a product page. After PR #231 it remained in Reels but mouse dragging did not advance the active reel. The new fix handles desktop mouse events explicitly, keeps touch scrolling native, and blocks the click generated after a drag.
- last_verified_at: 2026-10-28 America/Sao_Paulo
- next_action: commit the desktop mouse handler fix, open PR #232, pass CI, merge canonical, deploy, and verify both drag directions, keyboard navigation and in-place cart in the Codex IAB. Update this checkpoint with the observed production results.
