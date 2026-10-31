# Homologação CookLily com courier de teste e pagamentos simulados

- status: in_progress
- owner: AG-DEV
- branch: `cooklily/canonical`
- base_branch: `cooklily/canonical`
- base_sha_verified: `b1589083c60c6251726b44112dcf36f8f2a68804`
- head_sha_verified: `b1589083c60c6251726b44112dcf36f8f2a68804`
- pull_requests: [#305](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/305) merged em `5f40850f7350ec09c4638e30c87068b44e069d74`, CI `41177528187` passou; [#306](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/306) merged em `b1589083c60c6251726b44112dcf36f8f2a68804`, CI `41178440493` passou em todos os 8 jobs
- last_verified_at: 2026-10-31 06:59 UTC
- interruption_state: deploy #305 falhou com segurança antes de aplicar migration real; #306 corrigiu a tolerância para variação de gzip observada no mesmo Node 22 sem alterar chunks/lazy loading. Novo deploy ainda não iniciado.

## Entrega e estado

Objetivo: homologar o despacho de couriers de teste com localização sintética e pedido/pagamento sem efeitos financeiros externos.

- A canonical contém autenticação por chave para agentes courier de teste (PRs #303 e #304).
- PR #305 integrou localização sintética no ponto de coleta apenas para courier de teste autenticado por chave. A API usa as coordenadas configuradas e limpa origem/localização ao ficar offline ou expirar. Courier normal não pode simular localização.
- PR #305 integrou pagamento Pix mock para homologação, aprovado pelo valor calculado no servidor, sem rede, QR ou cobrança. Pedidos de homologação não enfileiram WhatsApp.
- Checkout permite homologação para staff/admin por MFA ou chave de agente.
- Migration `20261031120000_lily_courier_location_source` está integrada, ainda aguardando deploy no banco operacional.
- Ambos os couriers devem ficar offline ao final da homologação.

## Testes e gates

- `npm run policy:preflight -- --agent AG-DEV --scope lily-courier-homologation`: passou em 2026-10-31.
- `npm run test:lily-budget`: passou após merge; 4/4.
- `npm run build:lily`: passou após merge. JS bruto 607.82/608 KiB; JS gzip 192.96/193.50 KiB; JS inicial gzip 52.36/110 KiB; maior chunk 71.97/280 KiB; CSS gzip 35.34/36 KiB; JS+CSS gzip 228.30/229 KiB.
- `npm run check` e `npm test`: passaram no candidato antes da calibração final; suite 84 arquivos, 440 testes passaram, 3 ignorados. CI da versão integrada cobre novamente os testes e produção.
- CI #305 run `41177528187`: todos os 8 jobs passaram em Node 20, 22 e 24.
- CI #306 run `41178440493`: todos os 8 jobs passaram, incluindo testes e builds em Node 20, 22 e 24.
- Deployer do primeiro SHA: migrações temporárias/validadores e 81 arquivos/436 testes passaram; o build falhou antes de migration real em JS gzip 193.16/193 KiB (+0.16 KiB), e o deployer restaurou o checkout anterior.
- CI Node 22 e VPS Node 22 produziram JS bruto idêntico (607.82 KiB), gzip 192.96 KiB na CI e 193.16 KiB na VPS. PR #306 calibrou o limite individual para 193.50 KiB, preservando o teto combinado estrito de 229 KiB. Experimentos que faziam `customer-flow` entrar nos imports iniciais foram descartados.

## Migrations e deploy

- Migration pendente: `20261031120000_lily_courier_location_source`, que adiciona `courierLocationSource` a `LilyUser`.
- O deploy anterior abortou antes da migration real e retornou a VPS ao SHA `b181939417df1cbe429b789bcbb3be4ae356a91b`.
- Log do deploy abortado: `/srv/carro-chefe/data/deploy-logs/deploy-20261031-064340-5f40850f7350.log`.
- SHA integrado apto a novo deploy: `b1589083c60c6251726b44112dcf36f8f2a68804`.
- O próximo deploy deve usar `/usr/local/sbin/carro-chefe-deploy` com esse SHA e registrar resultado, SHA efetivo e status da migration.

## Homologação e riscos

- Ponto de coleta validado pelo proprietário e salvo no painel; localização em homologação deve ser sintética, sem GPS físico.
- O primeiro deploy não criou pedido, pagamento real, notificação nem chamada de provedor.
- Homologação funcional pendente no domínio: entrar com a conta staff/admin via chave, criar pedido de teste com pagamento mock, autenticar os dois couriers de teste por suas chaves dedicadas, ativá-los com localização sintética, verificar oferta sequencial/recusa/aceite/coleta/status e ETA/entrega/avaliação. Confirmar ausência de cobrança real e de envio WhatsApp.
- Homologação visual deve usar exclusivamente o navegador integrado do Codex, em desktop e mobile. A aba integrada foi reconectada com sucesso; painel mostra a sessão “Entregador teste 2” e informa que requer acesso staff.
- Colocar ambos os couriers offline ao final e verificar o estado final por UI.

## Próxima ação exata

Publicar este checkpoint atualizado sozinho em `cooklily/canonical` pelo script `tools/recovery/push-cooklily-checkpoint.ps1`. Em seguida executar o deploy do SHA `b1589083c60c6251726b44112dcf36f8f2a68804`; se passar, retomar a homologação no IAB em desktop e mobile, corrigir falhas com novo PR/deploy e atualizar o checkpoint após cada marco.
