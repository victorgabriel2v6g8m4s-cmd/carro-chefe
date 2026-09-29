# CookLily — Entrega 11I — Conciliação automática Pix

- status: merged
- owner: AG-DEV
- branch: `feat/lily-entrega-11i-pix-auto-reconciliation`
- base_branch: `cooklily/canonical`
- base_sha_verified: `1dcb08036c4e25b3bf29c5a45c8130f65fb1a761`
- validated_head_sha: `5758eaf634988bb8cb86b5c37fdf8be6aa3fd402`
- merge_sha: `41cdb60877ad660fad505a219cc695af7f0b9537`
- checkpoint_rule_commit: `9cec66fdd5fc1e3c07654638fe8c20c824077e4c`
- pull_requests: PR #102 -> `cooklily/canonical` (merged); PR #103 -> `main` (gate temporário fechado sem merge)
- last_verified_at: 2026-09-29
- interruption_state: concluída tecnicamente; homologação externa pendente

## Concluído e persistido

- Regra global de checkpoint adicionada ao `AGENTS.md` e protocolo em `docs/execution-checkpoints/README.md`.
- Schema para `LilyPixSettlement` e `LilyPixReconciliationState`.
- Migration `20260929173000_lily_pix_auto_reconciliation`.
- Motor `apps/api/src/modules/lily/pix-reconciliation.ts`.
- Testes `apps/api/src/modules/lily/pix-reconciliation.test.ts`.
- Registro de rotas administrativas de reconciliação.
- Worker de reconciliação iniciado no runtime do servidor.
- Polling com janela sobreposta, paginação estrita e fail-closed.
- Normalização bancária sem persistir nome/documento/`infoPagador`.
- Deduplicação por `source:endToEndId`.
- Matching por `txid` contra `providerPaymentId`/referência e valor exato.
- Divergência de valor mantém pedido/pagamento pendentes e gera `payment.amount_mismatch` + reconciliação discrepante.
- Pix sem txid, desconhecido, ambíguo, duplicado, tardio ou corrida perdida preservado para revisão.
- Checkout anuncia confirmação `automatic` somente quando a geração Pix e a reconciliação bancária estão prontas.
- OAuth client-credentials/mTLS configuráveis; scope não presumido.
- Endpoints admin de configuração, settlements e execução manual.
- Runbook VPS e documentação técnica da 11I.
- Fallback manual preservado.

## Gates e testes

Validação final do SHA `5758eaf634988bb8cb86b5c37fdf8be6aa3fd402`:

- CI `36622443247`: success.
- CodeQL `36622443193`: success.
- Quality / Node 20: success.
- Quality / Node 24: success.
- Tool Health / Linux: success.
- Windows Supervisor: success.
- Workbook Snapshot: success.
- Excel Recipe Linux: success.
- Excel Recipe Windows: success.

Durante o gate foram detectadas e corrigidas sem bypass:
- manifesto de política desatualizado após alteração em `AGENTS.md`;
- validação `oauthBodyFormatValid` ausente;
- corrupção textual acidental da regex de `receivedPathValid`.

## Integração

- PR #102 marcado pronto após gates verdes.
- Squash merge concluído em `cooklily/canonical`.
- Merge SHA: `41cdb60877ad660fad505a219cc695af7f0b9537`.
- PR gate #103 fechado sem merge.

## Migrations

- `packages/lily-database/prisma/migrations/20260929173000_lily_pix_auto_reconciliation/migration.sql`

## Bloqueios/riscos remanescentes

- A instituição/banco/PSP que efetivamente receberá o Pix da CookLily ainda precisa ser definida.
- Não escolher arbitrariamente um PSP apenas para concluir a homologação.
- Autenticação, scopes, URLs, certificados e eventual tarifa dependem da conta real.
- O provider de reconciliação deve permanecer `disabled` até a homologação da instituição recebedora.
- “Pix próprio sem gateway” não implica tarifa bancária zero.

## Homologação/dependências externas

- Confirmar a instituição recebedora real.
- Confirmar acesso à API Pix de recebidos e requisitos de mTLS/OAuth.
- Configurar credenciais somente na VPS/secret manager.
- Executar smoke controlado: pagamento exato, replay, valor divergente, paginação e timeout.
- Conferir tabela contratual de tarifas da conta.

## Próxima ação exata

Definir qual conta/instituição receberá o Pix CookLily e, com a documentação/credenciais reais dessa conta, homologar o adapter 11I sem alterar os invariantes fail-closed.
