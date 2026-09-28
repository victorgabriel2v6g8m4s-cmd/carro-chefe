# Entrega 11D — logística e painel do entregador

**Data:** 28/09/2026  
**Runtime tecnicamente validado:** `0941ede6142c3e63fe90ff1d0b1dcbb7b5651322`  
**CI:** `36409871119` — success  
**CodeQL:** `36409871166` — success  
**Gate PR:** #91, fechado sem merge em `main`.

## Resultado

A CookLily agora possui três domínios separados para um pedido:

1. **financeiro** — pagamento e reconciliação;
2. **produção** — cozinha e preparação;
3. **logística** — aceite, coleta, rota e entrega.

A logística só começa quando o pedido:

- é de entrega;
- possui pagamento confirmado;
- foi avançado pela cozinha até `ready_for_dispatch`.

Nesse momento o pedido entra em `waiting_courier`.

## Estados logísticos

```text
not_ready
  -> waiting_courier
  -> courier_accepted
  -> courier_arrived_pickup
  -> picked_up
  -> left_pickup
  -> courier_arrived_delivery
  -> delivered
  -> left_delivery
```

Também existe `cancelled` para evolução posterior de cancelamento/reatribuição.

Cada transição é persistida em `LilyOrderDeliveryEvent`.

## Papel courier

Foi criado o papel `courier`, separado de customer, staff e admin.

Requisitos:

- conta CookLily existente;
- promoção por admin ou helper operacional;
- troca para senha privilegiada;
- MFA TOTP;
- segundo fator confirmado em cada nova sessão;
- CSRF em mutações.

Courier não recebe acesso ao catálogo administrativo, equipe ou painel financeiro.

## Privacidade

Antes do aceite, a fila do entregador recebe somente região suficiente para decidir a entrega:

- bairro;
- cidade;
- UF.

Rua, número, complemento e referência só aparecem depois que aquele courier aceita a entrega.

Telefone do cliente não faz parte da API do entregador nesta versão.

## Aceite atômico

O aceite usa atualização condicional no banco:

- pedido ainda precisa estar em `waiting_courier`;
- `courierUserId` precisa estar vazio;
- pedido precisa continuar pago e pronto para despacho.

Se dois entregadores tentarem aceitar simultaneamente, somente um consegue; o segundo recebe conflito.

## Códigos de segurança

### Coleta

A cozinha recebe um código de seis dígitos quando o pedido de entrega está pronto.

O entregador:

1. marca “Cheguei na coleta”;
2. recebe o código presencialmente;
3. precisa confirmá-lo para marcar “Pegar o pedido”.

### Entrega

O cliente autenticado recebe seu código de entrega quando o pedido já saiu da coleta/está chegando.

O entregador:

1. marca “Cheguei no local de entrega”;
2. recebe o código do cliente;
3. precisa confirmá-lo para marcar “Entreguei o pedido”.

### Armazenamento

Os códigos não são gravados em plaintext no banco.

Eles são derivados por HMAC de:

- ID do pedido;
- finalidade (`pickup` ou `delivery`);
- segredo de produção `COOKLILY_LOGISTICS_CODE_KEY`.

O segredo:

- deve conter 32 bytes aleatórios em base64url;
- fica somente na VPS;
- é independente da chave MFA;
- precisa permanecer estável durante pedidos em andamento.

Tentativas inválidas:

- são limitadas por rate limit;
- geram auditoria;
- não registram o código informado.

## Backend

Principais arquivos:

- `apps/api/src/modules/lily/logistics.ts`;
- `apps/api/src/modules/lily/logistics-codes.ts`;
- `apps/api/src/modules/lily/operations.ts`;
- `apps/api/src/modules/lily/orders.ts`;
- `apps/api/src/modules/lily/admin-security.ts`;
- `apps/api/src/modules/lily/team.ts`.

Endpoints:

```text
GET  /api/v1/lily/courier/deliveries
POST /api/v1/lily/courier/deliveries/:id/accept
POST /api/v1/lily/courier/deliveries/:id/transition
```

## Frontend

Painel mobile:

`/lilyacai/entregas`

Fluxo disponível:

- Aceitar entrega;
- Cheguei na coleta;
- Pegar o pedido — exige código;
- Saí do local de coleta;
- Cheguei no local de entrega;
- Entreguei o pedido — exige código;
- Saí do local de entrega.

A página atualiza a cada 5 segundos.

O detalhe do pedido do cliente continua atualizando a cada 10 segundos e agora agrega eventos financeiros, da cozinha e da entrega.

## Cozinha

Ao avançar o pedido para pronto para despacho:

- a cozinha mantém seu estado em `ready_for_dispatch`;
- a logística passa atomicamente para `waiting_courier`;
- um evento logístico é criado;
- o código de coleta fica disponível à cozinha quando o segredo está configurado.

## Banco/migration

Migration:

`packages/lily-database/prisma/migrations/20260928101000_lily_delivery_flow/migration.sql`

Adiciona ao pedido:

- `deliveryStatus`;
- `deliveryUpdatedAt`;
- `courierUserId`.

E cria:

- `LilyOrderDeliveryEvent`;
- índices de fila/entregador/eventos;
- backfill seguro para pedidos de entrega existentes.

## Nginx e deploy

Novo namespace:

`/api/v1/lily/courier/*`

Helper idempotente:

`deploy/scripts/enable-lily-entrega11-nginx`

O deployer agora falha antes de migration real se:

- a rota courier não estiver liberada no Nginx;
- `COOKLILY_LOGISTICS_CODE_KEY` estiver ausente;
- a chave não possuir exatamente 32 bytes após base64url decode.

Runbook completo:

`docs/lily-acai/DEPLOY_VPS.md`

## Evidência de validação

Node 20:

- 31 arquivos de teste aprovados;
- 172 testes aprovados;
- `logistics.test.ts`: 4/4;
- `team.test.ts`: 4/4;
- `operations.test.ts`: 4/4;
- `structure.test.ts`: 13/13;
- `deploy-scripts.test.ts`: 6/6;
- static checks: success;
- production builds: success.

Node 24:

- 31 arquivos de teste aprovados;
- 172 testes aprovados;
- mesmas suítes críticas verdes;
- static checks: success;
- production builds: success.

Também verdes:

- Tool Health;
- Workbook Snapshot;
- Excel Recipe Linux;
- Excel Recipe Windows;
- Windows Supervisor;
- CodeQL.

## Pendências da próxima tranche

- QA real com cozinha + cliente + dois couriers simultâneos;
- cancelamento/retorno à fila;
- desistência e reatribuição de courier;
- histórico de entregas finalizadas;
- guest tracking;
- ETA/mapa/rotas;
- WhatsApp/notificações por etapa;
- conciliação bancária automática do Pix próprio.

Nenhuma dessas pendências bloqueia a integridade técnica do fluxo básico validado; elas bloqueiam níveis posteriores de operação/experiência e precisam de homologação antes da abertura comercial correspondente.
