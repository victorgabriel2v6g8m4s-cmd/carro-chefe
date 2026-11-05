# CookLily — homologação do pedido, pagamento de teste e WhatsApp

- status: in_progress
- owner: Codex
- branch: `codex/cooklily-wa-template-activation`
- base_branch: `cooklily/canonical`
- base_sha_verified: `77a2d74797b40f73520914d3062ec6094e8d0fe8`
- head_sha_verified: `77a2d74797b40f73520914d3062ec6094e8d0fe8` (alterações locais ainda não commitadas)
- pull_requests: none
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

## Trabalho em andamento

- Corrigir a condição do estúdio para ativar apenas templates de utilidade com um corpo e botões seguros (URL CookLily ou resposta rápida), alinhada à validação backend.
- Depois de CI e integração, publicar o SHA aprovado somente no staging, ativar os cinco mapeamentos correspondentes aos templates aprovados e validar o envio da fila ao destinatário de teste já autorizado.
- Diagnosticar o HTTP 400 do sandbox sem expor token, dados de cartão ou corpo bruto do provedor; consultar pagamentos de teste antes de qualquer retry.

## Próxima ação exata

`git diff --check` passou. Criar commit e PR draft para `cooklily/canonical`, aguardar CI, integrar por squash e publicar somente no staging. Depois, associar/ativar templates e continuar a homologação.
