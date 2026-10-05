# ADR-003 — escolha de pagamento, fallback Pix e descontos por método

## Registro

- **Data:** 05/10/2026
- **Fuso:** UTC-03:00
- **Decidido por:** Humano — proprietário
- **Escopo:** CookLily
- **Status:** APROVADO / IMPLEMENTAÇÃO DESTA ENTREGA
- **Relação:** complementa e, no ponto explicitado abaixo, substitui a DEC-CL-102 do ADR-002.

## Decisão

O cliente escolhe explicitamente uma das três formas públicas de pagamento antes de qualquer cobrança:

1. **Pix**;
2. **Cartão de crédito**;
3. **Cartão de débito**.

A interface não apresenta providers como se fossem formas de pagamento distintas. `cooklily_pix`, `mercado_pago` e `manual` são decisões internas de roteamento.

## Roteamento por método

```text
pix
  1. cooklily_pix  — BR Code/Pix Copia e Cola próprio
  2. mercado_pago — fallback automático quando configurado
  3. manual        — última contingência

credit_card
  mercado_pago

debit_card
  mercado_pago
```

Esta decisão **substitui** a parte do ADR-002 que mantinha Pix Mercado Pago fora do fluxo público. A nova instrução do proprietário determina Mercado Pago Pix como fallback do Pix próprio.

O Pix manual deixa de ser uma forma pública separada; ele é contingência interna do método `pix`.

## Segurança do fallback

Fallback não significa tentar providers externos indiscriminadamente.

- Falha ao gerar o BR Code CookLily é local e não movimenta dinheiro; é seguro continuar para o próximo provider.
- Se o Mercado Pago estiver indisponível **antes de ser chamado**, a cadeia pode seguir para o fallback manual.
- Se uma tentativa já foi enviada ao Mercado Pago e ocorrer timeout/resultado ambíguo, o sistema falha fechado e **não cria automaticamente outro Pix**, porque a cobrança externa pode ter sido criada. A repetição usa a mesma chave de idempotência.

## Débito

Cartão de débito é um método de domínio próprio (`debit_card`), separado de crédito.

- tokenização pelo Card Payment Brick do Mercado Pago;
- `payment_method.type=debit_card` no backend;
- uma parcela;
- PAN/CVV não passam pela API CookLily e não são persistidos.

## Motor de desconto por método

Cada método possui configuração independente:

- habilitado/desabilitado;
- sem desconto, percentual ou valor fixo;
- valor do desconto;
- teto opcional;
- valor mínimo do pedido para elegibilidade.

Percentuais são persistidos em basis points (10000 = 100%). Valores fixos são persistidos em centavos.

### Base elegível

O desconto por método incide sobre o valor dos produtos já líquido das demais regras comerciais do pedido, **sem reduzir a taxa de entrega**:

```text
base_do_pagamento = grandTotalCents do pedido
base_elegivel = base_do_pagamento - deliveryFeeCents
desconto = regra(base_elegivel)
total_a_pagar = base_do_pagamento - desconto
```

O desconto é limitado à base elegível e nunca produz pagamento negativo.

## Imutabilidade e reconciliação

O pedido mantém seu total comercial original. No instante em que o cliente cria o pagamento, o sistema congela no pagamento:

- método escolhido;
- provider efetivamente usado;
- cadeia de fallback disponível/tentada;
- total-base;
- base elegível;
- taxa de entrega;
- desconto aplicado;
- regra aplicada;
- total financeiro a cobrar.

Esse snapshot fica no `providerDataJson` do `LilyPayment`; mudanças futuras na configuração não alteram pagamentos já criados.

A reconciliação compara o valor recebido com o **valor final do pagamento após desconto**, não com o total-base do pedido.

## Compatibilidade

A Entrega 07 legada permanece disponível para histórico e rotinas administrativas de reconciliação/cancelamento/estorno. O novo checkout usa endpoints de orquestração por método e não depende do `paymentProvider` global legado.

## Configuração administrativa

A configuração por método fica em `LilyPaymentMethodSetting`, no banco Lily dedicado. O painel de configuração é acessível pelo namespace de pagamento e exige staff/admin; mutações exigem admin + CSRF e são auditadas.

`paymentsEnabled` continua sendo o kill switch global e permanece fechado por padrão.

## Critério de pronto

- Pix, crédito e débito coexistem na mesma tela;
- Pix próprio é prioridade;
- MP Pix é fallback;
- Pix manual é último fallback;
- débito é tokenizado e enviado como `debit_card`;
- desconto configurável aparece antes da cobrança;
- cálculo de desconto é server-side;
- taxa de entrega não recebe desconto;
- snapshot financeiro é imutável;
- idempotência é separada por pedido + método;
- analytics aceita `debit_card`;
- testes cobrem coexistência, desconto, BR Code, fallback manual e débito;
- CI e CodeQL verdes antes da integração canônica.
