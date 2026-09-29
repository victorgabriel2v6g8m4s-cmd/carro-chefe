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

Se o Blender não estiver no PATH, passe `-BlenderExe`. Para abrir arquivo existente, passe `-BlendFile`. O bridge grava a sessão efêmera em `.runtime/blender-agent/session/bridge.json`; esse arquivo contém token local e nunca deve ser versionado.

## Cliente

```powershell
python -m tools.blender_agent.client status
python -m tools.blender_agent.client call scene.summary
python -m tools.blender_agent.client call object.add_primitive --json '{"kind":"cube","name":"Baguete_Base","scale":[3.8,1.05,0.65]}'
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
| `modifier.add` | modifiers allowlisted |
| `material.simple` | Principled BSDF básico |
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

As imagens ficam em:

```text
.runtime/blender-agent/viewports/
```

Cada imagem recebe um receipt auditável em:

```text
.runtime/blender-agent/receipts/
```

O receipt registra SHA-256, dimensões, cena e estado da viewport no momento da captura.

## Segurança

- bind somente em `127.0.0.1` e porta efêmera por padrão;
- token aleatório por sessão;
- sem action para `eval`, `exec`, shell ou Python arbitrário;
- actions e eventos são allowlisted;
- UI é simulada pelo próprio Blender, sem mouse global do Windows;
- renders, exports e checkpoints ficam em `.runtime/blender-agent/`;
- mesh customizado possui limites de tamanho;
- a ferramenta não publica ativos nem sobrescreve automaticamente mídia oficial.

Preferir ações semânticas. `ui.*` é fallback para Sculpt, seleção visual, viewport e outras operações contextuais.

## Testes

```bash
python -m unittest discover -s tools/blender_agent/tests -p "test_*.py" -v
```

Smoke test real, após abrir o Blender pelo launcher:

```powershell
python -m tools.blender_agent.client status
python -m tools.blender_agent.client ui-window
python -m tools.blender_agent.client ui-dismiss
python -m tools.blender_agent.client ui-view3d
python -m tools.blender_agent.client ui-orbit --dx 120 --dy 60
python -m tools.blender_agent.client call scene.summary
```

## Limitações atuais

- a captura do viewport e o conjunto multiângulo foram implementados, mas ainda precisam do smoke test visual no Blender 5.2 LTS real antes de considerar a V0.2 validada;
- `event_simulate` exige `--enable-event-simulate`;
- Sculpt depende do contexto/tool ativo;
- checkpoint é criado, mas rollback automático ficará para a próxima fase;
- OBJ varia por versão e usa fallback;
- ainda não há addon/painel instalável nem reconhecimento visual automático da UI.

Roadmap completo em `docs/tecnologia/BLENDER_AGENT.md`.

## Troubleshooting do launcher

Se o Blender abrir e mostrar `Unable to Load File`, ou se `python -m tools.blender_agent.client status` disser que `bridge.json` não existe, o bridge não iniciou.

A partir da correção de 29/09/2026 o launcher preserva aspas em caminhos Windows com espaços, inclusive pastas como `Área de Trabalho`, e espera a criação real da sessão antes de retornar sucesso.

Diagnóstico sem abrir o Blender:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/blender_agent/start.ps1 -DryRun
```

Na linha `Args:`, o caminho completo de `blender_bridge.py` deve aparecer entre aspas. No fluxo normal, só prossiga para `client status` depois de o launcher imprimir `Blender Agent pronto.`.

### Splash inicial / interface aparentemente travada

O splash do Blender é modal: enquanto está aberto, a viewport atrás dele não recebe cliques. O Blender 5.2 fecha esse splash com `Esc`. A V0.1.1 envia esse `Esc` automaticamente 0,75 s após a inicialização. Se ainda aparecer, rode `python -m tools.blender_agent.client ui-dismiss`. Depois confirme a viewport com `ui-view3d` e use `ui-orbit`, que calcula automaticamente o centro da maior VIEW_3D em vez de depender de coordenadas fixas.
