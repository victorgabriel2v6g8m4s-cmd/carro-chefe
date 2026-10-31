# Despacho próprio sequencial e avaliação pós-pedido

- **Data:** 31/10/2026
- **Estado:** implementação candidata; integração, deploy e homologação real pendentes.
- **Branch:** `codex/cooklily-courier-dispatch-ratings`
- **Base canônica verificada:** `6da73bcdb064786cef80f7dd1269c7c6790206d2`
- **Decisão:** ADR 004; somente entregadores CookLily, sem operador externo/raio fixo, oferta individual por proximidade; V1 com status/ETA; avaliação por dimensões.

## Implementação

- Disponibilidade manual do courier com geolocalização temporária; coordenadas são limpas ao ficar offline e localização com mais de 90 segundos deixa de habilitar despacho.
- Oferta ordenada por distância geodésica, um courier por pedido por vez. Recusa, expiração, saída de disponibilidade e posição antiga liberam a próxima tentativa; cada tentativa fica registrada.
- Painel de entrega aceita timeout configurável (15–300 segundos; padrão 60) e coordenadas pareadas do ponto de coleta. Sem coordenadas, o dispatcher não oferece pedido.
- Restaurante registra aceite com previsão inicial de preparo ou recusa com motivo. Se pedido pago for recusado, fica cancelado com estorno em `pending_confirmation`; nenhum caminho afirma que o provedor já estornou.
- Checklist de expedição registra responsável e horário antes de abrir oferta.
- Customer acompanha estados e ETA não ao vivo; notificação de aceite reaproveita outbox/consentimento.
- Avaliação exige titular autenticado e pedido concluído; aceita uma ou mais dimensões (loja, entrega, plataforma), notas 1–5 e comentários opcionais de até 500 caracteres. Uma avaliação por pedido.
- Migration aditiva acrescenta dados de disponibilidade/oferta, decisão/checklist, coordenadas/timeout e tabela única `LilyOrderReview`.

## Configuração pelo proprietário

Passo a passo para contas, segredo operacional, coordenadas, timeout, rotina de cozinha, courier, ETA e homologação está em [`GUIA_CONFIGURACAO_DISPATCH_COOKLILY_2026-10-31.md`](GUIA_CONFIGURACAO_DISPATCH_COOKLILY_2026-10-31.md).

## Verificações já executadas

- TypeScript raiz e build TypeScript da API — passaram.
- Testes puros courier/review — 4 passaram.
- Prisma validate no schema CookLily — passou.
- `git diff --check` — passou na revisão atual.
- A migration foi aplicada via SQLite stdlib a um banco em memória preparado com o schema-base da canonical — sucesso (81 tabelas após a migration). `prisma migrate deploy` em arquivo SQLite descartável ainda termina com `Schema engine error:` sem diagnóstico neste runtime Windows; confirmar no CI/Linux antes do deploy.
- Suite de integração usa `better-sqlite3`, cujo binding nativo Windows não está disponível neste worktree; as novas rotas e integrações aguardam execução no CI.
- Tool-health e deploy-validation: 18 testes passaram; 4 testes que criam SQLite falharam antes da execução por falta do mesmo binding nativo.
- Build Vite da página institucional e build Vite da Lily — passaram localmente. Métricas do build local: JS raw 606.38 KiB, JS gzip 192.35 KiB, CSS raw 179.11 KiB, CSS gzip 35.34 KiB, JS+CSS gzip 227.69 KiB, entrypoint JS gzip 52.11 KiB. Tetos separados são 193 KiB JS e 36 KiB CSS; o agregado é 229 KiB, a soma desses tetos. Limites do entrypoint e maior chunk permanecem iguais.
- CI Linux mediu 228.09 KiB JS+CSS gzip no Vite 8.2.1, enquanto o build local Vite 8.3.5 mediu 227.69 KiB. O teto agregado anterior de 228 KiB foi 0.09 KiB abaixo do resultado Linux; alinhado à soma dos limites separados sem alterar os assets ou os limites individuais.
- Teste do budget após o alinhamento do agregado/fixture: 4/4 passaram; medição local termina em `build_budget=ok`.

## Pendências antes de produção

- Testes completos de API, schema e build no CI; corrigir regressões identificadas.
- `prisma migrate deploy` validado em ambiente suportado e banco isolado.
- PR integrado à canonical.
- Deploy controlado com backup e migration.
- Homologação exclusiva no navegador integrado Codex, desktop e mobile: staff/cozinha, courier, cliente, recusa/timeout, privacidade e avaliação. Nenhum pedido real deve ser criado para homologação.
- Preencher coordenadas de produção e validar ETA/provider antes de ativar pedidos de teste no domínio.
- Política de moderação/retenção de avaliações e procedimentos completos para cliente ausente, devolução/cancelamento e reembolso ainda exigem decisão operacional.
