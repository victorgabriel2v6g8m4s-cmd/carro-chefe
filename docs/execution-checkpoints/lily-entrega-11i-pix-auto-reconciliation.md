# CookLily — Entrega 11I — Conciliação automática Pix

- status: in_progress
- owner: AG-DEV
- branch: `feat/lily-entrega-11i-pix-auto-reconciliation`
- base_branch: `cooklily/canonical`
- base_sha_verified: `1dcb08036c4e25b3bf29c5a45c8130f65fb1a761`
- head_sha_verified_before_checkpoint_rule: `e85a29ed17d6147022a7e9d670da02140a8d36bc`
- checkpoint_rule_commit: `9cec66fdd5fc1e3c07654638fe8c20c824077e4c`
- pull_requests: ainda não verificado/criado para 11I
- last_verified_at: 2026-09-29
- interruption_state: retomada auditada; Git tratado como fonte de verdade

## Concluído e persistido

- Schema para `LilyPixSettlement` e `LilyPixReconciliationState`.
- Migration `20260929173000_lily_pix_auto_reconciliation`.
- Motor `apps/api/src/modules/lily/pix-reconciliation.ts`.
- Testes `apps/api/src/modules/lily/pix-reconciliation.test.ts`.
- Registro de rotas administrativas de reconciliação.
- Worker de reconciliação iniciado no runtime do servidor.
- Branch auditada como 7 commits à frente e 0 atrás da canonical antes da criação da regra de checkpoint.
- Regra global de checkpoint adicionada ao `AGENTS.md`.

## Em andamento

Auditar integralmente o motor de reconciliação já persistido, confirmar invariantes de segurança/idempotência, fechar documentação/roadmap/deploy e validar gates.

## Gates e testes

Ainda não revalidados nesta retomada. Não considerar a 11I pronta até CI e CodeQL verdes no SHA final candidato.

## Migrations

- `packages/lily-database/prisma/migrations/20260929173000_lily_pix_auto_reconciliation/migration.sql`

## Bloqueios/riscos

- O banco/PSP recebedor real e suas credenciais/API ainda precisam ser confirmados antes da homologação produtiva.
- Não escolher arbitrariamente um PSP apenas para completar a integração.
- A conciliação deve permanecer fail-closed: Pix sem correspondência exata de txid + valor não pode aprovar pedido automaticamente.

## Homologação/dependências externas

- Confirmar instituição recebedora e API Pix disponível.
- Configurar credenciais somente por ambiente/secret manager.
- Executar homologação com eventos Pix reais/sandbox quando a instituição estiver definida.

## Próxima ação exata

Ler o código completo de `pix-reconciliation.ts` e os testes já persistidos, comparar com os invariantes da Entrega 11I, corrigir lacunas, atualizar documentação/roadmap e então abrir PR/gate para CI e CodeQL.
