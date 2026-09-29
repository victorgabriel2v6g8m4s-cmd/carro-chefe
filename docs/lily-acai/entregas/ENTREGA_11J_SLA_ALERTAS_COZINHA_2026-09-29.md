# Entrega 11J — SLA e alertas operacionais da cozinha — 29/09/2026

## Objetivo

Fechar a pendência de SLA/alertas de atraso da fila da cozinha sem inventar um tempo operacional e sem permitir que o relógio altere automaticamente o estado do pedido.

A primeira versão cobre somente a etapa `preparing` / **Montar pedido**.

## Decisão principal

O sistema **não possui SLA padrão**.

A configuração `kitchenPreparationSlaMinutes` é nullable:
- `null`: SLA desligado;
- inteiro entre 1 e 720: SLA ativo para pedidos em montagem.

O valor precisa ser definido pela operação. A aplicação não cria um número por conta própria.

## Persistência

Campo adicionado a `LilyOperationalSettings`:

```text
kitchenPreparationSlaMinutes Int?
```

Migration:

`packages/lily-database/prisma/migrations/20260929203000_lily_kitchen_sla/migration.sql`

A migration é aditiva e não preenche valor existente.

## Configuração administrativa

O endpoint já existente de fulfillment foi ampliado:

- `GET /api/v1/lily/admin/fulfillment`;
- `PATCH /api/v1/lily/admin/fulfillment`.

O staff pode informar ou remover o SLA no painel **Entrega e retirada**.

Validação server-side:
- inteiro;
- mínimo 1 minuto;
- máximo 720 minutos;
- `null` permitido para desativar.

## Cálculo

A função `lilyKitchenPreparationSla` usa somente:

- `operationStatus`;
- `operationUpdatedAt`;
- threshold configurado;
- relógio do servidor.

O SLA só existe quando `operationStatus === "preparing"`.

Retorno:

- threshold;
- início;
- vencimento;
- minutos decorridos;
- minutos restantes;
- minutos de atraso;
- status `on_track` ou `overdue`.

Se o SLA estiver desativado ou o pedido estiver em outra etapa, o DTO devolve `sla: null`.

## Regra de segurança operacional

Estar atrasado **não**:
- avança pedido;
- cancela pedido;
- muda status financeiro;
- muda status operacional;
- dispara ação externa;
- impede o staff de operar.

É apenas sinalização/observabilidade.

## API da cozinha

`GET /api/v1/lily/admin/kitchen/orders` passa a incluir:

- `sla` por pedido;
- resumo:
  - `kitchenPreparationSlaMinutes`;
  - `overdue`.

O contador representa os pedidos retornados pela consulta atual.

## UX

No painel `/painel/cozinha`:

- pedido em montagem e dentro do SLA mostra minutos restantes;
- pedido atrasado mostra minutos acima do SLA;
- cabeçalho mostra quantidade de pedidos atrasados;
- SLA desativado aparece explicitamente como desativado;
- atualização continua usando polling de 5 segundos.

O alerta visual não substitui QA real em tablet/celular.

## Privacidade

Nenhum dado pessoal novo é exposto.

O SLA utiliza apenas timestamps e estado operacional já necessários para a cozinha.

## Testes

Cobertura adicionada para:

- SLA desligado;
- ausência de SLA fora de `preparing`;
- cálculo de tempo restante;
- cálculo de atraso;
- configuração/desativação via endpoint administrativo;
- exposição de atraso pela fila;
- confirmação de que a leitura do SLA não altera `operationStatus`;
- fila sem SLA configurado devolvendo `sla: null`.

## Fora do escopo desta subfase

- notificações push;
- WhatsApp de atraso;
- escalonamento automático;
- alteração automática de prioridade;
- SLA de pagamento;
- SLA de courier/entrega;
- impressão.

Esses itens devem ser tratados separadamente para evitar automações operacionais sem regra aprovada.

## Estado

Implementação candidata no branch `feat/lily-entrega-11j-sla-alertas-operacionais`.

Integração depende de CI e CodeQL verdes no SHA final.

## Homologação após integração

1. definir com a operação um SLA de montagem real;
2. configurar o valor no painel;
3. abrir a cozinha em tablet/celular;
4. validar pedido dentro do prazo;
5. validar pedido atrasado;
6. confirmar que o atraso não muda status sozinho;
7. confirmar legibilidade do alerta em operação real;
8. ajustar o valor apenas após evidência operacional.
