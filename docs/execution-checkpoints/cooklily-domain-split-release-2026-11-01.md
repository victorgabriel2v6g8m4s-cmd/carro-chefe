# CookLily domain split and release process — main documentation

- status: in_progress
- owner: AG-DEV
- branch: `codex/domain-split-release-main`
- base_branch: `origin/main`
- base_sha_verified: `cdf3d91258a4439d22afc0eda508c6ece0d2f325`
- head_sha_verified: documentation not yet committed
- pull_requests: none
- last_verified_at: 2026-11-01 America/Sao_Paulo
- interruption_state: none

## Entrega

Publish the approved CookLily domain/release decision and incident/reputation history in the Carro Chefe `main` documentation; then separate CookLily into its own repository, trim deployment/build/test scope, and set up staged deployment and approved promotion to `licalily.com`.

## Completed and persisted

- [x] Added `docs/governanca/COOKLILY_DOMINIOS_RELEASES_E_REPUTACAO_2026-11-01.md` with the owner-approved decision and factual incident summary (not yet committed).
- [x] Updated links to detailed TLS and VPS evidence to point to `cooklily/canonical`, where those artifacts live.

## Verified repository state

- Started from `origin/main` SHA `cdf3d91258a4439d22afc0eda508c6ece0d2f325`.
- Main did not contain CookLily-specific TLS checkpoint, deployment runbook or decision register at start. The cross-project decision memo is self-contained; deeper evidence links to `cooklily/canonical`.
- No GitHub PR, deploy, repo creation, VPS/DNS edit, Meta change, or user-data migration has occurred in this main worktree.

## Gates / migrations

- Documentation-only: `git diff --check` pending.
- No schema/migration changes in this documentation step.

## Risks and dependencies

- New public domain currently returned HTTP 429 during a probe; determine why before publication.
- New CookLily repo visibility, org/owner, secret migration, CI/deploy credentials and domain/provider access must be verified.
- Preserve `carrochefe.com/` and restrict CookLily test scope to `/lilyacai/*`.

## Next exact action

Run `git diff --check`, commit and push this documentation branch, open a draft PR to `main`, then verify and merge it only after its checks pass. Continue runtime/DNS work only after documenting current access and release gates.

