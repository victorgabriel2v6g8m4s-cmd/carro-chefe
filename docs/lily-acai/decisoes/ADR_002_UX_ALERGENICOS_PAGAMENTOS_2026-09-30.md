# ADR-002 — apresentação de alergênicos e escolha de pagamento

## Registro de autoria

- **Data da decisão:** 30/09/2026
- **Hora registrada no contexto da decisão:** 16:50
- **Fuso:** UTC-03:00
- **Decidido por:** **Humano — proprietário**
- **Origem:** instrução direta do proprietário no projeto Carro Chefe/CookLily
- **Status:** APROVADO
- **Escopo:** CookLily
- **Relação:** complementa o ADR-001 e altera requisitos de apresentação/pagamento sem reabrir o cardápio inicial.

A hora acima é preservada porque estava disponível no contexto da mensagem que formalizou estas decisões. Não deve ser retroativamente atribuída às decisões do ADR-001, cujo PDF registra a data de fechamento, mas não registra horário.

---

## DEC-CL-101 — alergênicos em sanfona fechada por padrão

### Decisão

As informações de alergênicos devem aparecer em uma **sanfona/accordion fechada por padrão**.

No estado fechado:

- o controle/acionador “Alergênicos” pode permanecer visível;
- o conteúdo de CONTÉM, PODE CONTER, revisão incompleta e orientação de segurança fica oculto;
- **o aviso textual de alergênicos só aparece depois que o cliente abre a sanfona**;
- não abrir automaticamente por hover, foco, entrada na página ou mudança de configuração.

Ao clicar/acionar:

- expandir o resumo autoritativo da configuração escolhida;
- mostrar CONTÉM e PODE CONTER;
- quando houver componente não revisado, mostrar o aviso de informação em revisão;
- manter a orientação de confirmar ingredientes e contato cruzado com a equipe;
- preservar a informação histórica congelada no pedido onde a Entrega 12 já usa snapshot.

### Acessibilidade

A implementação deve usar um controle acessível por teclado, com estado expandido/fechado anunciado por tecnologia assistiva (`aria-expanded` ou equivalente semântico). O conteúdo oculto não deve permanecer visualmente exposto.

### Relação com a Entrega 12

A Entrega 12 continua válida para:

- taxonomia;
- revisão de produto/sabor/adicional;
- agregação server-side;
- snapshot histórico;
- cozinha;
- pedido autenticado/guest;
- regras de segurança.

Esta decisão **substitui somente a apresentação aberta por padrão no cliente**.

### Estado de implementação auditado em 30/09/2026

**PENDENTE DE IMPLEMENTAÇÃO.**

O componente atual `AllergenNotice.tsx` renderiza o aviso diretamente quando existe um resumo e não possui sanfona fechada por padrão. Portanto, a decisão está aprovada, mas não pode ser marcada como implementada até o frontend e seus testes serem atualizados.

---

## DEC-CL-102 — métodos de pagamento escolhidos pelo cliente

### Decisão

No checkout CookLily, o cliente deve poder escolher entre:

1. **Pix CookLily próprio**
   - BR Code/Pix Copia e Cola gerado automaticamente pelo backend;
   - valor e `txid` vinculados ao pagamento;
   - sem gateway para gerar a cobrança;
   - conciliação automática quando o adapter bancário real estiver homologado, preservando fallback operacional seguro.

2. **Cartão de crédito via Mercado Pago**
   - tokenização pelo SDK/Brick oficial;
   - dados brutos do cartão não passam pelos servidores CookLily.

3. **Cartão de débito via Mercado Pago**
   - tokenização pelo SDK/Brick oficial;
   - tratamento como método próprio no domínio e na interface;
   - sem armazenar PAN/CVV.

O **cliente escolhe explicitamente** o método desejado antes de iniciar o pagamento.

### Arquitetura alvo

A seleção pública não deve depender de um único `paymentProvider` global mutuamente exclusivo. O roteamento deve acontecer por método:

```text
Checkout
├── pix          -> cooklily_pix
├── credit_card  -> mercado_pago
└── debit_card   -> mercado_pago
```

Mercado Pago Pix não faz parte da seleção pública aprovada por esta decisão. A capacidade pode permanecer internamente para homologação/compatibilidade enquanto não confundir o fluxo público.

Pix manual pode permanecer como contingência administrativa, não como opção principal do cliente.

### Estado de implementação auditado em 30/09/2026

**PARCIAL / REQUER REFATORAÇÃO.**

Já existe:

- provider `cooklily_pix` com BR Code, valor e `txid`;
- Mercado Pago com cartão de crédito tokenizado;
- tela capaz de apresentar mais de um método retornado pela configuração;
- reconciliação Pix automática tecnicamente integrada.

Ainda não corresponde à decisão porque:

- o domínio aceita `manual_pix | pix | credit_card`, sem `debit_card`;
- o Card Payment Brick atual exclui explicitamente `debit_card`;
- a configuração atual escolhe um `paymentProvider` global por vez, impedindo publicar simultaneamente Pix próprio e cartão Mercado Pago;
- a configuração Mercado Pago ainda inclui Pix próprio do Mercado Pago como possibilidade, que deixa de ser método público necessário pelo ADR-002.

### Critério de pronto

Esta decisão só pode ser marcada como implementada quando:

- `debit_card` existir no contrato frontend/backend;
- o Mercado Pago aceitar débito no fluxo homologado;
- Pix público for gerado pelo `cooklily_pix`;
- cartões crédito/débito forem roteados ao Mercado Pago;
- os três métodos puderem coexistir no mesmo checkout;
- o cliente puder alternar a escolha antes de criar o pagamento;
- idempotência continuar separada por pedido + método;
- testes cobrirem roteamento, valor, segurança e troca de método;
- deploy e homologação real confirmarem o comportamento.
