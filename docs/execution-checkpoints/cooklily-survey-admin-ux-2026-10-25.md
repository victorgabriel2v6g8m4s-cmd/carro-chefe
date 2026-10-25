# CookLily — UX do painel e pesquisas — 2026-10-25

- **Responsável:** AG-DEV
- **Status:** candidate
- **Branch:** `codex/cooklily-survey-ux-polish`
- **Base branch:** `cooklily/canonical`
- **Base SHA verificado:** `c4b42dc3396dad657ca2f8e463867e86c2520563`
- **HEAD verificado:** `100387a52c99dc3fb1eeab6b036f00b67ea5865a` (commit de implementação, branch já publicada)
- **PRs:** aguardando criação de PR draft para esta entrega.
- **Migration/schema:** migration `20261025120000_lily_survey_notifications_estimates` criada e aplicada com sucesso ao `.runtime/lily-acai.db` local; migrations do Lily passaram no banco de desenvolvimento descartável/ignorado.
- **Estado real inicial:** painel de survey refaz sessão/lista após salvar e mantém formulário com `.reset()` após await; opção IDs editáveis/manual e campos CSV; binary swipe sem card/drag; ausência de prévia; footer existente repete abas anteriores e não destaca Inicio/Carrinho.
- **Gates iniciais:** `policy:preflight` para `apps/lily_acai`, `apps/api/src/modules/lily`, `packages/lily-database` e `docs/execution-checkpoints` PASS.
- **Entregas já implementadas localmente:** atualização otimista do editor sem recarregar os dados; formulário de missão usa referência de DOM capturada antes do `await`; IDs técnicos gerados e exibidos como referência; options/linhas/colunas em controles adicionáveis; MIME por seletor, limite de mídia individual com unidade e máximo seguro de 10 MiB; prévia ao vivo; cartão binário com swipe, cor/escala, texto/mídia e botões acessíveis; estimativa de duração; notificações idempotentes para contas ativas no banco Lily, KPIs no sino/lista e pós-publicação; rodapé Início/Dashboard/Reels/Carrinho/Perfil; regiões usam entradas de lista sem campos CSV. A especificação de navegação recebeu errata datada com a ordem mais recente aprovada pelo proprietário. Script de publicação emergencial do checkpoint agora aceita o caminho da tarefa e valida que apenas esse arquivo chega ao commit.
- **Gates locais:** `npm run check` PASS após último ajuste; `npm test` PASS (55 arquivos, 304 testes aprovados, 3 ignorados); `npm run build` PASS após último ajuste (inclui budget Lily verde); migration Lily aplicada; `git diff --check` PASS; preflights PASS em `apps/lily_acai`, `apps/api/src/modules/lily`, `packages/lily-database`, `docs/execution-checkpoints` e `tools/recovery`; parser PowerShell PASS para script de publicação do checkpoint. Build e testes foram executados serialmente após uma tentativa paralela de build/test gerar colisão temporária no Prisma Client. Primeira rodada de teste falhou porque `.runtime` não existia; depois a pasta local foi criada e as migrations Lily foram aplicadas, e a rodada seguinte passou. `npm ci` instalou dependências e indicou 14 alertas existentes no lockfile (5 moderados, 9 altos).
- **Bloqueios/riscos:** não existe modelo/configuração de níveis ou catálogo de resgates no schema atual; por isso a API retorna `progressTarget: null` e a interface mantém barra de proximidade/aviso de desistência ocultos, conforme requisito condicional. Limites de upload continuam limitados a 10 MiB no servidor.
- **Revisão visual:** viewport mobile (390×844) mostrou header sticky, chamada de pesquisa na Home e rodapé com Início/Dashboard/Reels/Carrinho/Perfil na ordem pedida. A página carregou sem API de desenvolvimento (9 erros de proxy esperados por API desligada); painel privado e submissão de respostas não puderam ser visualmente homologados sem serviço/auth local, mas componentes compilaram e gates passaram.
- **Próxima ação exata:** abrir PR draft de `codex/cooklily-survey-ux-polish` para `cooklily/canonical`, registrar seu número neste checkpoint e publicar a atualização do checkpoint na própria PR antes de integrar; acompanhar CI e integrar pela autorização existente quando verde. Após o merge atualizar o estado `merged` do checkpoint na canonical usando o script emergencial (`pwsh -File tools/recovery/push-cooklily-checkpoint.ps1 -Checkpoint docs/execution-checkpoints/cooklily-survey-admin-ux-2026-10-25.md`). Não executar deploy VPS.
- **Homologação:** interação visual desktop/mobile será verificada localmente; homologação prática no site publicado após deploy do proprietário.

## Roadmap detalhado

1. [ ] Corrigir atualização do painel sem refazer sessão e lista; remover acesso assíncrono inválido a `event.currentTarget.reset()`.
2. [ ] Adicionar modelo e API de notificações de pesquisa, protegidas por conta, com KPIs configurados e publicação idempotente.
3. [ ] Trocar a navegação inferior por destinos Home, Reels, Cardápio, Carrinho, Dashboard e Perfil, preservando Reels como ação central e ranking acessível.
4. [ ] Fazer IDs técnicos (survey/question/mission) serem gerados pelo sistema e exibidos em modo somente leitura; usar selects para referências.
5. [ ] Trocar CSV/linhas de texto por controles de opção/linha/coluna adicionáveis e removíveis; exibir grade prévia visual.
6. [ ] Configurar mídia por pergunta com MIME em opções e tamanho number+unit, limites absolutos server-side.
7. [ ] Criar prévia ao vivo das perguntas enquanto o staff edita.
8. [ ] Criar card de resposta binária com mídia/texto, drag pointer, escala/cor progressiva, direção acessível e feedback positivo/negativo configurável.
9. [ ] Atualizar testes, documentação e este checkpoint após cada marco; validar gates locais e CI do PR.
10. [ ] Abrir PR draft contra canonical; integrar com autorização persistente quando CI estiver verde; não executar deploy VPS.
