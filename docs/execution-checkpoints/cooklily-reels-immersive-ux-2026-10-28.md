# CookLily — Reels imersivo em tela cheia

- status: in_progress
- owner: AG-DEV
- branch: codex/reels-immersive-fullscreen
- base_branch: cooklily/canonical
- base_sha_verified: ac4528f52d9462623e821f62a633ec11370dded7
- head_sha_verified: changes uncommitted; base behind canonical by doc-only PR #226 commit 26fb56d; pending rebase
- pull_requests: pending
- deployed_sha: ac4528f52d9462623e821f62a633ec11370dded7
- tests/gates: `npm run test:lily-ui` PASS (16 files, 70 tests); `npm run build` PASS including CookLily budget; `npm run check` PASS. Full `npm test` reached Vitest but failed many unrelated API integration suites because this worktree lacks the core test database setup; rerun with project test DB configuration before claiming full-suite pass. Production IAB before deploy confirms current baseline still has old header/footer and text controls; post-deploy evidence pending.
- migrations: none
- blockers: current production Reels UI remains the old card with header/footer navigation, text-labeled sound and visible pause button. Feature code not yet merged/deployed; IAB after deploy required.
- last_verified_at: 2026-10-28 America/Sao_Paulo
- next_action: resolve test environment configuration, rebase on canonical after PR #226, commit and open PR; merge/deploy after CI, then validate mobile/desktop through Codex IAB and capture screenshots.

## Requirements and evidence

- Repository spec: `docs/lily-acai/UX_REELS_DASHBOARD_FIDELIDADE_2026-10-09.md`, sections 5.1–5.4 and 5.6: vertical product navigation, horizontal media carousel, touch-to-toggle video, own sound control, 2× hold, visible states, and no copied third-party branding.
- Owner's 2026-10-28 request: when the Reels tab is selected, show the media full-screen immediately; remove the pause button; make sound toggle icon-only; use Instagram/TikTok as interaction references.
- Review guideline: icon-only control must have an accessible label; full-bleed media uses safe-area insets; motion respects input and media controls remain keyboard accessible.
