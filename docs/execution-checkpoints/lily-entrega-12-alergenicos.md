# CookLily — Entrega 12 — Alergênicos do catálogo e do pedido

- status: merged_validated
- owner: AG-DEV
- branch: `feat/lily-entrega-12-alergenicos`
- base_branch: `cooklily/canonical`
- base_sha_verified: `e7d767eb84a13f2f48c0817c24d6243a6b0432df`
- validated_head_sha: `da643f2d5e3fc07a3764ebfb8eb2d08f3e7a1e0a`
- canonical_merge_sha: `6074c7b287cc20b03f4d11a1ea3ab3fd7f64a6f0`
- ci_run: `36745374077` — success
- codeql_run: `36745374191` — success
- canonical_pr: #117 — squash merged
- gate_pr: #118 — closed without merge
- last_verified_at: 2026-09-30
- previous_delivery: Entrega 10B, merge `930f9d3aa635af099e7a1b9b0de928bb54bdd80f`
- interruption_state: entrega integrada; resta somente homologação operacional dos dados reais

## Entregue

- vocabulário controlado de alergênicos;
- produto, sabor e adicional com estado de revisão independente;
- catálogo legado migra como `unreviewed`;
- admin para CONTÉM / PODE CONTER / revisão;
- API pública normalizada, sem JSON interno de armazenamento;
- agregação server-side de produto + sabores + adicionais;
- produto fixo usa a composição publicada real e não aceita omissão artificial de sabor;
- combos unem os resumos dos itens;
- `CONTÉM` prevalece sobre `PODE CONTER`;
- informação incompleta permanece explicitamente incompleta;
- carrinhos legados viram informação pendente, nunca “sem alergênicos”;
- checkout recota no servidor;
- `allergenSnapshotJson` congela a informação por item do pedido;
- detalhe autenticado, tracking guest, cozinha e comanda usam o snapshot histórico;
- testes de domínio, catálogo, pedidos, cozinha e regressões estruturais;
- CI Node 20/24, builds, Tool Health e CodeQL aprovados.

## Pendências de homologação

- revisar manualmente produto por produto, sabor por sabor e adicional por adicional com fichas/ingredientes reais;
- definir com Operações a política sobre possibilidade de contato cruzado;
- validar a apresentação em mobile e desktop;
- criar pedido real/de homologação e confirmar que o snapshot permanece após mudar o catálogo;
- validar a comanda impressa/PDF com o alerta de alergênicos.

## Continuidade

Não abrir nova entrega até concluir o ciclo de testes solicitado pelo proprietário.
