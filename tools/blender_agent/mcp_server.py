from __future__ import annotations

import json
import time
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
        "antes de operações destrutivas. Ao iniciar uma nova etapa material da produção, "
        "crie um stage com blender_history_start. Use as ferramentas de workspace para consultar "
        "abas antigas e as ferramentas de history para recuperar contexto por etapa, sem "
        "depender da memória da conversa. Em Sculpt, prefira strokes pequenos em coordenadas "
        "NORMALIZED, mantenha checkpoint habilitado e capture o viewport após cada stroke antes "
        "de decidir o próximo ajuste."
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
def blender_workspaces() -> dict[str, Any]:
    """Lista as abas/workspaces disponíveis no Blender e indica a aba atual."""
    return _result(call("workspace.list"))


@mcp.tool()
def blender_workspace_describe(
    names: list[str] | None = None,
    all_workspaces: bool = False,
) -> dict[str, Any]:
    """Consulta conteúdo estruturado de uma ou várias abas/workspaces sem depender da memória do chat."""
    return _result(call("workspace.describe", {
        "names": names,
        "all": all_workspaces,
    }))


@mcp.tool()
def blender_workspace_capture(
    workspaces: list[str] | None = None,
    target: str = "VIEW_3D",
    area_type: str | None = None,
    shading: str | None = None,
    label: str = "workspace-capture-set",
    captures: list[dict[str, Any]] | None = None,
) -> list[Image]:
    """Captura várias abas/workspaces em uma operação e devolve todas as imagens ao modelo.

    Use captures para um plano customizado por aba; caso contrário, workspaces/target/area_type/shading
    definem um plano comum.
    """
    params: dict[str, Any] = {
        "label": sanitize_label(label, "workspace-capture-set"),
    }
    if captures:
        params["captures"] = captures
    else:
        params.update({
            "workspaces": workspaces,
            "target": target,
            "area_type": area_type,
            "shading": shading,
        })
    result = _result(call("workspace.capture_set", params))
    if int(result.get("failure_count", 0)) > 0:
        raise RuntimeError(f"workspace capture teve falhas: {result.get('captures')}")
    if not bool(result.get("restored_original_workspace", False)):
        raise RuntimeError("workspace original nao foi restaurado apos capture_set")
    images: list[Image] = []
    for capture in result.get("captures", []):
        if capture.get("ok") and capture.get("path"):
            images.append(Image(path=capture["path"]))
    if not images:
        raise RuntimeError(f"nenhuma captura de workspace foi gerada: {result}")
    return images


@mcp.tool()
def blender_history_start(
    label: str,
    stage_id: str | None = None,
    previous_stage_id: str | None = None,
    tags: list[str] | None = None,
) -> dict[str, Any]:
    """Inicia uma nova etapa de produção e referencia automaticamente a etapa anterior."""
    return _result(call("history.stage.create", {
        "label": label,
        "stage_id": stage_id,
        "previous_stage_id": previous_stage_id,
        "activate": True,
        "tags": tags or [],
    }))


@mcp.tool()
def blender_history_list(limit: int = 100) -> dict[str, Any]:
    """Lista etapas de produção registradas, incluindo a etapa ativa e suas relações."""
    return _result(call("history.stage.list", {"limit": limit}))


@mcp.tool()
def blender_history_use(stage_id: str) -> dict[str, Any]:
    """Ativa uma etapa histórica existente para continuar o trabalho nela."""
    return _result(call("history.stage.activate", {"stage_id": stage_id}))


@mcp.tool()
def blender_history_context(stage_id: str | None = None, recent: int = 20) -> dict[str, Any]:
    """Recupera contexto resumido da etapa, eventos recentes, anexos e referência anterior/próxima."""
    return _result(call("history.stage.describe", {
        "stage_id": stage_id,
        "recent": recent,
    }))


