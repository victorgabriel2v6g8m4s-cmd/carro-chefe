# CookLily — rota de pagamento e UX do painel

Checkpoint concluído em 2026-10-07.

## Entregue

- o POST da escolha de pagamento usa `/api/v1/lily/payments/options`, dentro do prefixo já permitido pelo Nginx;
- o backend mantém o handler financeiro existente e expõe um alias de transporte compatível com o proxy;
- cada produto recebe upload, substituição e remoção direta da foto de capa, reutilizando `LilyMediaAsset` e `coverMediaId` já existentes;
- JPEG, PNG e WebP até 10 MB continuam usando a validação/armazenamento de mídia CookLily;
- o seletor legado de mídia é sincronizado em segundo plano para que um salvamento posterior não restaure a capa anterior;
- mutações administrativas exibem feedback discreto e específico de sucesso/falha;
- durante o refresh legado do catálogo, a tela anterior é preservada visualmente e os painéis abertos são restaurados, evitando o flash de `Carregando painel...`.

## Diagnóstico do 404 ao escolher Pix

O frontend usava `POST /api/v1/lily/payment-options`, enquanto o Nginx de produção permite o prefixo `/api/v1/lily/payments/` e mantém o restante de `/api/` fail-closed. Por isso o clique em Pix recebia 404 antes de chegar ao Fastify. Ausência de credenciais é tratada pela API como indisponibilidade/configuração, não como 404 do proxy.

## Credenciais e providers

Pix próprio requer `COOKLILY_PIX_KEY`, `COOKLILY_PIX_MERCHANT_NAME` e `COOKLILY_PIX_MERCHANT_CITY`.

Mercado Pago usa `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_PUBLIC_KEY` e `MERCADO_PAGO_WEBHOOK_SECRET`. O webhook público é `/api/v1/lily/payments/webhooks/mercado-pago`.

A conciliação automática do Pix próprio é opcional e depende das credenciais/API Pix do PSP bancário configurado em `COOKLILY_PIX_API_*`; gerar o BR Code não depende dessa integração bancária.

Segredos permanecem somente no arquivo de ambiente da VPS e não devem ser enviados ao repositório.
