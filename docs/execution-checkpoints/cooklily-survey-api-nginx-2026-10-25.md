# CookLily — liberar API de pesquisas no Nginx

- Tarefa: corrigir pesquisas publicadas que não aparecem para clientes.
- Responsável: AG-DEV.
- Estado: `in_progress`.
- Branch: `codex/fix-lily-survey-nginx`.
- Base branch: `cooklily/canonical`.
- Base SHA verificado: `306c0bdccea0cc206700c73e4721e4c7264346a1`.
- HEAD verificado: `306c0bdccea0cc206700c73e4721e4c7264346a1` (alterações locais ainda não commitadas neste checkpoint).
- PRs: nenhum; branch pronta para publicar.
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
- Aguardando commit, PR, CI e integração em `cooklily/canonical`.

## Gates e testes

- Probes ao vivo: health HTTP 200; endpoint de pesquisas e início de pesquisa HTTP 404 Nginx (causa reproduzida).
- `node --test deploy/scripts/survey-ops.test.mjs`: PASS, 5 testes.
- `git diff --check`: PASS.
- `npm run check`: PASS.
- `npm test`: PASS, 56 arquivos; 307 aprovados, 3 ignorados.
- `npm run build`: PASS; aviso preexistente de chunk Vite acima de 500 KB.
- CI/PR: pendentes.

## Migrations

- Nenhuma migration para esta correção de roteamento.

## Bloqueios/riscos

- O browser da VPS continua sem acesso público à rota até o próximo `sudo cc deploy canonical` após merge.
- A correção deve preservar o bloqueio genérico `/api/` e encaminhar autorização para validação no Fastify.

## Homologação/dependências externas

- Após deploy, verificar endpoint de pesquisas autenticado e confirmar que o card da pesquisa publicada aparece; repetir em mobile.

## Próxima ação exata

1. Commitar e publicar as alterações desta branch.
2. Abrir PR para `cooklily/canonical`, aguardar CI e integrar com o SHA esperado.
3. Atualizar checkpoint após merge e orientar o proprietário a executar `sudo cc deploy canonical`.
