# Manual de agentes — Blender Agent V0.1–V0.5

## 1. Objetivo

Este documento é o procedimento operacional obrigatório para agentes que utilizem `tools/blender_agent` para criar, inspecionar, refinar, validar ou recuperar produções 3D no Blender.

O Blender Agent não é um canal para executar Python arbitrário dentro do Blender. Ele é uma camada controlada, auditável e reproduzível que combina:

- actions semânticas allowlisted via `bpy`;
- captura da VIEW_3D;
- contexto de workspaces;
- auto-history segmentado por etapa;
- Sculpt assistido;
- recipes 3D versionadas;
- loop iterativo V0.5 com percepção, proposal, snapshot, checkpoint, diff, avaliação, rollback e receipt;
- MCP multimodal para clientes locais compatíveis.

O agente deve privilegiar **ações pequenas, observáveis e reversíveis**. O objetivo não é “mexer no Blender até parecer certo”, mas produzir um resultado cuja origem, alterações, evidências e recuperação possam ser reconstruídas depois.

## 2. Status de maturidade

Baseline operacional validada: **Windows 10 + Blender 5.2 LTS**.

| Versão | Capacidade | Estado |
|---|---|---|
| V0.1 | bridge local, actions semânticas, UI confinada ao Blender | validada |
| V0.2 | viewport, presets, screenshots e receipts | validada |
| V0.2.1 | múltiplos workspaces e auto-history | validada |
| V0.3 | Sculpt assistido, checkpoints e before/after | validada |
| V0.4 | recipes 3D, variants, materiais, seeds, captures e receipts | validada |
| V0.5 | `observe → propose → apply → evaluate → rollback/finish` | validada |

A validação da conexão MCP local com o cliente/agente final é uma etapa separada. Um agente não deve afirmar que possui controle MCP do computador do usuário até que o cliente local esteja realmente conectado e `blender_status` responda.

## 3. Regras obrigatórias antes de agir

Antes de qualquer trabalho 3D, o agente deve:

1. ler `AGENTS.md` e `REGRAS.md` aplicáveis ao escopo;
2. consultar `docs/ferramentas/README.md` e confirmar que `blender-agent` é a ferramenta adequada;
3. ler este manual;
4. verificar se há recipe, stage, receipt, checkpoint ou produção anterior que deva ser retomada;
5. verificar o estado do bridge antes de emitir mutações;
6. definir o objeto-alvo e o critério de aceite antes de editar;
7. preferir actions semânticas e recipes a interação simulada de UI;
8. criar checkpoint antes de alteração destrutiva ou difícil de reproduzir;
9. usar capturas focadas para comparar o produto, não a cena inteira;
10. registrar a conclusão em history/receipt e nunca depender apenas do histórico do chat.

Se uma capacidade necessária não existir, o agente deve registrar a necessidade em `docs/ferramentas/PENDENCIAS.md`. Não deve improvisar `eval`, `exec`, shell, scripts temporários executados dentro do Blender ou automação global do mouse.

## 4. Regra principal de decisão

Use a camada mais semântica e determinística disponível.

Ordem de preferência:

```text
recipe parametrizada
  > action semântica
  > modifier/material preset
  > Sculpt assistido
  > UI simulada confinada ao Blender
```

A UI simulada é fallback, não caminho principal.

### Quando usar cada camada

| Necessidade | Ferramenta preferida |
|---|---|
| construir novamente um produto ou base | recipe V0.4 |
| mover, escalar, selecionar, duplicar, material, modifier | action semântica |
| variação reproduzível | variant/override/seed da recipe |
| refino orgânico que modifiers não resolvem bem | Sculpt V0.3 |
| comparar visualmente e iterar | V0.5 |
| navegar/orbitar quando não há action semântica equivalente | `ui.*` |
| reproduzir ação repetível no futuro | transformar em recipe, não repetir UI manual |

## 5. Inicialização segura

