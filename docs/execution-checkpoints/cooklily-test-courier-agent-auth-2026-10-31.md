# Homologação CookLily com courier de teste e pagamentos simulados

- status: in_progress
- owner: AG-DEV
- branch: `cooklily/canonical`
- base_branch: `cooklily/canonical`
- base_sha_verified: `b1589083c60c6251726b44112dcf36f8f2a68804`
- head_sha_verified: `ac88eb9c27b263bed212a5974cb4eb6b874ee49c` (deploy de aplicação; checkpoint será avançado depois da homologação)
- pull_requests: [#305](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/305) merged `5f40850f7350ec09c4638e30c87068b44e069d74`, CI `41177528187` passou; [#306](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/306) merged `b1589083c60c6251726b44112dcf36f8f2a68804`, CI `41178440493` passou em todos os 8 jobs
- last_verified_at: 2026-10-31 07:00 UTC
- interruption_state: deploy concluído; homologação funcional e visual no IAB ainda pendentes

## Entrega e estado

Objetivo: homologar o despacho de couriers de teste com localização sintética e pedido/pagamento sem efeitos financeiros externos.

- A canonical contém autenticação por chave para agentes courier de teste (PRs #303 e #304).
- PR #305 integrou localização sintética no ponto de coleta apenas para courier de teste autenticado por chave. A API usa as coordenadas configuradas e limpa origem/localização ao ficar offline ou expirar. Courier normal não pode simular localização.
- PR #305 integrou pagamento Pix mock para homologação, aprovado pelo valor calculado no servidor, sem rede, QR ou cobrança. Pedidos de homologação não enfileiram WhatsApp.
- Checkout permite homologação para staff/admin por MFA ou chave de agente.
- Migration `20261031120000_lily_courier_location_source` aplicada com sucesso ao banco operacional Lily.
- Ambos os couriers devem ficar offline ao final da homologação.

## Testes e gates

- `npm run policy:preflight -- --agent AG-DEV --scope lily-courier-homologation`: passou em 2026-10-31.
- `npm run test:lily-budget`: passou 4/4 após merge.
- `npm run build:lily`: local passou. JS raw 607.82/608 KiB; JS gzip 192.96/193.50 KiB; JS inicial gzip 52.36/110 KiB; maior chunk 71.97/280 KiB; CSS gzip 35.34/36 KiB; JS+CSS gzip 228.30/229 KiB.
- CI #305 run `41177528187` e CI #306 run `41178440493`: todos os 8 jobs passaram; suites/builds Node 20, 22 e 24.
- Deploy `ac88eb9c27b263bed212a5974cb4eb6b874ee49c`: build remoto JS gzip 193.16/193.50 KiB, CSS gzip 35.37/36 KiB e combinado 228.52/229 KiB; orçamento aprovado.
- Health checks Carro Chefe e Lily passaram; `external_smoke=ok` na tentativa 1.
- Deployer executou migrações em bancos temporários e operação; core sem pendências, migration Lily `20261031120000_lily_courier_location_source` aplicada.

## Migrations e deploy

- Deploy concluído para SHA `ac88eb9c27b263bed212a5974cb4eb6b874ee49c`.
- Log: `/srv/carro-chefe/data/deploy-logs/deploy-20261031-065929-ac88eb9c27b2.log`.
- Evidência: `/srv/carro-chefe/data/deploy-logs/deploy-20261031-065929-ac88eb9c27b2.evidence`.
- Backup pré-deploy da base Lily verificado em `/srv/carro-chefe/data/backups/lily-acai-pre-ac88eb9c27b2-20261031-065929.db`.
- A versão do site em produção está apta para homologação da entrega.

## Homologação e riscos

- Ponto de coleta validado pelo proprietário e salvo no painel; localização em homologação deve ser sintética, sem GPS físico.
- Testar apenas pedido de homologação com pagamento mock; não criar cobrança/QR, não disparar WhatsApp nem usar provedor externo.
- Ainda pendente no domínio: entrar com staff/admin por chave, criar pedido de homologação, autenticar os dois couriers de teste pelas chaves dedicadas, ativá-los com localização sintética, verificar oferta sequencial/recusa/aceite/coleta/status e ETA/entrega/avaliação e confirmar que não houve efeitos externos.
- Homologação visual deve usar exclusivamente o navegador integrado do Codex, desktop e mobile. A aba integrada foi reconectada com sucesso e exibiu “Acesso staff necessário” para a sessão “Entregador teste 2”.
- Colocar ambos os couriers offline ao final e verificar o estado final por UI.

## Próxima ação exata

Entrar no painel de entregas no navegador integrado usando a identidade admin de agente autorizada; depois conduzir a simulação com pedido mock e as duas contas courier de teste. Verificar o fluxo em viewport desktop e mobile, registrar screenshots/bugs, corrigir qualquer falha via PR e repetir merge/deploy/homologação. Ao terminar, desligar ambos os couriers e publicar o checkpoint final.
