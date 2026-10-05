# Blender Agent — Loop iterativo V0.5

## Objetivo

A V0.5 transforma as capacidades anteriores em um ciclo controlado de produção 3D:

```text
recipe/contexto
  -> observar
  -> propor uma alteração pequena
  -> snapshot + checkpoint
  -> aplicar action allowlisted
  -> capturar AFTER
  -> comparar métricas/imagens
  -> avaliar
  -> manter, continuar ou rollback
  -> repetir dentro do budget
```

O bridge **não cria um agente autônomo irrestrito**. O planner continua sendo o modelo/agente externo; o Blender Agent fornece percepção estruturada, actions limitadas, orçamento, checkpoints, rollback, history e receipts.

## Arquitetura

A V0.5 usa uma extensão sobre o bridge estável V0.1–V0.4:

```text
tools/blender_agent/blender_bridge.py       # core estável
tools/blender_agent/blender_bridge_v05.py   # extensão V0.5
tools/blender_agent/iteration.py             # schema/validator/criteria puro Python
tools/blender_agent/iteration_cli.py         # CLI dedicada
tools/blender_agent/mcp_server_v05.py        # MCP multimodal V0.5
```

`start.ps1` carrega `blender_bridge_v05.py`, que reutiliza o core e adiciona somente as novas actions e o enquadramento focado.

## Correção visual da V0.4

As capturas anteriores enquadravam a cena inteira, portanto câmera, luz e o Cube padrão podiam aparecer junto da baguete.

A V0.5 corrige isso também para recipes V0.4:

1. identifica o `target_object` da captura — explicitamente ou pelo primeiro component existente da recipe;
2. salva objeto ativo, seleção e `hide_set()` de cada objeto da cena;
3. oculta temporariamente todos os objetos exceto o target;
4. seleciona o target e usa `view_selected`;
5. aplica preset/shading;
6. captura apenas a VIEW_3D;
7. restaura imediatamente hidden state, seleção e objeto ativo.

Nenhuma câmera, luz, Cube ou outro objeto do usuário é apagado. A resposta da captura contém:

```json
{
  "target_object": "CC_Baguette_Base",
  "isolated_target": true
}
```

## Configuração da sessão

Schema v1:

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
    "dimension_ranges": {
      "CC_Baguette_Base": {
        "x": [5.0, 9.0],
        "y": [1.0, 4.0],
        "z": [0.5, 3.0]
      }
    },
    "vertex_ranges": {
      "CC_Baguette_Base": [8, 100000]
    },
    "min_visual_score": 0.8,
    "require_visual_review": true,
    "max_failed_actions": 0,
    "max_rollbacks": 3
  },
  "require_human_approval": true,
  "create_stage": true,
  "restore_stage": true,
  "restore_workspace": true,
  "tags": ["baguette", "v0.5"]
}
```

Limites atuais:

- até 8 targets;
- até 20 iterações;
- até 8 views;
- proposal até 128 KiB;
- schema fechado, sem campos desconhecidos.

## Proposal

Cada iteração aceita **uma alteração pequena**:

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

Actions V0.5 allowlisted:

- `object.transform`;
- `object.shade_smooth`;
- `object.irregularize`;
- `modifier.add`;
- `material.simple`;
- `material.preset`;
- `sculpt.stroke`.

A proposal não pode apontar `params.name` para um objeto fora de `target_objects`.

## Approval

Com `require_human_approval=true`, `iteration.apply` recusa a mutação até receber `approved=true`.

Isso permite um fluxo em que o agente:

1. observa;
2. explica a alteração proposta;
3. aguarda aprovação;
4. só então aplica.

Para ciclos automatizados supervisionados, a flag pode ser desabilitada no config.

## Percepção

`iteration.observe` devolve duas camadas:

### Estruturada

Para cada target:

- location;
- rotation;
- scale;
- dimensions;
- modifier count/types;
- material count;
- vertex/edge/polygon count;
- `geometry_hash`;
- `state_hash`.

### Visual

Capturas isoladas por view, cada uma com PNG, SHA-256, preset, shading e target.

No MCP, `blender_iteration_observe_images` entrega essas imagens diretamente ao modelo multimodal.

## Snapshot, checkpoint e rollback

Antes de cada proposal aplicada:

- é criado snapshot interno dos targets para rollback rápido;
- é criado checkpoint `.blend` persistente;
- métricas BEFORE são registradas.

Depois da action:

- métricas AFTER;
- captures AFTER;
- diff estruturado.

O diff mostra deltas de transform/dimensions/counts e flags `geometry_changed`/`state_hash_changed`.

Se a action lança erro, o bridge tenta rollback automático para o snapshot e registra falha no auto-history.

`iteration.rollback` também permite rollback explícito da última iteração.

> Limite V0.5 inicial: rollback de operações executadas enquanto o Blender permanece em Sculpt Mode depende do contexto ativo do Blender. O fluxo recomendado para Sculpt é manter strokes pequenos, avaliar imediatamente e usar o checkpoint `.blend` como recuperação de último recurso caso o snapshot em memória não possa ser restaurado no contexto atual.

## Critérios

Critérios determinísticos:

- ranges de dimensões por eixo;
- ranges de vertex count;
- máximo de actions falhas;
- máximo de rollbacks;
- budget de iterações.

Critério visual:

- `require_visual_review`;
- `min_visual_score` de 0 a 1.

O bridge não inventa sozinho a nota visual. O agente multimodal ou o humano analisa as capturas e envia `visual_score`, notas e scores por view em `iteration.evaluate`.

## Decisões de avaliação

`iteration.evaluate` aceita:

- `keep` — aceitar a alteração;
- `continue` — aceitar e seguir para outra iteração;
- `rollback` — restaurar snapshot;
- `finish` — marcar como pronto para finalizar.

## Auto-history

O stage da sessão registra:

- `iteration.start`;
- `iteration.observe`;
- `iteration.propose`;
- `iteration.apply`;
- `iteration.evaluate`;
- `iteration.rollback`;
- `iteration.finish`.

Assim um agente futuro pode reconstruir o raciocínio operacional sem depender do histórico do chat.

## Receipt final

`iteration.finish` grava JSON dentro dos attachments do stage contendo:

- config + hash;
- source recipe/receipt;
- baseline metrics;
- final metrics;
- critérios;
- todas as iterações;
- proposals;
- diffs;
- visual reviews;
- rollbacks;
- `receipt_hash` SHA-256.

## CLI

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

## MCP V0.5

Servidor:

```text
tools.blender_agent.mcp_server_v05
```

Ferramentas principais:

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

## Smoke test integrado

Feche/reabra o Blender Agent com o bridge V0.5 e rode:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/blender_agent/iteration-smoke-test.ps1 -OpenImages
```

O smoke:

1. cria target temporário usando a recipe V0.4;
2. exige captures `.png` focados somente no target;
3. inicia sessão V0.5 com budget;
4. observa target;
5. registra proposal que exige aprovação;
6. aplica após aprovação com snapshot + checkpoint;
7. confirma diff real;
8. rejeita visualmente a mudança e executa rollback;
9. confirma que o `state_hash` voltou ao baseline;
10. grava receipt;
11. confirma auto-history;
12. remove o target e restaura o stage anterior.

A V0.5 só deve ser marcada como validada depois desse smoke passar no Windows 10 + Blender 5.2 LTS.
