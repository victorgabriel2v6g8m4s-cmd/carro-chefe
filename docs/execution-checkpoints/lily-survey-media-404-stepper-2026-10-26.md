# CookLily — correção de mídia e fluxo de perguntas

- Tarefa: corrigir 404 das mídias de opção de pesquisa e exibir uma pergunta por tela.
- Responsável: AG-DEV.
- Estado: `merged`.
- Branch: `cooklily/canonical`.
- Base branch: `cooklily/canonical`.
- Base SHA verificado: `ae3c728889cf56091fff012bba74baa40ebca03b`.
- HEAD verificado: `019b8278b45388946a113f5c88c5881c6ea14697`.
- PRs: [#191](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/191), merged.
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
4. `[done]` PR #191 integrado com squash em `cooklily/canonical`; CI passou em Node 20/24, Linux/Windows Excel Recipe, Tool Health, Windows Supervisor e Workbook Snapshot.

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

1. Usuário executa `sudo cc deploy canonical`; depois homologar imagem/vídeo no admin e cliente e percurso de pesquisa no celular.
