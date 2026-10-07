from __future__ import annotations

from typing import Any

from . import mcp_server as base
from .client import call

mcp = base.mcp
Image = base.Image
_result = base._result


@mcp.tool()
def blender_reference_image_add(
    path: str,
    name: str | None = None,
    location: list[float] | None = None,
    rotation_deg: list[float] | None = None,
    scale: list[float] | None = None,
    display_size: float = 5.0,
    opacity: float = 0.55,
    depth: str = "BACK",
    side: str = "DOUBLE_SIDED",
    pack: bool = False,
) -> dict[str, Any]:
    """Insere uma imagem local permitida como Image Empty de referência na cena."""
    return _result(call("reference.image.add", {
        "path": path,
        "name": name,
        "location": location or [0.0, 0.0, 0.0],
        "rotation_deg": rotation_deg or [90.0, 0.0, 0.0],
        "scale": scale or [1.0, 1.0, 1.0],
        "display_size": display_size,
        "opacity": opacity,
        "depth": depth,
        "side": side,
        "pack": pack,
    }))


@mcp.tool()
def blender_material_image_texture(
    name: str,
    path: str,
    material_name: str | None = None,
    node_name: str = "CC_BaseColorImage",
    colorspace: str = "sRGB",
    extension: str = "REPEAT",
    use_alpha: bool = False,
    pack: bool = False,
) -> dict[str, Any]:
    """Carrega uma imagem permitida e liga seu Color ao Base Color do Principled BSDF do objeto."""
    return _result(call("material.image_texture", {
        "name": name,
        "path": path,
        "material_name": material_name,
        "node_name": node_name,
        "colorspace": colorspace,
        "extension": extension,
        "use_alpha": use_alpha,
        "pack": pack,
    }))


@mcp.tool()
def blender_mesh_comparison_snapshot(
    name: str,
    space: str = "WORLD",
    modifiers: str = "evaluated",
    include_camera_projection: bool = False,
) -> dict[str, Any]:
    """Lê uma malha por nome exato para comparação 2D, sem alterar seleção, modo ou arquivo Blender.

    Retorna vertices/faces, matrix_world, bounds, counts, unidade, hashes e política de modifiers.
    Use include_camera_projection somente quando a comparação realmente usar a câmera ativa.
    """
    return _result(call("mesh.comparison_snapshot", {
        "name": name,
        "space": space,
        "modifiers": modifiers,
        "include_camera_projection": include_camera_projection,
    }))


@mcp.tool()
def blender_iteration_validate(config: dict[str, Any]) -> dict[str, Any]:
    """Valida a configuração V0.5 sem iniciar uma sessão."""
    return _result(call("iteration.validate", {"config": config}))


@mcp.tool()
def blender_iteration_start(
    config: dict[str, Any],
    source_recipe: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Inicia o loop iterativo em objetos existentes, opcionalmente vinculando o receipt da recipe V0.4."""
    return _result(call("iteration.start", {
        "config": config,
        "source_recipe": source_recipe,
    }))


@mcp.tool()
def blender_iteration_status() -> dict[str, Any]:
    """Retorna estado, budget, falhas, rollbacks, proposal e última observação."""
    return _result(call("iteration.status"))


@mcp.tool()
def blender_iteration_context() -> dict[str, Any]:
    """Contexto estruturado para o planner: config, baseline, observação e iterações recentes."""
    return _result(call("iteration.context"))


@mcp.tool()
def blender_iteration_observe() -> dict[str, Any]:
    """Isola os targets, captura views e mede geometria/transformações para percepção estruturada."""
    return _result(call("iteration.observe", {}, timeout=60.0))


@mcp.tool()
def blender_iteration_observe_images() -> list[Image]:
    """Executa percepção e devolve as views isoladas diretamente ao modelo multimodal."""
    result = _result(call("iteration.observe", {}, timeout=60.0))
    images = [Image(path=item["path"]) for item in result.get("captures", []) if item.get("path")]
    if not images:
        raise RuntimeError(f"iteration.observe não gerou imagens: {result}")
    return images


@mcp.tool()
def blender_iteration_propose(proposal: dict[str, Any]) -> dict[str, Any]:
    """Submete uma única alteração allowlisted com rationale, efeito esperado e confiança."""
    return _result(call("iteration.propose", {"proposal": proposal}))


@mcp.tool()
def blender_iteration_apply(approved: bool = False) -> dict[str, Any]:
    """Cria snapshot + checkpoint, aplica a proposal e devolve métricas/diff/capturas after."""
    return _result(call("iteration.apply", {"approved": approved}, timeout=60.0))


@mcp.tool()
def blender_iteration_apply_compare(approved: bool = False) -> list[Image]:
    """Aplica a proposal e devolve pares de imagens BEFORE/AFTER para avaliação multimodal."""
    result = _result(call("iteration.apply", {"approved": approved}, timeout=60.0))
    images: list[Image] = []
    for item in result.get("before", {}).get("captures", []):
        if item.get("path"):
            images.append(Image(path=item["path"]))
    for item in result.get("after", {}).get("captures", []):
        if item.get("path"):
            images.append(Image(path=item["path"]))
    if not images:
        raise RuntimeError(f"iteration.apply não gerou imagens comparáveis: {result}")
    return images


@mcp.tool()
def blender_iteration_evaluate(
    decision: str = "continue",
    visual_score: float | None = None,
    visual_reviewed: bool = False,
    visual_notes: str = "",
    view_scores: dict[str, float] | None = None,
) -> dict[str, Any]:
    """Registra julgamento visual estruturado e decide keep/continue/rollback/finish."""
    return _result(call("iteration.evaluate", {
        "decision": decision,
        "visual_score": visual_score,
        "visual_reviewed": visual_reviewed or visual_score is not None,
        "visual_notes": visual_notes,
        "view_scores": view_scores or {},
    }))


@mcp.tool()
def blender_iteration_rollback(reason: str = "agent rollback") -> dict[str, Any]:
    """Restaura o snapshot da última iteração e registra o rollback no auto-history."""
    return _result(call("iteration.rollback", {"reason": reason}))


@mcp.tool()
def blender_iteration_finish(force: bool = False) -> dict[str, Any]:
    """Finaliza a sessão, avalia critérios, grava receipt/diffs e limpa snapshots internos."""
    return _result(call("iteration.finish", {"force": force}))


if __name__ == "__main__":
    mcp.run(transport="stdio")
