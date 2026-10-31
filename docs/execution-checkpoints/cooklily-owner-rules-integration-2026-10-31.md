# Integração das regras e decisões do proprietário

- status: in_progress
- owner: AG-DEV
- branch: `codex/cooklily-owner-rules`
- base_branch: `cooklily/canonical`
- base_sha_verified: `685f3f647b90f2cae4228093579e073999c72bab`
- head_sha_verified: pendente
- pull_requests: nenhum
- last_verified_at: 2026-10-31
- interruption_state: none

## Concluído e persistido

- PR #249 (`codex/cooklily-simulator-greeting`) já estava merged em 29/10/2026, merge SHA `15591416ae096bb4990779a5bcb36441604f242a`, ancestral da canonical atual. A branch remota foi removida após o merge.
- O worktree local da branch contém 14 arquivos modificados e não commitados com instruções/decisões posteriores. O worktree original foi preservado; as alterações foram copiadas para esta branch baseada na canonical atual.
- Conflitos de `package.json` e `DECISOES_PENDENCIAS.md` resolvidos preservando `pretest`, adicionando `test:runtime` e mantendo os estados mais recentes da canonical; decisões novas e linhas 052–059 atualizadas.
- Atualizações incluem: Central Operacional descontinuada e removida do build/servidor público (410), ERP próprio, ferramentas de agentes apenas locais, `test:runtime` como gate de runtime/deploy, recuperação de senha via OTP WhatsApp, prazos de retenção por classe, confirmação de ciência de cupom em cancelamento, totem dedicado e pendências de indicação/CRM.

## Em andamento

- Revisar semanticamente o diff, conferir scripts de deploy/gates e atualizar o checkpoint com CI/PR.

## Gates e testes

- `git diff --check`: aprovado após resolução do patch; revisão final pendente.
- JSON de `package.json` e `deploy/validation/gates.json`: parse válido.
- Testes de runtime, check e build: pendentes.
- CI do PR: pendente.

## Migrations

- Nenhuma nesta integração documental/deploy.

## Bloqueios/riscos

- Esta integração altera o runtime público ao remover a Central Operacional e retornar HTTP 410 em `/gestao`; deploy deve aguardar CI e revisão do escopo.
- A remoção progressiva de endpoints, módulos backend e persistência da Central permanece pendente e deve ser planejada separadamente.
- O deploy oficial ainda usa checkout Git na VPS; docs esclarecem que ferramentas locais não devem ser instaladas nem usadas pelo runtime.

## Homologação/dependências externas

- Nenhum deploy executado nesta integração.
- O PR #249 e deploy da saudação já concluídos são registrados no checkpoint do editor WhatsApp.

## Próxima ação exata

Finalizar a revisão do diff e gates locais possíveis; commit, PR contra `cooklily/canonical`, acompanhar CI e squash merge se todos os gates passarem. Depois retomar a implementação de despacho/avaliações em branch rebased sobre a canonical nova e seguir `npm run test:runtime`, `npm run check` e `npm run build`.
