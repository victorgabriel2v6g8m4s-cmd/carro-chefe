# CookLily — Entrega 11K — Impressão da cozinha

- status: in_progress
- owner: AG-DEV
- branch: `feat/lily-entrega-11k-impressao-cozinha`
- base_branch: `cooklily/canonical`
- base_sha_verified: `808434275bd434a0e9665138e181180f72b08267`
- head_sha_verified: `93a39a43157a3a8f76cc5cde257a1dd83a4ff462`
- pull_requests: PR #106 -> `cooklily/canonical` (draft); PR #107 -> `main` (gate temporário)
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

## Concluído e persistido

- Endpoint staff de comanda minimizada.
- Guard server-side: somente pedido pago em `preparing` ou `ready_for_dispatch`.
- DTO separado, sem telefone/endereço/códigos/status internos/configuração técnica.
- Sabores reduzidos somente a nomes.
- Testes de privacidade, autorização e readiness.
- Client frontend tipado.
- Página dedicada de prévia/print.
- Botão “Imprimir comanda” somente em pedidos aptos.
- CSS de impressão hardware-neutral.
- Documento técnico, roadmap, status e índice atualizados.

## Em andamento

Revisão final do diff e gate CI/CodeQL.

## Revisão pré-gate

- Diff revisado contra `cooklily/canonical`: 0 commits atrás.
- Foi detectado antes do gate que a primeira redução de tipos frontend havia atingido `KitchenOrder` em vez de somente `KitchenPrintTicket`.
- Correção persistida em `68d29d33858e75c30a55704eeccf91a1a8eab14e`: contrato normal restaurado e minimização restrita ao DTO de impressão.

## Gates e testes

Ainda não iniciados. Integração depende de CI + CodeQL verdes no SHA final.

## Bloqueios/riscos

- Não assumir largura de papel, modelo ou protocolo sem equipamento real.
- Não expor PII na comanda.
- Impressão não pode alterar status nem marcar pedido como produzido.

## Próxima ação exata

Abrir PR draft contra `cooklily/canonical` e PR gate contra `main`, atualizar este checkpoint com os PRs e validar CI/CodeQL do SHA final.