No Windows:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/blender_agent/start.ps1 -MaxRetry 9 -RetrySeconds 10
```

O launcher deve terminar com:

```text
Blender Agent pronto.
PID:     ...
Bridge:  127.0.0.1:...
Sessao:  ...\.runtime\blender-agent\session\bridge.json
```

Somente depois disso o agente pode continuar.

Confirmação:

```powershell
python -m tools.blender_agent.client status
```

Se o bridge não subir, **não aumente indefinidamente o tempo**. O launcher grava stdout/stderr em:

```text
.runtime/blender-agent/startup-logs/
```

Traceback determinístico é erro de bootstrap e deve ser corrigido; retries servem para startup lento.

### Diagnóstico sem iniciar Blender

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/blender_agent/start.ps1 -DryRun
```

O caminho de `blender_bridge_v05_entry.py` deve permanecer corretamente entre aspas.

## 6. Fluxo operacional padrão

Para uma produção real, siga esta sequência:

```text
STATUS
  ↓
CONTEXT / HISTORY
  ↓
BASE REPRODUZÍVEL (recipe)
  ↓
OBSERVE
  ↓
PROPOSE uma mudança pequena
  ↓
CHECKPOINT + SNAPSHOT
  ↓
APPLY
  ↓
COMPARE before/after
  ↓
EVALUATE
  ├─ keep
  ├─ continue
  ├─ rollback
  └─ finish
  ↓
RECEIPT + HISTORY
```

Não pule `observe` em uma sessão existente. Não aplique duas mudanças conceitualmente diferentes na mesma proposal. Não finalize sem capturas ou métricas suficientes para justificar o resultado.

## 7. V0.1 — actions semânticas e UI confinada

As actions semânticas devem ser usadas sempre que possível para:

- inventário da cena;
- seleção;
- criação de primitivas/mesh;
- transformação;
- duplicação e exclusão controlada;
- smooth shading;
- modifiers;
- materiais;
- câmera;
- render;
- checkpoint;
- export GLB/OBJ.

Exemplos:

```powershell
python -m tools.blender_agent.client call scene.summary
python -m tools.blender_agent.client object-add-primitive cube --name Baguete_Base --scale 3.8 1.05 0.65
python -m tools.blender_agent.client object-delete Baguete_Base
```

### UI simulada

Somente quando necessário:

```powershell
python -m tools.blender_agent.client ui-window
python -m tools.blender_agent.client ui-view3d
python -m tools.blender_agent.client ui-orbit --dx 120 --dy 60
```

Nunca use automação de mouse do Windows para substituir `ui.*`. As coordenadas de UI devem permanecer confinadas à janela do Blender.

## 8. V0.2 — percepção visual

O agente deve capturar a VIEW_3D, não o desktop inteiro.

Diagnóstico:

```powershell
python -m tools.blender_agent.client viewport-describe
```

Vista previsível:

```powershell
python -m tools.blender_agent.client viewport-shading MATERIAL
python -m tools.blender_agent.client viewport-view FRONT
python -m tools.blender_agent.client viewport-capture --name produto-front.png
```

Para validação geométrica, prefira pelo menos:

- FRONT;
- RIGHT;
- TOP;
- THREE_QUARTER.

A captura deve ser usada como evidência visual, não como substituto de métricas estruturadas.

### Captura focada

Em recipe/V0.5, capture somente o target:

- objetos não-alvo podem ser ocultados temporariamente no viewport;
- o target deve ser selecionado e enquadrado com `view_selected`;
- câmera, luz, Cube e outros objetos do usuário não devem ser apagados;
- seleção, visibilidade e objeto ativo devem ser restaurados após a captura;
- o resultado deve registrar `target_object` e `isolated_target=true`.

Não aprove uma comparação visual se objetos estranhos contaminarem o enquadramento.

## 9. V0.2.1 — contexto persistente e auto-history

O agente não deve depender da memória da conversa para lembrar o estado da produção.

Comandos principais:

```powershell
python -m tools.blender_agent.client workspace-list
python -m tools.blender_agent.client workspace-describe --all
python -m tools.blender_agent.client history-list
python -m tools.blender_agent.client history-show
python -m tools.blender_agent.client history-search baguete
```

Para iniciar uma etapa explícita:

```powershell
python -m tools.blender_agent.client history-start "Refino da baguete" --tag baguete
```

Para registrar decisão humana/operacional:

```powershell
python -m tools.blender_agent.client history-note "Silhueta frontal aprovada" --tag decisao
```

### Como retomar uma produção

Ao retomar trabalho anterior:

1. liste stages;
2. leia o stage relevante;
3. busque as actions recentes e anexos;
4. localize o último receipt/checkpoint aprovado;
5. capture novamente o estado atual;
6. compare o estado atual com o receipt/history antes de alterar;
7. só então abra nova etapa ou sessão iterativa.

Nunca assuma que a cena atual é idêntica ao último chat.

## 10. V0.3 — Sculpt assistido

Use Sculpt somente quando a forma orgânica não puder ser alcançada de modo mais determinístico por recipe/modifier/action.

Fluxo obrigatório:

```text
sculpt.prepare
  → checkpoint
  → captura BEFORE
  → stroke pequeno
  → captura AFTER
  → avaliação
  → próximo stroke ou rollback
```

Exemplo:

```powershell
python -m tools.blender_agent.client sculpt-prepare --name Baguete_Base --workspace Sculpting --brush GRAB --radius 70 --strength 0.3
python -m tools.blender_agent.client sculpt-stroke --point 0.44 0.50 --point 0.50 0.50 --point 0.56 0.48 --brush GRAB --radius 70 --strength 0.3 --label ajustar-silhueta
python -m tools.blender_agent.client sculpt-finish
```

Brushes allowlisted:

- DRAW;
- SMOOTH;
- GRAB;
- INFLATE;
- CLAY_STRIPS;
- CREASE;
- SNAKE_HOOK.

### Regras de Sculpt

- strokes curtos;
- uma intenção por stroke;
- radius/strength conservadores no início;
- capture before/after;
- nunca confiar apenas no retorno `FINISHED` do operador: verificar imagem/diff;
- se a topologia não suporta detalhe suficiente, resolver topologia antes de multiplicar strokes;
- checkpoint `.blend` é a recuperação final se rollback em memória estiver incompatível com o contexto de Sculpt.

## 11. V0.4 — recipes 3D

Recipe é o caminho padrão para uma base que precisa ser reproduzida.

Exemplo oficial:

```text
tools/blender_agent/recipes/carro-chefe-baguette-base-v1.json
```

### Sequência obrigatória

Primeiro valide:

```powershell
python -m tools.blender_agent.client recipe-validate tools/blender_agent/recipes/carro-chefe-baguette-base-v1.json
```

Depois planeje sem alterar a cena:

```powershell
python -m tools.blender_agent.client recipe-plan tools/blender_agent/recipes/carro-chefe-baguette-base-v1.json --variant long --set object_name=Teste_Baguete
```

Somente então execute:

```powershell
python -m tools.blender_agent.client recipe-run tools/blender_agent/recipes/carro-chefe-baguette-base-v1.json --variant long --set object_name=Teste_Baguete
```

### O que deve ir para uma recipe

- dimensões/escala base;
- componentes estáveis;
- modifiers;
- materiais por preset;
- seeds de irregularidade;
- checkpoints relevantes;
- views de validação;
- critérios objetivos;
- variants aprovadas.

### O que não deve ir para uma recipe

- código Python;
- shell;
- `eval`/`exec`;
- decisões subjetivas do planner;
- gestos improvisados de UI;
- mutações fora das actions recipe-safe.

### Variants e overrides

Precedência:

```text
default < variant < override explícito
```

Use variant quando a diferença representar uma opção estável/reutilizável. Use override para experimento pontual. Se um override se tornar recorrente e aprovado, transforme-o em variant ou parâmetro documentado.

## 12. V0.5 — loop iterativo

V0.5 deve ser usado para refinar um objeto já existente, especialmente quando o agente precisa comparar visualmente cada alteração.

### Configuração mínima recomendada

