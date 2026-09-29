# Blender Agent — Contexto persistente, workspaces e auto-history

## Objetivo

Reduzir a dependência da memória da conversa durante produções 3D longas. O agente deve conseguir consultar o estado de abas antigas do Blender, capturar várias abas numa única operação e recuperar o que fez em etapas anteriores por palavras-chave e filtros.

A camada de contexto não substitui o arquivo `.blend`. Ela registra **o que o agente viu, fez e decidiu**, de forma segmentada e auditável.

## Terminologia

No Blender, as "abas" superiores como `Layout`, `Modeling`, `Sculpting`, `Shading` e `Geometry Nodes` são **Workspaces**. Cada Workspace pode conter uma ou mais `Area` (VIEW_3D, OUTLINER, PROPERTIES, NODE_EDITOR etc.).

## 1. Consulta de conteúdo de workspaces

Actions:

- `workspace.list`: lista os workspaces existentes e o atual;
- `workspace.describe`: consulta um workspace, vários nomes ou todos;
- a consulta troca temporariamente o workspace ativo, coleta o contexto e restaura o workspace original.

Cada descrição inclui:

- nome do workspace e screen;
- cena e modo atual;
- objeto ativo e seleção;
- contagem de objetos por tipo;
- até 100 objetos com tipo/visibilidade;
- áreas/editor types e dimensões;
- dados específicos quando disponíveis:
  - VIEW_3D: shading, perspectiva e distância;
  - OUTLINER: display mode;
  - PROPERTIES: contexto;
  - TEXT_EDITOR: texto aberto;
  - IMAGE_EDITOR: imagem aberta;
  - NODE_EDITOR: tree/shader/geometry node type;
  - DOPESHEET_EDITOR: modo.

Isso permite ao agente perguntar "o que havia na aba Sculpting?" sem depender de memória antiga do chat.

## 2. Capturas personalizadas de múltiplos workspaces

Action: `workspace.capture_set`.

A captura aceita:

- lista simples de workspaces + um target comum; ou
- um plano customizado com `captures[]`, onde cada item define workspace, target, área, shading e filename.

Targets:

- `VIEW_3D`: captura somente a maior região 3D;
- `WINDOW`: captura a janela inteira daquele workspace;
- `AREA`: captura a maior área de um tipo específico, por exemplo `NODE_EDITOR`.

Até 20 capturas podem ser feitas em uma chamada. O workspace original é restaurado ao final.

O resultado inclui:

- PNG por captura;
- SHA-256 por arquivo;
- manifesto JSON agregador;
- sucesso/falha individual por workspace;
- referência automática no histórico da etapa ativa.

## 2.1 Sincronização real entre workspaces

O primeiro smoke test multi-workspace revelou que simplesmente atribuir `window.workspace` e chamar redraw dentro da mesma execução não garante que o framebuffer já represente a nova aba. O Blender pode ter atualizado o estado lógico do workspace enquanto a imagem visível ainda corresponde ao frame anterior.

A captura múltipla agora usa uma máquina de estados assíncrona no próprio `bpy.app.timers`:

```text
switch workspace
  ↓
yield para o event loop
  ↓
aguarda screen ficar estável por alguns ticks
  ↓
aplica shading/configuração
  ↓
yield novamente
  ↓
captura
  ↓
valida workspace_requested == workspace_captured
  ↓
próxima aba
```

A quantidade padrão de ciclos de estabilização é 3 e pode ser ajustada por:

```text
CC_BLENDER_WORKSPACE_SETTLE_TICKS
```

O manifesto da captura passou para versão 2 e inclui, por item:

- `workspace_requested`;
- `workspace_captured`;
- `workspace_match`;
- `screen_captured`;
- target/area;
- SHA-256.

Se o workspace ativo não corresponder ao solicitado no instante da captura, o item é marcado como falha em vez de gerar silenciosamente uma imagem com nome incorreto.

Ao final, o capture-set também confirma `restored_original_workspace=true`.

## 3. Auto-history segmentado por etapa

O histórico não usa um arquivo global gigantesco.

Estrutura:

```text
.runtime/blender-agent/history/
├── active-stage.json
├── <stage-id>/
│   ├── metadata.json
│   ├── events/
│   │   ├── events-0001.jsonl
│   │   ├── events-0002.jsonl
│   │   └── ...
│   └── attachments/
│       ├── capture.png
│       ├── capture.json
│       └── ...
└── <next-stage-id>/
    └── ...
```

Cada `metadata.json` contém:

- `stage_id`;
- label;
- criação/última atualização;
- status;
- tags;
- `previous_stage_id`;
- contadores do histórico;
- estatísticas de pruning.

A relação para a próxima etapa é derivada consultando quais etapas apontam para a atual como `previous_stage_id`. Isso permite navegação anterior/próxima e também ramificações.

## 4. Registro automático de comandos

Todas as actions normais processadas pelo bridge são registradas automaticamente na etapa ativa:

- action;
- timestamp;
- request id;
- parâmetros;
- resultado ou erro;
- tags;
- anexos detectados;
- SHA-256 dos anexos dentro do runtime.

Actions `history.*` não são registradas automaticamente para evitar recursão. `history.note`, criação e ativação de stage fazem seus registros explicitamente.

