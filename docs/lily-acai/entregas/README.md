# Entregas — CookLily

A ordem abaixo substitui a sequência anterior a partir da Entrega 03, conforme decisão de 23/09/2026.

| Entrega | Escopo | Status |
|---|---|---|
| 01 | Fundação, isolamento e governança | concluída |
| 02 | Scaffold, banco base, autenticação e consentimentos | concluída |
| 03 | Logo oficial, kit de marca e rebranding integral | implementação técnica concluída; QA visual pendente |
| 04 | Landing, leads, WhatsApp e primeira publicação | implementação concluída; deploy pendente |
| 05 | Catálogo, mídia, admin, cardápio dinâmico e publicação | publicada na VPS; homologação conjunta com 06 pendente |
| 06 | Carrinho, endereço e criação de pedido | **implementação técnica concluída e validada; deploy/homologação pendentes** |
| 07 | Pagamento e reconciliação | não iniciada |
| 08 | Painel de pedidos | não iniciada |
| 09 | Tracking QR e analytics first-party | não iniciada |
| 10 | QA operacional, acessibilidade, observabilidade e hardening | não iniciada |

Planos e relatórios:

- `ENTREGA_03_MARCA_COOKLILY.md`;
- `ENTREGA_04_LANDING_WHATSAPP_DEPLOY.md`;
- `ENTREGA_05_CATALOGO_PUBLICACAO.md`;
- `ENTREGA_06_CARRINHO_PEDIDOS.md`;
- `HOMOLOGACAO_05_06_AJUSTES.md`.

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