```json
{
  "schema_version": 1,
  "label": "refino baguete",
  "target_objects": ["CC_Baguette_Base"],
  "max_iterations": 6,
  "views": [
    {
      "name": "front",
      "preset": "FRONT",
      "shading": "MATERIAL",
      "target_object": "CC_Baguette_Base"
    },
    {
      "name": "three-quarter",
      "preset": "THREE_QUARTER",
      "shading": "MATERIAL",
      "target_object": "CC_Baguette_Base"
    }
  ],
  "criteria": {
    "min_visual_score": 0.8,
    "require_visual_review": true,
    "max_failed_actions": 0,
    "max_rollbacks": 3
  },
  "require_human_approval": true,
  "create_stage": true,
  "restore_stage": true,
  "restore_workspace": true
}
```

### CLI do ciclo

```powershell
python -m tools.blender_agent.iteration_cli validate config.json
python -m tools.blender_agent.iteration_cli start config.json
python -m tools.blender_agent.iteration_cli observe
python -m tools.blender_agent.iteration_cli propose proposal.json
python -m tools.blender_agent.iteration_cli apply --approve
python -m tools.blender_agent.iteration_cli evaluate continue --visual-score 0.88 --visual-reviewed
python -m tools.blender_agent.iteration_cli status
python -m tools.blender_agent.iteration_cli context
python -m tools.blender_agent.iteration_cli rollback --reason "silhueta piorou"
python -m tools.blender_agent.iteration_cli finish
```

### Uma proposal = uma mudança

Proposal correta:

```json
{
  "action": "object.transform",
  "params": {
    "name": "CC_Baguette_Base",
    "location": [0.1, 0.0, 0.0]
  },
  "rationale": "corrigir centralização",
  "expected_effect": "deslocar levemente para a direita",
  "confidence": 0.88,
  "tags": ["shape"]
}
```

Não misture, na mesma proposal, por exemplo:

- transformação + material;
- material + modifier;
- modifier + stroke;
- dois objetivos visuais independentes.

Uma mudança pequena produz diff interpretável e rollback confiável.

### Actions iterativas permitidas

- `object.transform`;
- `object.shade_smooth`;
- `object.irregularize`;
- `modifier.add`;
- `material.simple`;
- `material.preset`;
- `sculpt.stroke`.

A action não pode modificar um `params.name` fora de `target_objects`.

## 13. Percepção, comparação e avaliação

`iteration.observe` deve ser executado antes de planejar a próxima alteração.

Ele fornece:

- transform;
- dimensions;
- modifiers;
- materiais;
- vertex/edge/polygon count;
- `geometry_hash`;
- `state_hash`;
- capturas PNG focadas.

Depois de `apply`, compare:

1. métricas estruturadas;
2. `geometry_hash`/`state_hash`;
3. before/after por view;
4. objetivo declarado na proposal;
5. critérios da sessão.

### Rubrica visual recomendada

Quando houver `visual_score`, use a mesma régua durante a sessão:

| Score | Interpretação |
|---:|---|
| 0.90–1.00 | atende muito bem; nenhum defeito relevante observado |
| 0.80–0.89 | atende; pequenos refinamentos opcionais |
| 0.65–0.79 | parcialmente correto; continuar iterando |
| 0.40–0.64 | alteração fraca ou ambígua; preferir rollback/replanejamento |
| 0.00–0.39 | piorou ou divergiu do objetivo; rollback |

A nota deve ser acompanhada de observação concreta. Não use “parece melhor” sem indicar o que melhorou e em qual view.

### Decisões

Use:

- `keep`: alteração aprovada, sem necessidade imediata de outra proposta;
- `continue`: alteração aprovada e haverá próxima iteração;
- `rollback`: piorou, não atingiu o efeito esperado ou violou critério;
- `finish`: resultado atingiu os critérios e está pronto para receipt final.

Se houver dúvida entre `keep` e `rollback`, prefira preservar o estado anterior e coletar mais evidência.

## 14. Budget de iterações

O budget existe para impedir loops sem fim.

Regras:

- defina `max_iterations` antes de começar;
- não aumente budget silenciosamente;
- 3 a 6 iterações é um intervalo normal para um objetivo pequeno;
- se três tentativas consecutivas não melhorarem o mesmo problema, pare e replaneje a abordagem;
- se o problema é estrutural, altere recipe/topologia/modifier em vez de insistir em Sculpt;
- quando o budget acabar sem atingir critérios, finalize como não aprovado ou solicite decisão humana; não force `finish` para “dar certo”.

## 15. Aprovação humana

Use `require_human_approval=true` quando:

- a produção é um ativo aprovado/oficial;
- a alteração pode destruir trabalho manual relevante;
- a mudança é difícil de reverter semanticamente;
- o agente está mudando forma final, composição ou identidade visual;
- a sessão ainda está em calibração;
- o usuário pediu supervisão.

`iteration.apply` só deve receber `approved=true` quando a aprovação necessária realmente ocorreu.

Não trate aprovação de um teste smoke como autorização permanente para alterações futuras de produto oficial.

## 16. Checkpoints, snapshots e rollback

Antes de mutação iterativa, V0.5 cria:

- snapshot em memória para rollback rápido;
- checkpoint `.blend` persistente;
- métricas BEFORE.

Depois da mutação:

- métricas AFTER;
- captures AFTER;
- diff.

Use rollback quando:

- visual piorou;
- métrica saiu do range;
- proposal teve efeito diferente do esperado;
- action falhou parcialmente;
- o agente perdeu confiança no estado.

Após rollback, confirme `state_hash` e, quando relevante, `geometry_hash` contra o baseline/estado anterior. Nunca assuma que rollback funcionou apenas porque a action retornou sucesso.

## 17. Receipts, hashes e evidência

Receipts são parte da definição de pronto.

O agente deve preservar e referenciar:

- recipe id/version/hash;
- plan hash;
- iteration config hash;
- checkpoints;
- before/after captures;
- diffs;
- avaliações visuais;
- rollbacks;
- receipt final e `receipt_hash` SHA-256.

Artefatos ficam em:

```text
.runtime/blender-agent/history/<stage-id>/attachments/
```

Nomes longos de arquivo são sanitizados preservando extensões como `.png`, `.json`, `.blend`, `.glb` e `.obj`.

O agente não deve renomear aleatoriamente artifacts do runtime sem atualizar as referências correspondentes.

## 18. Uso via MCP

Servidor V0.5:

```text
tools.blender_agent.mcp_server_v05
```

Ferramentas principais:

- `blender_status`;
- `blender_scene_summary`;
- `blender_viewport_describe`;
- `blender_viewport_capture`;
- `blender_checkpoint`;
- `blender_recipe_validate`;
- `blender_recipe_plan`;
- `blender_recipe_run`;
- `blender_recipe_status`;
- `blender_iteration_validate`;
- `blender_iteration_start`;
- `blender_iteration_status`;
- `blender_iteration_context`;
- `blender_iteration_observe`;
- `blender_iteration_observe_images`;
- `blender_iteration_propose`;
- `blender_iteration_apply`;
- `blender_iteration_apply_compare`;
- `blender_iteration_evaluate`;
- `blender_iteration_rollback`;
- `blender_iteration_finish`.

### Sequência MCP recomendada

```text
blender_status
  → blender_iteration_context/status
  → blender_iteration_observe_images
  → analisar imagens + métricas
  → blender_iteration_propose
  → aprovação humana, se exigida
  → blender_iteration_apply_compare
  → comparar before/after
  → blender_iteration_evaluate
  → repetir ou finish
```

`blender_iteration_apply_compare` é preferível para modelos multimodais porque devolve os pares BEFORE/AFTER diretamente como imagens.

### Regra para agentes remotos

Se o agente não possui uma conexão MCP local validada, ele **não deve afirmar que está vendo ou controlando o Blender local**. Nesse caso, use comandos que o usuário executa localmente ou um mecanismo de integração privado explicitamente suportado e validado. O bridge deve continuar em `127.0.0.1` e não deve ser exposto diretamente à internet.

## 19. Workflow recomendado — primeira baguete real

Para produzir a baguete real do Carro Chefe:

