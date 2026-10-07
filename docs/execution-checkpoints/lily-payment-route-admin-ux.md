# CookLily — rota de pagamento e UX do painel

Checkpoint aberto em 2026-10-07.

## Escopo

- corrigir o POST da escolha de pagamento para uma rota permitida pelo Nginx da CookLily;
- permitir upload direto da foto de capa dentro de cada produto;
- reduzir o efeito de recarregamento total do painel após mutações;
- exibir feedback discreto e específico de sucesso ou falha nas ações administrativas.

## Diagnóstico do Pix

O frontend usava `POST /api/v1/lily/payment-options`, enquanto o Nginx de produção permite o prefixo `/api/v1/lily/payments/` e mantém o restante de `/api/` fail-closed. Por isso o clique em Pix podia receber 404 antes de chegar ao Fastify. Ausência de credenciais é tratada pela API como indisponibilidade/configuração, não como 404.
