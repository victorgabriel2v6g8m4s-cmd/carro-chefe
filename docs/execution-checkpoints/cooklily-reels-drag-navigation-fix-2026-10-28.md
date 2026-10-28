# CookLily — correção do arraste vertical nos Reels

- status: in_progress
- owner: AG-DEV
- branch: codex/reels-drag-navigation-fix
- base_branch: cooklily/canonical
- base_sha_verified: 52ed687346682bfa039c7dc7a2d1b83a4ba3383c
- head_sha_verified: uncommitted fix after base; refresh after commit
- pull_requests: pending
- deployed_sha: 52ed687346682bfa039c7dc7a2d1b83a4ba3383c (UI icons/feed deployed; vertical reverse mouse drag needs follow-up)
- tests/gates: policy preflight PASS; `npm run test:lily-ui` PASS (16 files, 72 tests); `npm run check` PASS; `npm test` PASS (67 files, 356 passed, 3 skipped); `npm run build` PASS, CookLily JS+CSS gzip 216.94/217 KiB; `git diff --check` PASS. PR/production retest pending.
- migrations: none
- blockers: none
- discovered_issue: integrated-browser manual test found the mouse drag was changing `feed.scrollTop` while the pointer was still held. IntersectionObserver could switch/unmount the active Reel before pointer-up; a downward drag from the second item inconsistently navigated forward or opened its product configurator.
- fix: removed intermediate feed scrolling during pointer movement; calculate the adjacent slide from the starting slide on pointer-up and scroll-snap there. Added a structural regression assertion to prevent reintroducing live scroll mutation during drag.
- production_evidence: deployed release `52ed687346682bfa039c7dc7a2d1b83a4ba3383c`, deploy evidence `/srv/carro-chefe/data/deploy-logs/deploy-20261028-171254-52ed68734668.evidence`; Reels and main header/footer visually checked in Codex IAB. Browser evidence also confirmed comments panel opens with an empty state and that one test product was added without leaving Reels; temporary cart test items were removed and cart returned to 0 items.
- last_verified_at: 2026-10-28 America/Sao_Paulo
- next_action: review diff, commit/push, open PR, pass CI, merge, deploy canonical and repeat upward/downward mouse drag plus keyboard navigation and cart flow in the Codex integrated browser.

## Regressions to verify

- [ ] From a non-first Reel, drag upward; exactly one next product becomes active.
- [ ] From that Reel, drag downward; exactly one previous product becomes active without route change.
- [ ] ArrowDown and ArrowUp each move one product.
- [ ] A fixed product with no required minimum add-ons can be added in-place and shows icon feedback.
- [ ] A required-customization product stays in the catalog configurator.
- [ ] Test cart data is removed after verifying.
- [ ] Browser stays in the Codex integrated tab; no Chrome/Edge interaction.
