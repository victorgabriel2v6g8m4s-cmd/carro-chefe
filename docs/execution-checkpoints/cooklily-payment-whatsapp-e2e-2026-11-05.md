# CookLily — homologação do pedido, pagamento de teste e WhatsApp

- status: in_progress
- owner: Codex
- branch: `codex/cooklily-template-patch-default-fix`
- base_branch: `cooklily/canonical`
- base_sha_verified: `5722156df70dd8fef8ec310e52b29a6216218eb7`
- head_sha_verified: `ef71d37f39f6dcb86cb1b8246c3f34084c225077`
- pull_requests: PR #338 merged por squash em `11c105317b170c5fa17f7efa312d8a262d13dbea`; PR #339 fechado sem merge por divergência de base; PR #340 merged em `5722156df70dd8fef8ec310e52b29a6216218eb7`; PR #341 merged em `ef71d37f39f6dcb86cb1b8246c3f34084c225077`
- migrations: none planned
- last_verified_at: 2026-11-05 America/Sao_Paulo
- interruption_state: none

## Entrega

Homologar no staging isolado a criação do pedido, pagamento Mercado Pago em ambiente de teste, notificações WhatsApp da Meta e transições operacionais. Não publicar esta execução em `licalily.com/cook` nem alterar configurações de produção.

## Evidências confirmadas

