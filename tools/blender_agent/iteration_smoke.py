from __future__ import annotations

import json
import time
from pathlib import Path

from .client import call
from .recipes import load_recipe


ROOT = Path(__file__).resolve().parents[2]
RECIPE = ROOT / "tools" / "blender_agent" / "recipes" / "carro-chefe-baguette-base-v1.json"


def _result(response: dict) -> dict:
    result = response.get("result")
    if not isinstance(result, dict):
        raise RuntimeError(f"resposta sem result: {response}")
    return result


def _assert_png_captures(captures: list[dict], label: str) -> None:
    if not captures:
        raise RuntimeError(f"{label} nao gerou capturas")
    for capture in captures:
        path = Path(str(capture.get("path") or ""))
        if path.suffix.lower() != ".png":
            raise RuntimeError(f"{label} captura sem .png: {path}")
        if not path.exists() or path.stat().st_size <= 0:
            raise RuntimeError(f"{label} captura ausente: {path}")
        if not capture.get("isolated_target"):
            raise RuntimeError(f"{label} captura nao isolou target: {capture}")


def main() -> int:
    suffix = int(time.time() * 1000)
    object_name = f"CC_Iteration_Smoke_{suffix}"
    previous_stage = None
    created = False
    recipe_result = None
    iteration_result = None

    print("1/9 bridge status")
    status = _result(call("health"))
    previous_stage = status.get("active_stage_id")

    try:
        print("2/9 build target from V0.4 recipe")
        recipe_result = _result(call("recipe.run", {
            "recipe": load_recipe(RECIPE),
            "variant": "compact",
            "overrides": {"object_name": object_name, "irregularity_seed": 424242},
            "dry_run": False,
            "create_stage": True,
            "restore_stage": True,
            "restore_workspace": True,
        }, timeout=120.0))
        if not recipe_result.get("passed"):
            raise RuntimeError(f"recipe smoke target falhou: {recipe_result}")
        created = True
        _assert_png_captures(recipe_result.get("captures", []), "recipe")
        if any(capture.get("target_object") != object_name for capture in recipe_result.get("captures", [])):
            raise RuntimeError("recipe capture nao apontou para o objeto produzido")

        print("3/9 start V0.5 iterative session")
        config = {
            "schema_version": 1,
            "label": "V0.5 smoke",
            "target_objects": [object_name],
            "max_iterations": 3,
            "views": [
                {"name": "front", "preset": "FRONT", "shading": "MATERIAL", "target_object": object_name},
                {"name": "three-quarter", "preset": "THREE_QUARTER", "shading": "MATERIAL", "target_object": object_name},
            ],
            "criteria": {
                "dimension_ranges": {
                    object_name: {
                        "x": [4.0, 9.0],
                        "y": [1.0, 5.0],
                        "z": [0.5, 4.0]
                    }
                },
                "vertex_ranges": {object_name: [8, 100000]},
                "min_visual_score": 0.80,
                "require_visual_review": True,
                "max_failed_actions": 0,
                "max_rollbacks": 2
            },
            "require_human_approval": True,
            "create_stage": True,
            "restore_stage": True,
            "restore_workspace": True,
            "tags": ["smoke", "v0.5"]
        }
        start = _result(call("iteration.start", {
            "config": config,
            "source_recipe": {
                "id": recipe_result.get("recipe_id"),
                "version": recipe_result.get("recipe_version"),
                "receipt": recipe_result.get("receipt"),
                "receipt_hash": recipe_result.get("receipt_hash"),
            },
        }))
        baseline_hash = start["criteria"]["metrics"][object_name]["state_hash"]

        print("4/9 observe isolated target")
        observation = _result(call("iteration.observe", {}, timeout=60.0))
        _assert_png_captures(observation.get("captures", []), "iteration.observe")
        if any(capture.get("target_object") != object_name for capture in observation.get("captures", [])):
            raise RuntimeError("iteration.observe capturou target incorreto")

        print("5/9 propose approved transform")
        proposal = _result(call("iteration.propose", {
            "proposal": {
                "action": "object.transform",
                "params": {"name": object_name, "location": [0.35, 0.0, 0.0]},
                "rationale": "Smoke: deslocamento proposital para validar diff e rollback.",
                "expected_effect": "Location X muda para 0.35 sem alterar a geometria.",
                "confidence": 1.0,
                "tags": ["smoke", "transform"]
            }
        }))
        if not proposal.get("approval_required"):
            raise RuntimeError("smoke esperava approval_required=true")

        print("6/9 apply with snapshot/checkpoint and compare")
        applied = _result(call("iteration.apply", {"approved": True}, timeout=60.0))
        _assert_png_captures(applied.get("after", {}).get("captures", []), "iteration.apply")
        delta = applied.get("diff", {}).get(object_name, {}).get("location_delta")
        if not isinstance(delta, list) or abs(float(delta[0])) < 0.30:
            raise RuntimeError(f"diff de location inesperado: {delta}")
        checkpoint_path = Path(str(applied.get("checkpoint", {}).get("path") or ""))
        if not checkpoint_path.exists():
            raise RuntimeError(f"checkpoint iterativo ausente: {checkpoint_path}")

        print("7/9 evaluate visual result and rollback")
        evaluated = _result(call("iteration.evaluate", {
            "decision": "rollback",
            "visual_score": 0.95,
            "visual_reviewed": True,
            "visual_notes": "Smoke: a mudanca foi intencionalmente rejeitada para validar rollback.",
            "view_scores": {"front": 0.95, "three-quarter": 0.95},
        }))
        if not evaluated.get("rollback"):
            raise RuntimeError("iteration.evaluate nao executou rollback")
        restored_hash = evaluated["criteria"]["metrics"][object_name]["state_hash"]
        if restored_hash != baseline_hash:
            raise RuntimeError("rollback nao restaurou o state_hash de baseline")

        print("8/9 finish and verify receipt")
        iteration_result = _result(call("iteration.finish", {}))
        if not iteration_result.get("passed"):
            raise RuntimeError(f"iteration finish nao passou criteria: {iteration_result}")
        receipt = Path(str(iteration_result.get("receipt") or ""))
        if not receipt.exists() or receipt.suffix.lower() != ".json":
            raise RuntimeError(f"receipt V0.5 ausente: {receipt}")
        status_after = _result(call("iteration.status"))
        if status_after.get("state") != "finished":
            raise RuntimeError(f"iteration.status inesperado apos finish: {status_after}")

        print("9/9 verify auto-history and cleanup")
        history = _result(call("history.search", {
            "stage_id": iteration_result["stage_id"],
            "action": "iteration.apply",
            "success": True,
            "limit": 20,
        }))
        if not history.get("matches"):
            raise RuntimeError("auto-history nao encontrou iteration.apply")

        print("")
        print("Blender Agent Iterative V0.5 smoke test OK.")
        print(f"Target:       {object_name}")
        print(f"Recipe:       {recipe_result.get('recipe_id')}@{recipe_result.get('recipe_version')}")
        print(f"Recipe stage: {recipe_result.get('stage_id')}")
        print(f"Iter stage:   {iteration_result.get('stage_id')}")
        print(f"Iterations:   {iteration_result.get('iteration_count')}")
        print(f"Rollbacks:    {iteration_result.get('rollbacks')}")
        print(f"Criteria:     {iteration_result.get('passed')}")
        print(f"Receipt:      {iteration_result.get('receipt')}")
        print(f"Receipt SHA:  {iteration_result.get('receipt_hash')}")
        return 0
    finally:
        if created:
            try:
                call("object.delete", {"name": object_name})
            except Exception as exc:
                print(f"WARNING: cleanup target failed: {exc}")
        if previous_stage:
            try:
                call("history.stage.activate", {"stage_id": previous_stage})
            except Exception as exc:
                print(f"WARNING: restore previous stage failed: {exc}")


if __name__ == "__main__":
    raise SystemExit(main())
