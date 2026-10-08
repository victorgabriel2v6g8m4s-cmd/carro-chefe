# QR Pix personalizado da CookLily — 2026-10-08

## Objetivo

Mostrar um QR Code escaneável na tela de pagamento do Pix próprio, sem depender de um PNG produzido pelo PSP. O BR Code continua sendo o payload original recebido do backend; a personalização muda apenas a renderização visual.

## Implementação

- Reutiliza o renderizador e o encoder do QR Lab em `apps/qr_manipulator/src/lib`.
- Aplica módulos em pontos (`moduleStyle: dot`) e olhos arredondados (`eyeStyle: rounded`).
- Usa a paleta da CookLily: foreground `#44042D` e fundo `#FFF7FA`, sem logo central para preservar a área de leitura.
- Tenta correção de erro M e reduz para L apenas se o BR Code for longo demais para o limite do encoder atual. Se o PSP fornecer um QR em base64 e a renderização local falhar, usa a imagem do PSP como fallback.
- Detecta BR Code Pix pelo prefixo `000201`; códigos não reconhecidos continuam disponíveis como instruções copiáveis, sem tentar transformá-los em QR.
- Corrige a área Pix Copia e Cola: largura total, tipografia monoespaçada, quebra de texto e botão separado. Ajusta também o cabeçalho do pedido e o cartão de pagamento para desktop e mobile.

## Testes adicionados

- Regressão da tela de pagamento para confirmar que o QR Lab é reutilizado com pontos, olhos arredondados e cores da marca.
- Testes de capacidade do encoder com payloads longos, cobrindo correção M e fallback para L.

## Homologação realizada — 08/10/2026

O proprietário confirmou que o QR foi escaneado em outro celular, abriu a cobrança no aplicativo bancário e apresentou o valor esperado. O QR e a apresentação do valor estão homologados. O pagamento não foi concluído, então recebimento, confirmação financeira e transição do pedido permanecem pendentes. Evidência detalhada: [HOMOLOGACAO_QR_PIX_2026-10-08.md](HOMOLOGACAO_QR_PIX_2026-10-08.md).

A próxima prioridade é finalizar a UI pública do site. O teste financeiro ponta a ponta será realizado em etapa posterior; não marcar pagamento como aprovado sem confirmação autoritativa.