1. reúna fotos de referência aprovadas e dimensões conhecidas;
2. defina escala real e objetos-alvo;
3. regenere a base por recipe V0.4;
4. capture FRONT/RIGHT/TOP/THREE_QUARTER focados;
5. compare proporções com as referências;
6. corrija primeiro dimensões e silhueta por parâmetros/modifiers;
7. use seed determinístico apenas para irregularidade controlada;
8. aplique material da biblioteca por preset;
9. abra sessão V0.5 com budget pequeno;
10. faça uma correção por iteração;
11. use Sculpt somente para irregularidades orgânicas que a recipe não resolve;
12. compare before/after em cada iteração;
13. rollback de qualquer alteração ambígua/pior;
14. finalize quando critérios objetivos e avaliação visual estiverem atendidos;
15. registre receipt e marque a versão aprovada;
16. transforme ajustes recorrentes em parâmetros/variant da recipe.

A versão aprovada deve ser regenerável sem depender de repetir manualmente toda a sessão de Sculpt.

## 20. Workflow — ajuste de material

Para mudar apenas aparência:

1. observe em `MATERIAL` ou `RENDERED`;
2. confirme que geometria não precisa mudar;
3. use `material.preset` antes de `material.simple`;
4. altere apenas cor/roughness/metallic necessários;
5. aplique em uma proposal isolada;
6. compare as mesmas views e iluminação;
7. verifique que `geometry_hash` permaneceu estável;
8. aceite ou rollback;
9. se aprovado e recorrente, atualize biblioteca/recipe em vez de manter override manual permanente.

## 21. Workflow — correção geométrica

Prioridade:

```text
parâmetros da recipe
  → transform
  → modifier
  → irregularize com seed
  → Sculpt
```

Comece pela opção mais reproduzível. Não use Sculpt para corrigir algo que um parâmetro dimensional deveria controlar.

## 22. Anti-padrões proibidos

Agentes não devem:

- executar Python arbitrário no Blender;
- usar `eval`, `exec` ou shell como atalho;
- expor a porta local do bridge na internet;
- controlar mouse global do Windows para substituir `ui.*`;
- editar sem target explícito;
- aplicar múltiplas intenções em uma proposal;
- fazer dezenas de strokes sem observar entre eles;
- usar `view_all` para aprovar um produto quando objetos da cena contaminam a imagem;
- apagar câmera/luz/Cube do usuário apenas para limpar screenshots;
- aumentar budget repetidamente para perseguir resultado indefinido;
- usar `finish --force` para esconder critério não atendido;
- ignorar erro porque “visualmente parece funcionar”;
- confiar em chat como única memória operacional;
- sobrescrever recipe/receipt aprovado sem versionar;
- declarar MCP conectado sem teste real do cliente;
- afirmar rollback sem verificar hash/estado;
- transformar smoke test em produção oficial.

## 23. Troubleshooting

### `bridge.json` não aparece