- O serviço `cooklily-staging.service` está ativo no release `/srv/cooklily/staging/releases/5722156d`, porta local 4175 e banco isolado `/srv/cooklily/staging/data/staging.db`.
- `/etc/cooklily/staging.env` seleciona `MERCADO_PAGO_ENVIRONMENT=test`; as credenciais de teste do Mercado Pago já estavam configuradas. Um restart inicial do staging após a inclusão de variáveis WhatsApp foi confirmado ativo e `/health` retornou HTTP 200.
- `staging.env` não tinha variáveis de envio Meta. Foram adicionadas, sem imprimir valores, `COOKLILY_WHATSAPP_ACCESS_TOKEN`, `COOKLILY_WHATSAPP_PHONE_NUMBER_ID` e `COOKLILY_WHATSAPP_GRAPH_VERSION` a partir das credenciais CookLily configuradas na VPS para permitir somente o teste autorizado pelo proprietário ao número de homologação consentido. Não copiar valores para Git ou logs.
- A sessão administrativa de agente foi renovada via `node tools/lily-agent-auth.mjs login --key <chave dedicada>` e handoff concluído em aba integrada do Codex.
- Temporariamente ativados no banco staging: Mercado Pago + cartão, pagamentos, pedidos online, retirada e somente a janela de quinta-feira 00:00–23:59. Entrega permanece desativada. Essas configurações devem ser restauradas para desligado/fechado ao concluir o teste.
- Criado pelo checkout real do staging o pedido `CL-104492A004F7`, total R$ 15,00, retirada, aceite transacional de WhatsApp marcado. Estado atual observado: `awaiting_payment`; não há linha em `LilyPayment`.
- O sandbox respondeu HTTP 400 ao cartão de teste, sem criar registro de pagamento. Log sanitizado: `LILY_PAYMENT_PROVIDER_REJECTED`, status 400, request ID `97b07e44-ce2a-4d5c-a184-8cbe4d33469d`. A tela apresentou recusa genérica. Não repetir a tentativa antes de identificar a causa do 400.
- A notificação `awaiting_payment` do pedido está pendente com zero tentativas; nenhum WhatsApp foi enviado ainda.
- No WhatsApp Manager, cinco templates relevantes estão `APPROVED` / `UTILITY` em `pt_BR`: `cooklily_pedido_recebido`, `cooklily_pagamento_confirmado`, `cooklily_saiu_para_entrega`, `cooklily_entregador_chegou`, `cooklily_pedido_entregue`. O template de pedido recebido foi conferido na Meta; corpo, rodapé e dois botões correspondem aos rascunhos do pacote inicial, com links sob `licalily.com/cook`.
- Descoberto bloqueio de UI: o backend valida e aceita botões `BUTTONS` de resposta rápida/URL da CookLily, mas o frontend só habilitava “Ativar nas notificações” quando não havia componente `BUTTONS`. A tela de WhatsApp ainda mostra fail-closed e template fallback/idioma pendentes; nenhum rascunho está ativo.
- Correção local no estúdio: habilitação agora reutiliza critérios compatíveis com o backend (template utility operacional, body único, botões URL de domínios CookLily permitidos ou quick replies; até três botões). Testes focados: 5 passaram. `npm run check` passou. `npm run test:runtime`: 86 arquivos, 468 testes passaram, 3 ignorados. `npm run build` passou e `build_budget=ok` (JS gzip 211.37 KiB, total JS+CSS gzip 252.50 KiB).
- CI do PR #338 passou nos jobs de Node 20/22/24, Tool Health, Windows Supervisor, Excel Recipe e Workbook Snapshot; PR foi integrado por squash.
- Reconsulta segura da outbox encontrou duas notificações pendentes (`CL-2C89449B54DE` e `CL-104492A004F7`), ambas com opt-in ligado, mas nenhuma ligada ao telefone de teste autorizado. O worker permanece fail-closed; não habilitar até essas linhas serem desativadas pelo fluxo de opt-out e existir apenas notificação do destinatário autorizado.
- O erro 400 do Mercado Pago foi localizado pelo request ID; os logs mantêm apenas status e ID, sem causa sanitizada. O endpoint /v1/orders da integração pode retornar códigos `required_properties`, `unsupported_properties` ou `property_value` entre outros; conferir a compatibilidade do payload com a documentação oficial antes de nova tentativa. Fonte: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-management/integration-errors/api.
- Atualização desta tentativa: a API de negócios WhatsApp foi consultada novamente e os cinco templates do fluxo seguem `APPROVED`, categoria `UTILITY`, idioma `pt_BR`.
- No painel integrado, a ativação de `awaiting_payment` voltou a retornar HTTP 400 (`req-30`). A linha exata do banco staging foi consultada sem PII; a validação do release, executada com o próprio registro, passou. O backend agora devolve códigos de regra que falhar, sem conteúdo do template.
- O checkout usa o adaptador legado `mercado-pago-provider.ts`, que descartava causas da Orders API. Um adaptador compartilhado agora registra/exibe somente códigos allowlisted, status e request ID, sem descrições ou corpo bruto.
- Foi implementada ação administrativa auditada para marcar somente uma notificação ainda `pending` como `skipped`; ela preserva `whatsappUpdatesOptIn`. Teste cobre autenticação, concorrência/idempotência, auditoria e preservação do consentimento.
- Gates locais após essas mudanças: testes direcionados 28/28; `npm run check` passou; `npm run test:runtime` passou com 86 arquivos, 471 testes aprovados e 3 ignorados; `npm run build` passou, orçamento `build_budget=ok` (JS gzip 211.47 KiB; JS+CSS gzip 252.61 KiB). Sem migration ou alteração de schema.
- PR #340 passou os oito jobs de CI (Node 20/22/24, Windows Supervisor, Tool Health Linux, Excel Recipe Ubuntu/Windows e Workbook Snapshot) e foi integrado por squash em `5722156d`.
- Reconferência da VPS: `cooklily-staging.service` está ativo e `GET /api/v1/lily/public/health` retorna 200. `COOKLILY_WHATSAPP_PROVIDER=disabled`; o envio continua desligado.
- As duas notificações antigas (`CL-104492A004F7` e `CL-2C89449B54DE`) foram marcadas `skipped` via ação administrativa auditada; a fila filtrada por `pending` está vazia e o consentimento permaneceu inalterado.
- O proprietário esclareceu em 2026-11-05 que todas as ocorrências de pagamento anteriores foram testes, sem pagamento real e sem acompanhamento WhatsApp; portanto não são evidência de homologação real nem motivo para conciliar cobranças reais. Não repetir nem reutilizar essas tentativas; a homologação ainda precisa de um pedido novo em ambiente controlado.
- Rebuild do SHA `5722156d` concluído com `build_budget=ok`: JS gzip 211.47 KiB e JS+CSS gzip 252.61 KiB.
- A ativação de template segue falhando porque Zod materializa defaults em `templateInputSchema.partial()` e injeta `variables: []` num PATCH `{status:"active"}`. O banco salvo tem três variáveis e três placeholders; a validação isolada passa. Corrigi o schema para defaults serem aplicados apenas no POST e acrescentei teste de regressão.
- Correção integrada em `ef71d37f`: defaults de criação passaram a ser normalizados apenas no POST; PATCH preserva campos omitidos. Teste focal 6/6; `npm run check` passou; `npm run test:runtime` passou (86 arquivos, 472 aprovados, 3 ignorados); `npm run build` passou com `build_budget=ok` (JS gzip 211.47 KiB, JS+CSS gzip 252.61 KiB); CI do PR #341 passou nos oito jobs.

## Trabalho em andamento

- Publicar o SHA `ef71d37f` no release isolado de staging, sem migration; validar health e reproduzir pelo navegador a ativação do template aprovado.
- Repetir ativação do template aprovado após o novo release; configurar envio Meta apenas no ambiente autorizado e manter o envio desligado até existir pedido novo com opt-in do número autorizado.
- Depois, criar um pedido novo, testar o pagamento no sandbox e confirmar sequência real de notificações/recepção no WhatsApp e estados da cozinha/entrega.

## Próxima ação exata

PR #341 integrado em `ef71d37f`; gates locais e CI passaram. Próxima ação exata: copiar o módulo API atualizado para release novo derivado de `/srv/cooklily/staging/releases/5722156d`, trocar symlink e reiniciar somente `cooklily-staging.service`; validar health e ativar `awaiting_payment` pelo painel. Depois, continuar com pedido novo, sandbox Mercado Pago, notificação real ao número autorizado, resposta pelo WhatsApp integrado, transições de cozinha/entrega e cancelamento/estorno de teste.
