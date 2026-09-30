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
| 07 | Pagamento e reconciliação | **implementação técnica aprovada no SHA `4b111c2e26b234d83111a58a9b20ef34f773a97a`; deploy/homologação pendentes** |
| 08 | Painel de pedidos | **validada e integrada pelo PR #108; CI `36635632700`, CodeQL `36635632701`; QA real pendente** |
| 09 | Tracking QR e analytics first-party | **validada e integrada pelo PR #110; CI `36637864661`, CodeQL `36637864655`; QA real/retention policy pendentes** |
| 10 | QA operacional, acessibilidade, observabilidade e hardening | **10A (#112) e 10B (#116) validadas/integradas; parte automatizável fechada; QA real, recuperação de senha e retention continuam pendentes** |
| 12 | Alergênicos do catálogo e do pedido | **validada e integrada pelo PR #117; CI `36745374077`, CodeQL `36745374191`; revisão dos dados reais/QA pendentes** |

Planos e relatórios:

- `ENTREGA_03_MARCA_COOKLILY.md`;
- `ENTREGA_04_LANDING_WHATSAPP_DEPLOY.md`;
- `ENTREGA_05_CATALOGO_PUBLICACAO.md`;
- `ENTREGA_06_CARRINHO_PEDIDOS.md`;
- `HOMOLOGACAO_05_06_AJUSTES.md`;
- `ENTREGA_07_PAGAMENTOS_RECONCILIACAO.md`;
- `ENTREGA_08_TORRE_CONTROLE_PEDIDOS_2026-09-29.md`;
- `ENTREGA_09_ANALYTICS_FIRST_PARTY_2026-09-29.md`;
- `ENTREGA_10A_OBSERVABILIDADE_BACKUP_2026-09-29.md`;
- `ENTREGA_10B_A11Y_PERFORMANCE_2026-09-29.md`;
- `ENTREGA_12_ALERGENICOS_2026-09-30.md`;
- `P0_UX_SEGURANCA_2026-09-27.md`;
- `P1_UX_CONTA_ADMIN_2026-09-27.md`.

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

A correção foi revalidada com sucesso no runtime SHA `4b111c2e26b234d83111a58a9b20ef34f773a97a`:

- CI run `36330633129`: **success**;
- CodeQL run `36330633098`: **success**;
- Quality Node 20: **122 testes / 25 arquivos**, build success;
- Quality Node 24: **122 testes / 25 arquivos**, build success;
- Tool Health / Linux: **success**;
- Workbook Snapshot, Excel Recipe Linux/Windows e Windows Supervisor: **success**.

A Entrega 07 está tecnicamente aprovada, mas isso não autoriza deploy nem encerra QA operacional/mobile.

Backlog de homologação: `../PENDENCIAS_UX_SEGURANCA_2026-09-27.md`.


## Patch P0 — UX mobile e MFA

Documento: `P0_UX_SEGURANCA_2026-09-27.md`.

Runtime validado: `0f3e894f4993eea1c07aed881bad4ea4525e1674`.

- CI `36332050698`: success;
- CodeQL `36332050747`: success;
- Node 20: 27 arquivos / 131 testes;
- Node 24: 27 arquivos / 131 testes;
- Tool Health e gates auxiliares: success.

O patch trata os P0 de implementação. QA visual em aparelhos reais e enrollment MFA na VPS continuam como homologação operacional, não como dívida de código.


## Patch P1 — UX, conta e administração

Documento: `P1_UX_CONTA_ADMIN_2026-09-27.md`.

Runtime validado: `a1176a444d6ab184ab75bdc30b5b0ee8449e05f0`.

- CI `36334839141`: success;
- CodeQL `36334839168`: success;
- Node 20: 27 arquivos / 136 testes;
- Node 24: 27 arquivos / 136 testes;
- builds e Tool Health: success.

Entregue tecnicamente: focus trap, alvos de toque críticos 44 px, Configurações da loja separada de fulfillment, controle explícito de sessões e deep-link de produto. Recuperação de senha continua pendente por depender de canal seguro de verificação.


## Entrega 11 — operação ponta a ponta

- 11D: `ENTREGA_11D_LOGISTICA_2026-09-28.md` — fluxo base do courier tecnicamente validado.
- 11E: `ENTREGA_11E_REATRIBUICAO_HISTORICO_2026-09-28.md` — recusa, desistência, reatribuição segura e histórico; CI/CodeQL aprovados, QA real pendente.
- 11F: `ENTREGA_11F_TRACKING_GUEST_2026-09-28.md` — tracking guest por capability token; CI/CodeQL aprovados, QA real pendente.
- 11G: `ENTREGA_11G_ETA_MAPAS_2026-09-28.md` — ETA de rota/mapas sem GPS contínuo; CI/CodeQL aprovados, homologação real pendente.
- 11H: `ENTREGA_11H_WHATSAPP_ETAPAS_2026-09-29.md` — outbox WhatsApp operacional por etapa; CI/CodeQL aprovados e integrada pelo PR #99, homologação Meta real pendente.
- 11I: `ENTREGA_11I_CONCILIACAO_PIX_AUTOMATICA_2026-09-29.md` — ingestão autoritativa, settlement ledger, matching txid+valor e worker de conciliação; CI/CodeQL aprovados e integrada pelo PR #102, homologação bancária real pendente.
- 11J: `ENTREGA_11J_SLA_ALERTAS_COZINHA_2026-09-29.md` — SLA configurável da montagem e alertas visuais na fila da cozinha; CI/CodeQL aprovados e integrada pelo PR #104, parametrização/QA real pendentes.
- 11K: `ENTREGA_11K_IMPRESSAO_COZINHA_2026-09-29.md` — comanda staff minimizada e impressão nativa do navegador; CI/CodeQL aprovados e integrada pelo PR #106, QA de impressão real pendente.
