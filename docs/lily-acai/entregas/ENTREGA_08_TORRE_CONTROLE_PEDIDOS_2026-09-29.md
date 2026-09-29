# Entrega 08 — torre de controle operacional de pedidos

**Data:** 29/09/2026  
**Branch:** `feat/lily-entrega-08-torre-controle-pedidos`  
**Base:** `cooklily/canonical` em `e05582931bf28f69292ce353ae6996414f8b259d`

## Objetivo

Fechar a Entrega 08 como painel de pedidos operacional sem duplicar os motores de estado já separados entre pagamentos, cozinha e logística.

A solução funciona como uma torre de controle: consolida o estado real de cada domínio, destaca situações objetivas que exigem atenção e envia a equipe para a tela responsável pela ação.

## Implementação

### Backend

Novo módulo:

`apps/api/src/modules/lily/order-operations.ts`

Rotas:

- `GET /api/v1/lily/admin/orders/overview`
- `POST /api/v1/lily/admin/orders/:id/complete-pickup`

O overview é restrito a staff/admin com MFA e não expõe telefone, endereço, códigos logísticos ou outros dados pessoais desnecessários.

Filtros:

- ativos;
- atenção;
- concluídos;
- cancelados;
- todos;
- modalidade retirada/entrega;
- busca por número do pedido.

Resumo operacional:

- pedidos visíveis;
- pedidos com atenção;
- aguardando pagamento;
- em preparo;
- prontos;
- em logística;
- concluídos.

Alertas objetivos:

- pedido pago ainda parado em `received/waiting_payment`;
- SLA de preparo vencido;
- produção avançada sem pagamento confirmado;
- entrega pronta cuja fila logística não foi aberta.

Nenhum tempo arbitrário foi inventado para marcar entrega “parada”; o único tempo operacional usado é o SLA de cozinha explicitamente configurável.

### Retirada presencial

Foi fechada uma lacuna anterior: pedidos de retirada ficavam em `ready_for_dispatch` sem uma conclusão auditável.

A nova ação exige simultaneamente:

- perfil staff/admin;
- MFA válido;
- CSRF;
- `fulfillmentType=pickup`;
- `status=paid`;
- `operationStatus=ready_for_dispatch`;
- controle otimista por `operationUpdatedAt`.

Ao concluir:

- `operationStatus -> completed`;
- `completedAt` é persistido;
- `LilyOrderOperationEvent` é criado;
- `LilyAdminAudit` registra a ação.

Pedidos de entrega não podem usar esta rota.

### Frontend

Nova tela:

`/lilyacai/painel/pedidos`

A tela mostra, por pedido:

- número;
- valor;
- quantidade de itens;
- modalidade;
- estado financeiro;
- estado da cozinha;
- estado logístico;
- SLA quando aplicável;
- alertas;
- próxima ação operacional.

Ela atualiza automaticamente a cada 10 segundos e possui filtros de operação e busca.

A página foi adicionada ao painel administrativo.

## Decisões de segurança

Não foi criado endpoint de edição genérica de status.

Isso preserva os invariantes:

- pagamento muda no domínio financeiro;
- produção muda na cozinha;
- entrega muda na logística;
- retirada presencial ganha apenas a transição final específica que faltava.

## Testes adicionados

`apps/api/src/modules/lily/order-operations.test.ts`

Cobertura:

- customer não acessa overview;
- overview não vaza telefone/endereço/códigos;
- pedido pago parado antes da produção é sinalizado;
- SLA vencido aparece no filtro de atenção;
- retirada pronta/paga pode ser concluída;
- conclusão persiste evento e auditoria;
- CSRF é obrigatório;
- pedido de entrega não usa conclusão de retirada;
- concluído sai da fila ativa e aparece no filtro correto.

## Homologação real

Permanece separada para o próximo ciclo de testes na VPS. Esta entrega não depende de serviço externo novo nem exige namespace Nginx adicional.
