# CookLily — ciclo de vida e edição de pesquisas

- Tarefa: permitir pausar/retomar e excluir pesquisas; corrigir edição indisponível.
- Responsável: AG-DEV.
- Estado: `merged`.
- Branch: `codex/lily-survey-lifecycle-edit` (integrada).
- Base branch: `cooklily/canonical`.
- Base SHA verificado: `62147fb`.
- HEAD verificado: `ac7db2f` (`feat(lily): manage survey lifecycle and editing (#183)`).
- PRs: [#183](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/183), merged por squash.
- Última verificação: 2026-10-25.
- Estado de interrupção: não interrompido.

## Implementado e integrado

- Causa confirmada: botão Editar ficava desabilitado fora de `draft`; endpoint PUT também aceitava apenas `draft`.
- Antes não havia rota/ação administrativa para pausar, retomar ou remover pesquisas.
- O modelo status é texto; as respostas e métricas têm histórico de versão ligado à pesquisa.
- Preflights AG-DEV passaram para frontend surveys, API surveys, banco Lily e documentação de checkpoint.

## Entregas

- Transições `draft/published/paused/cancelled` com autorização, CSRF, atualização condicional e auditoria server-side.
- Painel edita rascunhos e pausadas. Para editar publicada, primeiro pause; aguarde participações abertas; o formulário rola até o editor.
- Pausadas não aceitam novos inícios; participantes já ativos podem enviar respostas/anexos.
- Excluir aplica cancelamento lógico, encerra participações abertas e preserva respostas/estatísticas.
- Testes cobrem pausa, bloqueio de edição, conclusão em pausa, incremento de versão, retomada e exclusão lógica.

## Gates e testes

- Pré-mudança: causa reproduzida; UI bloqueava status diferente de `draft` e API também rejeitava PUT nesse estado.
- `npm run check`: PASS.
- `npm test`: PASS, 57 arquivos; 309 aprovados, 3 ignorados.
- `npm run build`: PASS; budget CookLily dentro do limite (aviso Vite de chunk >500 KB já existente).
- Playwright CLI com APIs mockadas: edição paused habilitada, published exige pausa, pausa/retomada e cancelamento visíveis; viewport mobile 360 px sem overflow horizontal e foco de teclado presente.
- CI PR #183: 7/7 checks passaram (Node 20, Node 24, Tool Health Linux, Windows Supervisor, Workbook Snapshot, Excel Recipe Ubuntu e Windows).

## Migrations

- Nenhuma prevista; status existente comporta paused/cancelled.

## Bloqueios/riscos

- Edição após publicação incrementa a versão. Para não perder respostas, edição paused aguarda todas as participações abertas da versão atual; elas podem ser concluídas enquanto a pesquisa estiver pausada.
- Cancelamento lógico mantém dados históricos e evita apagar respostas vinculadas.
- Banco operacional local estava sem a migration de métricas; gates foram executados com banco SQLite temporário recém-migrado, sem alterar o runtime existente.

## Homologação/dependências externas

- Após deploy, validar edição, pausa, retomada e exclusão lógica em painel staff e cliente.

## Próxima ação exata

1. Proprietário executar `sudo cc deploy canonical` na VPS.
2. Homologar no site editar, pausar, retomar e excluir logicamente uma pesquisa, incluindo cliente com resposta em andamento.
