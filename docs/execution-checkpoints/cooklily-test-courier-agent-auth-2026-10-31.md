# Autenticação por chave e homologação de couriers de teste CookLily

- status: blocked
- owner: AG-DEV
- branch: `codex/cooklily-test-courier-bundle-fix`
- base_branch: `cooklily/canonical`
- base_sha_verified: `b181939417df1cbe429b789bcbb3be4ae356a91b`
- head_sha_verified: `01eea446242b388f2e45ebb7f8a65af8c0ff0cc2`
- pull_requests: [#303](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/303) — merged as `0bcc615e7348e08c221e6485f60e0274fea1a58d`; [#304](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/304) — merged as `b181939417df1cbe429b789bcbb3be4ae356a91b`
- last_verified_at: 2026-10-31 06:03 UTC
- interruption_state: deploy validado; homologação do despacho interrompida por permissão Geolocation indisponível no IAB e ausência de sandbox de pagamento isolado

## Concluído e persistido

- Implementação da autenticação por chave e proteção para contas courier de teste integrada à canonical nos PRs #303 e #304.
- A flag de teste sozinha não altera autenticação. Contas sem identidade de agente mantêm senha/MFA; agentes dedicados usam chave Ed25519 exclusiva.
- Duas chaves Ed25519 distintas foram provisionadas para as contas courier de teste. Somente chaves públicas foram registradas no servidor; nenhuma chave privada foi exibida ou versionada.
- Deploy do SHA `b181939417df1cbe429b789bcbb3be4ae356a91b` concluiu. Serviço ativo, sem migration pendente; log `/srv/carro-chefe/data/deploy-logs/deploy-20261031-054247-b181939417df.log`.
- CI do PR #304, run `41173396639`, passou. `npm run check`, `npm test` (84 arquivos, 438 aprovados, 3 ignorados) e `npm run build` passaram antes da integração.
- No navegador integrado, courier autenticou e carregou `/lilyacai/entregas`; `/lilyacai/painel` negou acesso staff. Desktop 1440×900 e mobile 390×844 carregaram sem overflow horizontal.
- Coordenadas do ponto de coleta lidas no painel: latitude `-20.401107788085938`, longitude `-54.58594512939453`; prazo de oferta configurado em 60 segundos.

## Em andamento

- Homologação de disponibilidade e despacho ainda não concluída. Ambos couriers seguem offline.
- Proprietário autorizou a posição sintética do ponto de coleta nas abas temporárias do navegador integrado. Foi aplicado override de geolocalização à aba courier, mas a permissão Geolocation continuou indisponível e a página não emitiu PUT para o servidor.

## Gates e testes

- `npm run policy:preflight -- --agent AG-DEV --scope lily-test-courier-auth`: passou na execução anterior.
- `git diff --check`: passou após atualização deste checkpoint.
- A página courier recarregada no domínio real confirmou “Ative para receber ofertas de entrega”; courier 1 offline, sem entregas abertas ou histórico. Courier 2 não foi ativado.
- Nenhum pedido, oferta ou pagamento foi criado.

## Migrations

- Nenhuma migration nova para PR #304; migration de logística foi aplicada no deploy anterior.

## Bloqueios/riscos

- O navegador integrado Codex não ofereceu uma interface/API suportada para conceder permissão de localização. O override sintético de latitude/longitude não é suficiente. Nenhuma coordenada foi enviada ao backend.
- O modo `x-lily-homologation: 1` marca pedidos como homologação e permite contornar loja fechada, mas não isola pagamentos. A rota `apps/api/src/modules/lily/payments.ts` continua chamando `lilyPaymentProvider(...).createPayment(...)` para pedido de homologação. Não criar pagamento/checkout, pois pode gerar cobrança real.
- Para continuar, é necessária uma permissão de geolocalização funcional no IAB ou rota de teste estritamente controlada com coordenadas sintéticas, e um provider mock/sandbox para pedidos de homologação que prove não chamar o provedor financeiro externo.

## Homologação/dependências externas

- Autenticação e restrição de papel homologadas no domínio real, apenas pelo navegador integrado.
- Disponibilidade, oferta sequencial, recusa/expiração, aceite, status/ETA, coleta e avaliação permanecem não homologados.
- O modo desktop/mobile foi visualmente conferido para a rota courier; o fluxo funcional de entrega está bloqueado pelas condições acima.

## Próxima ação exata

Implementar e revisar um caminho de homologação sem efeitos financeiros externos (mock provider isolado) e disponibilizar localização sintética sem depender de permissão Geolocation do browser, ou liberar essa permissão no próprio IAB. Só então testar disponibilidade, oferta sequencial, recusa/expiração, aceite, status/ETA, coleta e avaliação em desktop/mobile. Manter ambos couriers offline ao final e atualizar este checkpoint.
