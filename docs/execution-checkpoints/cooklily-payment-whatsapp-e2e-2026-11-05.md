# CookLily — homologação do pedido, pagamento de teste e WhatsApp

- status: in_progress
- owner: Codex
- branch: `codex/cooklily-payment-staging-evidence`
- base_branch: `cooklily/canonical`
- base_sha_verified: `a7a61d2b0046a87c528d80fa63405141504c6e15`
- head_sha_verified: `a7a61d2b0046a87c528d80fa63405141504c6e15` (antes da atualização deste checkpoint)
- pull_requests: PR #338 merged por squash em `11c105317b170c5fa17f7efa312d8a262d13dbea`; PR #339 fechado sem merge por divergência de base; PR #340 merged em `5722156df70dd8fef8ec310e52b29a6216218eb7`; PR #341 merged em `ef71d37f39f6dcb86cb1b8246c3f34084c225077`; PR #342 merged por squash em `a7a61d2b0046a87c528d80fa63405141504c6e15` após todos os jobs do CI run `42088476232` passarem
- migrations: none planned
- last_verified_at: 2026-11-05 America/Sao_Paulo
- interruption_state: none

## Entrega

Homologar um pedido novo no domínio público CookLily, pagamento em ambiente explicitamente de teste, notificação WhatsApp real e acompanhamento operacional. Registrar todas as limitações na documentação. A autorização posterior do proprietário para testar em `licalily.com/cook` substitui a restrição anterior de não publicar/testar no público; qualquer resultado continua identificado como teste e não como venda real.

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

## Retomada em domínio público — 2026-11-05

As evidências staging acima são históricas e não representam o teste solicitado agora. O proprietário instruiu a criação de um pedido novo no domínio público e esclareceu que as tentativas anteriores não foram pagamento real nem acompanhamento WhatsApp.

- Release público observado no browser integrado: `https://licalily.com/cook`; o serviço público e o painel são os que foram usados. Nenhum deploy foi feito nesta retomada.
- Produto público de teste `teste1`, preço promocional R$ 0,50, foi adicionado pelo catálogo; retirada selecionada. O checkout estava fora do horário e exibiu o modo “Homologação — pedido e pagamento simulados, sem cobrança”.
- Opt-in operacional do WhatsApp foi marcado no checkout conforme consentimento prévio do proprietário para o número de teste autorizado.
- Pedido recém-criado: `CL-5B6FD8DB956D`, ID interno `cmw3t28gm0006cxlpsrlcpzzj`, total R$ 0,50, retirada, marcado como HOMOLOGAÇÃO. O pagamento foi concluído pelo botão “Simular · R$ 0,50”; a página confirmou “PAGAMENTO CONFIRMADO”. Não houve chamada nem pagamento Mercado Pago, nem cobrança real.
- Pedido foi liberado manualmente no painel da cozinha para a etapa “Montando pedido”. Nenhum alimento foi produzido ou retirado. A tela pública de acompanhamento mostrou a linha do tempo recebimento → aguardando pagamento → pagamento confirmado → montando pedido, com opt-in de WhatsApp ativo.
- O painel público de WhatsApp mostrou 0 notificações pendentes, 0 recuperáveis e 16 falhas finais; os templates locais de `awaiting_payment`/`payment_confirmed` aparecem `draft` e “Meta: ainda não associado”. Portanto, o site não disparou automaticamente nenhuma mensagem para este pedido.
- A API WhatsApp da Meta foi reconsultada usando a conta CookLily previamente escolhida. Os cinco templates operacionais (`cooklily_pedido_recebido`, `cooklily_pagamento_confirmado`, `cooklily_saiu_para_entrega`, `cooklily_entregador_chegou`, `cooklily_pedido_entregue`) retornaram `APPROVED`, categoria `UTILITY`, idioma `pt_BR`.
- Para verificar entrega Cloud API, com confirmação explícita do proprietário, foi enviado manualmente o template aprovado `cooklily_pedido_recebido` do número comercial CookLily ao número de teste optado. Meta respondeu `accepted`, `deliverable=true`, message id `wamid.HBgMNTU2Njk5ODY0ODUxFQIAERgUQ0U1NDhBNUJDMEI5NTdDOTc3M0EA`. A conversa do WhatsApp Web mostrou o corpo, rodapé e os botões “Finalizar pagamento” e “Editar pedido”. Isto comprova envio Cloud API manual e recepção no WhatsApp, mas NÃO comprova disparo automático pelo outbox do aplicativo.
- O botão “Finalizar pagamento” do teste manual abriu `https://licalily.com/cook/pagamento/CL-5B6FD8DB956D` e a página respondeu “Pedido não encontrado”. Diagnóstico: o teste manual preencheu o sufixo URL com o número público do pedido. O renderer canônico `apps/api/src/modules/lily/whatsapp-template-renderer.ts` usa `createLilyOrderAccessLink(order.id)` para preencher CTAs, ou seja, um link de acesso assinado derivado do ID interno. Portanto este teste manual não reproduziu o parâmetro emitido pela aplicação; ainda é pendente verificar o link assinado emitido pelo outbox público quando a automação estiver ativa.
- O pedido permaneceu marcado HOMOLOGAÇÃO e em montagem; nenhuma retirada ocorreu. Não cancelar ou marcar como entregue sem decisão explícita, para preservar evidência do fluxo observado.
- Conta de envio confirmada na Meta: `+55 67 9928-9187`; destinatário consentido: `+55 66 9986-4851`. Não registrar tokens/segredos.