Use:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/blender_agent/start.ps1 -MaxRetry 9 -RetrySeconds 10
```

Leia `.runtime/blender-agent/startup-logs/`.

### `ModuleNotFoundError: No module named 'tools'`

O entrypoint V0.5 deve adicionar `Path(__file__).resolve().parents[2]` ao `sys.path` antes dos imports `tools.blender_agent.*`. Atualize a branch se esse erro reaparecer.

### PowerShell 5.1 com caminho Unicode

A CLI emite JSON ASCII-safe. Scripts `.ps1` da ferramenta devem permanecer ASCII para evitar mojibake em caminhos como `Área de Trabalho`.

### Workspace/capture mostra tela antiga

Troca de workspace exige timer-yield. Não capture imediatamente no mesmo ciclo após `window.workspace = ...`. Use as actions existentes que aguardam estabilização.

### Capture sem `.png`

A sanitização de filename deve preservar a extensão, mesmo quando o stem é truncado. Não aprove smoke/recipe se algum caminho de capture perder `.png`.

### `sculpt.stroke` incompatível

O bridge descobre propriedades RNA suportadas por `OperatorStrokeElement`. Não reintroduza campos históricos fixos sem introspecção.

### `UnifiedPaintSettings` ausente

Blender 5.x usa `tool_settings.sculpt.unified_paint_settings`; existe fallback para versões antigas.

### Produto aparece junto com câmera/luz/Cube

Capture focado não está sendo aplicado. O agente deve isolar temporariamente o target e usar `view_selected`, restaurando a cena depois.

## 24. Checklist antes de alterar

- [ ] Bridge responde `status`.
- [ ] Target existe e está identificado pelo nome correto.
- [ ] Stage/receipt anterior foi consultado.
- [ ] Critério de aceite está explícito.
- [ ] Recipe existente foi considerada antes de ação manual.
- [ ] Views de comparação estão definidas.
- [ ] Budget está definido para V0.5.
- [ ] Aprovação humana está habilitada quando necessária.
- [ ] Há checkpoint para alteração destrutiva/arriscada.

## 25. Checklist por iteração

- [ ] `observe` executado.
- [ ] Proposal contém uma única intenção.
- [ ] `params.name` pertence a `target_objects`.
- [ ] Rationale e efeito esperado são verificáveis.
- [ ] Aprovação obtida, se exigida.
- [ ] Snapshot/checkpoint criado.
- [ ] BEFORE e AFTER disponíveis.
- [ ] Diff estrutural examinado.
- [ ] Capturas focadas examinadas.
- [ ] Visual score/notes registrados quando exigidos.
- [ ] Decisão `keep/continue/rollback/finish` justificada.

## 26. Checklist ao finalizar

- [ ] Critérios determinísticos passaram.
- [ ] Revisão visual passou quando exigida.
- [ ] Nenhum objeto não-alvo foi alterado indevidamente.
- [ ] Workspace/seleção/visibilidade foram restaurados.
- [ ] Receipt final existe.
- [ ] `receipt_hash` foi gerado.
- [ ] History contém as actions principais.
- [ ] Checkpoint relevante está referenciado.
- [ ] Alterações reutilizáveis foram incorporadas à recipe/variant quando adequado.
- [ ] Resultado aprovado não depende apenas de estado temporário não documentado.

## 27. Critérios para escalar rumo à V1.0

Antes de considerar o Blender Agent V1.0 para uso geral por agentes, manter como requisitos:

- regressão contínua no Blender LTS suportado;
- conexão MCP local validada no cliente alvo;
- addon/painel de diagnóstico e estado da sessão;
- recuperação clara após crash/restart;
- receipts e recipes versionados de forma estável;
- política de retenção de artifacts/checkpoints;
- biblioteca de materials/components amadurecida;
- recipes reais dos produtos oficiais;
- comparação com referências reais em múltiplas views;
- critérios de aprovação humana definidos para ativos oficiais;
- tool-health cobrindo os fluxos não destrutivos possíveis fora do Blender e smoke documentado para os fluxos reais.

## 28. Referências

Documentos técnicos relacionados:

- [Blender Agent](../tecnologia/BLENDER_AGENT.md)
- [Contexto persistente](../tecnologia/BLENDER_AGENT_CONTEXT.md)
- [Sculpt assistido](../tecnologia/BLENDER_AGENT_SCULPT.md)
- [Recipes 3D](../tecnologia/BLENDER_AGENT_RECIPES.md)
- [Loop iterativo V0.5](../tecnologia/BLENDER_AGENT_ITERATIVE.md)
- [Catálogo de ferramentas](../ferramentas/README.md)
- [Ferramentas próprias](../ferramentas/PROPRIAS.md)

README operacional da ferramenta:

```text
tools/blender_agent/README.md
```

## 29. Regra final

Um agente usando o Blender Agent deve conseguir responder, a qualquer momento:

1. **Qual objeto estou alterando?**
2. **Qual estado anterior posso restaurar?**
3. **Qual evidência mostra que a última mudança melhorou?**
4. **Qual recipe/receipt/history permite retomar ou reproduzir o trabalho?**
5. **Quais critérios ainda faltam para considerar o ativo aprovado?**

Se qualquer uma dessas respostas estiver indefinida, o agente deve observar/documentar antes de continuar mutando a cena.
