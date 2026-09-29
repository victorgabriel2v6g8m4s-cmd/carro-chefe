# CookLily — Entrega 08 — Torre de controle de pedidos

- status: in_progress
- owner: AG-DEV
- branch: `feat/lily-entrega-08-torre-controle-pedidos`
- base_branch: `cooklily/canonical`
- base_sha_verified: `e05582931bf28f69292ce353ae6996414f8b259d`
- last_verified_at: 2026-09-29
- interruption_state: implementação iniciada após autorização explícita do proprietário para prosseguir antes da homologação da 11K

## Objetivo

Fechar a Entrega 08 sem criar um segundo motor de estados: consolidar financeiro, cozinha e logística numa fila operacional única, destacar pedidos que exigem atenção e encaminhar as ações ao domínio responsável.

Também fechar a lacuna de retirada presencial: pedido pago e pronto para retirada precisa poder ser marcado como entregue ao cliente de forma auditável.

## Invariantes

- nenhuma API de “forçar status” arbitrário;
- financeiro continua no domínio de pagamentos;
- montagem continua no domínio da cozinha;
- entrega continua no domínio logístico;
- torre de controle é leitura operacional e roteamento de ação;
- conclusão de retirada exige staff + MFA + CSRF, pedido pago, fulfillment pickup e estado ready_for_dispatch;
- overview não expõe telefone, endereço ou códigos logísticos;
- deploy/homologação real continuam separados e serão executados depois.

## Próximas ações

1. API de overview/triagem de pedidos;
2. conclusão auditável de retirada;
3. painel frontend de pedidos;
4. testes de RBAC, privacidade, filtros e transição;
5. gates CI/CodeQL;
6. documentação e integração em `cooklily/canonical`.
