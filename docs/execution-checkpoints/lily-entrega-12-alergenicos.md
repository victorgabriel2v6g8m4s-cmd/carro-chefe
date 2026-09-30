# CookLily — Entrega 12 — Alergênicos do catálogo e do pedido

- status: in_progress
- owner: AG-DEV
- branch: `feat/lily-entrega-12-alergenicos`
- base_branch: `cooklily/canonical`
- base_sha_verified: `e7d767eb84a13f2f48c0817c24d6243a6b0432df`
- last_verified_at: 2026-09-30
- previous_delivery: Entrega 10B, merge `930f9d3aa635af099e7a1b9b0de928bb54bdd80f`

## Objetivo

Adicionar informação estruturada de alergênicos ao catálogo CookLily e preservar a informação apresentada no snapshot do pedido.

## Princípios

- lista vazia nunca significa automaticamente “livre de alergênicos”;
- produto, sabor e adicional possuem estado de revisão próprio;
- a configuração final agrega produto base + sabores selecionados + adicionais selecionados;
- `contains` prevalece sobre `mayContain` para o mesmo alergênico;
- informação incompleta permanece explicitamente incompleta;
- nenhuma tela declara “seguro para alérgicos”, “sem glúten”, “sem lactose” ou ausência de contato cruzado sem evidência própria;
- pedidos congelam o snapshot de alergênicos usado no momento da compra;
- cozinha recebe a informação estruturada do pedido, sem depender de memória do catálogo atual.

## Escopo

1. vocabulário controlado de alergênicos;
2. campos revisáveis em produto, sabor e adicional;
3. API/admin para configuração;
4. agregação autoritativa no quote;
5. UI do configurador/carrinho;
6. snapshot no pedido e DTO operacional;
7. testes de união, precedência, informação incompleta e persistência;
8. documentação e gates CI/CodeQL.
