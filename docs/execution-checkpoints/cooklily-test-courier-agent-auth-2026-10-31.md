# Homologação CookLily com courier de teste e pagamentos simulados

- status: in_progress
- owner: AG-DEV
- branch: `codex/cooklily-courier-homologation`
- base_branch: `cooklily/canonical`
- base_sha_verified: `dbab273eda00de6dfe203e58448faa225bd07274`
- head_sha_verified: `650fa04d995cdbc93ec7b5a03771380f5731ce53`
- pull_requests: [#305](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/305) — draft aberto contra `cooklily/canonical`; CI run `41176718321` enfileirado
- last_verified_at: 2026-10-31 06:25 UTC
- interruption_state: retomada após bloqueio do IAB; implementação local concluída, homologação de produção pendente

## Entrega e estado

Objetivo: permitir homologar o despacho de couriers de teste com localização sintética restrita e pedido/pagamento sem efeitos financeiros externos.

- A canonical já contém autenticação por chave para agentes courier de teste, base do trabalho nos PRs #303 e #304.
- Alteração local: courier de teste autenticado com chave de agente pode simular a localização do ponto de coleta; a API lê as coordenadas configuradas no servidor, persiste a origem `test-pickup` e limpa coordenadas/origem ao ficar offline ou após expiração. A API nega a simulação a courier comum ou sem chave de agente.
- Alteração local: pagamento Pix homologado passa por provider mock que aprova o valor calculado pelo servidor sem rede externa, QR ou transação. Pedidos de homologação não enfileiram notificações WhatsApp. A proteção cobre a rota legada e o fluxo de escolha usado no checkout.
- Checkout: a opção de homologação também aparece a admin/staff autenticado por chave de agente, sem remover os requisitos existentes para sessão por senha/MFA.
- Migration local: `20261031120000_lily_courier_location_source`; schema Prisma correspondente.
- Ambos os couriers devem permanecer offline ao final da homologação.

## Testes e gates

- `npm run policy:preflight -- --agent AG-DEV --scope lily-courier-homologation`: passou em 2026-10-31.
- `npm run check`: passou antes do commit `8e06742` (schema core/Lily válidos e TypeScript sem erros).
- Testes focados: 5 arquivos, 51 testes passaram (`agent-auth`, `logistics`, `payments`, `payment-choice`, `orders`).
- `npm run build`: passou; orçamento CookLily: JS bruto 607.20/608 KiB, JS gzip 192.64/193 KiB, CSS gzip 35.34/36 KiB, JS+CSS gzip 227.98/229 KiB.
- `git diff --check`: passou antes do commit `8e06742`.
- Suíte completa: 84 arquivos, 440 testes passaram e 3 foram ignorados (443 total), usando pool de threads com 2 workers.
- Uma execução inicial do Vitest com o pool padrão ficou sem resposta; a tentativa com pool de threads concluiu a suíte acima.
- CI do PR, revisão, merge, deploy e homologação real ainda pendentes.

## Migrations

- Nova migration adiciona `courierLocationSource` à tabela `LilyUser`. Deve ser aplicada pelo deployer canônico com backup e gates.
- Não foi feita escrita na VPS nesta retomada.

## Homologação e riscos

- O ponto de coleta já foi salvo e conferido no painel da operação. O fluxo de courier segue pendente até a migration e o código chegarem à produção.
- IAB contém sessão autenticada do admin e rotas do painel, mas a UI pública ainda está na versão anterior ao deploy.
- Não foi criado pedido nesta execução; nenhum pagamento, notificação ou chamada de provedor real ocorreu.
- Depois do deploy: testar ativação sintética e sequência de oferta/aceite, confirmar status/ETA, concluir a entrega/avaliação se habilitada e verificar offline de ambos os couriers. Não usar GPS físico nem localização real do computador.
- Realizar conferência visual em desktop e mobile usando somente o navegador integrado do Codex. Não abrir navegador externo.

## Próxima ação exata

Concluir a execução integral de testes; revisar o diff; registrar o resultado; commitar e enviar a branch, abrir PR draft contra `cooklily/canonical`, aguardar CI/revisão e integrar por squash. Em seguida executar o deploy pelo procedimento canônico, homologar no IAB em desktop e mobile e manter ambos os couriers offline ao terminar.
