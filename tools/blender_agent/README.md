# Blender Agent Bridge

Integração local do Carro Chefe com Blender para permitir que agentes controlem modelagem 3D sem depender de Computer Use do sistema operacional.

A ferramenta combina duas camadas: ações semânticas via Blender Python API e eventos de interface simulados pelo próprio Blender para clique, arrasto, middle-mouse e wheel quando a modelagem exigir interação parecida com mouse. A camada de UI usa `bpy.types.Window.event_simulate`; não existe automação genérica do mouse do Windows nesta versão.

## Requisitos

- Windows 10 ou superior para o fluxo principal do projeto;
- Blender 5.2 LTS é a baseline validada para o fluxo completo; versões anteriores podem não possuir `Window.screenshot` usado na captura automática do viewport;
- Python do sistema para o cliente CLI;
- Blender iniciado com `--enable-event-simulate` para ações `ui.*`.
- O core de protocolo/CLI é testável sem Blender em Linux, macOS e Windows.

## Início rápido no Windows

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/blender_agent/start.ps1
```

O launcher usa tentativas em vez de um timeout único. O padrão é `9` tentativas de até `10` segundos cada. Em máquina mais lenta, ajuste explicitamente:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/blender_agent/start.ps1 -MaxRetry 12 -RetrySeconds 15
```

`-WaitForBridgeSeconds` permanece aceito apenas por compatibilidade e é convertido em número de tentativas quando `-MaxRetry` não é informado.

A cada tentativa o launcher verifica se o processo do Blender continua vivo e se `.runtime/blender-agent/session/bridge.json` pertence ao PID recém-aberto e contém `port` e `token`. O stdout/stderr do startup também são gravados em `.runtime/blender-agent/startup-logs/`; se o bridge não subir, as últimas linhas são impressas automaticamente para diferenciar máquina lenta de erro real de import/bootstrap.

Se o Blender não estiver no PATH, passe `-BlenderExe`. Para abrir arquivo existente, passe `-BlendFile`. O bridge grava a sessão efêmera em `.runtime/blender-agent/session/bridge.json`; esse arquivo contém token local e nunca deve ser versionado.

## Cliente

```powershell
python -m tools.blender_agent.client status
python -m tools.blender_agent.client call scene.summary
python -m tools.blender_agent.client object-add-primitive cube --name Baguete_Base --scale 3.8 1.05 0.65
python -m tools.blender_agent.client object-delete Baguete_Base
```

Há um bootstrap de baguete em `examples/baguette_bootstrap.jsonl`.

## Mouse/gestos dentro do Blender

Primeiro consulte `python -m tools.blender_agent.client ui-window`. Depois use:

```powershell
python -m tools.blender_agent.client ui-click 640 420 --button left
python -m tools.blender_agent.client ui-drag 620 430 760 360 --button middle
python -m tools.blender_agent.client ui-drag 620 430 700 430 --button middle --shift
python -m tools.blender_agent.client ui-wheel 3
```

As coordenadas são relativas à janela Blender. O bridge rejeita coordenadas fora dos limites reportados por `ui.window`. O launcher/bridge também tenta fechar automaticamente o splash inicial com `Esc` após a inicialização.

## Actions disponíveis

| Action | Finalidade |
|---|---|
| `health` | status do bridge/Blender |
| `scene.summary` / `object.list` | inventário da cena |
| `object.select` | seleção por nome |
| `object.add_primitive` / `object.add_mesh` | criação de geometria |
| `object.transform` | localização, escala e rotação |
| `object.duplicate` / `object.delete` | duplicação e remoção |
| `object.shade_smooth` | smooth shading |
| `object.irregularize` | irregularidade geométrica determinística por seed |
| `modifier.add` | modifiers allowlisted |
| `material.simple` | Principled BSDF básico |
| `material.preset` | aplica preset da biblioteca versionada de materiais |
| `camera.orbit` | câmera determinística |
| `render.still` | PNG em runtime |
| `checkpoint.create` | cópia `.blend` em runtime |
| `export.glb` / `export.obj` | export controlado |
| `ui.window` / `ui.view3d` / `ui.event` | janela, bounds da viewport e evento allowlisted |
| `ui.dismiss_modal` | envia `Esc` para fechar splash/modal atual |
| `ui.orbit` | orbita automaticamente a maior VIEW_3D |
| `ui.click` / `ui.drag` / `ui.wheel` | interação estilo mouse confinada ao Blender |
| `viewport.describe` | estado da VIEW_3D, shading, perspectiva e seleção |
| `viewport.set_view` / `viewport.frame_all` | presets de vista e enquadramento |
| `viewport.set_shading` | wireframe/solid/material/rendered |
| `viewport.capture` | captura PNG somente da região 3D + receipt JSON/SHA-256 |
| `workspace.list` / `workspace.describe` | lista e consulta conteúdo de abas/workspaces |
| `workspace.capture_set` | captura múltiplos workspaces/áreas e gera manifesto |
| `history.stage.create/list/activate/describe` | ciclo de vida e contexto das etapas de produção |
| `history.search` | pesquisa por texto, etapa, action, tempo, status, tags e anexos |
| `history.note` | nota explícita na etapa ativa |
| `sculpt.status` | estado do Sculpt/brush/objeto/viewport |
| `sculpt.prepare` | entra em Sculpt Mode com brush/radius/strength allowlisted |
| `sculpt.stroke` | stroke multiponto com checkpoint e captura anterior |
| `sculpt.finish` | sai de Sculpt e restaura workspace anterior |
| `recipe.validate` | valida schema/action allowlist/hash sem editar cena |
| `recipe.plan` | resolve variant/overrides e gera plano determinístico |
| `recipe.run` | executa recipe step-by-step com stage/history/capturas/receipt |
| `recipe.status` | progresso/resultado resumido da recipe |

## Feedback visual automático — V0.2

A V0.2 permite que o agente capture exatamente a região 3D exibida no Blender 5.2 LTS. A implementação usa `Window.screenshot(region=...)` e grava o PNG via `imbuf`, sem capturar outros aplicativos ou o desktop inteiro.

Diagnóstico da viewport:

```powershell
python -m tools.blender_agent.client viewport-describe
```

Definir vista e shading:

```powershell
python -m tools.blender_agent.client viewport-shading MATERIAL
python -m tools.blender_agent.client viewport-view FRONT
```

Capturar a vista atual:

```powershell
python -m tools.blender_agent.client viewport-capture --name baguete-front.png
```

Gerar um conjunto previsível de vistas:

```powershell
python -m tools.blender_agent.client viewport-capture-set --label baguete-test
```

O conjunto padrão gera `FRONT`, `RIGHT`, `TOP` e `THREE_QUARTER`. Também podem ser escolhidas vistas específicas com `--views`.

As capturas e receipts passam a ficar dentro da etapa ativa:
