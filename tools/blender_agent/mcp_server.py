from __future__ import annotations

import json
from typing import Any

try:
    from mcp.server.mcpserver import Image, MCPServer
except ModuleNotFoundError:  # MCP Python SDK v1 compatibility.
    from mcp.server.fastmcp import FastMCP as MCPServer
    from mcp.server.fastmcp import Image

from .client import call
from .protocol import sanitize_label

mcp = MCPServer(
    "Carro Chefe Blender Agent",
    instructions=(
        "Controle somente a sessão local do Blender Agent do Carro Chefe. "
        "Prefira ações semânticas; use eventos ui.* apenas quando necessário. "
        "Capture a viewport após mudanças visuais relevantes e crie checkpoints "
        "antes de operações destrutivas."
    ),
)


def _result(response: dict[str, Any]) -> dict[str, Any]:
    result = response.get("result")
    if not isinstance(result, dict):
        raise RuntimeError("resposta do Blender bridge sem result estruturado")
    return result


@mcp.tool()
def blender_status() -> dict[str, Any]:
    """Verifica a sessão local do Blender e retorna versão, arquivo e viewport."""
    return _result(call("health"))


@mcp.tool()
def blender_scene_summary() -> dict[str, Any]:
    """Lista objetos, seleção e estado básico da cena Blender atual."""
    return _result(call("scene.summary"))


@mcp.tool()
def blender_viewport_describe() -> dict[str, Any]:
    """Retorna bounds, shading, orientação e seleção da VIEW_3D ativa."""
    return _result(call("viewport.describe"))


@mcp.tool()
def blender_viewport_set_view(
    preset: str = "THREE_QUARTER",
    frame_all: bool = True,
    shading: str | None = None,
) -> dict[str, Any]:
    """Define uma vista previsível e opcionalmente o shading do viewport."""
    if shading:
        call("viewport.set_shading", {"type": shading})
    return _result(call("viewport.set_view", {
        "preset": preset,
        "frame_all": frame_all,
    }))


@mcp.tool()
def blender_viewport_capture(name: str = "agent-latest.png") -> Image:
    """Captura somente a VIEW_3D atual e devolve a imagem diretamente ao modelo."""
    clean = sanitize_label(name, "agent-latest.png")
    if not clean.lower().endswith(".png"):
        clean += ".png"
    result = _result(call("viewport.capture", {"filename": clean}))
    return Image(path=result["path"])


@mcp.tool()
def blender_ui_orbit(dx: int = 120, dy: int = 60, steps: int = 18) -> dict[str, Any]:
    """Orbita a maior VIEW_3D usando o simulador de eventos interno do Blender."""
    return _result(call("ui.orbit", {"dx": dx, "dy": dy, "steps": steps}))


@mcp.tool()
def blender_checkpoint(label: str = "agent-checkpoint") -> dict[str, Any]:
    """Cria uma cópia .blend de checkpoint na área de runtime."""
    return _result(call("checkpoint.create", {"label": sanitize_label(label, "agent-checkpoint")}))


@mcp.tool()
def blender_action(action: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    """Executa uma action explicitamente allowlisted pelo protocolo do Blender Agent."""
    return _result(call(action, params or {}))


@mcp.tool()
def blender_action_json(action: str, params_json: str = "{}") -> dict[str, Any]:
    """Variante do blender_action para clientes que preferem params como JSON textual."""
    params = json.loads(params_json)
    if not isinstance(params, dict):
        raise ValueError("params_json deve representar um objeto JSON")
    return _result(call(action, params))


if __name__ == "__main__":
    mcp.run(transport="stdio")
