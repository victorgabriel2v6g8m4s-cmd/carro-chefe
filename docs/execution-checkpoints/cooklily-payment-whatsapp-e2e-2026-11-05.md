# CookLily — homologação do pedido, pagamento de teste e WhatsApp

- status: in_progress
- owner: Codex
- branch: `codex/cooklily-payment-whatsapp-followup`
- base_branch: `cooklily/canonical`
- base_sha_verified: `11c105317b170c5fa17f7efa312d8a262d13dbea`
- head_sha_verified: `d5bfc4da96fa611a1d54d93cbbad9c4ab7a37902` (commit da implementação; a atualização deste checkpoint é o commit seguinte)
- pull_requests: PR #338 merged por squash em `11c105317b170c5fa17f7efa312d8a262d13dbea`; follow-up PR ainda não aberto
- migrations: none planned
- last_verified_at: 2026-11-05 America/Sao_Paulo
- interruption_state: none

## Entrega

Homologar no staging isolado a criação do pedido, pagamento Mercado Pago em ambiente de teste, notificações WhatsApp da Meta e transições operacionais. Não publicar esta execução em `licalily.com/cook` nem alterar configurações de produção.

## Evidências confirmadas

- O serviço `cooklily-staging.service` está ativo no release `/srv/cooklily/staging/releases/9f321912`, porta local 4175 e banco isolado `/srv/cooklily/staging/data/staging.db`.
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

## Trabalho em andamento

- Abrir PR e aguardar CI para o commit `d5bfc4da`.
- Publicar frontend e módulos API alterados somente no serviço isolado `/srv/cooklily/staging`; confirmar SHA, saúde e ausência de migration.
- Descartar por ação administrativa auditada as duas notificações pendentes incompatíveis com o destinatário; confirmar fila vazia antes de habilitar qualquer envio.
- Repetir ativação do template aprovado e registrar o motivo específico se ainda falhar.
- Consultar pagamento/pedido existentes no painel e na base de staging antes de criar tentativa nova. Usar exclusivamente credenciais/cartão sandbox; não enviar mensagem até haver um pedido com opt-in correspondente ao número autorizado.

## Próxima ação exata

Enviar o commit `d5bfc4da` para `origin`, abrir PR draft contra `cooklily/canonical` e aguardar os gates. Depois do merge, preparar release staging derivado do release ativo `11c10531`, substituindo somente `apps/lily_acai/dist` e os arquivos de API explicitamente alterados; preservar o banco e não aplicar migrations. Fazer swap atômico, restart/health e rollback imediato se falhar. Só então usar a ação administrativa para descartar as duas notificações pendentes alheias ao número de teste e repetir a ativação com diagnósticos.
