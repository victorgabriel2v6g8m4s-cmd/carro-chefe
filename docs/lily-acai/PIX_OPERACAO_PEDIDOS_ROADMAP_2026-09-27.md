# CookLily — Pix próprio e operação ponta a ponta

**Data:** 27/09/2026  
**Status:** plano ativo de implementação incremental.

## Objetivo

Evoluir a CookLily de catálogo/checkout para uma operação ponta a ponta com:

- Pix próprio CookLily sem taxa de gateway;
- acompanhamento do pedido pelo cliente;
- painel da cozinha;
- fila operacional;
- entregadores;
- códigos de coleta e entrega;
- eventos auditáveis;
- possibilidade de integrar APIs externas baratas/gratuitas sem acoplar o domínio a um fornecedor.

## Princípio do Pix próprio

A CookLily pode gerar internamente um **QR Code Pix estático / Pix Copia e Cola** conforme BR Code, com:

- chave Pix válida;
- valor;
- `txid`;
- nome do recebedor;
- cidade;
- CRC16.

Isso não precisa de gateway para criar a cobrança.

**Importante:** “sem taxa” significa **sem taxa de gateway CookLily**. A instituição financeira recebedora pode cobrar tarifa de recebimento Pix em conta PJ.

O Banco Central documenta QR Pix estático contendo todos os dados necessários no próprio QR, incluindo chave, valor opcional e `txid`.

## Arquitetura proposta

```text
Cliente
  |
  +-- Checkout CookLily
        |
        +-- PaymentProvider
             |
             +-- cooklily_pix   <- BR Code gerado internamente
             +-- mercado_pago
             +-- manual
             +-- futuros bancos/PSPs
```

### Provider `cooklily_pix`

Responsabilidades:

- gerar `txid` único por pagamento;
- gerar payload BR Code;
- devolver Pix Copia e Cola;
- persistir snapshot;
- manter pagamento `pending`;
- confirmação manual no primeiro estágio;
- futuramente sincronizar automaticamente via API bancária/extrato.

O QR/payload não deve depender de serviço externo.

## Conciliação automática futura

Para automatizar confirmação sem Mercado Pago, precisamos de uma fonte autoritativa de recebimentos:

1. API Pix do banco recebedor;
2. webhook do PSP/banco;
3. API de extrato/conta;
4. Open Finance, quando houver produto adequado.

A API interna CookLily permanece igual; somente o adapter de conciliação muda.

### Pesquisa inicial

O Sicoob publica APIs empresariais, incluindo Pix Recebimentos, mas a tarifa transacional depende da cooperativa/pacote. A tabela 2026 localizada publica exemplos de cobrança por recebimento via API Pix, então não deve ser tratada como “zero taxa” garantida.

Decisão atual:

- **geração Pix própria primeiro**;
- integração bancária automática depois de sabermos qual conta PJ receberá o Pix e sua tabela real.

## Separação de estados

Não usar um único campo para tudo.

### Financeiro

`LilyPayment.status`

- pending
- approved
- failed
- cancelled
- partially_refunded
- refunded

### Produção / cozinha

Novo estado operacional:

- received
- waiting_payment
- preparing
- ready_for_dispatch
- cancelled

### Entrega

Novo estado logístico:

- waiting_courier
- courier_accepted
- courier_arrived_pickup
- picked_up
- left_pickup
- courier_arrived_delivery
- delivered
- left_delivery

Para retirada no balcão, o fluxo logístico pode ser mais curto.

## Eventos

Toda mudança deve registrar:

- pedido;
- estado anterior;
- estado novo;
- ator;
- data/hora;
- origem;
- metadados mínimos.

A tela do cliente usa esses eventos para montar a linha do tempo.

## Códigos de segurança

### Código de coleta

- gerado por pedido de entrega;
- visível para cozinha/staff;
- informado ao entregador apenas no local;
- entregador precisa confirmar o código para marcar `picked_up`;
- armazenar somente hash quando possível.

### Código de entrega

- gerado por pedido;
- visível ao cliente;
- entregador precisa informar para marcar `delivered`;
- armazenar hash;
- limitar tentativas;
- auditar falhas.

