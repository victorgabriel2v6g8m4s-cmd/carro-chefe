# Homologação CookLily com courier de teste e pagamentos simulados

- status: in_progress
- owner: AG-DEV
- branch: `codex/cooklily-courier-homologation-checkpoint`
- base_branch: `cooklily/canonical`
- base_sha_verified: `5f40850f7350ec09c4638e30c87068b44e069d74`
- head_sha_verified: `5f40850f7350ec09c4638e30c87068b44e069d74`
- pull_requests: [#305](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/305) — merged por squash em `5f40850f7350ec09c4638e30c87068b44e069d74`; CI run `41177528187` passou em todos os 8 jobs
- last_verified_at: 2026-10-31 06:42 UTC
- interruption_state: PR integrada; deploy e homologação real pendentes

## Entrega e estado

Objetivo: permitir homologar o despacho de couriers de teste com localização sintética restrita e pedido/pagamento sem efeitos financeiros externos.

- A canonical já contém autenticação por chave para agentes courier de teste, base do trabalho nos PRs #303 e #304.
- Implementada e integrada: courier de teste autenticado com chave de agente pode simular a localização do ponto de coleta; a API lê as coordenadas configuradas no servidor, persiste a origem `test-pickup` e limpa coordenadas/origem ao ficar offline ou após expiração. A API nega a simulação a courier comum ou sem chave de agente.
- Implementada e integrada: pagamento Pix homologado passa por provider mock que aprova o valor calculado pelo servidor sem rede externa, QR ou transação. Pedidos de homologação não enfileiram notificações WhatsApp. A proteção cobre a rota legada e o fluxo de escolha usado no checkout.
- Checkout: a opção de homologação também aparece a admin/staff autenticado por chave de agente, sem remover os requisitos existentes para sessão por senha/MFA.
- Migration `20261031120000_lily_courier_location_source` integrada; ainda precisa ser aplicada na VPS pelo deploy canônico.
- Ambos os couriers devem permanecer offline ao final da homologação.

## Testes e gates

- `npm run policy:preflight -- --agent AG-DEV --scope lily-courier-homologation`: passou em 2026-10-31.
- `npm run check`: passou (schema core/Lily válidos e TypeScript sem erros).
- Testes focados: 5 arquivos, 51 testes passaram (`agent-auth`, `logistics`, `payments`, `payment-choice`, `orders`).
- `npm run build` com lockfile: passou; orçamento CookLily: JS bruto 607.82/608 KiB, JS gzip 192.96/193 KiB, CSS gzip 35.34/36 KiB, JS+CSS gzip 228.30/229 KiB.
- `git diff --check`: passou antes da integração.
- Suíte completa: 84 arquivos, 440 testes passaram e 3 foram ignorados (443 total), usando pool de threads com 2 workers.
- Uma execução inicial do Vitest com o pool padrão ficou sem resposta; a tentativa com pool de threads concluiu a suíte acima.
- PR #305 CI run `41176741362` falhou inicialmente no build CookLily em Vite 8.2.1 (JS raw 608.03/608.00 KiB, gzip 193.05/193.00 KiB); os testes passaram em Node 20/22/24. O job Tool Health refletiu a mesma falha do build.
- O texto do controle de homologação foi reduzido para respeitar o limite. Build local com dependências travadas (Vite 8.2.1) passou em JS raw 607.82/608.00 KiB e gzip 192.96/193.00 KiB.
- Correção CI run `41177248118` passou em todos os 8 jobs, incluindo testes e build em Node 20/22/24 e Tool Health Linux.
- PR #305 revisada e integrada por squash; todos os 8 jobs do CI passaram.
- Deploy e homologação real ainda pendentes.

## Migrations

- Nova migration adiciona `courierLocationSource` à tabela `LilyUser`. Deve ser aplicada pelo deployer canônico com backup e gates.
- A VPS está ativa no SHA `b181939417df1cbe429b789bcbb3be4ae356a91b`, com checkout limpo e migration pendente. O SSH ao host autorizado foi verificado com a chave cujo fingerprint coincide com o previamente confirmado pelo proprietário.
- Deploy autorizado será executado com o SHA merge `5f40850f7350ec09c4638e30c87068b44e069d74` pelo `/usr/local/sbin/carro-chefe-deploy`.

## Homologação e riscos

- O ponto de coleta já foi salvo e conferido no painel da operação. O fluxo de courier segue pendente até a migration e o código chegarem à produção.
- IAB contém sessão autenticada do admin e rotas do painel, mas a UI pública ainda está na versão anterior ao deploy.
- Não foi criado pedido nesta execução; nenhum pagamento, notificação ou chamada de provedor real ocorreu.
- Depois do deploy: testar ativação sintética e sequência de oferta/aceite, confirmar status/ETA, concluir a entrega/avaliação se habilitada e verificar offline de ambos os couriers. Não usar GPS físico nem localização real do computador.
- Realizar conferência visual em desktop e mobile usando somente o navegador integrado do Codex. Não abrir navegador externo.

## Próxima ação exata

Executar `sudo /usr/local/sbin/carro-chefe-deploy 5f40850f7350ec09c4638e30c87068b44e069d74` na VPS; confirmar migration e health. Depois homologar checkout, disponibilidade, oferta, aceite, status/ETA, conclusão e avaliação no IAB em desktop/mobile, e deixar ambos os couriers offline.
