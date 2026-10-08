# Correção do checkout Pix e ativos web — 2026-10-08

## Diagnóstico

- O código atual do cliente cria pagamentos em `POST /api/v1/lily/payments/options`, dentro do prefixo publicado pelo Nginx. O erro no console em `/api/v1/lily/payment-options` indica que o navegador executou uma versão antiga do bundle; o HTML da SPA não declarava política explícita de não-cache.
- O pedido automático de `/favicon.ico` caía no fallback estático genérico. Como `.ico` não é um tipo estático permitido e não há um favicon nesse caminho, o servidor respondia `415`.
- A tela de pagamento consultava `/api/v1/lily/auth/me` mesmo para visitantes. A API corretamente responde `401` quando não existe sessão; essa chamada era desnecessária para uma compra de convidado.

## Correções

- HTML de SPA recebe `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`, além de `Pragma` e `Expires`, para que o navegador busque o HTML atualizado após deploy.
- `/favicon.ico` responde `204 No Content` com cache curto, sem passar pelo leitor de arquivos estáticos.
- A tela de pagamento consulta primeiro `/api/v1/lily/auth/status`; só consulta `/auth/me` se houver uma sessão, preservando o token CSRF para clientes autenticados.
- Testes de regressão cobrem as três condições e mantêm a expectativa de que o cliente use `/api/v1/lily/payments/options`.

## Validação e deploy

Não considerar a correção validada em produção até o deploy concluir com sucesso. Após integrar em `cooklily/canonical`, executar `sudo cc deploy canonical` e fazer uma recarga forçada do navegador uma vez (`Ctrl+Shift+R) no desktop; em seguida testar novamente a criação de Pix.