@mcp.tool()
def blender_history_search(
    query: str | None = None,
    stage_id: str | None = None,
    action: str | None = None,
    since: str | None = None,
    until: str | None = None,
    success: bool | None = None,
    has_attachment: bool | None = None,
    tags: list[str] | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    """Pesquisa o auto-history por palavras-chave e filtros de etapa, ação, tempo, resultado, tags e anexos."""
    return _result(call("history.search", {
        "query": query,
        "stage_id": stage_id,
        "action": action,
        "since": since,
        "until": until,
        "success": success,
        "has_attachment": has_attachment,
        "tags": tags or [],
        "limit": limit,
    }))


@mcp.tool()
def blender_history_note(
    text: str,
    tags: list[str] | None = None,
    stage_id: str | None = None,
) -> dict[str, Any]:
    """Anexa uma nota curta ao histórico segmentado da etapa."""
    return _result(call("history.note", {
        "text": text,
        "tags": tags or [],
        "stage_id": stage_id,
    }))


@mcp.tool()
def blender_recipe_validate(recipe: dict[str, Any]) -> dict[str, Any]:
    """Valida estritamente uma recipe 3D versionada sem modificar o Blender."""
    return _result(call("recipe.validate", {"recipe": recipe}))


@mcp.tool()
def blender_recipe_plan(
    recipe: dict[str, Any],
    variant: str | None = None,
    overrides: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Resolve parametros, variant e overrides e devolve o plano deterministico sem executar."""
    return _result(call("recipe.plan", {
        "recipe": recipe,
        "variant": variant,
        "overrides": overrides or {},
    }))


@mcp.tool()
def blender_recipe_run(
    recipe: dict[str, Any],
    variant: str | None = None,
    overrides: dict[str, Any] | None = None,
    dry_run: bool = False,
    create_stage: bool = True,
    restore_stage: bool = False,
    workspace: str | None = None,
    restore_workspace: bool = True,
) -> dict[str, Any]:
    """Executa uma recipe allowlisted step-by-step, com history, captures e receipt."""
    return _result(call("recipe.run", {
        "recipe": recipe,
        "variant": variant,
        "overrides": overrides or {},
        "dry_run": dry_run,
        "create_stage": create_stage,
        "restore_stage": restore_stage,
        "workspace": workspace,
        "restore_workspace": restore_workspace,
    }, timeout=120.0))


@mcp.tool()
def blender_recipe_status() -> dict[str, Any]:
    """Mostra progresso da recipe atual ou resultado resumido da ultima execucao."""
    return _result(call("recipe.status"))


@mcp.tool()
def blender_sculpt_status() -> dict[str, Any]:
    """Mostra objeto, modo, brush, raio, força e viewport do Sculpt atual."""
    return _result(call("sculpt.status"))


@mcp.tool()
def blender_sculpt_prepare(
    name: str | None = None,
    workspace: str = "Sculpting",
    brush: str = "DRAW",
    radius: int = 60,
    strength: float = 0.25,
) -> dict[str, Any]:
    """Seleciona um mesh, entra em Sculpt Mode e configura um brush allowlisted."""
    return _result(call("sculpt.prepare", {
        "name": name,
        "workspace": workspace,
        "frame_selected": True,
        "brush": brush,
        "radius": radius,
        "strength": strength,
    }))


@mcp.tool()
def blender_sculpt_stroke(
    points: list[list[float] | dict[str, float]],
    brush: str | None = None,
    radius: int = 60,
    strength: float = 0.25,
    pressure: float = 1.0,
    mode: str = "NORMAL",
    label: str = "stroke",
) -> dict[str, Any]:
    """Aplica um stroke Sculpt pequeno em coordenadas normalizadas e cria checkpoint antes."""
    return _result(call("sculpt.stroke", {
        "points": points,
        "brush": brush,
        "radius": radius,
        "strength": strength,
        "pressure": pressure,
        "mode": mode,
        "coordinate_space": "NORMALIZED",
        "label": sanitize_label(label, "stroke"),
        "checkpoint": True,
        "capture_before": True,
    }))


@mcp.tool()
def blender_sculpt_iteration(
    points: list[list[float] | dict[str, float]],
    brush: str | None = None,
    radius: int = 60,
    strength: float = 0.25,
    pressure: float = 1.0,
    mode: str = "NORMAL",
    label: str = "stroke",
    settle_seconds: float = 0.2,
) -> list[Image]:
    """Executa checkpoint + stroke e devolve imagens antes/depois para comparação visual."""
    clean = sanitize_label(label, "stroke")
    before_name = f"{clean}-before.png"
    stroke = _result(call("sculpt.stroke", {
        "points": points,
        "brush": brush,
        "radius": radius,
        "strength": strength,
        "pressure": pressure,
        "mode": mode,
        "coordinate_space": "NORMALIZED",
        "label": clean,
        "checkpoint": True,
        "capture_before": True,
        "before_name": before_name,
    }))
    before = stroke.get("before_capture")
    if not isinstance(before, dict) or not before.get("path"):
        raise RuntimeError("sculpt iteration nao recebeu captura anterior")

    time.sleep(max(0.05, min(2.0, float(settle_seconds))))
    after = _result(call("viewport.capture", {
        "filename": f"{clean}-after.png",
    }))
    return [Image(path=before["path"]), Image(path=after["path"])]


@mcp.tool()
def blender_sculpt_finish(restore_workspace: bool = True) -> dict[str, Any]:
    """Sai de Sculpt Mode e restaura o workspace anterior quando possível."""
    return _result(call("sculpt.finish", {
        "restore_workspace": restore_workspace,
    }))


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
