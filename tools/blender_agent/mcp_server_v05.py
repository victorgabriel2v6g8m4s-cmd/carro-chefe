from __future__ import annotations

from typing import Any

from . import mcp_server as base
from .client import call

mcp = base.mcp
Image = base.Image
_result = base._result


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
