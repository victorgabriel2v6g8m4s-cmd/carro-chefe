# CookLily — ciclo de vida e edição de pesquisas

- Tarefa: permitir pausar/retomar e excluir pesquisas; corrigir edição indisponível.
- Responsável: AG-DEV.
- Estado: `in_progress`.
- Branch: `codex/lily-survey-lifecycle-edit`.
- Base branch: `cooklily/canonical`.
- Base SHA verificado: `62147fb`.
- HEAD verificado: `62147fb` (alterações locais concluídas, aguardando commit).
- PRs: nenhum.
- Última verificação: 2026-10-25.
- Estado de interrupção: não interrompido.

## Implementado localmente (pendente de commit)

- Confirmado em código: botão Editar fica desabilitado para status diferente de `draft`; endpoint PUT também aceita apenas `draft`.
- Confirmado em código: não existe rota/ação administrativa para pausar, retomar ou remover pesquisas.
- O modelo status é texto; as respostas e métricas têm histórico de versão ligado à pesquisa.
- Preflights AG-DEV passaram para frontend surveys, API surveys, banco Lily e documentação de checkpoint.

## Próximos marcos

- Implementadas transições `draft/published/paused/cancelled`, com autorização, CSRF, atualização condicional e auditoria server-side.
- Painel permite editar rascunhos e pesquisas pausadas; edição publicada exige pausa e conclusão das participações abertas; o formulário rola até a área de edição.
- Pausadas não aceitam novos inícios, mas usuários com participação em andamento podem enviar respostas/anexos.
- Exclusão é cancelamento lógico, encerra participações em andamento e preserva respostas/estatísticas.
- Testes de integração cobrem pausa, bloqueio de edição, conclusão de resposta durante pausa, incremento de versão, retomada e exclusão lógica.

## Gates e testes

- Pré-mudança: causa reproduzida; UI bloqueava status diferente de `draft` e API também rejeitava PUT nesse estado.
- `npm run check`: PASS.
- `npm test`: PASS, 57 arquivos; 309 aprovados, 3 ignorados.
- `npm run build`: PASS; budget CookLily dentro do limite (aviso Vite de chunk >500 KB já existente).
- Playwright CLI com APIs mockadas: edição paused habilitada, published exige pausa, pausa/retomada e cancelamento visíveis; viewport mobile 360 px sem overflow horizontal e foco de teclado presente.
- CI/PR: pendentes.

## Migrations

- Nenhuma prevista; status existente comporta paused/cancelled.

## Bloqueios/riscos

- Edição após publicação incrementa a versão. Para não perder respostas, edição paused aguarda todas as participações abertas da versão atual; elas podem ser concluídas enquanto a pesquisa estiver pausada.
- Cancelamento lógico mantém dados históricos e evita apagar respostas vinculadas.
- Banco operacional local estava sem a migration de métricas; gates foram executados com banco SQLite temporário recém-migrado, sem alterar o runtime existente.

## Homologação/dependências externas

- Após deploy, validar edição, pausa, retomada e exclusão lógica em painel staff e cliente.

## Próxima ação exata

1. Commitar e publicar as mudanças da branch.
2. Abrir PR para `cooklily/canonical`, aguardar CI e integrar com o SHA esperado.
3. Atualizar o checkpoint após o merge; proprietário executa `sudo cc deploy canonical` e homologa no site.
