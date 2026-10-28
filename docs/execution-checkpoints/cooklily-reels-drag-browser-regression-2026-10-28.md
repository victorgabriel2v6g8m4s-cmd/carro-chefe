# CookLily Reels — regressão de gesto encontrada em homologação

- status: in_progress
- owner: AG-DEV
- branch: codex/reels-action-order
- base_branch: cooklily/canonical
- base_sha_verified: c2b0615f31fa4a341f56256d8de4ae4701b88366
- head_sha_verified: c2b0615f31fa4a341f56256d8de4ae4701b88366 (button-order edit pending)
- pull_requests: PR #230, #231 and #232 merged; PR #233 pending creation for the requested vertical action order
- deployed_sha: c2b0615f31fa4a341f56256d8de4ae4701b88366
- tests/gates: PR #232 deploy passed (359 tests, build budget 216.93/217 KiB, verified backups, readiness, external smoke). Previous live test showed mouse drag stayed in Reels but did not switch slides; PR #232 explicit mouse handlers are awaiting IAB retest. Button order change is in progress. Latest local gates for order: preflight PASS; Lily UI 72 tests PASS; check PASS; full isolated test and build are running.
- migrations: none
- blockers: none for code delivery. An initial unisolated `npm test` run used `.runtime/lily-acai.db` and failed because its schema lacks `loyaltyRoundingMode`; tests cleaned test data in that local runtime DB. A post-run SQLite backup is preserved at ignored path `.runtime/lily-acai-preserved-20261028-1442.db`; the untouched original state cannot be established from the repo. Subsequent tests used the isolated `.runtime/lily-acai-check.db`.
- discovered_issue: production IAB drag `[250,150] -> [250,500]` first navigated from `/lilyacai/reels` to a product page. After PR #231 it remained in Reels but mouse dragging did not advance the active reel. PR #232 adds explicit mouse down/up handling, keeps touch scrolling native, and blocks the click generated after a drag; production retest remains pending. User then specified vertical action order: like, cart, comments, share, save; implemented in this branch.
- last_verified_at: 2026-10-28 America/Sao_Paulo
- next_action: finish isolated tests/build, commit button order plus this checkpoint, open PR #233, pass CI, merge canonical, deploy, then verify desktop drag in both directions, keyboard navigation, visible action order, comments, and in-place cart in the Codex IAB. Update this checkpoint with actual evidence and final deploy SHA.
