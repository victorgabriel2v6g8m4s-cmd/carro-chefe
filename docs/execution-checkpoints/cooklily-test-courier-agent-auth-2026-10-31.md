# Homologação CookLily com courier de teste e pagamentos simulados

- status: in_progress
- owner: AG-DEV
- branch: `cooklily/canonical`
- base_branch: `cooklily/canonical`
- base_sha_verified: `263ba8163dedb8d6e67bd01b268c11f9d60fef50`
- head_sha_verified: `8ff663cebdd905a551ac4dd68f569cf69ba3d8eb` (deploy em produção)
- pull_requests: [#305](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/305) merged `5f40850f7350ec09c4638e30c87068b44e069d74`, CI `41177528187`; [#306](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/306) merged `b1589083c60c6251726b44112dcf36f8f2a68804`, CI `41178440493`; [#307](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/307) merged `8ff663cebdd905a551ac4dd68f569cf69ba3d8eb`, CI `41180053324` (8/8 passou)
- last_verified_at: 2026-10-31 07:27 UTC
- interruption_state: deploy #307 concluído; homologação restante deve continuar no IAB

## Entrega e estado

Objetivo: homologar despacho de couriers de teste com localização sintética restrita e pedido/pagamento sem efeitos externos.

- A canonical contém autenticação por chave para couriers de teste (PRs #303 e #304).
- PR #305 implementou localização sintética de teste no ponto de coleta apenas para courier de teste autenticado por chave; API usa coordenadas configuradas e remove localização ao ficar offline ou expirar; courier normal não pode simular localização.
- PR #305 implementou pagamento mock aprovado pelo total calculado no servidor, sem rede, QR ou cobrança. Pedidos de homologação não enfileiram WhatsApp.
- Checkout de homologação permitido para staff/admin autorizados.
- Migration `20261031120000_lily_courier_location_source` aplicada em produção.
- Pedidos mock de retirada `CL-2CCD986DEF0B` e entrega `CL-959F09B70771` criados; sem provedor, QR, cobrança ou WhatsApp. O pedido de entrega anterior foi até pronto e checklist, mas ofertas sequenciais expiraram porque localizações venceram o TTL de 90 s; couriers tentados não podem ser reofertados nesse pedido.
- PR #307 corrige o hint do provedor mock e muda o CTA para “Simular”/“Processando...”.
- Courier teste 2 foi explicitamente posto offline e confirmado na UI mobile; verificar ambos de novo ao final.

## Testes e gates

- Preflight `lily-courier-homologation` e `lily-payment-choice-ux`: passaram.
- Testes CookLily: 25 arquivos/110 testes; typecheck e `git diff --check` passaram.
- Build local e budget: JS bruto 607.94/608 KiB; JS gzip 193.01/193.50; inicial 52.36/110; chunk máximo 71.97/280; CSS gzip 35.34/36; combinado 228.36/229.
- CI PR #305 `41177528187`: 8/8; PR #306 `41178440493`: 8/8; PR #307 `41180053324`: 8/8.
- CI #307: [run](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/actions/runs/41180053324).
- Deploy `8ff663cebdd905a551ac4dd68f569cf69ba3d8eb`: migrations temporárias e operacionais sem pendências; check/types e testes runtime passaram; build remoto JS raw 607.94/608 KiB, JS gzip 193.22/193.50, CSS gzip 35.37/36, agregado 228.59/229; health Carro Chefe/Lily e smoke externo passaram na primeira tentativa.

## Migrations e deploy

- Deploy `8ff663cebdd905a551ac4dd68f569cf69ba3d8eb` concluído às 2026-10-31 07:26 UTC. Log `/srv/carro-chefe/data/deploy-logs/deploy-20261031-072234-8ff663cebdd9.log`; evidência `/srv/carro-chefe/data/deploy-logs/deploy-20261031-072234-8ff663cebdd9.evidence`.
- Backups pré-deploy verificados: core `/srv/carro-chefe/data/backups/carro-chefe-pre-8ff663cebdd9-20261031-072234.db`; Lily `/srv/carro-chefe/data/backups/lily-acai-pre-8ff663cebdd9-20261031-072234.db`.

## Homologação e riscos

- Ponto de coleta validado pelo proprietário e salvo no painel. Usar somente localização sintética.
- Nenhuma cobrança, QR, WhatsApp ou chamada de provedor em pedidos mock.
- IAB desktop 1280×720: console courier sem erros. IAB mobile 390×844: página courier sem overflow horizontal, console sem erros; viewport precisa reset ao concluir. Capturas da UI ficaram nas abas temporárias, não são arquivos versionados.
- Confirmar após deploy CTA “Simular” e hint do pagamento mock, desktop e mobile.
- Criar pedido novo de entrega mock; atualizar localização de ambos imediatamente antes do checklist; testar oferta sequencial, recusa/aceite, check-in, confirmação de coleta, status/ETA, chegada, entrega e avaliação. Não criar integração externa. Deixar couriers offline no final.
- Homologação real exclusivamente no navegador integrado Codex; viewport resetado depois das medidas móveis.

## Próxima ação exata

No IAB, confirmar CTA/hint em desktop e mobile, criar pedido novo mock, percorrer cozinha, dispatch sequencial com localizações frescas, recusa/aceite, coleta, atualização ETA/status, entrega e avaliação. Corrigir/reimplantar/repetir se houver falha. Desativar ambos couriers e verificar offline, resetar viewport e atualizar este checkpoint como completed com evidências.
