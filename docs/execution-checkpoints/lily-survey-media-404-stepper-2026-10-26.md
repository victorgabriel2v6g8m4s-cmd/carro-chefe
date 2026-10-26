# CookLily — correção de mídia e fluxo de perguntas

- Tarefa: corrigir 404 das mídias de opção de pesquisa e exibir uma pergunta por tela.
- Responsável: AG-DEV.
- Estado: `in_progress`.
- Branch: `codex/lily-survey-media-routing-stepper`.
- Base branch: `cooklily/canonical`.
- Base SHA verificado: `ae3c728889cf56091fff012bba74baa40ebca03b`.
- HEAD verificado: `ae3c728889cf56091fff012bba74baa40ebca03b`.
- PRs: nenhum.
- Última verificação: 2026-10-26.
- Estado de interrupção: não interrompido.

## Evidência e causa

- O backend implementa `GET /api/v1/lily/survey-option-media/:mediaFile` e o upload retorna URLs nesse prefixo.
- Nginx só encaminhava `/api/v1/lily/surveys/` e `/api/v1/lily/notifications/`; o bloqueio `location ^~ /api/ { return 404; }` recebia a rota de mídia.
- A página de resposta renderizava `visibleQuestions` por inteiro quando `allowNavigation` era verdadeiro, o que fazia o padrão mostrar todas as perguntas juntas.

## Etapas

1. `[done]` Incluir o prefixo de mídia no helper idempotente do Nginx, template e precheck de deploy.
2. `[done]` Ajustar o formulário para uma pergunta por etapa, com voltar condicionado à configuração e consentimento no final.
3. `[done]` Testes de deploy 5/5, UI Lily 56/56, testes condicionais 2/2, `npm run check`, `npm run build` e `git diff --check` passaram.
4. `[in_progress]` PR draft, CI remoto e integração em `cooklily/canonical` pendentes.

## Migrations

- Nenhuma.

## Gates e testes

- `npm run check`: PASS.
- `npm run build`: PASS, orçamento CookLily aprovado.
- `node --test deploy/scripts/survey-ops.test.mjs`: PASS, 5/5.
- `npm run test:lily-ui -- --maxWorkers=1`: PASS, 11 arquivos/56 testes.
- `npx vitest run ... conditional.test.ts --maxWorkers=1`: PASS, 2/2.
- `npm test`: suítes auxiliares passaram; Vitest agregado não iniciou coleta neste executor Windows. Suítes específicas passaram.
- `git diff --check`: PASS.

## Bloqueios e homologação

- O usuário precisa rodar `sudo cc deploy canonical` para atualizar a rota ativa no VPS; após o deploy validar mídias autenticado no admin e como cliente.

## Próxima ação exata

1. Abrir PR draft para `cooklily/canonical`, aguardar CI e integrar após aprovação dos gates.
