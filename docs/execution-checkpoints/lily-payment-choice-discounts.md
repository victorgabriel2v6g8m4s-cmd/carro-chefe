# Checkpoint — escolha de pagamento + descontos por método

- Tarefa: permitir escolha explícita entre Pix, cartão de crédito e cartão de débito, com cascata de Pix e motor de desconto configurável.
- Responsável: AG-DEV.
- Estado: em implementação.
- Branch: `feat/lily-payment-choice-discounts`.
- Base branch: `cooklily/canonical`.
- Base SHA verificado: `7989bdd86f0e645237b5bce51422ada9839509bd`.

## Auditoria inicial

A branch histórica `feat/lily-entrega-07-pagamentos` existe e foi absorvida pela linha canônica; `cooklily/canonical` está 285 commits à frente dela. A implementação atual já contém Pix próprio CookLily, Pix Mercado Pago, Pix manual, cartão de crédito tokenizado, reconciliação, cancelamento, estorno e tela com múltiplos métodos quando o provider global permite.

Gap confirmado no ADR-002 e no código atual:

- `debit_card` ainda não existe no domínio;
- o Card Payment Brick exclui débito;
- `paymentProvider` é global e mutuamente exclusivo;
- Pix próprio e cartões Mercado Pago não coexistem publicamente;
- não existe desconto por método;
- a decisão anterior mantinha Pix Mercado Pago fora da seleção pública, mas a nova decisão do proprietário determina Pix Mercado Pago como fallback do Pix próprio e Pix manual como último fallback.

## Arquitetura desta entrega

- seleção pública por método: `pix | credit_card | debit_card`;
- Pix: `cooklily_pix -> mercado_pago -> manual`, nessa ordem;
- fallback automático só ocorre quando é seguro (antes de uma transação externa ambígua); falha/timeout depois de chamar Mercado Pago permanece fail-closed para evitar cobrança duplicada;
- crédito e débito: Mercado Pago, com tokenização no Brick;
- Pix manual deixa de ser método público separado e vira contingência do método `pix`;
- regras de desconto são snapshots do pagamento e não reescrevem retroativamente o preço-base do pedido;
- desconto incide sobre mercadoria líquida do pedido, preservando taxa de entrega;
- configuração por método: habilitado, tipo de desconto (`none|percentage|fixed`), valor, teto opcional e mínimo de pedido;
- configuração persistida em tabela própria, criada por migration, sem misturar dados do Carro Chefe;
- financeiro legado de reconciliação/cancelamento/estorno é preservado.

## Segurança

- PAN/CVV nunca passam pela API CookLily;
- idempotência continua obrigatória;
- valores são calculados server-side;
- provider real e regra de desconto ficam congelados no snapshot do pagamento;
- falha do Mercado Pago após tentativa de criação não cai silenciosamente para Pix manual;
- mudanças administrativas exigem admin + CSRF e geram auditoria;
- pagamentos continuam fechados por padrão via `paymentsEnabled`.

## Pendências

- [ ] migration da configuração por método;
- [ ] motor de regras e cálculo de desconto;
- [ ] provider Mercado Pago para crédito/débito/Pix no novo orquestrador;
- [ ] rotas públicas/admin de escolha de pagamento;
- [ ] frontend de checkout com três escolhas;
- [ ] tela administrativa de configuração;
- [ ] testes backend/frontend estruturais;
- [ ] documentação/ADR atualizado;
- [ ] CI + CodeQL;
- [ ] integração em `cooklily/canonical` somente após gates verdes.