## Painel do cliente

Entrega incremental:

### Fase C1
- status atual;
- linha do tempo;
- pagamento;
- retirada/entrega;
- horário dos eventos.

### Fase C2
- entregador aceitou;
- chegou na coleta;
- saiu para entrega;
- chegou ao endereço;
- entregue;
- código de entrega.

### Fase C3
- ETA;
- mapa/localização opcional;
- notificações WhatsApp/push.

## Painel da cozinha

### Fase K1
Fila em colunas:

- recebido;
- aguardando pagamento;
- montar pedido;
- pronto/despachar.

Ações:

- assumir pedido;
- avançar etapa;
- voltar etapa somente com justificativa/admin;
- destacar atraso;
- detalhes dos itens;
- observações;
- impressão futura.

### Fase K2
- capacidade;
- tempo médio;
- alertas;
- SLA;
- prioridade;
- pedidos atrasados.

## Painel do entregador

### Fase D1
- entregas disponíveis;
- aceitar entrega;
- cheguei na coleta;
- confirmar código e pegar pedido;
- saí da coleta;
- cheguei ao destino;
- confirmar código e entregar;
- saí do destino.

### Fase D2
- geolocalização opcional;
- rota;
- ETA;
- contato mascarado;
- prova operacional;
- histórico de entregas.

## Perfis e permissões

Papéis futuros:

- customer;
- staff;
- kitchen;
- courier;
- admin.

Até a migração de papéis estar pronta, cozinha pode operar com `staff`.

O papel `courier` deve ter acesso mínimo:

- somente entregas disponíveis/aceitas;
- endereço apenas quando necessário;
- telefone mascarado quando possível;
- sem acesso ao painel financeiro;
- sem acesso ao catálogo/admin.

## Roadmap de implementação

### Fase 11A — documentação e Pix próprio
- [x] consolidar estado atual;
- [x] definir arquitetura;
- [ ] implementar gerador BR Code;
- [ ] adicionar provider `cooklily_pix`;
- [ ] configuração fail-closed;
- [ ] testes oficiais de payload/CRC;
- [ ] integrar tela de pagamento;
- [ ] integrar painel financeiro;
- [ ] homologar com uma chave Pix real.

### Fase 11B — domínio operacional
- [ ] adicionar estágio operacional;
- [ ] adicionar eventos operacionais;
- [ ] APIs de fila;
- [ ] regras de transição;
- [ ] impedir preparação antes do pagamento, salvo override explícito;
- [ ] painel inicial da cozinha.

### Fase 11C — acompanhamento do cliente
- [ ] timeline;
- [ ] polling/SSE;
- [ ] código de entrega;
- [ ] histórico legível;
- [ ] mensagens por etapa.

### Fase 11D — logística
- [ ] papel courier;
- [ ] fila de entregas;
- [ ] aceite atômico;
- [ ] código de coleta;
- [ ] código de entrega;
- [ ] painel mobile entregador;
- [ ] auditoria.

### Fase 11E — automações
- [ ] webhook/integração bancária para conciliar CookLily Pix;
- [ ] WhatsApp;
- [ ] ETA;
- [ ] alertas de atraso;
- [ ] métricas.

## APIs externas candidatas

Prioridade:

1. gratuitas;
2. taxa fixa baixa;
3. open source/self-hosted;
4. baixo lock-in.

Possíveis usos:

- CEP/endereço;
- mapas/rotas;
- WhatsApp;
- conciliação bancária;
- observabilidade.

Nenhuma API externa poderá ser tratada como fonte de verdade financeira sem validação adequada.

## Critérios de segurança

- sem PAN/CVV;
- sem segredo no frontend;
- códigos armazenados como hash;
- RBAC;
- CSRF;
- MFA para funções privilegiadas;
- idempotência;
- rate limits;
- eventos imutáveis;
- auditoria;
- fail-closed;
- não expor PII desnecessária ao entregador.

## Critério para “pronto”

Cada subfase só é considerada pronta quando:

- código;
- testes;
- documentação;
- CI;
- CodeQL;
- migração;
- runbook;
- QA real correspondente.
