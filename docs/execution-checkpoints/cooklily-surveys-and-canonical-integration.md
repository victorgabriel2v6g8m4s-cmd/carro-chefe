# CookLily surveys and canonical integration — execution checkpoint

- **Responsible:** AG-DEV
- **Status:** in_progress
- **Branch:** `codex/cooklily-surveys-work`
- **Worktree:** `C:\Users\valdi\OneDrive\Área de Trabalho\cezar-surveys-work`
- **Base branch:** `cooklily/canonical`
- **Verified base SHA:** `c572c2cdfdf06fe6c3396c48a019409d0ce84c7c`
- **HEAD verified:** `c20c4a0c58f5f6f397c1664b0dbb13eb9d103964` (commit `c20c4a0`, pushed to origin)
- **Feature source:** `origin/feat/separate-whatsapp-webhooks` at `357cb92bce0c2971e51f940f6837e3c407eabc7a`; divergent history requires reconciliation, not fast-forward.
- **PRs:** draft [#176](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/176), base `cooklily/canonical` SHA `c572c2cdfdf06fe6c3396c48a019409d0ce84c7c`; head SHA `c20c4a0c58f5f6f397c1664b0dbb13eb9d103964`; open and attached to task.
- **Migrations:** survey/mission Prisma schema and hand-authored SQLite migration `20261024170000_lily_surveys_and_missions`; Prisma generate/validate PASS; all 23 Lily migrations applied sequentially to disposable SQLite and `foreign_key_check` PASS. `prisma migrate deploy`/`migrate dev --create-only` still return opaque `Schema engine error` on this Windows environment.
- **Completed evidence:** policy check and all three AG-DEV preflights passed; survey API/contracts/upload/consent/points/mission routes, customer/admin UI, five-tab mobile navigation, home CTA, sticky notifications, phone/password controls, image fallback, selective webhook integration, and emergency checkpoint-only push script exist. Five unrelated personal/financial JPEG screenshots safely moved out of repo to `C:\Users\valdi\OneDrive\Área de Trabalho\cooklily-media-quarantine-2026-10-24`.
- **In progress:** GitHub `Quality / Node 20` check; visual browser/mobile homologation remains a deployment follow-up.
- **Tests/gates:** GitHub checks `Excel Recipe / ubuntu-22.04`, `Excel Recipe / windows-latest`, `Workbook Snapshot`, `Windows Supervisor`, `Tool Health / Linux`, `Quality / Node 24` PASS; `Quality / Node 20` in_progress. `npm run policy:check` PASS; all three AG-DEV preflights PASS; Prisma generate/validate and `npm run check` PASS; `npm test` PASS (303 passed, 3 skipped; 55 files); `npm run build` PASS (repeat after final edits) with Vite chunk-size warning for CookLily main chunk (548.94 kB; build budget PASS); `git diff --cached --check` PASS; targeted security/survey tests PASS (20 tests).
- **Risks/blockers:** no reward-redemption/level configuration exists, so proximity progress and abandon warnings stay hidden and the API returns null. No CookLily product photos were present in the unrelated image set; current catalog media remains admin-managed and missing images fall back to the verified brand logo. Prisma migration CLI failure is local to this Windows run; the full migration SQL history and foreign keys were validated through SQLite, but Linux CI/deploy has not run. Vite reports the existing overall CookLily entry chunk above its generic 500 kB warning threshold although the project's explicit build budget passes.
- **External homologation:** VPS deployment remains for owner to run with `sudo cc deploy canonical`; this task prepares and validates files, does not run a production deployment.
- **Next exact action:** poll the Node 20 check once; if successful, mark roadmap merged-pending-approval/CI-complete and retain the checkpoint. If failed, retrieve diagnostics, fix the cause, rerun local gates and push a follow-up commit to PR #176.
- **Updated:** 2026-10-24

## Roadmap detalhado

1. [x] Rebase de trabalho sobre a canonical atual e registro da divergência da branch de webhooks.
2. [x] Rodar política/preflight para os caminhos de API, frontend Lily e banco Lily.
3. [x] Retirar do repositório as imagens pessoais/financeiras identificadas, preservando cópia em quarentena fora do checkout.
4. [x] Adicionar schema de surveys, participações, respostas e missões; criar migration SQL; gerar/validar Prisma.
5. [x] Finalizar contratos de respostas, upload privado MIME/tamanho, validação de respostas e autorização staff/admin.
6. [x] Criar experiência do cliente: lista autenticada, pesquisa, progresso, consentimento, missões e recompensa animada condicional.
7. [x] Criar painel staff/admin: criação/edição de rascunho, importação JSON/HTML sanitizada, formatação, tipos, pontos, navegação, pré-requisitos, publicação e leitura privada de respostas/anexos.
8. [x] Implementar cinco abas mobile na ordem do planejamento: Cardápio, Ranking, Reels, Dashboard, Perfil; adicionar destinos funcionais.
9. [x] Incluir CTA de pesquisa rápida na home, botão de notificações no header, autoformatação de telefone e controles de revelar senha.
10. [x] Integrar seletivamente os webhooks assinados da `feat/separate-whatsapp-webhooks` sobre canonical, sem reverter atualizações posteriores nem exigir DNS/certificado de host novo.
11. [x] Corrigir fallback de imagens administráveis e manter screenshots pessoais fora do repositório; não havia fotos próprias CookLily para associar.
12. [x] Gates locais finais: `npm run check`, `npm test` (55 arquivos, 303 passaram, 3 skips), `npm run build`, `git diff --cached --check`, política e preflights passaram; migration SQL completa foi aplicada em SQLite descartável e verificada; Prisma migrate CLI Windows e chunk warning anotados como limitações.
13. [x] Entregar script PowerShell que cria commit contendo exclusivamente este checkpoint em `cooklily/canonical`, com fetch/rebase e proteção contra avanço concorrente.
14. [x] Commit `c20c4a0` enviado e PR #176 em rascunho criado contra `cooklily/canonical`; seis checks remotos passaram e um check Node 20 permanece em execução; sem executar deploy VPS.
