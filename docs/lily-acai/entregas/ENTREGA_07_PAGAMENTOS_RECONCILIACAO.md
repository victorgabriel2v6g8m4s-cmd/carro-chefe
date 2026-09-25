# Entrega 07 — Pagamento e reconciliação CookLily

## Status

Implementação técnica em validação.

A Entrega 07 parte da linha homologada das Entregas 05/06 e adiciona o domínio financeiro sem misturar credenciais ou dados de cartão ao restante da plataforma.

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

O repositório ainda não possui uma decisão canônica de adquirente/gateway nem credenciais de produção.

Existem referências exploratórias a provedores em documentos de tecnologia, mas nenhuma escolha aprovada para a CookLily.

Por isso esta entrega **não escolhe um fornecedor comercial em nome da operação**.

Foi criado um contrato `LilyPaymentProvider` e o primeiro adaptador é `manual`, com Pix de confirmação operacional.

Isso permite homologar pedido, pagamento, estado, reconciliação, RBAC, UX e contabilidade antes de conectar um gateway automático.

Quando um provedor for aprovado, deve ser adicionado como novo adaptador sem reescrever carrinho, pedido, reconciliação ou telas do cliente.

## Estado inicial seguro

A migration mantém:

- `paymentsEnabled=false`;
- `paymentProvider=manual`;
- `manualPixEnabled=false`;
- instruções Pix vazias.

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
- se existe configuração utilizável;
- métodos disponíveis.

Não expõe chave/instruções Pix publicamente.

### Criar pagamento

`POST /api/v1/lily/payments`

Exige:

- `Idempotency-Key`;
- dono autenticado + CSRF, ou
- token seguro do pedido guest.

### Consultar pagamento

`GET /api/v1/lily/payments/:id`

### Pagamentos de um pedido

`GET /api/v1/lily/orders/:orderId/payments`

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
- inicia Pix somente se habilitado;
- exibe as instruções congeladas;
- permite copiar instruções;
- possui ação “Já paguei · verificar status”;
- consulta automaticamente pagamento pendente;
- reflete aprovação/estorno;
- explica que a CookLily não solicita cartão/CVV.

## Painel financeiro

Nova rota:

`/lilyacai/painel/pagamentos`

### Staff

Acesso de leitura.

### Admin

Pode:

- configurar/habilitar pagamentos;
- configurar Pix manual;
- confirmar entrada;
- cancelar cobrança pendente;
- reconciliar;
- registrar estorno parcial/integral.

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

O frontend do cliente não recebe notas/referências internas da conciliação.

## Nginx

A Entrega 07 adiciona dois allowlists antes do bloqueio genérico `/api/`:

- `location = /api/v1/lily/payments`;
- `location ^~ /api/v1/lily/payments/`.

O deployer valida a presença desses blocos e falha fechado se o Nginx live não estiver atualizado.

O script de deploy não sobrescreve Nginx automaticamente.

## Pendências que permanecem

### Provedor automático

Bloqueado por decisão comercial/técnica de fornecedor e credenciais.

Quando aprovado:

- implementar adapter;
- validar assinatura de webhook;
- mapear estados do provedor;
- deduplicar por `providerEventId`;
- confirmar pagamento somente por evidência autenticada do provedor;
- homologar sandbox antes da produção.

### MFA de staff/admin

Continua recomendado antes de ampliar significativamente a equipe.

Implementação segura exige definir método (TOTP/WebAuthn), provisionamento, recuperação e armazenamento/encriptação dos segredos.

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
- admin confirma e pedido vira paid;
- reconciliação matched/discrepant passa;
- estorno parcial/integral passa;
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
