# Entrega 07 — Pagamento e reconciliação CookLily

## Status

**Implementação técnica aprovada; deploy e homologação operacional pendentes.**

A Entrega 07 parte da linha homologada das Entregas 05/06 e adiciona o domínio financeiro sem misturar credenciais ou dados de cartão ao restante da plataforma.

### Gate v1

O gate `gate/lily-entrega-07-v1` não aprovou a entrega:

- CodeQL: **success**;
- Quality / Node 20: **failure** em static checks;
- Quality / Node 24: **failure** em static checks;
- Tool Health / Linux: **failure** no check `app-api`;
- demais jobs auxiliares observados: success.

Causa raiz confirmada no log:

`apps/api/src/modules/lily/orders.ts` passava `serializeOrder` diretamente para `orders.map`. Como o serializer possui segundo parâmetro opcional `guestAccessToken`, o TypeScript interpretava o índice numérico fornecido por `Array.map` como esse segundo argumento e rejeitava a assinatura.

Correção aplicada na branch canônica `cooklily/canonical`:

```ts
orders.map((order) => serializeOrder(order))
```

O Tool Health falhou em cascata porque o check `app-api` executa o mesmo TypeScript. Não foi identificada, naquele gate, uma falha independente do domínio de pagamentos no Tool Health.

A correção foi revalidada com sucesso no runtime SHA `4b111c2e26b234d83111a58a9b20ef34f773a97a`:

- CI run `36330633129`: **success**;
- CodeQL run `36330633098`: **success**;
- Node 20: 25 arquivos / **122 testes** — success;
- Node 24: 25 arquivos / **122 testes** — success;
- builds de produção — success;
- Tool Health / Linux — success;
- Workbook Snapshot — success;
- Excel Recipe Linux/Windows — success;
- Windows Supervisor — success.

Commits posteriores ao SHA acima, até esta atualização, alteram somente documentação e não o runtime validado.

## Objetivo

Transformar o pedido `awaiting_payment` da Entrega 06 em um fluxo financeiro auditável:

1. pedido é criado com preço/configuração recalculados pelo servidor;
2. cliente segue para a etapa de pagamento;
3. pagamento é criado de forma idempotente;
4. o pagamento nasce pendente;
5. somente uma confirmação financeira autorizada move o pagamento para aprovado;
6. o pedido muda para `paid` na mesma operação transacional;
7. reconciliação registra bruto, taxa, líquido e eventual divergência;
8. estornos parciais/totais permanecem auditáveis.

## Decisão de provedor

A decisão atual é manter **o domínio financeiro próprio da CookLily** e usar processadores externos por adapters.

Contrato:

`LilyPaymentProvider`

Adapters atuais:

- `manual`: Pix com confirmação operacional, preservado como fallback;
- `mercado_pago`: Checkout Transparente / Orders API para Pix automático e cartão tokenizado.

Mercado Pago é o primeiro provider automático por decisão técnica desta rodada, mas o sistema não fica acoplado a ele: pedido, pagamento, reconciliação, eventos, RBAC, painel e UX continuam independentes do fornecedor.

O levantamento comercial e técnico está em:

`../PAGAMENTOS_GATEWAY_2026-09-27.md`

Credenciais reais continuam fora do Git e a conta do processador precisa ser criada/homologada pelo proprietário.

## Estado inicial seguro

A migration mantém:

- `paymentsEnabled=false`;
- `paymentProvider=manual`;
- `manualPixEnabled=false`;
- instruções Pix vazias;
- `mercadoPagoPixEnabled=false`;
- `mercadoPagoCardEnabled=false`.

A migration adicional `20260927221000_lily_mercado_pago_gateway` preserva esses defaults fail-closed.

Portanto, publicar a migration **não abre cobrança**.

Um admin precisa configurar e habilitar o meio de pagamento conscientemente.

## Banco de dados

Migration:

`20260926120000_lily_payments`

