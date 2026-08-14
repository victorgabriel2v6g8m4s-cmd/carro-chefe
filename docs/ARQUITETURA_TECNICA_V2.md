# Arquitetura técnica V2 — site e Central Operacional

## Resultado pretendido

O mesmo domínio terá duas experiências isoladas e uma única API operacional:

```text
carrochefe.com/
├── welcome                  Site institucional e marca
├── cardapio                 Ponte para o catálogo/checkout do ERP
├── gestao/*                 Central Operacional autenticada
├── api/v1/*                 Plano, tarefas, agentes e preferências
└── api/v1/integrations/*    Entrada de webhooks assinados
```

O ERP continua dono de catálogo comercial, preço, estoque, pedido, pagamento, fiscal e financeiro. A Central é dona do planejamento, justificativas, decisões, riscos, compras e coordenação entre pessoas e agentes.

## Módulos

```text
apps/site       React + TypeScript + Vite; build público
apps/gestao     React + TypeScript + Vite; build com base /gestao/
apps/api        Fastify + TypeScript; API, SSE, estáticos e bridge
packages/database   Prisma, migrações, importador JSON → SQLite
packages/contracts  Validações Zod e contratos compartilhados
packages/ui         Vocabulário visual e formatação compartilhada
```

`planejamento/public`, `planejamento/server.js` e `planejamento/lib` permanecem como legado de comparação. Só devem ser removidos depois de paridade validada e migração definitiva.

## Persistência e retomada

- O endereço é a fonte principal do ponto de retorno: entidade em `/gestao/tarefas/:id`, filtros na query string e seção no hash.
- `PUT /api/v1/me/ui-state/gestao` guarda rota, busca, hash, scroll, menu e tarefa selecionada para continuidade entre sessões.
- O estado transacional fica no SQLite via Prisma. A importação do seed é idempotente e registra hash/lote.
- Cada transição de tarefa exige justificativa, ator e `expectedVersion`; a operação atualiza tarefa, histórico, auditoria e outbox na mesma transação.

## Central ↔ agentes

Cada execução mantém dois níveis complementares de observabilidade:

- o log técnico e o terminal preservam eventos brutos do runtime;
- o relatório operacional consolida resultado, causa provável, sucessos, falhas, evidências e recomendação de continuidade.

Se uma execução antiga não tiver relatório explícito, a API deriva um diagnóstico somente a partir de passos, mensagens e logs preservados. O campo `partial` distingue trabalho útil seguido de falha de uma falha total. Problemas ao registrar telemetria são tolerados pelo bridge e não podem encerrar a tarefa principal.

O bridge injeta no prompt o contrato JSON compacto dos endpoints operacionais. Isso evita que cada agente precise pesquisar o código ou experimentar campos para registrar passos. Um relatório explícito produzido pelo agente é preservado; o bridge só cria o relatório de contingência quando ele estiver ausente ou for derivado do histórico. Erros HTTP 4xx mantêm o código e a mensagem originais em vez de aparecerem como erro interno genérico.

Comunicações são registros direcionais append-only (`sourceId → targetId`) dos tipos delegação, coordenação, repasse, pergunta, resposta e resultado. O mapa na C.O. usa somente esses registros, sem inventar conversas. Execuções de um mesmo comando multiagente são processadas em sequência para que o resultado anterior possa ser repassado ao agente seguinte.

### Respostas enriquecidas e referências `@`

Respostas do proprietário aceitam até 12 mídias/documentos e até 30 referências estruturadas. O endpoint `GET /api/v1/references?taskId=...` restringe as sugestões ao contexto útil da tarefa: tarefa atual, dependências, tarefas dependentes, execuções, evidências, arquivos e registros do mesmo responsável. A interface insere `@ID` no texto e salva também `{id,type,label,route}`; assim o vínculo continua válido mesmo quando o texto é resumido.

