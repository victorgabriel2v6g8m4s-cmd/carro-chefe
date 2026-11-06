# Homologação de pagamento, chave de agente e operação CookLily

- status: interrupted_external_dependencies
- owner: Codex / AG-DEV
- branch: codex/cooklily-payment-provider-diagnostics (implementação integrada)
- base_branch: cooklily/canonical
- base_sha_verified: 8a8728b839836be162f6062a89ae28e1d4f1ac55
- merged_sha_verified: 9f3219121362d1caafcaa3bcee263dd76585edd4
- pull_requests: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/336 (merged por squash; CI verde)
- staging_release: /srv/cooklily/staging/releases/9f321912
- last_verified_at: 2026-11-05
- interruption_state: aguardando cota Mercado Pago e aprovação Meta

## Concluído e persistido

- PR #336 foi integrado por squash no SHA `9f3219121362d1caafcaa3bcee263dd76585edd4` após todos os jobs do CI concluírem com sucesso (Node 20, 22, 24, Tool Health, Windows Supervisor, Excel Recipe e Workbook Snapshot).
- O ajuste do adapter Mercado Pago trata HTTP 429 como limitação temporária, lê `Retry-After` numérico ou HTTP-date e não expõe o corpo bruto; teste cobre mensagem e redaction.
- O staging isolado foi atualizado em `/srv/cooklily/staging/current` para release `9f321912`, sem migration e sem mexer nos domínios públicos. Somente `apps/api/src/modules/lily/mercado-pago-choice-provider.ts` foi substituído; o serviço `cooklily-staging.service` foi reiniciado.
- Após a janela normal de inicialização, health check local do staging respondeu HTTP 200; `/lilyacai/agent-auth.html` respondeu HTTP 200 e o serviço permaneceu ativo.
- Fluxo da chave repetido depois do deploy usando `tools/lily-agent-auth.mjs login` e exclusivamente o navegador integrado. A página exibiu `Acesso confirmado`, abriu `/lilyacai/painel` como a conta de teste administrativa e o handoff informou ticket consumido sem exibir ou salvar o ticket.
- O painel financeiro no browser confirmou que a configuração de staging está restaurada/desativada: processador Pix manual, pagamentos e meios Pix/cartão desligados. Pedido `CL-2C89449B54DE` permanece aguardando pagamento; não há pagamento criado para ele.
- No checkout de teste, a tentativa anterior voltou HTTP 502 na aplicação com `providerStatus=429` do Mercado Pago e request ID `21fe5261-3f3d-464f-99bb-ae127f8f0bf6`; sem `Retry-After`, sem cobrança e sem pagamento persistido. A API oficial define 429 como limite por Client ID/cota e recomenda respeitar `Retry-After` e usar backoff exponencial com jitter: https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-pro/create-order/post.
- O módulo atualizado e o erro 429 foram testados em código; nenhuma nova chamada de cobrança foi enviada após a detecção do limite.
- No WhatsApp Manager, após consulta ao vivo em 2026-11-05, os cinco templates seguem `Em análise`: `cooklily_pedido_recebido`, `cooklily_pagamento_confirmado`, `cooklily_saiu_para_entrega`, `cooklily_entregador_chegou` e `cooklily_pedido_entregue`. Nenhuma mensagem foi disparada.
- Estados operacionais de teste já disponíveis: um pedido pago e pronto para retirada, um pago recebido na cozinha, e um pedido mock cancelado/estornado. Não foram avançados nesta rodada para evitar efeitos de notificação WhatsApp enquanto os templates permanecem não aprovados.
- Validação visual da tela administrativa financeira em desktop e viewport 390×844 passou sem overflow horizontal; viewport foi restaurado ao padrão.

## Gates e testes

- Teste focal `apps/api/src/modules/lily/mercado-pago-provider.test.ts`: 12 passaram.
- `npm run check`: passou.
- `npm run test:runtime`: 86 arquivos, 467 passaram, 3 ignorados.
- `npm run build`: passou; orçamento do bundle aprovado.
- `git diff --check`: passou no PR funcional.
- CI do PR #336, run `41972882976`: todos os jobs concluídos com sucesso.
- Health check remoto após deploy: `GET http://127.0.0.1:4175/api/v1/health` HTTP 200.
- Rota de autenticação após deploy: `GET /lilyacai/agent-auth.html` HTTP 200 e login por chave confirmado via IAB.

## Migrations e dados

- Nenhuma migration nova.
- Dados do staging permanecem no SQLite isolado `/srv/cooklily/staging/data/staging.db`.
- Não houve cobrança, pagamento sandbox criado, estorno novo, alteração de dados produtivos ou deploy nos domínios de produção.
- Backup anterior do banco de staging: `/srv/cooklily/staging/data/backups/staging-before-8a8728b-20261105T043617Z.db`.

## Bloqueios/riscos externos

- O Mercado Pago devolveu 429 sem `Retry-After`; isso bloqueia a criação de pagamento no teste real do provedor. O ajuste melhora mensagem/telemetria e espera, mas não libera a cota externa.
- A homologação real ponta a ponta segue incompleta até o Mercado Pago aceitar uma única tentativa sandbox e a confirmação de pagamento ser observada no webhook e no pedido.
- Os cinco templates continuam em análise na Meta. A homologação de WhatsApp real e notificações acopladas a cozinha/entrega só pode ocorrer após aprovação; não enviar via texto livre como substituto.
- As configurações de pagamento e pedidos do staging foram deixadas desligadas após o teste.
- A publicação em `licalily.com/cook` não faz parte desta execução.

## Próximas ações exatas

1. Aguardar reset/liberação da cota da aplicação de testes do Mercado Pago ou abrir suporte à Meta/Mercado Pago com o request ID acima; não repetir pagamentos enquanto não houver janela de cota/`Retry-After`.
2. Aguardar a aprovação dos cinco templates no WhatsApp Manager.
3. Com ambos liberados, reativar temporariamente o checkout apenas no staging, criar uma tentativa sandbox única no pedido de teste existente, verificar pagamento/webhook e continuar cozinha, entrega, cancelamento e estorno sem afetar produção.
4. Enviar mensagens reais somente depois de confirmar aprovação de cada template e usar o destino de teste com opt-in registrado.
5. Repetir homologação visual desktop/mobile no navegador integrado e restaurar novamente as configurações de staging.
