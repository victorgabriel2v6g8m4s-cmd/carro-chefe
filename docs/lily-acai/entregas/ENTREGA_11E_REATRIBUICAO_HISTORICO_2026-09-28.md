# Entrega 11E — recusa, desistência, reatribuição segura e histórico logístico

**Data:** 28/09/2026  
**Branch de entrega:** `feat/lily-entrega-11e-reatribuicao-historico-guest`  
**Base:** `cooklily/canonical` em `280c637495fcb1e4fda9150bf5a1b9d5e1bd7044`  
**Status:** tecnicamente validada e integrada pelo PR #92. Candidate SHA `ddda7af8648bf9bf69ab80f3ee2224e5a7d6dd77`; CI `36413414854` e CodeQL `36413414990`: success. QA real multiusuário permanece pendente.

## Objetivo

Fechar a principal lacuna de cadeia de custódia da Entrega 11D:

- courier poder recusar uma oferta sem bloquear a fila para os demais;
- courier poder desistir com segurança antes da coleta;
- admin poder devolver à fila ou reatribuir antes da coleta;
- impedir reatribuição automática depois que o código de coleta foi confirmado;
- manter histórico auditável das atribuições, inclusive quando o responsável muda;
- disponibilizar histórico minimizado para courier e admin.

## Invariantes de segurança

1. **Um pedido possui no máximo uma atribuição ativa.**
   A migration cria índice parcial único em `LilyDeliveryAssignment(orderId)` quando `status = 'active'`.

2. **Aceite continua atômico.**
   A atribuição histórica é criada na mesma transação que muda `waiting_courier -> courier_accepted`.

3. **Desistência só existe antes da coleta.**
   Permitida em `courier_accepted` e `courier_arrived_pickup`. A partir de `picked_up`, API retorna conflito e não troca o responsável.

4. **Reatribuição administrativa segue o mesmo bloqueio.**
   O admin pode operar `waiting_courier`, `courier_accepted` e `courier_arrived_pickup`. Depois da coleta, o fluxo automático é fechado para preservar cadeia de custódia.

5. **Concorrência é otimista e fail-closed.**
   Atualizações condicionam `courierUserId`, `deliveryStatus` e `deliveryUpdatedAt`. Se outro ator mudou a entrega, a operação falha com conflito.

6. **Motivos internos não vazam para o cliente.**
   Eventos públicos recebem somente marcadores genéricos como `courier_abandoned` e `admin_reassigned`. Motivo e observação detalhados ficam no vínculo/auditoria administrativa.

7. **Endereço histórico é minimizado.**
   Um courier que deixou de ser responsável vê somente bairro/cidade/UF no histórico; não mantém acesso histórico à rua, número, complemento ou referência.

## Persistência

Novo modelo: `LilyDeliveryAssignment`.

Campos principais:

- `orderId`;
- `courierUserId`;
- `status`: `active | completed | abandoned | reassigned | cancelled`;
- `assignedBy`;
- `assignedAt`;
- `endedAt`;
- `endReason`;
- `endNote`.

A migration também faz backfill das entregas que já tinham `courierUserId` no runtime anterior.

Arquivo:

`packages/lily-database/prisma/migrations/20260928123000_lily_delivery_assignment_history/migration.sql`

## API courier

### Recusar oferta

`POST /api/v1/lily/courier/deliveries/:id/reject`

- exige courier/admin privilegiado, MFA e CSRF;
- aceita motivo controlado e observação opcional;
- só funciona se o pedido continuar pago, liberado e sem responsável;
- registra auditoria;
- a entrega deixa de ser oferecida novamente àquele courier, mas continua disponível aos demais.

### Desistir antes da coleta

`POST /api/v1/lily/courier/deliveries/:id/abandon`

- exige vínculo atual;
- permitido somente antes de `picked_up`;
- encerra a atribuição como `abandoned`;
- limpa `courierUserId`;
- devolve o pedido para `waiting_courier`;
- registra evento e auditoria na mesma operação transacional.

### Histórico

`GET /api/v1/lily/courier/deliveries/history`

Filtros:

- `page`;
- `limit`;
- `status`.

O resultado é baseado no histórico de atribuições, e não apenas no `courierUserId` atual do pedido. Isso mantém visíveis entregas concluídas, abandonadas ou reatribuídas sem reabrir acesso a PII histórica.

## API admin

### Operação atual

`GET /api/v1/lily/admin/deliveries`

Retorna:

- entregas logísticas;
- responsável atual;
- couriers/admins aptos para atribuição.

### Reatribuição

`POST /api/v1/lily/admin/deliveries/:id/reassign`

Com `courierUserId`:

- encerra o vínculo anterior como `reassigned`;
- cria novo vínculo `active`;
- muda a entrega para `courier_accepted`.

Com `courierUserId = null`:

- encerra o vínculo anterior;
- devolve a entrega para `waiting_courier`.

No-op é rejeitado; alvo precisa estar ativo, com papel courier/admin, senha privilegiada atualizada e MFA configurado.

### Histórico

`GET /api/v1/lily/admin/deliveries/history`

Filtros planejados/implementados:

- paginação;
- status do vínculo;
- courier;
- intervalo de `assignedAt`.

Histórico administrativo também usa endereço reduzido.

## Frontend

### Courier — `/lilyacai/entregas`

Adicionado:

- recusa de oferta com motivo;
- desistência controlada antes da coleta;
- histórico das últimas atribuições;
- indicação de concluída, desistência, reatribuída, ativa ou cancelada.

### Admin — `/lilyacai/painel/entregas`

Adicionado:

- visão das entregas atuais;
- responsável atual;
- seleção de novo responsável;
- devolução para fila;
- justificativa;
- bloqueio visual quando a coleta já ocorreu;
- histórico de atribuições.

## Cobertura automatizada adicionada

A suíte `logistics.test.ts` agora cobre, além da 11D:

- recusa não remove a entrega da fila para outro courier;
- courier que recusou não recebe a mesma oferta novamente;
- desistência devolve à fila;
- atribuição abandonada fica no histórico;
- endereço completo não permanece exposto no histórico do ex-responsável;
- desistência após `picked_up` é bloqueada;
- reatribuição admin após `picked_up` é bloqueada;
- reatribuição cria dois vínculos históricos corretos;
- finalização encerra o vínculo como `completed`;
- histórico courier/admin é paginado e vinculado ao responsável correto.

## Validação

Ainda não declarar esta entrega como tecnicamente aprovada até o gate remoto concluir.

Pendente no momento deste documento:

- Prisma validate/generate;
- migration em banco vazio;
- typecheck;
- testes Node 20/24;
- builds;
- Tool Health;
- CodeQL;
- QA real com dois couriers + admin.

## Próxima entrega — 11F

Tracking seguro de pedido guest:

- usar o token opaco já criado no checkout;
- token somente em header/capability local, nunca como query com PII;
- hash no banco e comparação em tempo constante;
- resposta pública minimizada;
- nenhuma exposição de endereço, telefone, notas internas, ator ou justificativas;
- código de entrega só quando a etapa logística permitir;
- rate limit, `Cache-Control: no-store` e resposta uniforme contra enumeração;
- página de acompanhamento guest com polling.

Depois da 11F, a ordem do roadmap é:

1. 11G — ETA/mapas;
2. 11H — WhatsApp por etapa;
3. 11I — conciliação automática do Pix próprio.
