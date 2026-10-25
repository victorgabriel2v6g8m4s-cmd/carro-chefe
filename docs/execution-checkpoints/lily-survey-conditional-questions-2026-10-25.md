# CookLily — perguntas condicionais em pesquisas

- Tarefa: permitir exibir perguntas conforme respostas anteriores.
- Responsável: AG-DEV.
- Estado: `in_progress`.
- Branch: `codex/lily-survey-conditional-questions`.
- Base branch: `cooklily/canonical`.
- Base SHA verificado: `94ea181a879ed64e09c84fe899bb684ff3a221a5`.
- HEAD verificado nos gates: `8d53c6c1ab518b5049b51b6e70b7a831480d9622` (`feat(lily): support conditional survey questions`).
- PRs: nenhum.
- Última verificação: 2026-10-25.
- Estado de interrupção: não interrompido.

## Escopo

- Criador de pesquisa: escolher pergunta anterior, condição e resposta para mostrar outra pergunta.
- Respondente: exibir somente perguntas aplicáveis; progresso, obrigatoriedade, pontos e métricas usam apenas perguntas visíveis.
- Backend: validar regras e respostas no servidor, bloquear dependências circulares/à frente e limpar respostas ocultas.
- Preservar import/export JSON, prévia administrativa, navegação e compatibilidade de pesquisas existentes.

## Etapas

1. `[completed]` Estender contrato e validação das condições.
2. `[completed]` Implementar editor condicional e adaptar a página do respondente.
3. `[completed]` Testar os caminhos sim/não, ocultação, progresso, pontos, condições encadeadas e proteção contra dependência futura.
4. `[completed]` Rodar gates completos e validar interface.
5. `[in_progress]` Abrir PR draft, acompanhar CI e integrar na canonical.

## Gates e testes

- Preflight AG-DEV: PASS para API surveys, frontend surveys e checkpoints.
- Vitest focado nos contratos/API/UI: PASS, 13 testes.
- `npm run check`: PASS.
- `npm test`: PASS, 58 arquivos; 315 aprovados e 3 ignorados.
- `npm run build`: PASS; budget CookLily aprovado. Aviso do Vite sobre chunk acima de 500 kB continua preexistente.
- Playwright CLI: controle condicional aparece após selecionar pergunta anterior; viewport 360 px sem overflow horizontal.

## Migrations

- Nenhuma prevista: dependências serão armazenadas junto ao JSON declarativo da pesquisa.

## Bloqueios/riscos

- Condição limitada a uma pergunta anterior por pergunta subordinada nesta entrega; encadeamento suporta ramificações em sequência sem ciclos.

## Homologação/dependências externas

- Após deploy, configurar uma pesquisa real e validar respostas “sim” e “não” em dispositivo móvel.

## Próxima ação exata

1. Abrir PR draft para `cooklily/canonical`, acompanhar CI e integrar quando todos os checks passarem.
