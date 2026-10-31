# Homologação CookLily com courier de teste e pagamentos simulados

- status: in_progress
- owner: AG-DEV
- branch: `codex/cooklily-courier-homologation-bundle-fix` (checkpoint com deploy e homologação parcial) (reaberta para corrigir UX de pagamento identificada no IAB)
- base_branch: `cooklily/canonical`
- base_sha_verified: `5f40850f7350ec09c4638e30c87068b44e069d74`
- head_sha_verified: `5f4cc3d62feb1df4189290e32c38427fca498b72` (deploy da aplicação); correção do CTA mock não commitada
- pull_requests: [#305](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/305) merged `5f40850f7350ec09c4638e30c87068b44e069d74`, CI `41177528187`; [#306](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/306) merged `b1589083c60c6251726b44112dcf36f8f2a68804`, CI `41178440493`, oito jobs passaram
- last_verified_at: 2026-10-31 07:14 UTC
- interruption_state: deploy `ac88eb9c27b263bed212a5974cb4eb6b874ee49c` concluído; homologação parcial; CTA mock incorreto identificado e correção ainda sem commit/deploy

## Entrega e estado

Objetivo: homologar o despacho de couriers de teste com localização sintética restrita e pedido/pagamento sem efeitos financeiros externos.

- A canonical contém autenticação por chave para agentes courier de teste (PRs #303 e #304).
- PR #305 integrou localização sintética no ponto de coleta apenas para courier de teste autenticado por chave; a API usa as coordenadas configuradas e limpa origem/localização ao ficar offline ou expirar. Courier normal não pode simular localização.
- PR #305 integrou pagamento Pix mock para homologação, com aprovação pelo valor calculado no servidor e sem rede, QR ou cobrança. Pedidos de homologação não enfileiram WhatsApp.
- Checkout permite homologação para staff/admin por MFA ou chave de agente.
- Migration `20261031120000_lily_courier_location_source` aplicada ao banco operacional no deploy `ac88eb9c27b263bed212a5974cb4eb6b874ee49c`.
- Pedido mock de retirada `CL-2CCD986DEF0B` e entrega `CL-959F09B70771` criados; sem provedor, QR, cobrança ou WhatsApp; destino foi o endereço público da loja.\n- Pedido de entrega aceito pela cozinha, preparado, pronto e conferido. A fila ofereceu sequencialmente aos dois couriers; ambos expiraram/offline antes do aceite pois a localização sintética tem TTL de 90s. Criar pedido novo para repetir.\n- UI mock mostrava “Simular pagamento (sem cobrança)”, porém hint de contingência manual e CTA “Gerar Pix”. Correção local muda ambos; teste UX 8/8, suíte Lily 110/110 e typecheck passaram. Build excedeu JS raw em 0.02 KiB (608.02/608.00), ainda sem commit.\n- Ambos os couriers devem ficar offline ao final; courier 2 foi reativado durante diagnóstico.

## Testes e gates

- `npm run policy:preflight -- --agent AG-DEV --scope lily-courier-homologation`: passou em 2026-10-31.
- `npm run check`: passou.
- Testes focados: 5 arquivos, 51 testes passaram.
- Suíte completa local: 84 arquivos, 440 testes passaram e 3 ignorados.
- CI #305 run `41177528187`: todos os 8 jobs passaram, incluindo testes e build em Node 20, 22 e 24.
- Deployer remoto: migrations em bancos temporários e validadores passaram; runtime tests 81 arquivos/436 testes passaram.
- Primeiro build remoto falhou antes de qualquer migration real: JS gzip 193.16/193 KiB (+0.16 KiB). O deployer restaurou o checkout anterior.
- O build do mesmo SHA em CI Node 22 e VPS Node 22 produziu JS bruto idêntico (607.82 KiB), mas gzip 192.96 KiB na CI e 193.16 KiB na VPS. O teto combinado JS+CSS permaneceu abaixo do limite de 229 KiB.
- Experimentos de agrupamento de páginas reduziram gzip, mas faziam `customer-flow` entrar nos imports iniciais do manifest; foram descartados para preservar o carregamento lazy.
- Calibrado o limite individual JS gzip de 193.00 para 193.50 KiB, mantendo o limite combinado estrito em 229 KiB. Build local: JS raw 607.82/608 KiB; JS gzip 192.96/193.50 KiB; JS inicial gzip 52.36/110 KiB; chunk máximo 71.97/280 KiB; CSS gzip 35.34/36 KiB; JS+CSS gzip 228.30/229 KiB. O chunking original lazy permanece intacto.
- Preflight `lily-payment-choice-ux` passou. npm test via script falhou pois subprocesso não resolve npm no PATH; Vitest direto passou. Typecheck direto passou. Build: JS raw 608.02/608.00 KiB (+0.02), gzip 193.04/193.50, inicial 52.36/110, chunk máx 71.97/280, CSS gzip 35.34/36, agregado 228.38/229. Falta reduzir excesso raw sem alterar budget.
- Pendentes: reduzir 0.02 KiB raw, PR/CI/merge/deploy da correção e homologação final no IAB.

## Migrations e deploy

- A migration adiciona `courierLocationSource` a `LilyUser`; o deploy anterior abortou antes de aplicá-la ao banco real.
- VPS retornou ao SHA `b181939417df1cbe429b789bcbb3be4ae356a91b`.
- Log: `/srv/carro-chefe/data/deploy-logs/deploy-20261031-064340-5f40850f7350.log`.
- O próximo deploy deve usar o SHA integrado depois da correção de bundle e `/usr/local/sbin/carro-chefe-deploy`.

## Homologação e riscos

- Ponto de coleta já configurado e conferido pelo painel.
- Nenhum pedido, pagamento real, notificação ou chamada de provedor foi criado/enviado durante a tentativa de deploy.
- Deploy `ac88eb9c27b263bed212a5974cb4eb6b874ee49c` concluído, health/smoke passaram, migration aplicada e backup criado. Log `/srv/carro-chefe/data/deploy-logs/deploy-20261031-065929-ac88eb9c27b2.log`; backup `/srv/carro-chefe/data/backups/lily-acai-pre-ac88eb9c27b2-20261031-065929.db`.\n- Homologação parcial: pagamento mock e cozinha até pronto/checklist passaram; despacho sequencial expirou. Após correção e deploy, criar pedido novo, renovar localizações antes do checklist, testar recusa/aceite/coleta/status/ETA/entrega/avaliação.
- Homologação visual deve usar exclusivamente o navegador integrado do Codex, desktop e mobile; não usar GPS físico.

## Próxima ação exata

Reduzir 0.02 KiB JS raw sem alterar limites; repetir testes/typecheck/build; abrir PR da correção CTA/hint, aguardar CI, integrar e deployar. Depois no IAB desktop/mobile: pedido novo, localizações renovadas, oferta sequencial, recusa, aceite, coleta, status/ETA, entrega e avaliação; deixar couriers offline e publicar checkpoint final.
