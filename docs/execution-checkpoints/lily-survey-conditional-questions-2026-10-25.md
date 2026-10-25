# CookLily — perguntas condicionais em pesquisas

- Tarefa: permitir exibir perguntas conforme respostas anteriores.
- Responsável: AG-DEV.
- Estado: `merged`.
- Branch de implementação: `codex/lily-survey-conditional-questions` (integrada); branch do fechamento: `codex/close-lily-survey-conditional-checkpoint`.
- Base branch: `cooklily/canonical`.
- Base SHA verificado: `94ea181a879ed64e09c84fe899bb684ff3a221a5`.
- HEAD verificado: `7cabe22fa1619e42d49f89596e8cb8a1c14aa676` (`CookLily: perguntas condicionais nas pesquisas (#187)`).
- PRs: [#187](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/187), squash merge; CI 7/7 aprovado.
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
5. `[completed]` Abrir PR, acompanhar CI e integrar na canonical.

## Gates e testes

- Preflight AG-DEV: PASS para API surveys, frontend surveys e checkpoints.
- Vitest focado nos contratos/API/UI: PASS, 13 testes.
- `npm run check`: PASS.
- `npm test`: PASS, 58 arquivos; 315 aprovados e 3 ignorados.
- `npm run build`: PASS; budget CookLily aprovado. Aviso do Vite sobre chunk acima de 500 kB continua preexistente.
- Playwright CLI: controle condicional aparece após selecionar pergunta anterior; viewport 360 px sem overflow horizontal.
- PR #187: 7/7 checks aprovados (Node 20, Node 24, Workbook Snapshot, Excel Recipe Ubuntu e Windows, Windows Supervisor, Tool Health Linux).

## Migrations

- Nenhuma prevista: dependências serão armazenadas junto ao JSON declarativo da pesquisa.

## Bloqueios/riscos

- Condição limitada a uma pergunta anterior por pergunta subordinada nesta entrega; encadeamento suporta ramificações em sequência sem ciclos.

## Homologação/dependências externas

- Após deploy, configurar uma pesquisa real e validar respostas “sim” e “não” em dispositivo móvel.

## Próxima ação exata

1. Integrar o fechamento documental deste checkpoint após CI.
2. Proprietário executar `sudo cc deploy canonical` e homologar ambos os ramos de uma pesquisa condicional na VPS.
