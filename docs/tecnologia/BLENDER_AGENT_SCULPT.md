# Blender Agent — Sculpt assistido V0.3

## Objetivo

Permitir que agentes corrijam formas orgânicas no Blender por strokes pequenos, auditáveis e reversíveis, sem depender de mouse global do Windows.

O caso inicial é a baguete do Carro Chefe: ajustar silhueta, volume, assimetrias, abertura e detalhes orgânicos depois que a geometria semântica/paramétrica chegar ao seu limite.

## Princípio de operação

Cada iteração deve seguir:

```text
consultar contexto
  ↓
checkpoint automático
  ↓
captura antes
  ↓
stroke pequeno
  ↓
yield/event loop
  ↓
captura depois
  ↓
comparação visual
  ↓
manter ou corrigir
```

O agente não deve aplicar uma sequência longa de strokes sem observar o resultado intermediário.

## Actions

### `sculpt.status`

Retorna modo atual, workspace, objeto ativo, tipo do objeto, brush/tool ativo, radius/strength, estado da VIEW_3D e brushes allowlisted.

### `sculpt.prepare`

Responsabilidades:

1. escolher workspace de Sculpt;
2. selecionar um objeto MESH;
3. entrar em Sculpt Mode;
4. enquadrar o objeto selecionado;
5. ativar brush allowlisted;
6. definir radius e strength;
7. registrar workspace anterior para restauração posterior.

Se o workspace atual não possuir VIEW_3D, a ferramenta usa `Sculpting` ou `Layout`.

### `sculpt.stroke`

Aplica um stroke via `bpy.ops.sculpt.brush_stroke`.

Por padrão:

- exige Sculpt Mode;
- exige mesh ativo;
- limita a 128 pontos;
- usa coordenadas `NORMALIZED`;
- limita radius a 5–500 px;
- limita strength a 0.001–1.0;
- limita pressure a 0–1;
- cria checkpoint `.blend` antes do stroke;
- captura a viewport antes do stroke;
- registra comando, resultado e anexos no auto-history.

O retorno recomenda uma captura posterior separada, porque o framebuffer precisa receber um ciclo do event loop depois da deformação.

### `sculpt.finish`

Sai de Sculpt Mode e, por padrão, restaura o workspace que estava ativo antes de `sculpt.prepare`.

## Coordenadas normalizadas

A interface preferida para agentes usa coordenadas independentes da resolução do viewport:

```text
(0, 1) ---------------- (1, 1)
  |                        |
  |       VIEW_3D          |
  |                        |
(0, 0) ---------------- (1, 0)
```

Exemplo:

```json
[
  [0.45, 0.50],
  [0.50, 0.50],
  [0.55, 0.50]
]
```

A ferramenta converte esses valores para pixels da região VIEW_3D ativa.

Também existe `REGION` para diagnóstico/manual, mas agentes devem preferir `NORMALIZED`.

## Brushes allowlisted

V0.3 aceita:

- `DRAW`;
- `SMOOTH`;
- `GRAB`;
- `INFLATE`;
- `CLAY_STRIPS`;
- `CREASE`;
- `SNAKE_HOOK`.

A ferramenta tenta ativar o brush pelo tipo nativo e possui fallback para o tool id correspondente.

Não existe seleção arbitrária de asset/tool pelo protocolo.

## Modos de stroke

Allowlist:

- `NORMAL`;
- `INVERT`;
- `SMOOTH`;
- `ERASE`;
- `MASK` quando a versão do Blender expõe `brush_toggle=MASK`.

A implementação detecta em runtime as propriedades realmente disponíveis em `bpy.ops.sculpt.brush_stroke`, permitindo compatibilidade entre variações recentes da API do Blender.

## Checkpoints

Cada `sculpt.stroke` cria checkpoint por padrão:

```text
.runtime/blender-agent/checkpoints/
  <stage>-<label>-<timestamp>.blend
```

O checkpoint é criado antes da deformação.

Desabilitar checkpoint é permitido apenas no CLI genérico para diagnóstico explícito; as ferramentas MCP de Sculpt mantêm checkpoint obrigatório.

## Feedback visual via MCP

Ferramentas MCP:

- `blender_sculpt_status`;
- `blender_sculpt_prepare`;
- `blender_sculpt_stroke`;
- `blender_sculpt_iteration`;
- `blender_sculpt_finish`.

A ferramenta recomendada para um agente multimodal é `blender_sculpt_iteration`.

Ela cria checkpoint, captura "antes", executa o stroke, espera o redraw, captura "depois" e devolve as duas imagens ao modelo. O modelo deve comparar as imagens antes de escolher o próximo stroke.

## Auto-history

Cada stroke aparece automaticamente na etapa ativa. A captura posterior feita pelo agente é registrada como `viewport.capture` na mesma etapa.

## Segurança

- sem Python arbitrário;
- sem shell;
- sem mouse global;
- brushes allowlisted;
- limites de pontos/radius/strength/pressure;
- Sculpt apenas em MESH;
- checkpoint antes do stroke por padrão;
- coordenadas validadas contra a VIEW_3D;
- histórico segmentado;
- workspace anterior restaurável;
- ferramenta MCP não permite desativar checkpoint.

## CLI

Preparar:

```powershell
python -m tools.blender_agent.client sculpt-prepare --name Baguete_Base --workspace Sculpting --brush GRAB --radius 70 --strength 0.3
```

Stroke:

```powershell
python -m tools.blender_agent.client sculpt-stroke --points-json '[[0.44,0.50],[0.50,0.50],[0.56,0.48]]' --brush GRAB --radius 70 --strength 0.3 --label ajustar-silhueta
```

Captura posterior:

```powershell
python -m tools.blender_agent.client viewport-capture --name ajustar-silhueta-after.png
```

Finalizar:

```powershell
python -m tools.blender_agent.client sculpt-finish
```

## Smoke test Windows 10 + Blender 5.2 LTS

Com o bridge aberto:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/blender_agent/sculpt-smoke-test.ps1 -OpenImages
```

O teste cria uma UV sphere temporária, entra em Sculpt, cria checkpoint, captura antes, aplica stroke, captura depois, exige SHA-256 diferente, verifica o auto-history, restaura o workspace e remove a esfera.

## Critério de aceite V0.3

A V0.3 é considerada validada quando o smoke test real entra em Sculpt Mode, ativa o brush, modifica visualmente a esfera, gera checkpoint, produz before/after diferentes, registra o stroke no history, restaura workspace e limpa o objeto temporário.

Depois disso, a próxima evolução é aplicar o mesmo ciclo à baguete real com strokes planejados a partir das referências fotográficas.


## Compatibilidade PowerShell 5.1

O primeiro smoke V0.3 parou ao criar a esfera temporária porque o Windows PowerShell 5.1 alterou a passagem de um objeto JSON inline para o subprocesso Python. O problema não era o bridge nem o Sculpt; o parser do CLI recebia argumentos quebrados antes de chegar ao Blender.

Correção:

- o smoke não usa mais `client call ... --json`;
- foram adicionados `object-add-primitive` e `object-delete` tipados;
- `sculpt-stroke` aceita `--point X Y` repetível, evitando `--points-json` no smoke;
- continua existindo `--points-json` para ambientes que preservam argumentos JSON corretamente;
- há teste de regressão garantindo que `sculpt-smoke-test.ps1` não volte a depender de JSON inline.

Comandos usados pelo smoke agora atravessam PowerShell -> Python apenas como argumentos escalares.
