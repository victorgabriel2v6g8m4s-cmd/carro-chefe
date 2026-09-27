# Gateway de pagamentos CookLily — levantamento e arquitetura

Data da análise: 27/09/2026.

Este documento registra a comparação dos processadores estudados e a arquitetura implementada para que a CookLily controle seu próprio domínio de pagamentos sem assumir processamento bancário, custódia ou dados brutos de cartão.

> As taxas abaixo são uma fotografia das ofertas públicas consultadas nesta data. Condições comerciais, antecipação, análise cadastral, prazo de recebimento, promoções e negociação podem alterar os valores. A condição contratual válida é sempre a exibida na conta aprovada do estabelecimento.

## Decisão arquitetural

A CookLily possui uma camada própria de pagamentos:

```text
Checkout CookLily
  -> /api/v1/lily/payments
     -> PaymentProvider
        -> manual
        -> mercado_pago
        -> futuros adapters
```

A aplicação continua dona de:

- vínculo pedido ↔ pagamento;
- valor esperado;
- idempotência;
- estado local e trilha de eventos;
- reconciliação;
- autorização de cliente/staff/admin;
- prevenção de IDOR;
- cancelamento e estorno;
- auditoria;
- transição do pedido para pago/refunded;
- interface e experiência do checkout.

O processador externo fica responsável por movimentar o dinheiro e tokenizar dados sensíveis.

O primeiro adapter automático é `mercado_pago`, usando Checkout Transparente / Orders API.

O provider `manual` permanece disponível como fallback operacional, mas não é o caminho recomendado quando o adapter automático estiver homologado.

## Comparação pública

| Processador | Pix publicado | Cartão à vista publicado | Integração / observações |
| --- | ---: | ---: | --- |
| Mercado Pago | A taxa exata do Checkout deve ser confirmada na conta; páginas públicas de outros produtos exibem condições que não devem ser tratadas como tarifa contratual do Checkout | Varia conforme condição/prazo da conta | Checkout Transparente, Orders API recomendada, Pix, cartão tokenizado, webhooks assinados, refund API |
| Pagar.me / Stone | 0,99% na oferta Essencial consultada | 4,19% no Checkout Stone à vista | API + dashboard; antifraude incluído na oferta publicada; opção Flex com taxas customizadas |
| Asaas | R$ 1,99 por transação recebida na tarifa padrão exibida; promoção de R$ 0,99 por 3 meses na página consultada | R$ 0,49 + 2,99% padrão à vista; promoção de R$ 0,49 + 1,99% por 3 meses | API, checkout transparente, split e tokenização; taxa fixa pesa mais em tickets baixos |
| Efí Bank | 1,19% para Pix via API/QR dinâmico/Pix Cob | Não foi usado como referência principal de cartão neste levantamento | Forte oferta Pix/API; Pix Automático publicado a R$ 3,50 por Pix liquidado |

Fontes oficiais consultadas:

- Mercado Pago Checkout Transparente / Orders API: https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-api/overview
- Mercado Pago Pix via Orders: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/pix
- Mercado Pago Webhooks / orders: https://www.mercadopago.com.br/developers/pt/docs/automatic-payments-orders/notifications/orders
- Pagar.me / Stone ofertas: https://www.pagar.me/ofertas
- Asaas preços e taxas: https://www.asaas.com/precos-e-taxas
- Efí tarifas: https://sejaefi.com.br/tarifas

## Impacto de taxa fixa em ticket baixo

Exemplo meramente matemático, usando as taxas públicas acima e sem considerar antecipação ou condições negociadas:

| Ticket | Pagar.me Pix 0,99% | Efí Pix 1,19% | Asaas Pix padrão R$ 1,99 |
| ---: | ---: | ---: | ---: |
| R$ 20 | ~R$ 0,20 | ~R$ 0,24 | R$ 1,99 (~9,95%) |
| R$ 30 | ~R$ 0,30 | ~R$ 0,36 | R$ 1,99 (~6,63%) |
| R$ 50 | ~R$ 0,50 | ~R$ 0,60 | R$ 1,99 (~3,98%) |