### LilyPayment

Representa uma tentativa/cobrança de pagamento.

Campos relevantes:

- pedido;
- chave de idempotência única;
- provedor;
- método;
- estado;
- valor e moeda;
- identificadores/referências do provedor;
- snapshot das instruções;
- datas de aprovação/falha/cancelamento/estorno;
- total já estornado.

### LilyPaymentEvent

Ledger de transições do pagamento.

Armazena:

- origem do evento;
- tipo;
- estado anterior/seguinte;
- ID externo de evento quando houver;
- hash/payload limitado quando necessário.

O desenho já suporta deduplicação futura de webhook por `providerEventId`.

### LilyPaymentReconciliation

Registra a conciliação financeira:

- bruto esperado;
- bruto reportado;
- taxa;
- líquido;
- divergência;
- status `matched` ou `discrepant`;
- referência financeira;
- responsável pela reconciliação.

### Acesso guest

Pedidos sem conta recebem um token aleatório de alta entropia.

Somente o SHA-256 do token é persistido em `guestAccessTokenHash`.

O token bruto é retornado apenas ao navegador que criou/reabriu idempotentemente o pedido e é guardado no `sessionStorage` pelo frontend.

O `orderId` sozinho não concede acesso ao pagamento guest.

## Métodos atuais

### Pix automático — Mercado Pago

Método: `pix`.

Fluxo:

1. cliente informa o e-mail exigido pelo processador;
2. backend cria uma Order com `X-Idempotency-Key`;
3. provider retorna QR Code/Copia e Cola;
4. navegador exibe somente dados públicos da cobrança;
5. webhook assinado informa atualização;
6. backend valida HMAC e consulta novamente a Order diretamente no provider;
7. somente valor aprovado igual ao total esperado move o pedido para `paid`.

### Cartão de crédito — Mercado Pago

Método: `credit_card`.

O frontend usa o Card Payment Brick do Mercado Pago. PAN/CVV são capturados/tokenizados pelo processador e não passam pela API CookLily.

A API recebe apenas token descartável, método, parcelas e dados mínimos do pagador necessários à cobrança.

### Pix manual

Método: `manual_pix`.

Fluxo:

1. admin cadastra as instruções Pix;
2. cliente cria a cobrança;
3. o snapshot das instruções é congelado naquele pagamento;
4. cliente efetua o Pix fora da aplicação;
5. cliente pode consultar/verificar o status;
6. admin confere a entrada no extrato;
7. admin informa referência, bruto, taxa e líquido;
8. backend aprova pagamento, reconcilia e marca pedido como pago em transação.

O botão do cliente **não aprova pagamento**.

## API do cliente

### Configuração pública

`GET /api/v1/lily/public/payments/config`

Informa somente:

- pagamentos habilitados;
- provider selecionado;
- se existe configuração utilizável;
- métodos disponíveis;
- Public Key quando o provider selecionado for Mercado Pago.

Nunca expõe Access Token ou Webhook Secret.

### Criar pagamento

`POST /api/v1/lily/payments`

Exige:

- `Idempotency-Key`;
- dono autenticado + CSRF, ou
- token seguro do pedido guest.

### Consultar pagamento

`GET /api/v1/lily/payments/:id`

### Contexto mínimo de pagamento

`GET /api/v1/lily/orders/:orderId/payment-context`

Retorna somente número do pedido, estado, valor e moeda para montar o checkout sem expor itens/endereço de um pedido guest.

### Pagamentos de um pedido

`GET /api/v1/lily/orders/:orderId/payments`

### Webhook Mercado Pago

`POST /api/v1/lily/payments/webhooks/mercado-pago`

Exige assinatura válida e usa `data.id` somente como ponte para refetch autoritativo no provider.

O contrato do cliente não expõe:

- referência bancária interna;
- taxas da reconciliação;
- líquido financeiro;
- notas administrativas;
- origem interna dos eventos.