### Redaction e limites

Campos sensíveis comuns são redigidos:

- token;
- password/passwd;
- secret;
- authorization;
- api_key/apikey;
- cookie/set-cookie.

Valores grandes são truncados estruturalmente antes de gravar. Listas/dicionários extensos têm limites para impedir que meshes gigantes transformem um evento em um arquivo enorme.

## 5. Busca histórica

Action: `history.search`.

Filtros disponíveis:

- `query`: palavra/frase;
- `stage_id`;
- prefixo de `action`;
- `since` / `until`;
- sucesso/falha;
- presença de anexo;
- tags;
- limite de resultados.

Exemplos:

```powershell
python -m tools.blender_agent.client history-search baguete --stage bread-shape
python -m tools.blender_agent.client history-search --action viewport. --attachment success
python -m tools.blender_agent.client history-search sculpt --success failure
```

## 6. Contexto resumido de uma etapa

`history.stage.describe` / CLI `history-show` retorna:

- metadata;
- etapa anterior;
- próximas etapas;
- eventos recentes;
- quantidade/tamanho de anexos;
- política de retenção ativa.

Assim o agente pode retomar um trabalho antigo sem carregar toda a conversa.

## 7. Política de retenção

Defaults:

- 512 KiB por segmento JSONL;
- 250 eventos por segmento;
- 40 segmentos por etapa;
- 120 anexos por etapa;
- 256 MiB de anexos por etapa;
- 20.000 eventos máximos escaneados por busca.

Variáveis de ambiente:

- `CC_BLENDER_HISTORY_SEGMENT_BYTES`;
- `CC_BLENDER_HISTORY_SEGMENT_EVENTS`;
- `CC_BLENDER_HISTORY_MAX_SEGMENTS`;
- `CC_BLENDER_HISTORY_MAX_ATTACHMENTS`;
- `CC_BLENDER_HISTORY_MAX_ATTACHMENT_BYTES`;
- `CC_BLENDER_HISTORY_MAX_SEARCH_EVENTS`.

Ao ultrapassar retenção, segmentos/anexos mais antigos da própria etapa são removidos primeiro e o contador de pruning fica no metadata. A cadeia de stages e seus metadados permanecem.

## 8. Fluxo recomendado de produção

```text
criar stage
  ↓
consultar workspaces necessários
  ↓
checkpoint
  ↓
executar ações
  ↓
capturar viewport/workspaces
  ↓
auto-history registra comandos + anexos
  ↓
pesquisar histórico quando houver dúvida
  ↓
encerrar etapa criando a próxima
  ↓
metadata da nova etapa aponta para a anterior
```

Exemplo:

```powershell
python -m tools.blender_agent.client history-start "Base do pão" --tag baguete
python -m tools.blender_agent.client workspace-describe --name Layout --name Sculpting
python -m tools.blender_agent.client workspace-capture-set --workspace Layout --workspace Sculpting --target WINDOW
python -m tools.blender_agent.client history-search bevel --stage <stage-id>
python -m tools.blender_agent.client history-show <stage-id>
```

## 9. MCP

Ferramentas adicionadas:

- `blender_workspaces`;
- `blender_workspace_describe`;
- `blender_workspace_capture`;
- `blender_history_start`;
- `blender_history_list`;
- `blender_history_use`;
- `blender_history_context`;
- `blender_history_search`;
- `blender_history_note`.

`blender_workspace_capture` devolve uma lista de `Image`, permitindo que um modelo multimodal analise várias abas na mesma chamada.

## 10. Segurança

- tudo permanece dentro de `.runtime/blender-agent`;
- bridge continua loopback-only;
- nenhuma execução arbitrária foi adicionada;
- o workspace original é restaurado após inspeção/captura;
- histórico nunca persiste o token de sessão;
- anexos externos ao runtime não são incorporados automaticamente;
- a camada de history não altera arquivos oficiais do projeto.

## 11. Smoke test

Com o Blender Agent aberto:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/blender_agent/context-smoke-test.ps1 -OpenImages
```

O script valida:

1. bridge;
2. listagem de workspaces;
3. consulta de conteúdo;
4. criação de stage;
5. captura de múltiplos workspaces;
6. busca no auto-history por action + anexo;
7. recuperação do contexto da etapa.


## Log de validação multi-workspace

Em 29/09/2026, o smoke test abriu duas imagens nomeadas para `Animation` e `Compositing`, porém ambas mostravam visualmente `Compositing`. A causa foi atribuída ao capture-set síncrono, que trocava o workspace e fotografava antes de o event loop concluir o redraw.

Correção: capture-set passou a ser processado como job assíncrono por ticks, com validação de workspace/screen no momento exato da screenshot e manifesto v2. O smoke test agora prioriza `Animation` + `Compositing` quando disponíveis para reproduzir diretamente esse cenário.


## Validação

Em 29/09/2026, após a correção por timer-yield, o smoke multi-workspace foi validado pelo proprietário no Windows 10 + Blender 5.2 LTS: as capturas de Animation e Compositing passaram a representar workspaces diferentes corretamente e o auto-history/contexto concluiu sem erro.
