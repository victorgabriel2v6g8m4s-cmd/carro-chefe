# CookLily — Entrega 09 — Analytics first-party

- status: in_progress
- owner: AG-DEV
- branch: `feat/lily-entrega-09-analytics-first-party`
- base_branch: `cooklily/canonical`
- base_sha_verified: `3e4f4bdb6f8dc123a3174fa320b141c73bd764ed`
- last_verified_at: 2026-09-29
- previous_delivery: Entrega 08, merge `64f4af027fcdd3cf13ee57457c193a8c622cc5f9`

## Objetivo

Consolidar analytics first-party CookLily sem PII, com consentimento explícito no navegador, atribuição canônica `la_*`, eventos de funil tipados e relatório interno. Pedido/pagamento/receita continuam usando o banco operacional como fonte autoritativa.

## Invariantes

- analytics não essencial só é enviado após opt-in explícito no navegador;
- negar analytics não bloqueia catálogo, cadastro, carrinho, checkout ou pedido;
- nenhum evento aceita telefone, nome, endereço, nota livre ou token;
- parâmetros de evento/metadata são allowlist e limitados;
- URL persistida é somente path, sem query string;
- atribuição usa `la_qr/la_campaign/la_variant` com compatibilidade `cc_*` somente na entrada já existente;
- métricas de pedidos e receita são calculadas de `LilyOrder`, não inferidas de eventos do frontend;
- relatório interno exige staff/admin + MFA;
- fornecedores externos são opcionais e não são necessários para fechar esta entrega.

## Próximas ações

1. modelo/migration de eventos;
2. API pública de ingestão e API staff agregada;
3. cliente analytics + preferências de consentimento;
4. instrumentação do funil principal;
5. painel interno;
6. testes de consentimento, minimização e agregação;
7. gates CI/CodeQL e integração.
