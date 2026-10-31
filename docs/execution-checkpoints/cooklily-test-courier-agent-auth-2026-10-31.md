# Homologação CookLily com courier de teste e pagamentos simulados

- status: in_progress
- owner: AG-DEV
- branch: `cooklily/canonical`
- base_branch: `cooklily/canonical`
- base_sha_verified: `263ba8163dedb8d6e67bd01b268c11f9d60fef50`
- head_sha_verified: `8ff663cebdd905a551ac4dd68f569cf69ba3d8eb` (PR #307 integrado; deploy pendente)
- pull_requests: [#305](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/305) merged `5f40850f7350ec09c4638e30c87068b44e069d74`, CI `41177528187`; [#306](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/306) merged `b1589083c60c6251726b44112dcf36f8f2a68804`, CI `41178440493`; [#307](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/307) merged `8ff663cebdd905a551ac4dd68f569cf69ba3d8eb`, CI `41180053324` (8/8 passou)
- last_verified_at: 2026-10-31 07:22 UTC
- interruption_state: PR #307 integrado; precisa implantar correção de UX de pagamento mock e concluir homologação ponta a ponta no IAB

## Entrega e estado

Objetivo: homologar o despacho de couriers de teste com localização sintética restrita e pedido/pagamento sem efeitos financeiros externos.

- A canonical contém autenticação por chave para couriers de teste (PRs #303 e #304).
- PR #305 integrou localização sintética no ponto de coleta apenas para courier de teste autenticado por chave. A API usa coordenadas configuradas, limpa localização ao ficar offline/expirar e não permite simulação ao courier normal.
- PR #305 integrou pagamento mock para homologação, aprovado pelo valor calculado no servidor, sem rede, QR ou cobrança. Pedidos de homologação não enfileiram WhatsApp.
- Checkout de homologação é permitido para staff/admin autorizados.
- Migration `20261031120000_lily_courier_location_source` aplicada à base operacional no deploy `ac88eb9c27b263bed212a5974cb4eb6b874ee49c`.
- Pedidos mock de retirada `CL-2CCD986DEF0B` e entrega `CL-959F09B70771` criados. Nenhum provedor, QR, cobrança ou WhatsApp foi acionado; destino foi o endereço público da loja.
- Pedido de entrega anterior foi aceito pela cozinha, preparado, marcado pronto e conferido. O despacho ofereceu sequencialmente aos dois couriers, mas ambas as ofertas expiraram porque o TTL da localização sintética é 90 segundos. Os couriers já tentados não são reofertados no mesmo pedido; criar um pedido mock novo.
- Durante homologação, a opção mock dizia “Simular pagamento (sem cobrança)”, mas o hint mencionava contingência manual e o botão “Gerar Pix”. PR #307 corrigiu o hint para explicar simulação sem cobrança/QR/provedor e o botão para “Simular”; durante processamento, “Processando...”.
- Courier de teste 2 foi posto offline e confirmado pela UI mobile após uso; conferir estado final dos dois couriers novamente ao terminar.

## Testes e gates

- Preflight `lily-courier-homologation` e `lily-payment-choice-ux`: passaram.
- Vitest CookLily: 25 arquivos, 110 testes passaram. Typecheck direto com TypeScript e `git diff --check` passaram.
- Build CookLily e orçamento passaram após reduzir copy: JS bruto 607.94/608 KiB; JS gzip 193.01/193.50; JS inicial 52.36/110; maior chunk 71.97/280; CSS gzip 35.34/36; JS+CSS gzip 228.36/229.
- CI PR #305 run `41177528187`: 8/8 jobs passaram.
- CI PR #306 run `41178440493`: 8/8 jobs passaram.
- CI PR #307 run `41180053324`: 8/8 jobs passaram.
- O comando npm completo não funcionou localmente porque subprocessos não resolveram `npm` no PATH. Vitest, typecheck, build e budget foram invocados diretamente pelo Node instalado.

## Migrations e deploy

- Deploy `ac88eb9c27b263bed212a5974cb4eb6b874ee49c` concluído, migration aplicada, health checks e smoke externos passaram. Log `/srv/carro-chefe/data/deploy-logs/deploy-20261031-065929-ac88eb9c27b2.log`; evidência `.evidence`; backup `/srv/carro-chefe/data/backups/lily-acai-pre-ac88eb9c27b2-20261031-065929.db`.
- Deploy anterior ocorreu antes da correção do CTA mock. PR #307 ainda precisa de deploy usando SHA `8ff663cebdd905a551ac4dd68f569cf69ba3d8eb`.

## Homologação e riscos

- Ponto de coleta foi validado pelo proprietário e está salvo no painel; usar somente localização sintética.
- Confirmado no domínio: pagamento mock foi aprovado sem provedor externo; pedido seguiu até o checklist de entrega. Primeiro despacho sequencial expirou por localizações stale e os eventos ficaram registrados.
- IAB desktop: viewport observado em 1280×720; console sem erros no courier. IAB mobile: viewport 390×844; página courier sem overflow horizontal, console sem erros. Um screenshot mobile registrou a tela; confirmar visualmente novamente após o deploy.
- Ações pendentes no domínio: deploy #307; abrir novo pedido mock de entrega; atualizar localização dos dois couriers pouco antes do checklist; testar oferta sequencial, recusa e aceite, check-in, confirmação de coleta, status/ETA, chegada/entrega e avaliação. Confirmar que nenhuma cobrança, QR, WhatsApp ou chamada de provedor ocorreu.
- Homologação visual deve usar exclusivamente o navegador integrado do Codex. Viewport deve ser restaurado ao padrão depois das verificações mobile.

## Próxima ação exata

Implantar SHA `8ff663cebdd905a551ac4dd68f569cf69ba3d8eb`. No IAB, confirmar o CTA “Simular” e hint mock em viewport desktop e mobile; depois criar pedido mock novo e executar o fluxo courier com localizações renovadas imediatamente antes do checklist. Registrar screenshots/erros, corrigir e repetir. Ao concluir, deixar os dois couriers offline, resetar viewport do IAB e atualizar este checkpoint para completed com evidências.
