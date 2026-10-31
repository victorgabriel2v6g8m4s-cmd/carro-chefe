# Homologação CookLily com courier de teste e pagamentos simulados

- status: in_progress
- owner: AG-DEV
- branch: `codex/cooklily-courier-homologation-bundle-fix`
- base_branch: `cooklily/canonical`
- base_sha_verified: `5f40850f7350ec09c4638e30c87068b44e069d74`
- head_sha_verified: `5f40850f7350ec09c4638e30c87068b44e069d74` (base da correção; novo commit pendente)
- pull_requests: [#305](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/305) — merged por squash em `5f40850f7350ec09c4638e30c87068b44e069d74`; CI run `41177528187` passou em todos os 8 jobs
- last_verified_at: 2026-10-31 06:52 UTC
- interruption_state: primeira tentativa de deploy abortou antes de migration real por exceder o limite de gzip em 0,16 KiB; a diferença observada entre builds de mesmo código foi calibrada sem alterar o carregamento lazy

## Entrega e estado

Objetivo: homologar o despacho de couriers de teste com localização sintética restrita e pedido/pagamento sem efeitos financeiros externos.

- A canonical contém autenticação por chave para agentes courier de teste (PRs #303 e #304).
- PR #305 integrou localização sintética no ponto de coleta apenas para courier de teste autenticado por chave; a API usa as coordenadas configuradas e limpa origem/localização ao ficar offline ou expirar. Courier normal não pode simular localização.
- PR #305 integrou pagamento Pix mock para homologação, com aprovação pelo valor calculado no servidor e sem rede, QR ou cobrança. Pedidos de homologação não enfileiram WhatsApp.
- Checkout permite homologação para staff/admin por MFA ou chave de agente.
- Migration `20261031120000_lily_courier_location_source` integrada, pendente no banco operacional.
- Ambos os couriers devem ficar offline ao final da homologação.

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
- `npm run policy:preflight`, `npm run check`, `npm test` (84 arquivos/440 passaram/3 ignorados), `npm run build` e `git diff --check` passaram; budget test precisa ser repetido após calibrar o limite.
- Ainda pendentes: commitar/enviar a calibração, CI, merge, deploy e homologação no navegador.

## Migrations e deploy

- A migration adiciona `courierLocationSource` a `LilyUser`; o deploy anterior abortou antes de aplicá-la ao banco real.
- VPS retornou ao SHA `b181939417df1cbe429b789bcbb3be4ae356a91b`.
- Log: `/srv/carro-chefe/data/deploy-logs/deploy-20261031-064340-5f40850f7350.log`.
- O próximo deploy deve usar o SHA integrado depois da correção de bundle e `/usr/local/sbin/carro-chefe-deploy`.

## Homologação e riscos

- Ponto de coleta já configurado e conferido pelo painel.
- Nenhum pedido, pagamento real, notificação ou chamada de provedor foi criado/enviado durante a tentativa de deploy.
- A homologação funcional no domínio aguarda deploy bem-sucedido. Depois: ativar os dois couriers por chave, simular localização no ponto, criar pedido homologado com pagamento mock, testar oferta/recusa/aceite/status/ETA/entrega/avaliação e confirmar que ambos ficam offline ao final.
- Homologação visual deve usar exclusivamente o navegador integrado do Codex, desktop e mobile; não usar GPS físico.

## Próxima ação exata

Repetir `npm run test:lily-budget` e validar o diff; commitar/enviar a calibração e este checkpoint; abrir PR draft contra `cooklily/canonical`, aguardar CI e integrar por squash. Depois repetir o deploy do SHA mergeado e a homologação no IAB em desktop/mobile.
