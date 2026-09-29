# CookLily — Entrega 11I — Conciliação automática Pix

- status: in_progress
- owner: AG-DEV
- branch: `feat/lily-entrega-11i-pix-auto-reconciliation`
- base_branch: `cooklily/canonical`
- base_sha_verified: `1dcb08036c4e25b3bf29c5a45c8130f65fb1a761`
- head_sha_verified_before_checkpoint_rule: `e85a29ed17d6147022a7e9d670da02140a8d36bc`
- head_sha_verified: `b654a73d1b65d928357ed24f02ebd272861e4b58`
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
- Polling Pix endurecido em `13c11fb90ebabb5a50c69a0d81a58bff345da3bc`: paginação estrita, rejeição de linhas financeiras inválidas, limite seguro de páginas, OAuth client-credentials configurável e matching por `providerPaymentId` ou `providerReference`.
- Divergência de valor agora também gera evento auditável `payment.amount_mismatch` sem aprovar pagamento/pedido.
- Checkout passa a anunciar confirmação `automatic` apenas quando a geração Pix e a reconciliação automática estão ambas prontas (`6a22c62097e654f209bf54d5bc4be3c290193d29`).
- Testes adicionais de fail-closed, paginação, audit trail e matching por `providerPaymentId` em `b654a73d1b65d928357ed24f02ebd272861e4b58`.

## Em andamento

Auditoria do núcleo concluída e lacunas críticas corrigidas. Em andamento: fechar documentação/roadmap/deploy, revisar compatibilidade PSP-specific e então validar PR/gates.

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

Atualizar documentação operacional/roadmaps da Entrega 11I (incluindo variáveis de ambiente e dependência do PSP real), revisar o diff final e abrir PR canônico + gate de CI/CodeQL.