## Nova tentativa em staging — 2026-11-05

- O usuário pediu repetir pedido, pagamento sandbox e envio automático. Para evitar cobrança real, a repetição foi no staging isolado, não em `licalily.com/cook`.
- O primeiro login por chave abriu o Chrome externo por engano. Esse caminho foi interrompido; a autenticação subsequente ocorreu via relay na aba integrada do Codex. Não usar Chrome externo nesta execução.
- Staging verificado ativo no release `/srv/cooklily/staging/releases/ef71d37f`, `MERCADO_PAGO_ENVIRONMENT=test`, health 200; banco `/srv/cooklily/staging/data/staging.db`.
- Produto temporário de teste foi ajustado para R$ 0,50 após a API de métodos informar mínimo de R$ 0,50 para cartão. Pedido novo criado no checkout do staging: `CL-B0FE0AEAC942`, ID `cmw3v9daj000g64lp3agoci7c`, total R$ 0,50, `awaiting_payment`, sem linha em `LilyPayment`, `isHomologation=0`, opt-in WhatsApp ligado para o destinatário autorizado. Não houve pagamento registrado.
- A tentativa de cartão sandbox chegou a `POST /v1/orders` e o provedor respondeu HTTP 400; log seguro: `req-8d`, request ID `521bd0e8-6c19-45a3-8859-3602c7809197`. Não repetir enquanto a resposta não puder ser diagnosticada. O navegador permanece em mensagem genérica de recusa.
- A outbox automática para `awaiting_payment` falhou cinco tentativas: `LilyWhatsAppNotification` com `lastErrorCode=190`, `Authentication Error`, sem message ID. Os templates Meta continuam aprovados, mas o token configurado no staging foi recusado.
- No Meta Business Settings, `Agent` recebeu acesso total ao app CookLily (`1108622408209440`) e à conta WhatsApp CookLily (`28928731436819905`), associada à conta de mensagens de templates e faturamento (`27155682270740448`). Após recarregar, a tela confirmou os dois ativos como acesso total.
- Depois da autorização explícita, foi gerado token sem expiração para o app CookLily com apenas `whatsapp_business_management` e `whatsapp_business_messaging`. O token foi copiado sem ser lido ou exibido.
- A revisão automática bloqueou antes de iniciar o processo a transferência da área de transferência por SSH; não houve conexão nem escrita remota. O token ainda não está salvo no staging. O arquivo `/etc/cooklily/staging.env` permanece `root:root`, modo `640`, e a chave alvo é `COOKLILY_WHATSAPP_ACCESS_TOKEN`; o serviço de staging estava ativo e o health retornava HTTP 200 antes da tentativa.
- Correção de diagnóstico integrada em `a7a61d2b`: captura códigos allowlisted também em estruturas aninhadas (`error`, `errors`, `cause`, `details`), sem registrar descrições. Teste focal 14/14; `npm run check` e `npm run build` passaram; budget JS gzip 211,47 KiB e JS+CSS gzip 252,61 KiB; `npm run test:runtime` passou com 86 arquivos, 473 testes aprovados e 3 ignorados. CI #342 passou em Node 20/22/24 e todos os demais jobs. Sem migration.

## Trabalho pendente

- O proprietário deve inserir o token diretamente no servidor por um prompt sem eco, atualizando apenas `COOKLILY_WHATSAPP_ACCESS_TOKEN` em `/etc/cooklily/staging.env`; depois reiniciar apenas `cooklily-staging.service` e validar health e envio automático ao destinatário de teste autorizado. Não enviar o token pelo chat.
- Publicar a correção integrada somente no release staging, sem migrations; fazer uma nova tentativa sandbox apenas depois de inspecionar o novo código de erro e conferir o pedido no banco e no Mercado Pago.
- Depois de pagamento sandbox aprovado e WhatsApp automático recebido, validar tracking, cozinha, courier, cancelamento e estorno conforme os estados permitidos no staging. O checkout público permanece sem uso para pagamentos nesta fase.

## Trabalho em andamento

- Investigar e corrigir por que o release público não associa/ativa os templates aprovados e não cria notificações de saída para pedido opt-in.
- Criar uma homologação separada com Mercado Pago efetivamente em sandbox (modo explícito `test`) e fluxo de cartão de teste; o checkout público usado nesta tentativa só ofereceu simulação sem cobrança.
- Depois das correções/deploy autorizado, criar outro pedido de baixo valor de teste, confirmar pagamento sandbox e validar envio automático do aplicativo, recebimento no WhatsApp, links assinados de CTA e atualizações posteriores.

## Próxima ação exata

Próxima ação: criar backup do arquivo de diagnóstico em `/srv/cooklily/staging/releases/ef71d37f`, copiar atomicamente apenas o módulo integrado em `a7a61d2b`, reiniciar somente `cooklily-staging.service` e validar hash/readiness/health. Não tocar em banco, variáveis ou outros serviços. O token Meta foi criado e permanece no clipboard, mas ainda não foi gravado; o proprietário deve inseri-lo no staging por prompt sem eco antes do teste de envio automático. Resultado parcial: pedido staging criado; pagamento sandbox recusado sem registro; WhatsApp automático falhou com erro 190; envio manual público anterior não comprova automação.
