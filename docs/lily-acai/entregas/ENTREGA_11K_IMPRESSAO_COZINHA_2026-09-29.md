# Entrega 11K — impressão da cozinha — 29/09/2026

## Objetivo

Fechar a pendência de impressão da cozinha sem atrelar a CookLily a um modelo, largura de papel, fabricante ou protocolo de impressora antes da escolha do equipamento real.

## Decisão

A primeira fase usa a impressão nativa do navegador/sistema operacional.

Fluxo:

1. pedido é pago;
2. staff libera o pedido para `preparing`;
3. a fila da cozinha passa a exibir **Imprimir comanda**;
4. a ação abre uma página dedicada;
5. o staff revisa a comanda e aciona `window.print()`;
6. o navegador/sistema operacional escolhe a impressora configurada.

Não existe nesta fase comunicação direta com USB, rede, Bluetooth, ESC/POS ou driver de fabricante.

## Regra operacional

A comanda só pode ser emitida quando:

- `order.status === "paid"`; e
- `operationStatus` está em `preparing` ou `ready_for_dispatch`.

Caso contrário, o backend retorna `409 LILY_KITCHEN_PRINT_NOT_READY`.

Isso evita que impressão seja usada para contornar o bloqueio de produção antes do pagamento/liberação.

## Endpoint

`GET /api/v1/lily/admin/kitchen/orders/:id/print`

Requisitos:

- sessão staff/admin;
- MFA conforme política privilegiada já existente;
- pedido elegível para produção.

A rota é somente leitura. Imprimir não altera status, não cria evento de produção e não marca o pedido como concluído.

## Minimização de dados

A comanda possui contrato separado da fila normal para evitar vazamento acidental quando outros campos forem adicionados ao painel.

Incluído:

- ID técnico do pedido;
- número do pedido;
- horário de entrada;
- entrega/retirada;
- flag de homologação;
- observação do pedido;
- itens:
  - quantidade;
  - produto;
  - variação/tamanho;
  - sabores somente por nome;
  - adicionais;
  - observação do item.

Excluído:

- telefone;
- endereço;
- CEP/bairro;
- dados de pagamento;
- status financeiro interno;
- status operacional interno;
- configuração técnica do produto;
- IDs de sabores;
- código de coleta;
- código de entrega;
- segredo logístico.

## Frontend

Nova página:

`/lilyacai/painel/cozinha/imprimir/:id`

Características:

- não usa o Shell normal para evitar cabeçalho/rodapé na impressão;
- possui botão explícito **Imprimir**;
- possui link de volta para a cozinha;
- mostra identificação clara quando o pedido é de homologação;
- usa conteúdo textual, sem imagens necessárias.

Na fila `/painel/cozinha`, o botão de impressão aparece apenas nos mesmos estados permitidos pelo backend.

## CSS de impressão

Existe `@media print` dedicado:

- oculta ações da tela;
- remove bordas/sombras decorativas;
- usa fundo branco;
- evita quebra interna de blocos importantes;
- usa `@page` apenas para margem.

Nenhum `size` de papel é imposto. Isso é intencional para funcionar tanto em impressoras comuns quanto em futuras térmicas configuradas pelo sistema.

## Testes

Cobertura backend:

- staff recebe comanda de pedido apto;
- customer recebe 403;
- pedido ainda não pago/liberado recebe 409;
- contrato não contém telefone/endereço;
- contrato não contém códigos logísticos;
- contrato não contém status internos desnecessários.

Build frontend valida rota, página e tipos.

## Fora do escopo

- impressão automática ao receber pedido;
- spooler próprio;
- fila de impressão persistente;
- retry de impressora;
- ESC/POS;
- corte de papel;
- gaveta de dinheiro;
- impressão em múltiplas estações;
- seleção automática de impressora;
- largura fixa 58/80 mm.

Esses itens só devem ser implementados após a operação definir hardware, sistema operacional e topologia de rede.

## Estado

Implementação candidata no branch `feat/lily-entrega-11k-impressao-cozinha`.

Integração depende de CI e CodeQL verdes no SHA final.

## Homologação após integração

1. abrir pedido de teste pago;
2. liberar para montagem;
3. confirmar que “Imprimir comanda” aparece;
4. abrir a prévia;
5. conferir itens/sabores/adicionais/observações;
6. confirmar ausência de telefone/endereço/códigos;
7. imprimir em PDF;
8. imprimir na impressora disponível no estabelecimento;
9. ajustar CSS somente se a impressão real exigir;
10. se uma térmica específica for escolhida, planejar integração de hardware em subfase separada.