Uploads começam como rascunhos sem vínculo (`question-answer-draft` ou `management-message-draft`) e são ligados à pergunta/conversa, execução e tarefa na mesma transação que grava a resposta. Um rascunho já ligado a outro contexto é rejeitado.

### Conversa contínua com Gestão

`ManagementConversation` e `ManagementMessage` mantêm um canal separado do roteiro. Enviar uma mensagem cria uma `AgentRun` de finalidade `management_chat`, com `taskId = null`; portanto a conversa não cria nem conclui tarefas. Quando há uma thread anterior, o bridge a retoma. A resposta FINAL de `AG-GESTAO` fica logo depois do prompt, com link para logs, passos, consumo e relatório da execução.

O agente de Gestão pode consultar especialistas pelo mesmo protocolo de delegação abaixo. Se a consulta for obrigatória, a conversa aguarda o parecer e retoma a mesma thread; se for opcional, o resultado entra no contexto persistente das próximas interações.

### Delegação compacta e em lote

Agentes não montam mais corpos JSON extensos para progresso, passos, mensagens, consumo ou relatório de contingência; o bridge deriva esses registros dos eventos do runtime. A única chamada explícita comum é o helper:

```text
node tools/agent-runtime.mjs send RUN_ID AG-MARKETING "validar público" --data "task/context/marketing/3" --depends "TASK-X,DEC-Y" --unlock "TASK-Z"
```

`POST /api/v1/agent-runs/:runId/send` completa tarefa, intenção, ator, timestamps, referências resolvidas, comunicação e auditoria. Solicitações ficam em `AgentDispatch` e `dispatches/flush` cria uma única execução de consulta por agente de destino. `--required` coloca a origem em `waiting_dependency`; a conclusão do especialista a recoloca em `queued` no mesmo ponto. Sem `--required`, o solicitante não fica bloqueado.

`onSuccess.unlock` só move automaticamente tarefas em `backlog` ou `blocked` para `ready`, com transição, justificativa e auditoria imutáveis.

### Capacidade de escrita

`AgentDefinition.workspaceMode` aplica o princípio do menor privilégio:

- `project`: somente `AG-DEV`, com escrita no projeto;
- `artifacts`: agentes de negócio recebem um diretório isolado em `output/.agent-workspaces/<runId>` e podem criar, editar ou excluir apenas ali;
- `read_only`: nenhuma escrita local.

O workspace isolado não é versionado. Arquivos finais são copiados para o armazenamento de uploads quando o agente executa `agent-runtime.mjs artifact`; a trilha guarda hash, autor, execução e rota de visualização.

```text
Proprietário → cria AgentRun na Central
Bridge local → reivindica execução `queued`
Codex → transmite passos, mensagens e consumo
Codex → cria pergunta contextual e entra em `waiting_input`
Proprietário → responde na Central
Bridge → retoma a mesma thread e devolve resposta ao Codex
Codex → conclui; evidências e linha do tempo permanecem consultáveis
```

A interface nunca fala diretamente com um processo Codex. O worker `npm run bridge:codex` é o adaptador local e usa o SDK oficial com thread retomável. Isso permite trocar o executor sem reescrever a Central.

Endpoints principais:

- `GET /api/v1/bootstrap`
- `GET /api/v1/tasks/:taskId`
- `POST /api/v1/tasks/:taskId/status-transitions`
- `GET|POST /api/v1/agent-runs`
- `GET /api/v1/agent-runs/:runId`
- `POST /api/v1/agent-runs/:runId/steps`
- `POST /api/v1/agent-runs/:runId/questions`
- `POST /api/v1/agent-questions/:questionId/answer`
- `POST /api/v1/agent-runs/:runId/usage`
- `GET|POST /api/v1/uploads` (evidências, limite de 10 MB e tipos permitidos)
- `GET /api/v1/events` (SSE com retomada por `Last-Event-ID`)
- `POST /api/v1/integrations/:provider/webhook` (HMAC + idempotência)