## API financeira administrativa

Leitura de pagamentos é permitida para `staff/admin`.

Mutações financeiras são `admin-only`.

Rotas:

- `GET /api/v1/lily/admin/payments/settings`;
- `PATCH /api/v1/lily/admin/payments/settings`;
- `GET /api/v1/lily/admin/payments`;
- `POST /api/v1/lily/admin/payments/:id/confirm`;
- `POST /api/v1/lily/admin/payments/:id/cancel`;
- `POST /api/v1/lily/admin/payments/:id/reconcile`;
- `POST /api/v1/lily/admin/payments/:id/refund`.

Toda mutação financeira exige:

- sessão privilegiada;
- papel `admin`;
- CSRF;
- auditoria.

## Estados

### Pagamento

Estados usados nesta entrega:

- `pending`;
- `approved`;
- `cancelled`;
- `partially_refunded`;
- `refunded`.

### Pedido

Integração principal:

- `awaiting_payment -> paid` na confirmação;
- `paid -> refunded` quando o estorno torna-se integral.

Estorno parcial mantém o pedido em `paid` e registra o saldo estornado no pagamento.

## Idempotência

Criação de pagamento exige uma chave independente da idempotência do pedido.

Repetir a mesma chave para o mesmo pagamento devolve a tentativa existente.

Reutilizar a chave com conteúdo incompatível retorna conflito.

Também é reutilizada uma cobrança ativa do mesmo pedido/método para evitar duplicação acidental.

## Frontend do cliente

Nova rota:

`/lilyacai/pagamento/:orderId`

O checkout redireciona para ela após criar o pedido.

A tela:

- mostra estado do pagamento;
- permite escolher Pix/cartão conforme configuração;
- gera e exibe QR Code/Copia e Cola no Pix automático;
- preserva Pix manual como fallback;
- monta o Card Payment Brick oficial para tokenização;
- consulta automaticamente pagamento pendente;
- reflete aprovação, cancelamento e estorno;
- permite nova tentativa depois de falha/cancelamento;
- explica que número do cartão e CVV são tokenizados pelo processador e não passam pela API CookLily.

## Painel financeiro

Nova rota:

`/lilyacai/painel/pagamentos`

### Staff

Acesso de leitura.

### Admin

Pode:

- escolher provider manual ou Mercado Pago;
- visualizar apenas o estado de presença das credenciais da VPS, nunca seus valores;
- habilitar Pix/cartão separadamente;
- configurar Pix manual como fallback;
- confirmar entrada somente no provider manual;
- cancelar cobrança pendente (via provider quando automático);
- reconciliar;
- solicitar estorno parcial/integral ao provider automático ou registrar referência no modo manual.

KPIs:

- pendentes;
- saldo pago após estornos;
- divergências.

## RBAC e equipe — pendências absorvidas nesta entrega

A Entrega 07 também corrige dívidas registradas durante a homologação 05/06.

### Separação staff/admin

Antes, `staff` e `admin` tinham essencialmente o mesmo poder.

Agora:

- `staff`: catálogo/operação e leitura financeira;
- `admin`: gestão de equipe e mutações financeiras.

### Gestão de equipe pelo painel

Nova rota:

`/lilyacai/painel/equipe`

Admin pode:

- promover conta existente para staff/admin;
- alterar papel;
- suspender/reativar;
- consultar sessões ativas.

Proteções:

- conta precisa existir;
- admin não remove o próprio acesso na sessão atual;
- o sistema preserva ao menos um admin ativo;
- suspensão/demissão para customer revoga sessões.

A CLI `lily-promote-user` permanece como contingência operacional da VPS.

### Upgrade obrigatório de senha

Promoção para papel privilegiado:

- marca `staffPasswordUpgradeRequired=true`;
- revoga sessões antigas;
- exige novo login;
- bloqueia funções administrativas até troca de senha;
- nova senha staff/admin exige 12–128 caracteres;
- troca bem-sucedida libera o acesso.

