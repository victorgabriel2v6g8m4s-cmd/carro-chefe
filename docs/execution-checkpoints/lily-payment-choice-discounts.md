# Checkpoint — escolha de pagamento + descontos por método

- Tarefa: permitir escolha explícita entre Pix, cartão de crédito e cartão de débito, com cascata de Pix e motor de desconto configurável.
- Responsável: AG-DEV.
- Estado: integrado em `cooklily/canonical`.
- Branch de implementação: `feat/lily-payment-choice-discounts`.
- Base original: `7989bdd86f0e645237b5bce51422ada9839509bd`.
- Head funcional validado: `22b3372c049285b913ec1493da6e50627923a433`.
- Merge squash: `f7a976d082293a20335fce4e7d0b726608e98e10`.
- PR canônico: #128.
- Gate temporário: PR #129, fechado sem merge em `main`.
- CI: run #700, sucesso após reexecução do job Node 20 cancelado.
- CodeQL: run #705, sucesso após reexecução do job cancelado.

## Auditoria inicial

A branch histórica `feat/lily-entrega-07-pagamentos` existe e foi absorvida pela linha canônica; `cooklily/canonical` estava 285 commits à frente dela. A implementação atual já continha Pix próprio CookLily, Pix Mercado Pago, Pix manual, cartão de crédito tokenizado, reconciliação, cancelamento e estorno.

O gap confirmado era:

- `debit_card` não existia no domínio;
- o Card Payment Brick excluía débito;
- `paymentProvider` era global e mutuamente exclusivo;
- Pix próprio e cartões Mercado Pago não coexistiam publicamente;
- não existia desconto por método;
- a decisão anterior mantinha Pix Mercado Pago fora da seleção pública, mas a nova decisão do proprietário definiu Mercado Pago como fallback do Pix próprio e Pix manual como última contingência.

## Arquitetura integrada

- seleção pública por método: `pix | credit_card | debit_card`;
- Pix: `cooklily_pix -> mercado_pago -> manual`, nessa ordem;
- recusa determinística do Mercado Pago pode avançar para Pix manual;
- timeout/estado ambíguo após tentativa externa permanece fail-closed para evitar cobrança duplicada;
- crédito e débito usam Mercado Pago com tokenização no Brick;
- débito é enviado como `debit_card` e sempre em uma parcela;
- Pix manual deixou de ser escolha pública separada e virou contingência do método `pix`;
- configuração por método: habilitado, desconto `none|percentage|fixed`, valor, teto opcional e mínimo de pedido;
- desconto incide sobre mercadorias e preserva a taxa de entrega;
- preço-base, desconto, regra aplicada, provider real e cadeia de fallback ficam congelados no pagamento;
- o snapshot financeiro essencial também é preservado no evento append-only `payment.created`, para sobreviver a sincronizações legadas que substituam metadados mutáveis do provider;
- configuração persistida em `LilyPaymentMethodSetting`, isolada do domínio Carro Chefe;
- reconciliação, cancelamento e estorno legados foram preservados.

## Segurança

- PAN/CVV nunca passam pela API CookLily;
- idempotência continua obrigatória;
- valores e descontos são calculados server-side;
- falha externa ambígua não dispara fallback silencioso;
- mudanças administrativas exigem admin + CSRF e geram auditoria;
- pagamentos continuam fechados por padrão via `paymentsEnabled`.

## Validação concluída

- [x] migration da configuração por método;
- [x] motor de regras e cálculo de desconto;
- [x] provider Mercado Pago para crédito/débito/Pix no novo orquestrador;
- [x] rotas públicas/admin de escolha de pagamento;
- [x] frontend de checkout com três escolhas;
- [x] tela administrativa de configuração;
- [x] testes backend/frontend estruturais;
- [x] documentação/ADR;
- [x] CI Node 20/24, builds e Tool Health;
- [x] CodeQL;
- [x] integração em `cooklily/canonical`.

## Fora deste checkpoint

A integração técnica não substitui homologação com credenciais reais do Mercado Pago, Pix próprio/recebimento real, cartões reais de teste/sandbox e smoke operacional na VPS. Essas validações permanecem como etapa de homologação comercial.
