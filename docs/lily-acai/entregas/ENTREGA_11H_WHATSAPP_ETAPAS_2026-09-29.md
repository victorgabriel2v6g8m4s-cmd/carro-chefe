# Entrega 11H — WhatsApp operacional por etapa

**Data:** 29/09/2026  
**Base:** `cooklily/canonical` após Entrega 11G.  
**Status:** implementação candidata; gate CI/CodeQL e homologação Meta reais pendentes.

## Objetivo

Enviar atualizações operacionais de pedido pelo WhatsApp sem:

- transformar o consentimento de status em consentimento de marketing;
- duplicar mensagens quando uma ação é repetida;
- bloquear pedido/pagamento/cozinha/entrega se o provider estiver fora;
- persistir Access Token;
- disparar mensagens de etapas antigas depois de opt-out.

## Provider

Primeiro adapter: **Meta WhatsApp Cloud API direta**.

A integração usa o endpoint oficial de mensagens Graph API e um único template aprovado, configurado por ambiente. O acesso é direto para evitar dependência de BSP intermediário nesta primeira versão.

O sistema permanece provider-aware pela coluna `provider` da outbox e pela separação do adapter.

## Consentimento

Versão atual:

`2026-09-29`

O checkout oferece uma caixa **desmarcada por padrão**:

> Receber atualizações deste pedido pelo WhatsApp. Somente mensagens operacionais de status; este aceite não habilita promoções.

O aceite é por pedido e grava:

- `whatsappUpdatesOptIn`;
- `whatsappConsentAt`;
- `whatsappConsentVersion`.

Isso é separado de `lily_marketing`.

### Opt-out

Cliente pode desativar depois:

`POST /api/v1/lily/orders/:id/whatsapp/opt-out`

Autorização:

- pedido autenticado: dono da conta + CSRF;
- guest: capability `X-Lily-Order-Token`.

Ao desativar:

- `whatsappUpdatesOptIn=false`;
- mensagens `pending/failed` viram `skipped`;
- histórico enviado permanece para auditoria.

A interface de pedido autenticado e o tracking guest oferecem o botão de opt-out.

## Outbox persistente

Novo modelo:

`LilyWhatsAppNotification`

Campos relevantes:

- pedido;
- etapa;
- status;
- número de tentativas;
- próximo retry;
- provider;
- message id do provider;
- erro sanitizado;
- instante de envio.

Invariante:

`@@unique([orderId, stage])`

Portanto, a mesma etapa de um pedido é enfileirada no máximo uma vez.

Migration:

`20260929150000_lily_whatsapp_outbox`

## Etapas

A outbox suporta:

- `awaiting_payment`;
- `payment_confirmed`;
- `preparing`;
- `ready_for_pickup`;
- `waiting_courier`;
- `courier_accepted`;
- `picked_up`;
- `out_for_delivery`;
- `arrived_delivery`;
- `delivered`;
- `cancelled`;
- `refunded`.

Eventos atualmente conectados:

- criação opt-in -> `awaiting_payment`;
- pagamento aprovado -> `payment_confirmed`;
- cozinha inicia montagem -> `preparing`;
- retirada pronta -> `ready_for_pickup`;
- delivery liberada -> `waiting_courier`;
- courier aceitou/foi reatribuído -> `courier_accepted`;
- coleta confirmada -> `picked_up`;
- saiu da coleta -> `out_for_delivery`;
- chegou ao destino -> `arrived_delivery`;
- entrega confirmada -> `delivered`;
- estorno integral -> `refunded`.

`cancelled` fica reservado para a futura transição explícita de cancelamento de pedido; não é inventado a partir de cancelamento de tentativa de pagamento.

## Template Meta

A implementação espera um template operacional configurado em:

`COOKLILY_WHATSAPP_TEMPLATE_NAME`

Corpo esperado com dois parâmetros:

1. número do pedido;
2. texto da etapa.

Exemplo conceitual:

`Atualização CookLily: pedido {{1}} — {{2}}.`

O template precisa ser criado/aprovado no WhatsApp Manager antes de habilitar o worker em produção. A categoria final deve seguir a classificação aceita pela Meta para o conteúdo cadastrado.

## Ambiente

```env
COOKLILY_WHATSAPP_PROVIDER=meta_cloud
COOKLILY_WHATSAPP_ACCESS_TOKEN=<token-backend>
COOKLILY_WHATSAPP_PHONE_NUMBER_ID=<phone-number-id>
COOKLILY_WHATSAPP_GRAPH_VERSION=<versao-graph-aprovada>
COOKLILY_WHATSAPP_TEMPLATE_NAME=cooklily_order_update
COOKLILY_WHATSAPP_TEMPLATE_LANGUAGE=pt_BR

# opcionais
COOKLILY_WHATSAPP_TIMEOUT_MS=8000
COOKLILY_WHATSAPP_WORKER_INTERVAL_MS=15000
```

Segredos nunca usam `VITE_*`.

A versão Graph é configuração explícita, e não constante hardcoded, para evitar mascarar mudanças de versão da API.

## Worker

O worker roda somente no processo real de `server.ts`, não em `buildApp()`.

Isso evita timers automáticos em testes e ferramentas que apenas instanciam o Fastify.

Comportamento:

- busca `pending/failed` vencidos;
- claim otimista -> `processing`;
- envia template;
- sucesso -> `sent`;
- falha -> `failed` + backoff exponencial;
- máximo 8 tentativas;
- após limite -> `dead`;
- `processing` abandonado por mais de 5 minutos volta para retry automaticamente;
- opt-out detectado durante processamento -> `skipped`.

O provider nunca participa da transação que muda a etapa do pedido.

## Privacidade e logs

Não persistimos:

- Access Token;
- payload bruto da Meta;
- telefone duplicado na outbox;
- corpo completo da mensagem.

O telefone é lido do pedido somente no momento do envio.

Logs do worker carregam contagens e erro sanitizado, sem token/telefone.

## Admin API

Leitura para staff/admin:

- `GET /api/v1/lily/admin/whatsapp/settings`;
- `GET /api/v1/lily/admin/whatsapp/notifications`.

Retry é admin + CSRF:

- `POST /api/v1/lily/admin/whatsapp/retry`.

O endpoint de settings expõe apenas presença/validade estrutural da configuração, nunca credenciais.

## Testes implementados

- provider incompleto => `ready=false`;
- opt-out não enfileira;
- unique pedido+etapa evita duplicidade;
- request Meta usa token apenas em `Authorization`;
- token não aparece na URL nem registro persistido;
- corpo usa template + parâmetros;
- retorno Meta persiste apenas message id;
- 5xx do provider agenda retry;
- erro do provider não altera estado do pedido;
- pedido opt-in cria `awaiting_payment` atomically;
- guest consegue opt-out com capability;
- cozinha enfileira `preparing/waiting_courier`;
- logística enfileira as etapas relevantes;
- financeiro enfileira `payment_confirmed/refunded`.

## Homologação real pendente

1. criar/configurar WhatsApp Business Account da CookLily;
2. cadastrar número de envio;
3. criar e aprovar o template;
4. obter token backend e Phone Number ID;
5. escolher uma versão Graph suportada e gravá-la no env;
6. manter `COOKLILY_WHATSAPP_PROVIDER=disabled` até a homologação;
7. habilitar em ambiente controlado;
8. testar opt-in;
9. testar todas as etapas;
10. testar opt-out antes de uma etapa seguinte;
11. simular indisponibilidade/429 e retry;
12. conferir cobrança/qualidade do template na conta real.

## Próxima entrega — 11I

A cobrança Pix própria já existe. A próxima tranche não recria o Pix: adiciona a ingestão bancária autoritativa e o motor automático de matching/reconciliação por txid + valor.
