# CookLily — reparo do editor e cards de pesquisas

- Tarefa: corrigir envio/reload ao adicionar resposta, rotear notificações no Nginx, substituir a lista do painel por cards selecionáveis com preview/estatísticas reutilizável, suspender a criação de missões na interface, e incluir coletor de diagnóstico seguro para a VPS.
- Responsável: AG-DEV.
- Estado: `merged`.
- Branch: `codex/cooklily-survey-admin-cards`.
- Base branch: `cooklily/canonical`.
- Base SHA verificado: `47eb0977e21e20bad63de704ad7e4ab6372e9820`.
- HEAD verificado: `fb8a09c5fe2178fd0ba080526bd3b728428276de` (squash merge em `cooklily/canonical`).
- PR: [#179](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/179), merged em 2026-10-25; head `8bcd92c487d2fb8835705ff5891a59223f72c041`.
- Última verificação: 2026-10-25; `npm run check`, `npm test` e `npm run build` passaram localmente.
- Estado de interrupção: não interrompido; entrega concluída e aguardando deploy/homologação do proprietário.

## Concluído e persistido

- Preflight AG-DEV passou para `apps/lily_acai`, `apps/api/src/modules/lily`, `deploy/scripts` e `docs/execution-checkpoints`.
- Revisão do fluxo confirmou form HTML aninhado em `ItemListEditor` e rota de notificações ausente do Nginx versionado, apesar da rota existir no Fastify; o bloqueio genérico `/api/` explica o 404 observado.
- Branch nova criada a partir da `cooklily/canonical` verificada.
- Causa do reload corrigida: removido formulário HTML aninhado do editor de opções; botão agora não submete o formulário de pesquisa e Enter é tratado sem submit nativo.
- Criação de missão removida temporariamente do painel; edição e publicação de pesquisas permanecem acessíveis.
- Lista administrativa substituída por cards com seleção simples, preview por clique duplo e estatísticas em componente reutilizável também na página de resultados.
- Contadores e gráficos alimentados por endpoint staff-only; visualizações identificadas por ID aleatório de sessão, sem associação à conta; respostas textuais não entram nos agregados de opções.
- Duração por questão acumulada na participação e métricas agregadas persistidas em migration aditiva Lily.
- Nginx recebe rotas de notificações no template e em helper idempotente com backup, `nginx -t` e reload; `cc deploy canonical` instala/aplica o helper antes do precheck.
- Script de diagnóstico `deploy/scripts/diagnose-cooklily-access` coleta estado, DNS/HTTPS/TLS e logs limitados/redigidos, imprime e grava relatório `.txt` com modo 0600.
- Teste de migration executado em SQLite em memória; sem alteração em banco operacional local.

## Em andamento

- Homologação real após deploy pelo proprietário.

## Gates e testes

- `npm run check`: PASS (Prisma generate/validate de ambos schemas + TypeScript).
- `npm test`: PASS (56 arquivos, 307 testes passaram, 3 ignorados; inclui 5 testes de helper/diagnóstico/migration SQLite).
- `npm run build`: PASS, incluindo build Lily e budget (`build_budget=ok`; aviso Vite de chunk >500 kB).
- `git diff --check`: PASS.
- Teste unitário analytics: PASS (3/3); migration SQLite e scripts: PASS (5/5).
- Playwright local com respostas mockadas: botão “Adicionar resposta” incluiu opção e manteve URL; duplo clique abriu preview; viewport 390 px permaneceu sem overflow horizontal. API local não estava ligada e endpoints não mockados apresentaram erro esperado.
- CI do PR #179 no head `8bcd92c`: Excel Recipe windows/ubuntu, Workbook Snapshot, Windows Supervisor, Quality Node 20/24 e Tool Health Linux PASS. Revisões: nenhuma.
- CI pós-merge no SHA `fb8a09c`: todos os sete checks PASS.
- Merge squash confirmado: `fb8a09c5fe2178fd0ba080526bd3b728428276de`.

## Migrations

- Criada: `20261025153000_lily_survey_analytics` adiciona `questionTimesJson`, tabela de visualizações por sessão anônima e métricas agregadas por pergunta/opção.

## Bloqueios/riscos

- A rota 404 é produzida pelo fallback restritivo do Nginx; será aplicada automaticamente por `sudo cc deploy canonical`, com backup e precheck `nginx -t`.
- Métricas não devem expor resposta individual ao cliente; endpoints de estatística e resultados permanecem staff/admin autorizados.
- Deploy e migração de produção ainda não executados; o proprietário fará `sudo cc deploy canonical` e homologação.

## Homologação/dependências externas

- Após o deploy: testar adicionar/remover opção sem navegação, salvar/pesquisar/publicar, obter `/api/v1/lily/notifications` autenticado, abrir preview por clique duplo, métricas e rota em mobile.
- O proprietário executará o coletor após tentativa do usuário afetado e fornecerá o TXT resultante se a falha persistir.

## Próxima ação exata

1. Proprietário executa `sudo cc deploy canonical` na VPS.
2. Após tentativa do usuário, executar `sudo bash /srv/carro-chefe/current/deploy/scripts/diagnose-cooklily-access --minutes 20` e compartilhar o TXT privado se o erro persistir.