Isso torna especialmente importante negociar/confirmar a tarifa real do primeiro provider antes de abrir vendas.

## Por que Mercado Pago primeiro

A escolha inicial não significa dependência permanente. O adapter foi priorizado porque a documentação atual oferece, no mesmo caminho de Checkout Transparente:

- Orders API indicada como integração recomendada;
- Pix com QR Code e Copia e Cola;
- cartão com token gerado no frontend;
- `X-Idempotency-Key`;
- consulta autoritativa de order;
- webhooks com assinatura HMAC;
- cancelamento/refund por API;
- operação sem redirecionar o checkout principal para outro domínio.

A tarifa real da conta deve ser conferida depois que a conta/aplicação do estabelecimento estiver aprovada. Se a condição comercial ficar pior que Pagar.me/Stone ou outro provider, o contrato `PaymentProvider` permite adicionar outro adapter sem alterar pedidos, telas administrativas, histórico ou modelo de reconciliação.

## Segurança implementada

### Cartão

A CookLily não cria campos próprios de PAN/CVV no backend.

O frontend carrega o Card Payment Brick oficial. Os dados sensíveis são capturados/tokenizados pelo processador. A API CookLily recebe somente:

- token descartável;
- identificador do método;
- quantidade de parcelas;
- e-mail/identificação do pagador quando fornecidos pelo Brick.

Access Token e Webhook Secret nunca são enviados ao navegador.

### Pix

O backend cria uma Order no provider e persiste somente dados necessários para operação:

- ID da order do provider;
- ID da transação;
- QR Code/Copia e Cola;
- URL pública de pagamento quando houver;
- status;
- timestamps.

### Webhook

Endpoint:

```text
POST /api/v1/lily/payments/webhooks/mercado-pago
```

O backend:

1. exige `x-signature`, `x-request-id` e `data.id`;
2. valida HMAC SHA-256 com o Webhook Secret;
3. não confia no status recebido no body;
4. usa o ID assinado para consultar a Order diretamente na API do provider;
5. aplica a transição local apenas a partir da resposta autoritativa;
6. registra `providerEventId` para deduplicação.

### Valor aprovado

Um status `approved` só transforma o pedido em `paid` automaticamente se o valor confirmado pelo provider for exatamente igual a `LilyOrder.grandTotalCents`.

Divergência:

- não paga o pedido;
- gera evento `payment.amount_mismatch`;
- gera reconciliação `discrepant`;
- fica disponível para investigação administrativa.

### Aprovação manual

`/admin/payments/:id/confirm` aceita somente provider `manual`.

Um admin não consegue transformar um pagamento Mercado Pago em aprovado clicando no painel.

### Estorno

Para provider automático, o backend chama a API do processador primeiro. Somente depois da confirmação remota sincroniza o estado local.

O provider manual continua exigindo referência financeira informada pelo admin.

## Configuração deixada para o proprietário

Nenhuma credencial real foi criada ou versionada.

Para homologar Mercado Pago será necessário:

1. criar/aprovar a conta comercial;
2. criar a aplicação em Mercado Pago Developers;
3. habilitar/configurar Checkout Transparente e uma chave Pix;
4. obter a Public Key produtiva;
5. obter o Access Token produtivo;
6. configurar o webhook de Orders para:
   `https://carrochefe.com/api/v1/lily/payments/webhooks/mercado-pago`;
7. copiar a chave secreta do webhook;
8. salvar exclusivamente na VPS:
   - `MERCADO_PAGO_PUBLIC_KEY`;
   - `MERCADO_PAGO_ACCESS_TOKEN`;
   - `MERCADO_PAGO_WEBHOOK_SECRET`;
9. executar testes controlados;
10. só então selecionar `mercado_pago` no painel e habilitar Pix/cartão;
11. manter `paymentsEnabled=false` até a homologação comercial terminar.

## Defaults

A migration mantém fail-closed:

- provider existente continua `manual`;
- `mercadoPagoPixEnabled=false`;
- `mercadoPagoCardEnabled=false`;
- `paymentsEnabled` mantém o estado anterior (hoje deve permanecer desligado em produção até homologação).

Nenhuma publicação ativa automaticamente cobrança real.
