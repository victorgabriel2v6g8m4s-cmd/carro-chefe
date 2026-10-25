# CookLily — liberar API de pesquisas no Nginx

- Tarefa: corrigir pesquisas publicadas que não aparecem para clientes.
- Responsável: AG-DEV.
- Estado: `merged`.
- Branch: `codex/fix-lily-survey-nginx` (integrada).
- Base branch: `cooklily/canonical`.
- Base SHA verificado: `306c0bdccea0cc206700c73e4721e4c7264346a1`.
- HEAD verificado: `4c810ee` (`fix(lily): proxy customer survey API routes (#181)`).
- PRs: [#181](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/181), merged por squash.
- Última verificação: 2026-10-25.
- Estado de interrupção: não interrompido.

## Concluído e persistido

- Checkpoint anterior e canonical foram confrontados; o merge do PR #179 e a atualização #180 estão em `origin/cooklily/canonical`.
- Endpoint público de health respondeu HTTP 200.
- `GET /api/v1/lily/surveys` e `GET /api/v1/lily/surveys/test/start` responderam HTTP 404 com HTML do Nginx, confirmando ausência do proxy para rotas de pesquisa.
- A configuração versionada libera `/public/`, `/auth/`, `/admin/`, pagamentos/pedidos/clientes, notificações e courier, mas omite `/surveys`.
- Preflight AG-DEV passou para `deploy/nginx`, `deploy/scripts`, `docs/execution-checkpoints` e `docs/lily-acai`.

## Em andamento

- Implementadas rotas exata e subrotas `/api/v1/lily/surveys` no template Nginx e no helper aplicado por `sudo cc deploy canonical`.
- Helper mantém backup, valida `nginx -t`, restaura em falha, é idempotente e aborta configuração parcial/desconhecida.
- Coletor de diagnóstico e testes detectam regressão do 404 HTML de pesquisas.
- Alterações commitadas em `93693d1964b19c206ac27df328bb379b9388a34d` e integradas à `cooklily/canonical` no merge `4c810ee`.

## Gates e testes

- Probes ao vivo: health HTTP 200; endpoint de pesquisas e início de pesquisa HTTP 404 Nginx (causa reproduzida).
- `node --test deploy/scripts/survey-ops.test.mjs`: PASS, 5 testes.
- `git diff --check`: PASS.
- `npm run check`: PASS.
- `npm test`: PASS, 56 arquivos; 307 aprovados, 3 ignorados.
- `npm run build`: PASS; aviso preexistente de chunk Vite acima de 500 KB.
- CI PR #181: 7/7 checks passaram (Node 20, Node 24, Tool Health Linux, Windows Supervisor, Workbook Snapshot, Excel Recipe Ubuntu e Windows).

## Migrations

- Nenhuma migration para esta correção de roteamento.

## Bloqueios/riscos

- O browser da VPS continua sem acesso público à rota até executar `sudo cc deploy canonical` após merge.
- A correção deve preservar o bloqueio genérico `/api/` e encaminhar autorização para validação no Fastify.

## Homologação/dependências externas

- Após deploy, verificar endpoint de pesquisas autenticado e confirmar que o card da pesquisa publicada aparece; repetir em mobile.

## Próxima ação exata

1. Proprietário executar `sudo cc deploy canonical` na VPS.
2. Após deploy, validar que `GET /api/v1/lily/surveys` sem cookie retorna erro JSON de autenticação, nunca HTML 404 do Nginx, e confirmar a pesquisa publicada pelo cliente autenticado em desktop e mobile.
