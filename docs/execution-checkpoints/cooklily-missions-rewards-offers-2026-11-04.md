# Missões, recompensas e ofertas CookLily

- status: interrupted/unknown
- owner: Codex
- branch: codex/cooklily-missions-rewards-direct-release
- base_branch: cooklily/canonical
- base_sha_verified: e4e7bc352d31b55b8da2dc37bfa77a4799cd2a65
- head_sha_verified: e4e7bc352d31b55b8da2dc37bfa77a4799cd2a65
- pull_requests: nenhum
- last_verified_at: 2026-11-04 America/Sao_Paulo
- interruption_state: tracked edits were removed during temporary worktree cleanup; tracked files restored to HEAD; no code commit or deployment was made

## Objetivo

Implementar upload de avatar, CTAs e celebração de missões, convites/códigos no dashboard, missões encadeadas e sequência diária, entitlements gratuitos, recompensas por LilyCoins e ofertas segmentadas; centralizar componentes globais auditando duplicatas reais; preparar release CookLily pelo processo homologado.

## Fatos verificados antes da interrupção

- O worktree começou limpo em `e4e7bc352d31b55b8da2dc37bfa77a4799cd2a65`; seu HEAD continua nesse SHA e não há alterações de código agora.
- O fluxo canônico confirmado é staging, release candidata e promoção por administrador para `licalily.com/cook/`.
- Antes da limpeza, `npx prisma validate`, 6 testes focados, `npx tsc --noEmit -p tsconfig.json` passaram.
- Depois da inicialização do banco local isolado, `npm run test:runtime` passou: 86 arquivos, 447 testes aprovados, 3 ignorados.
- O `npm run build` antes da interrupção falhou no orçamento: JS 687.74 KiB / 650 KiB; gzip JS 216.73 / 207 KiB; CSS 205.58 / 200 KiB; JS+CSS gzip 258.39 / 248 KiB.
- Uma build do `HEAD` limpo em worktree temporário passou: JS 649.63 KiB, gzip JS 205.55 KiB, CSS 199.88 KiB, JS+CSS gzip 246.52 KiB.
- A remoção do worktree temporário removeu os arquivos rastreados modificados deste worktree. Eles foram restaurados ao `HEAD`. A migration de missão e os componentes da tentativa não estão presentes.
- O preparador local aplicou as 44 migrations atuais, incluindo a migration temporária, ao `.runtime/lily-acai.db` ignorado. Nenhuma migration foi aplicada em produção.
- Foi encontrada uma implementação relacionada em outro repositório/worktree CookLily, com alterações locais não commitadas; esse checkout não foi alterado nem integrado.

## Estado atual

- Nenhuma alteração de produto permanece no worktree. Apenas este checkpoint está sem commit.
- Não houve PR, deploy, release ou homologação desktop/mobile.
- O build falhou no orçamento antes da interrupção; não relaxar o limite para esconder a regressão.

## Gates e testes

- O resultado anterior de `npm run test:runtime` não representa o estado atual restaurado; repetir os gates após reconstruir as alterações.
- Após reconstruir: `npm run test:runtime`, `npm run check`, `npm run build`, testes focados de autorização/idempotência/limites/migration e homologação integrada desktop/mobile.

## Migrations

- Nenhuma migration de entrega está presente no worktree restaurado.
- A migration temporária foi aplicada somente ao banco local ignorado e removida junto com os arquivos rastreados; não foi aplicada à produção.

## Bloqueios/riscos

- Implementar e validar resgates de combo/oferta/VIP, limite recorrente por missão e oferta aplicada a múltiplos itens antes de declarar suporte completo.
- Reduzir a regressão do orçamento de bundle sem alterar os limites aprovados.
- A promoção pública depende de gates, homologação e ação de administrador no fluxo de releases.

## Critério obrigatório de homologação ponta a ponta

Além dos fluxos de missões/recompensas, a homologação da entrega deve percorrer a sequência de pedido com dados e meios estritamente de teste, sem cobrança ou estorno financeiro real:

1. Cliente fecha pedido e recebe no WhatsApp a confirmação de recebimento, resumo do pedido, ação para pagar e ação para editar.
2. Validar pagamento aprovado no sandbox e a mensagem de confirmação com ações de acompanhar e cancelar, respeitando a janela configurada.
3. Validar cancelamento dentro da janela e fora dela; quando houver pagamento capturado, confirmar que o estorno é solicitado/idempotente e que o pedido só informa estorno concluído após confirmação autoritativa do provedor.
4. Confirmar que pedido pago aparece na cozinha; preparar, marcar pronto, embalar/conferir e liberar para despacho.
5. Percorrer despacho sequencial dos entregadores disponíveis, aceite, chegada à coleta, confirmação de coleta, saída para entrega, chegada ao cliente e conclusão com códigos/estados esperados.
6. Confirmar as mensagens WhatsApp de cada etapa operacional, sem duplicidade e com opt-in válido; verificar templates aprovados na Meta antes de qualquer envio real.
7. Executar também recusa/timeout e falhas controladas de pagamento/estorno, registrar reconciliação e conferir que a operação não avança incorretamente.

Critério de aceite: registrar evidência de cada etapa, estados de pedido/pagamento/estorno, eventos de cozinha/entrega e mensagens recebidas; corrigir falhas e repetir o cenário afetado. Se uma configuração externa, aprovação de template ou sandbox estiver indisponível, marcar a etapa como bloqueada/inconclusiva e não declarar homologação integral nem publicar release público.

## Próxima ação exata

Reconstruir a entrega com base no `HEAD` canônico ou escolher conscientemente a implementação relacionada no checkout CookLily já existente; manter o limite do bundle, rerodar todos os gates e, antes de qualquer release público, homologar também a sequência ponta a ponta acima (WhatsApp, pagamento, estorno, cozinha, despacho, entrega e cancelamento).
