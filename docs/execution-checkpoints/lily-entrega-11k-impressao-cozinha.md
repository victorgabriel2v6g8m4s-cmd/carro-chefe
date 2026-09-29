# CookLily — Entrega 11K — Impressão da cozinha

- status: in_progress
- owner: AG-DEV
- branch: `feat/lily-entrega-11k-impressao-cozinha`
- base_branch: `cooklily/canonical`
- base_sha_verified: `808434275bd434a0e9665138e181180f72b08267`
- head_sha_verified: `808434275bd434a0e9665138e181180f72b08267`
- pull_requests: ainda não criados
- last_verified_at: 2026-09-29
- interruption_state: execução iniciada após integração da 11J

## Objetivo

Fechar a pendência de impressão da cozinha sem escolher hardware ou protocolo de impressora antes da operação definir o equipamento real.

## Decisão

Primeira fase: comanda de impressão via navegador/sistema operacional.

- botão “Imprimir comanda” por pedido;
- página dedicada, autenticada como staff;
- layout próprio para impressão;
- sem integração direta com USB, rede, ESC/POS ou fabricante;
- sem telefone/endereço do cliente;
- sem código de coleta/entrega;
- conteúdo limitado ao preparo: número, horário, tipo de fulfillment, itens, sabores, adicionais e observações.

## Em andamento

Criar DTO/endpoint de impressão minimizado, página frontend, print CSS, testes e documentação.

## Gates e testes

Ainda não iniciados. Integração depende de CI + CodeQL verdes no SHA final.

## Bloqueios/riscos

- Não assumir largura de papel, modelo ou protocolo sem equipamento real.
- Não expor PII na comanda.
- Impressão não pode alterar status nem marcar pedido como produzido.

## Próxima ação exata

Adicionar endpoint staff de comanda minimizada e teste de privacidade.
