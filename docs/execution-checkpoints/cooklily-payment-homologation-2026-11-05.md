# Homologação de pagamentos e autenticação de agente CookLily

- status: in_progress
- owner: Codex / AG-DEV
- branch: codex/cooklily-payment-provider-diagnostics
- base_branch: cooklily/canonical
- base_sha_verified: 8a8728b839836be162f6062a89ae28e1d4f1ac55
- head_sha_verified: f44f0a61fdbb8d50acffc6f51abe9c4c79d475ae
- pull_requests: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/336 (draft; CI Node 20 em andamento, demais jobs observados passaram)
- last_verified_at: 2026-11-05
- interruption_state: none

## Concluído e persistido

- O staging serve `8a8728b839836be162f6062a89ae28e1d4f1ac55` em `/srv/cooklily/staging/current`; serviço ativo e health check HTTP 200.
- A rota `/lilyacai/agent-auth.html` e o cookie de roteamento `cooklily_staging=1` permitem concluir o handoff da chave de agente no domínio de staging. A sessão admin de teste abriu o painel CookLily.
- O reverse proxy da VPS foi corrigido antes desta etapa para preservar o prefixo `/lilyacai/`; backup da configuração em `/var/backups/carrochefe.com-staging-prefix-20261105T044057Z.conf`.
- Handoff da chave repetido via `tools/lily-agent-auth.mjs login` e navegador integrado; a página exibiu `Acesso confirmado` e redirecionou para `/lilyacai/painel` como admin de teste.
- Credenciais de pagamento do staging estão explicitamente em modo `test`; o token de teste foi validado via perfil Mercado Pago. Não foram exibidos nem copiados segredos.
- Pedido de staging `CL-2C89449B54DE` (R$ 15,00) permanece `awaiting_payment`; não há registro em `LilyPayment` para ele.
- Uma tentativa de pagamento no checkout retornou HTTP 502 local com `providerStatus=429` do Mercado Pago; a API não devolveu `Retry-After`. O 429 corresponde a limite de requisições, confirmado na documentação oficial de Orders: https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-pro/create-order/post.
- Os cinco templates WhatsApp de pedidos (`cooklily_pedido_recebido`, `cooklily_pagamento_confirmado`, `cooklily_saiu_para_entrega`, `cooklily_entregador_chegou`, `cooklily_pedido_entregue`) estão com estado `Em análise` no WhatsApp Manager; não enviar até aprovação.
- Configurações temporárias de staging foram restauradas no painel: pedidos online desligados, quinta-feira desligada com janela anterior `18:00–23:00`, processor `Pix manual`, pagamentos e todos os toggles Pix/cartão desligados.
- Validação visual da página administrativa de pagamentos no viewport desktop padrão e em 390×844: sem overflow horizontal; viewport voltou ao tamanho padrão.
- Inicialização local de testes aplicada pelas migrations versionadas; `npm run check` passou; `npm run test:runtime` passou com 86 arquivos, 467 testes passaram e 3 ignorados; `npm run build` passou com os limites de bundle atendidos; teste focal do provider passou com 12 testes.

## Em andamento

- Commit funcional do adapter Mercado Pago para tratamento HTTP 429 e leitura de `Retry-After` numérico ou HTTP-date, sem corpo bruto de erro nas respostas; teste inclui referência de espera e redaction.
- PR draft #336 aberto com o commit `f44f0a61fdbb8d50acffc6f51abe9c4c79d475ae`; aguardar CI restante e integrar à canonical após gates verdes.
- Publicar somente em staging; sem repetir chamadas ao MP até nova janela de cota/`Retry-After`.
- Prosseguir a homologação da cadeia de pedido, cozinha, entrega, WhatsApp, cancelamento e estorno com registros de teste apropriados.

## Gates e testes

- Teste focal `apps/api/src/modules/lily/mercado-pago-provider.test.ts`: 12 passaram.
- `npm run check`: passou após a alteração.
- `npm run test:runtime`: 86 arquivos, 467 testes passaram, 3 ignorados após preparar o banco local; passou após a alteração.
- `npm run build`: passou após a alteração; build budget passou.
- `git diff --check`: passou.
- CI do PR `41972485430`: Node 22/24, Tool Health, Windows Supervisor, Excel Recipe e Workbook Snapshot passaram; Node 20 ainda rodava na última consulta.

## Migrations

- Nenhuma migration nova.
- A worktree usa banco de teste separado em `.runtime/`; as migrations versionadas foram aplicadas por `tools/prepare-local-lily-test-db.mjs`.
- Staging recebeu, no deploy anterior, as migrations até 56 com backup em `/srv/cooklily/staging/data/backups/staging-before-8a8728b-20261105T043617Z.db`.

## Bloqueios/riscos

- O sandbox Mercado Pago está limitando chamadas com HTTP 429 e não retornou `Retry-After`; reenviar repetidamente pode prolongar o bloqueio. Não houve cobrança nem criação remota confirmada.
- A homologação não pode ser declarada completa enquanto um pagamento aprovado em sandbox e os fluxos subsequentes não forem verificados.
- A homologação real do WhatsApp está bloqueada até os cinco templates saírem de `Em análise`.
- Configurações temporárias já restauradas; pedidos online e pagamentos permanecem desativados no staging.
- Publicação em `licalily.com/cook` não faz parte desta execução.

## Homologação/dependências externas

- Dependência externa: liberação da cota de requisições da aplicação/test credentials no Mercado Pago ou instrução `Retry-After`.
- Meta templates precisam ser aprovados antes de qualquer envio real ao destinatário com opt-in.
- Usar exclusivamente o navegador integrado do Codex para homologação visual; avaliar desktop e viewport mobile.

## Próxima ação exata

Após gates verdes, integrar PR #336, atualizar o checkpoint com o SHA resultante e fazer deploy somente em staging; validar o aviso 429 sem reenviar cartão. Prosseguir em paralelo com os fluxos internos que não dependem de aprovação Meta ou de quota do Mercado Pago.