### TTL privilegiado

- customer: sessão de até 30 dias;
- staff/admin: sessão de até 12 horas.

## Segurança

A aplicação não armazena:

- número de cartão;
- CVV;
- dados de tarja;
- senha bancária.

Pix manual usa apenas instruções operacionais configuradas pela equipe e referência financeira informada pelo admin após conferência.

No Mercado Pago:

- Access Token e Webhook Secret permanecem exclusivamente no backend/VPS;
- somente Public Key pode ir ao navegador;
- webhook exige HMAC;
- o body do webhook não é tratado como verdade financeira: o backend refaz a consulta ao provider;
- aprovação automática exige valor exato;
- confirmação manual de cobrança automática é bloqueada.

O frontend do cliente não recebe notas/referências internas da conciliação.

## Nginx

A Entrega 07 adiciona dois allowlists antes do bloqueio genérico `/api/`:

- `location = /api/v1/lily/payments`;
- `location ^~ /api/v1/lily/payments/`.

O deployer valida a presença desses blocos e falha fechado se o Nginx live não estiver atualizado.

O script de deploy não sobrescreve Nginx automaticamente.

## Pendências que permanecem

O backlog de UX, segurança e administração levantado em 27/09/2026 está consolidado em `../PENDENCIAS_UX_SEGURANCA_2026-09-27.md`. Os P0 devem ser tratados/revalidados antes de declarar prontidão comercial.

### Homologação comercial do provider

O adapter Mercado Pago está implementado tecnicamente. Continua pendente somente o que depende da conta real do estabelecimento:

- criação/aprovação da conta;
- aplicação em Mercado Pago Developers;
- Public Key e Access Token produtivos;
- chave Pix;
- configuração do webhook de Orders;
- Webhook Secret;
- teste controlado;
- conferência das taxas contratuais;
- ativação explícita no painel.

Detalhes: `../PAGAMENTOS_GATEWAY_2026-09-27.md` e `../DEPLOY_VPS.md`.

### MFA de staff/admin

MFA TOTP para staff/admin já foi implementado em etapa posterior, com segredo cifrado, recovery codes de uso único e segundo fator por nova sessão privilegiada. A homologação real de contas privilegiadas continua necessária no deploy.

### Recuperação de senha

Continua bloqueada por ausência de canal de verificação aprovado.

Não será implementado “esqueci minha senha” inseguro baseado apenas no telefone informado.

## Critérios de aceite

A Entrega 07 só pode ser considerada tecnicamente aprovada quando:

- migration passa em SQLite limpo;
- pagamentos permanecem disabled após migration;
- payment idempotency passa;
- guest token é obrigatório;
- customer só acessa os próprios pagamentos;
- staff não confirma/refunda;
- admin confirma manualmente apenas provider manual;
- webhook assinado de provider automático é validado e deduplicado;
- provider automático não aceita aprovação forçada pelo painel;
- valor aprovado divergente não paga pedido;
- cartão usa token do Brick sem PAN/CVV no backend;
- reconciliação matched/discrepant passa;
- estorno parcial/integral passa no provider e no estado local;
- dados internos financeiros não vazam ao cliente;
- promoção de equipe exige upgrade de senha;
- sessão privilegiada tem TTL reduzido;
- CI Node 20/24, build e CodeQL passam.

## Deploy

A Entrega 07 **não deve ser publicada** até:

1. Nginx live receber os allowlists de pagamento;
2. `nginx -t` passar;
3. SHA imutável passar pelo gate técnico;
4. migration ser incluída no backup/deploy automatizado.

Mesmo após deploy, pagamentos continuarão fechados até um admin habilitá-los no painel.

Para Mercado Pago, a habilitação também falha fechada se as credenciais necessárias não estiverem presentes na VPS. O runbook `../DEPLOY_VPS.md` contém a sequência de homologação e o webhook produtivo.