Eventos operacionais são gravados na outbox na mesma transação da mudança. `npm run webhooks:dispatch` entrega os tópicos aos destinos habilitados, com HMAC, chave de idempotência, tentativas e atraso exponencial. O `secretRef` do destino aponta para o nome de uma variável de ambiente; o segredo nunca fica no banco.

## Comandos em linguagem natural

O proprietário pode escrever uma orientação na Visão Geral ou em `/gestao/comandos`. A API:

1. guarda a frase original em `OperationalIntent`;
2. identifica os domínios por regras determinísticas auditáveis;
3. escolhe os agentes e tarefas ativas correspondentes;
4. registra fatos informados como `pending_verification`;
5. cria uma execução Codex por responsável;
6. agrega a conclusão e cria uma notificação.

Exemplo: “O ERP vai ser o X, mas verifique se atende aos requisitos” registra `erp.selected = X`, atualiza `DEC-002` para validação e aciona `AG-FINANCAS` e `AG-DEV`. O ERP só passa para `reviewed` quando ambas as execuções terminam; isso ainda não substitui a aprovação humana das evidências.

O roteador não usa um modelo apenas para classificar frases, reduzindo custo e tornando o despacho previsível. Frases sem domínio reconhecido vão para `AG-GESTAO`. A concorrência padrão é três agentes e pode ser configurada por `MAX_AGENT_CONCURRENCY`.

## Supervisor do Windows

`tools/windows-supervisor/CarroChefeSupervisor.exe` é compilado como aplicativo Windows sem console. Ele mantém vivos:

- a API e os dois builds web;
- a ponte local do Codex;
- o dispatcher da outbox/webhooks.

O ícone combina a logo com uma bolinha de estado: cinza para desligado, laranja para inicialização ou restabelecimento, verde para serviço saudável e vermelho para falha persistente/processo encerrado com erro. O mesmo estado é gravado em `.runtime/supervisor-state.json` para diagnóstico local; esse arquivo não é versionado.

Também consulta notificações novas e mostra um balão nativo do Windows quando a Central não está aberta. Dentro da Central, a mesma conclusão aparece como popup minimalista via SSE. Os workers usam portas locais de trava para impedir instâncias duplicadas.

Comandos de manutenção:

```bash
npm run supervisor:install
npm run supervisor:uninstall
npm run supervisor:build
```

O instalador cria um atalho somente para o usuário atual em `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup`. Logs ficam em `.runtime/logs` e não entram no Git.

## SQLite e produção

SQLite é adequado à primeira implantação somente com um processo, um host e volume local persistente. O banco usa foreign keys, WAL, espera de 5 segundos para contenção e transações curtas. WAL não deve ser compartilhado entre máquinas.

Antes da publicação:

1. Escolher VM ou contêiner de instância única com volume persistente.
2. Executar backup consistente antes de cada `prisma migrate deploy`.
3. Manter cópia criptografada fora do host: 7 diárias, 4 semanais e 6 mensais.
4. Testar restauração e smoke test da aplicação.
5. Migrar para Postgres gerenciado antes de múltiplas réplicas ou serverless.

## Bloqueio de segurança para `/gestao`

O servidor escuta somente `127.0.0.1` e recusa exposição externa enquanto `PRODUCTION_AUTH_READY` não estiver explícito. Esse sinalizador não implementa segurança; apenas evita publicação acidental. Antes de liberar `carrochefe.com/gestao`, implementar e testar:

- login OIDC/sessão segura e recuperação de acesso;
- papéis de proprietário, gestor, colaborador e identidade de máquina;
- CSRF, rate limit, logs de segurança e expiração de sessão;
- HTTPS, segredos fora do Git e política de upload;
- autorização por endpoint e trilha de auditoria.

## Validação

Na raiz:

```bash
npm run check
npm test
npm run build
```

O CI preserva os checks protegidos `Quality / Node 20` e `Quality / Node 24`, instala o lockfile, aplica migrações em banco temporário, valida tipos, executa testes antigos e V2 e gera os dois builds.
