# CookLily — crédito e feedback de recompensa da pesquisa

- Tarefa: confirmar pontuação no saldo do cliente e exibir recompensa animada após responder.
- Responsável: AG-DEV.
- Estado: `merged`.
- Branch de implementação: `codex/lily-survey-reward-feedback` (integrada); branch do fechamento deste checkpoint: `codex/close-lily-survey-reward-checkpoint`.
- Base branch: `cooklily/canonical`.
- Base SHA verificado: `49aadc431362f3ee691515cf8fc73e190a0304f1`.
- HEAD verificado: `da401dc977a5db626773319adb217059592cb43f` (`CookLily: feedback visual e crédito de pontos em pesquisas (#185)`).
- PRs: [#185](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/185), integrado por squash; CI 7/7 aprovado.
- Última verificação: 2026-10-25.
- Estado de interrupção: não interrompido.

## Achados

- O backend já calcula pontos pela configuração (`pointsPerForm` + respostas preenchidas × `pointsPerAnswer`), registra evento idempotente `survey_reward` e o perfil soma todos os eventos de fidelidade. Teste de integração confirmou o saldo após responder pesquisa configurada com 15 pontos por conclusão e 25 por resposta.
- A tela de recompensa mostrava o total, mas não tinha a barra animada solicitada.
- A configuração de pontuação deve conter valores maiores que zero; `showPoints` controla exibição prévia ao usuário, mas não impede crédito configurado.

## Implementado

- Barra de recompensa animada ao concluir pesquisa que creditou pontos, com texto do crédito e saldo atualizado formatados para pt-BR.
- Sem barra quando a pesquisa não pontua.
- Respeita `prefers-reduced-motion`; usa barra acessível com papel e valores ARIA.
- Teste ponta a ponta valida o evento e o saldo de perfil após submissão.

## Gates e testes

- Preflight AG-DEV: PASS para API de surveys, feature de surveys da Lily, estilos e checkpoints.
- Primeiro teste contra `.runtime/lily-acai.db` falhou antes dos casos porque o banco de desenvolvimento não contém `LilySurveyQuestionMetric`; nenhum arquivo de banco operacional foi alterado.
- Teste de API com banco temporário previamente migrado: PASS, 242 testes em 42 arquivos; 3 ignorados.
- `npm run check`: PASS.
- `npm test`: PASS, 57 arquivos; 310 aprovados, 3 ignorados.
- `npm run build`: PASS; budget CookLily aprovado. Aviso do Vite de chunk acima de 500 kB permanece já existente.
- Build e testes usam `.runtime/lily-lifecycle-test.db` apenas como banco temporário já existente.
- PR #185: 7/7 checks aprovados (Node 20, Node 24, Workbook Snapshot, Excel Recipe Ubuntu e Windows, Windows Supervisor, Tool Health Linux).

## Migrations

- Nenhuma necessária.

## Bloqueios/riscos

- Não foi possível inspecionar os valores de pontuação da pesquisa específica no banco da VPS. Para aquela pesquisa, validar no painel se pontos por conclusão ou por resposta estão acima de zero; a visibilidade opcional da recompensa não desativa o crédito.

## Homologação/dependências externas

- A pesquisa específica e seus valores não puderam ser inspecionados no banco da VPS.
- Após deploy pelo proprietário, concluir uma pesquisa pontuada e conferir a barra, o evento e o saldo no perfil.

## Próxima ação exata

1. Integrar este fechamento documental do checkpoint após CI.
2. Proprietário executar `sudo cc deploy canonical` e homologar uma pesquisa configurada com pontos acima de zero.
