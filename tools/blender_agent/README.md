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

## Integração direta com agentes via MCP

Além do CLI, a ferramenta agora possui um servidor MCP stdio em `mcp_server.py`. Ele transforma o Blender Agent em ferramentas que um cliente MCP local pode chamar diretamente.

Instalação isolada no Windows:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/blender_agent/install-mcp.ps1
```

O instalador cria:

```text
.runtime/blender-agent/mcp-venv/
```

e instala a versão pinada do MCP Python SDK. Ele **não altera automaticamente** o arquivo de configuração do Codex; ao final imprime o bloco sugerido para `%USERPROFILE%\.codex\config.toml`.

Ferramentas MCP principais:

| Tool MCP | Função |
|---|---|
| `blender_status` | verifica Blender/bridge |
| `blender_scene_summary` | lê a cena atual |
| `blender_viewport_describe` | lê estado da VIEW_3D |
| `blender_viewport_set_view` | ajusta preset/shading |
| `blender_viewport_capture` | captura a VIEW_3D e devolve a imagem diretamente ao modelo |
| `blender_ui_orbit` | orbita a viewport |
| `blender_checkpoint` | cria checkpoint |
| `blender_action` | chama qualquer action segura/allowlisted do protocolo |

O ponto importante da V0.2 é `blender_viewport_capture`: o MCP devolve a captura como conteúdo de imagem, portanto um modelo multimodal compatível consegue **ver a própria viewport** sem depender de captura manual do usuário.

### Codex local

A configuração stdio usa o Python do venv criado pelo instalador, módulo `tools.blender_agent.mcp_server` e `cwd` apontando para a raiz do repositório. O servidor depende do Blender Agent já aberto, porque ele se conecta ao arquivo de sessão local do bridge.

Depois de configurar/reiniciar o cliente, o ciclo esperado é:

```text
agente
  -> blender_status
  -> blender_checkpoint
  -> blender_action / blender_ui_orbit
  -> blender_viewport_capture
  -> modelo enxerga a imagem
  -> decide o próximo ajuste
  -> repete
```

### ChatGPT/Work

Não exponha o bridge local do Blender diretamente na internet. Quando o ambiente ChatGPT/Work não puder iniciar um MCP stdio local, a integração remota deve usar um mecanismo privado suportado (por exemplo, Secure MCP Tunnel quando disponível para a conta/ambiente). O bridge Blender continua somente em `127.0.0.1`; quem faz a ponte é a camada MCP/túnel aprovada.

Referências de integração:
- https://developers.openai.com/docs/config-file/config-reference
- https://developers.openai.com/api/docs/guides/agents-api/tools/mcp
- https://developers.openai.com/api/docs/guides/secure-mcp-tunnels

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

Smoke test automatizado da V0.2, após abrir o Blender pelo launcher:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/blender_agent/smoke-test.ps1 -OpenImage
```

Ele valida bridge, descrição do viewport, preset 3/4, geração do PNG, receipt e, se o venv MCP já existir, import do adaptador MCP. O `-OpenImage` é opcional.

Smoke test manual detalhado:

```powershell
python -m tools.blender_agent.client status
python -m tools.blender_agent.client ui-window
python -m tools.blender_agent.client ui-dismiss
python -m tools.blender_agent.client ui-view3d
python -m tools.blender_agent.client ui-orbit --dx 120 --dy 60
python -m tools.blender_agent.client call scene.summary
```

## Limitações atuais

- captura do viewport, capture-set e adaptador MCP com retorno de imagem foram implementados; ainda faltam smoke tests reais da imagem e da conexão MCP no ambiente do proprietário antes de considerar a V0.2 validada;
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

### Windows PowerShell 5.1 e caminhos com acentos

O smoke test V0.2 revelou uma incompatibilidade de code page quando a CLI Python devolvia JSON contendo caminhos Unicode, por exemplo `Área de Trabalho`. O Python retornava o caminho correto, mas o Windows PowerShell 5.1 podia reinterpretar os bytes e transformar `Área` em texto corrompido, fazendo `Test-Path` procurar um caminho inexistente.

Correção adotada:

- a CLI imprime JSON ASCII-safe, com Unicode representado por escapes `\uXXXX`;
- `ConvertFrom-Json` reconstrói o caminho Unicode correto antes de `Test-Path`;
- os scripts `.ps1` do Blender Agent usam somente bytes ASCII para evitar mojibake de literais no Windows PowerShell 5.1;
- há teste automatizado impedindo a reintrodução de caracteres não ASCII nesses scripts.

Essa correção não altera o nome real das pastas nem exige mover o repositório para um caminho sem acentos.
