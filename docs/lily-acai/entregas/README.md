# Entregas — CookLily

A ordem abaixo substitui a sequência anterior a partir da Entrega 03, conforme decisão de 23/09/2026.

| Entrega | Escopo | Status |
|---|---|---|
| 01 | Fundação, isolamento e governança | concluída |
| 02 | Scaffold, banco base, autenticação e consentimentos | concluída |
| 03 | Logo oficial, kit de marca e rebranding integral | implementação técnica concluída; QA visual pendente |
| 04 | Landing, leads, WhatsApp e primeira publicação | implementada e publicada; revalidar junto da linha canônica |
| 05 | Catálogo, mídia, admin, cardápio dinâmico e publicação | publicada na VPS; homologação conjunta com 06 pendente |
| 06 | Carrinho, endereço e criação de pedido | **implementação técnica concluída e validada; deploy/homologação pendentes** |
| 07 | Pagamento e reconciliação | **implementação presente; primeiro gate teve CodeQL verde e CI vermelho; correção aplicada na branch canônica e novo gate pendente** |
| 08 | Painel de pedidos | parcial: fulfillment/configuração existem; fila/operação completa pendente |
| 09 | Tracking QR e analytics first-party | parcial: attribution `la_*` existe; analytics completo pendente |
| 10 | QA operacional, acessibilidade, observabilidade e hardening | backlog aberto; 40 achados de UX/segurança/admin formalizados |

Planos e relatórios:

- `ENTREGA_03_MARCA_COOKLILY.md`;
- `ENTREGA_04_LANDING_WHATSAPP_DEPLOY.md`;
- `ENTREGA_05_CATALOGO_PUBLICACAO.md`;
- `ENTREGA_06_CARRINHO_PEDIDOS.md`;
- `HOMOLOGACAO_05_06_AJUSTES.md`;
- `ENTREGA_07_PAGAMENTOS_RECONCILIACAO.md`.

Validação técnica da Entrega 05:

- SHA: `9e9c2e194076aa5a8dd3262e73528ac3689c8896`;
- CI Node 20/24: success;
- 94 testes aprovados em cada matriz Node;
- build: success;
- CodeQL: success.

Validação técnica da Entrega 06:

- SHA: `da166683ab2d0e27acae23d9714ec8e824a02ac4`;
- CI run `36124932957`: success;
- 105 testes aprovados;
- builds: success;
- CodeQL run `36124933082`: success;
- PR técnico #65 fechado sem merge.

Cada entrega deve registrar o que foi feito, o que foi realmente testado, o que não foi executado, evidências, bloqueios e o plano da entrega seguinte. Nunca declarar teste como aprovado sem execução real.


## Patch pós-homologação 05/06

Feedback de homologação das Entregas 05 e 06 foi consolidado em `HOMOLOGACAO_05_06_AJUSTES.md`.

Validação técnica:

- SHA: `10872e686c6c71c228ff8aef0e507a48deaaf912`;
- CI: `36150024665` — success;
- CodeQL: `36150024735` — success;
- Node 20/24: 111 testes;
- deploy pendente.


## Entrega 07 — pagamento e reconciliação

Linha de origem: `feat/lily-entrega-07-pagamentos`. Integração atual: `cooklily/canonical`.

A implementação inclui domínio de pagamentos, Pix manual reconciliável, painel financeiro, estados/estornos, guest token, RBAC real, gestão de equipe e upgrade obrigatório de senha para contas privilegiadas.

O gateway automático continua condicionado à escolha/aprovação do provedor. A migration mantém pagamentos desabilitados por padrão.

Documento canônico: `ENTREGA_07_PAGAMENTOS_RECONCILIACAO.md`.


## Consolidação canônica — 27/09/2026

A CookLily passa a ter uma linha explícita de integração em `cooklily/canonical`, criada sobre a árvore mais avançada da Entrega 07. A branch `lily-acai` permanece como base histórica e não deve ser usada isoladamente para inferir o estado atual.

O primeiro gate da Entrega 07 (`gate/lily-entrega-07-v1`) apresentou:

- CodeQL: **success**;
- Quality Node 20: **failure** em static check;
- Quality Node 24: **failure** em static check;
- Tool Health / Linux: **failure** porque o check `app-api` executa o mesmo TypeScript;
- causa raiz: `orders.map(serializeOrder)` fazia o índice de `Array.map` ser interpretado como o segundo parâmetro opcional `guestAccessToken` do serializer;
- correção canônica: usar callback explícito `orders.map((order) => serializeOrder(order))`.

A Entrega 07 continua **não aprovada** até o novo gate completo ficar verde.

Backlog de homologação: `../PENDENCIAS_UX_SEGURANCA_2026-09-27.md`.
