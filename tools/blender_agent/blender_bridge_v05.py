from __future__ import annotations

import hashlib
import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import bpy

from tools.blender_agent import blender_bridge as core
from tools.blender_agent.history import (
    attachment_output_path,
    create_stage,
    ensure_stage,
    get_active_stage_id,
    record_event,
    set_active_stage,
)
from tools.blender_agent.iteration import (
    IterationError,
    evaluate_criteria,
    metrics_diff,
    structure_hash,
    validate_iteration_config,
    validate_proposal,
)
from tools.blender_agent.protocol import sanitize_filename, sanitize_label


_CORE_DISPATCH = core._dispatch
_CORE_RECIPE_CONFIGURE_CAPTURE = core._recipe_configure_capture
_CORE_RECIPE_CAPTURE = core._recipe_capture

_ITERATION_SESSION: dict[str, Any] | None = None
_ITERATION_LAST_STATUS: dict[str, Any] | None = None
_RECIPE_CAPTURE_STATE: dict[str, Any] | None = None


# ---------------------------------------------------------------------------
# Focused captures: V0.4 visual validation should show the product, not the
# user's camera/light/default cube. Objects are temporarily hidden in the
# current view layer and restored immediately after the screenshot.
# ---------------------------------------------------------------------------


def _view3d_override():
    window = bpy.context.window
    if window is None:
        raise RuntimeError("nenhuma janela Blender ativa")
    area, region, space, region_3d = core._view3d_context()
    return window, area, region, space, region_3d


def _capture_target_from_recipe(capture: dict[str, Any]) -> str | None:
    explicit = capture.get("target_object")
    if explicit:
        return str(explicit)
    job = core._RECIPE_RUN_JOB
    if job is None:
        return None
    components = job.plan.get("components") or []
    for component in components:
        object_name = component.get("object_name")
        if object_name and bpy.data.objects.get(str(object_name)) is not None:
            return str(object_name)
    return None


def _begin_focused_capture(
    target_name: str,
    *,
    preset: str,
    shading: str,
) -> dict[str, Any]:
    target = bpy.data.objects.get(str(target_name))
    if target is None:
        raise ValueError(f"objeto alvo da captura nao encontrado: {target_name}")

    window, area, region, _space, _region_3d = _view3d_override()
    active = bpy.context.view_layer.objects.active
    state = {
        "target": target.name,
        "active": active.name if active else None,
        "objects": [],
    }
    for obj in bpy.context.scene.objects:
        state["objects"].append({
            "name": obj.name,
            "hidden": bool(obj.hide_get()),
            "selected": bool(obj.select_get()),
        })
        if obj != target:
            obj.hide_set(True)
        else:
            obj.hide_set(False)

    try:
        if bpy.context.mode == "OBJECT":
            bpy.ops.object.select_all(action="DESELECT")
            target.select_set(True)
        bpy.context.view_layer.objects.active = target

        core._viewport_set_shading({"type": str(shading or "MATERIAL").upper()})
        core._viewport_set_view({
            "preset": str(preset or "THREE_QUARTER").upper(),
            "frame_all": False,
        })
        with bpy.context.temp_override(
            window=window,
            screen=window.screen,
            area=area,
            region=region,
        ):
            bpy.ops.view3d.view_selected(use_all_regions=False)
        core._redraw_window()
        return state
    except Exception:
        _restore_capture_state(state)
        raise


def _restore_capture_state(state: dict[str, Any] | None) -> None:
    if not state:
        return
    for item in state.get("objects", []):
        obj = bpy.data.objects.get(str(item.get("name")))
        if obj is None:
            continue
        try:
            obj.hide_set(bool(item.get("hidden", False)))
        except Exception:
            pass
        try:
            obj.select_set(bool(item.get("selected", False)))
        except Exception:
            pass
    active_name = state.get("active")
    active = bpy.data.objects.get(str(active_name)) if active_name else None
    try:
        bpy.context.view_layer.objects.active = active
    except Exception:
        pass
    core._redraw_window()


def _settle_redraw(iterations: int | None = None) -> None:
    count = int(iterations or core._WORKSPACE_CAPTURE_SETTLE_TICKS)
    for _ in range(max(1, min(10, count))):
        bpy.context.view_layer.update()
        core._redraw_window()


def _recipe_configure_capture_focused(capture: dict[str, Any]) -> None:
    global _RECIPE_CAPTURE_STATE
    if _RECIPE_CAPTURE_STATE is not None:
        _restore_capture_state(_RECIPE_CAPTURE_STATE)
        _RECIPE_CAPTURE_STATE = None

    target_name = _capture_target_from_recipe(capture)
    if not target_name:
        _CORE_RECIPE_CONFIGURE_CAPTURE(capture)
        return
    _RECIPE_CAPTURE_STATE = _begin_focused_capture(
        target_name,
        preset=str(capture.get("preset", "THREE_QUARTER")),
        shading=str(capture.get("shading", "MATERIAL")),
    )


def _recipe_capture_focused(capture: dict[str, Any], *, prefix: str) -> dict[str, Any]:
    global _RECIPE_CAPTURE_STATE
    target_name = _capture_target_from_recipe(capture)
    try:
        result = _CORE_RECIPE_CAPTURE(capture, prefix=prefix)
        if target_name:
            result["target_object"] = target_name
            result["isolated_target"] = True
        return result
    finally:
        if _RECIPE_CAPTURE_STATE is not None:
            _restore_capture_state(_RECIPE_CAPTURE_STATE)
            _RECIPE_CAPTURE_STATE = None


# ---------------------------------------------------------------------------
# V0.5 metrics / snapshots / rollback.
# ---------------------------------------------------------------------------


def _mesh_geometry_hash(obj) -> str | None:
    if obj.type != "MESH" or obj.data is None:
        return None
    digest = hashlib.sha256()
    digest.update(str(len(obj.data.vertices)).encode("ascii"))
    digest.update(b"|")
    digest.update(str(len(obj.data.edges)).encode("ascii"))
    digest.update(b"|")
    digest.update(str(len(obj.data.polygons)).encode("ascii"))
    for vertex in obj.data.vertices:
        digest.update(
            f"{vertex.index}:{float(vertex.co.x):.9f},{float(vertex.co.y):.9f},{float(vertex.co.z):.9f};".encode(
                "ascii"
            )
        )
    return digest.hexdigest()


def _object_metrics(name: str) -> dict[str, Any]:
    obj = bpy.data.objects.get(str(name))
    if obj is None:
        return {"name": str(name), "present": False}
    row: dict[str, Any] = {
        "name": obj.name,
        "present": True,
        "type": obj.type,
        "location": [round(float(v), 9) for v in obj.location],
        "rotation_euler": [round(float(v), 9) for v in obj.rotation_euler],
        "scale": [round(float(v), 9) for v in obj.scale],
        "dimensions": [round(float(v), 9) for v in obj.dimensions],
        "modifier_count": len(obj.modifiers),
        "modifiers": [modifier.type for modifier in obj.modifiers],
        "material_count": len(getattr(obj.data, "materials", []) or []) if obj.data else 0,
    }
    if obj.type == "MESH" and obj.data is not None:
        row.update({
            "vertex_count": len(obj.data.vertices),
            "edge_count": len(obj.data.edges),
            "polygon_count": len(obj.data.polygons),
            "geometry_hash": _mesh_geometry_hash(obj),
        })
    state_for_hash = dict(row)
    row["state_hash"] = structure_hash(state_for_hash)
    return row


def _collect_metrics(targets: list[str]) -> dict[str, Any]:
    return {name: _object_metrics(name) for name in targets}


def _snapshot_collection():
    name = "__CC_ITERATION_SNAPSHOTS"
    collection = bpy.data.collections.get(name)
    if collection is None:
        collection = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(collection)
    collection.hide_viewport = True
    collection.hide_render = True
    return collection


def _copy_materials_for_snapshot(obj_copy) -> None:
    data = getattr(obj_copy, "data", None)
    materials = getattr(data, "materials", None) if data else None
    if materials is None:
        return
    for index in range(len(materials)):
        material = materials[index]
        if material is not None:
            materials[index] = material.copy()


def _create_iteration_snapshot(session: dict[str, Any], label: str) -> dict[str, Any]:
    collection = _snapshot_collection()
    snapshot_id = sanitize_label(
        f"{session['session_id']}-{session['iteration_count']:02d}-{label}-{time.time_ns()}",
        "iteration-snapshot",
    )
    objects: dict[str, Any] = {}
    for target_name in session["config"]["target_objects"]:
        obj = bpy.data.objects.get(target_name)
        if obj is None:
            raise RuntimeError(f"target desapareceu antes do snapshot: {target_name}")
        clone = obj.copy()
        if obj.data is not None:
            clone.data = obj.data.copy()
        _copy_materials_for_snapshot(clone)
        clone.name = sanitize_label(f"__CC_SNAP_{snapshot_id}_{target_name}", "__CC_SNAP")[:63]
        collection.objects.link(clone)
        clone.hide_render = True
        clone.hide_set(True)
        objects[target_name] = {
            "snapshot_object": clone.name,
            "collections": [item.name for item in obj.users_collection],
        }
    snapshot = {
        "snapshot_id": snapshot_id,
        "created_ns": time.time_ns(),
        "objects": objects,
        "metrics": _collect_metrics(session["config"]["target_objects"]),
    }
    session.setdefault("snapshots", {})[snapshot_id] = snapshot
    return snapshot


def _restore_iteration_snapshot(session: dict[str, Any], snapshot_id: str) -> dict[str, Any]:
    snapshot = (session.get("snapshots") or {}).get(snapshot_id)
    if not snapshot:
        raise ValueError(f"snapshot iterativo nao encontrado: {snapshot_id}")

    restored: list[str] = []
    for target_name, info in snapshot["objects"].items():
        source = bpy.data.objects.get(str(info["snapshot_object"]))
        if source is None:
            raise RuntimeError(f"objeto de snapshot ausente: {info['snapshot_object']}")
        current = bpy.data.objects.get(target_name)
        if current is not None:
            current_data = current.data if current.type == "MESH" else None
            bpy.data.objects.remove(current, do_unlink=True)
            if current_data is not None and current_data.users == 0:
                try:
                    bpy.data.meshes.remove(current_data)
                except Exception:
                    pass

        clone = source.copy()
        if source.data is not None:
            clone.data = source.data.copy()
        _copy_materials_for_snapshot(clone)
        clone.name = target_name
        clone.hide_viewport = False
        clone.hide_render = False
        linked = False
        for collection_name in info.get("collections", []):
            collection = bpy.data.collections.get(collection_name)
            if collection is not None:
                collection.objects.link(clone)
                linked = True
                break
        if not linked:
            bpy.context.scene.collection.objects.link(clone)
        try:
            clone.hide_set(False)
        except Exception:
            pass
        restored.append(target_name)

    bpy.context.view_layer.update()
    return {
        "snapshot_id": snapshot_id,
        "restored_objects": restored,
        "metrics": _collect_metrics(session["config"]["target_objects"]),
    }


def _cleanup_iteration_snapshots(session: dict[str, Any]) -> None:
    for snapshot in list((session.get("snapshots") or {}).values()):
        for info in snapshot.get("objects", {}).values():
            obj = bpy.data.objects.get(str(info.get("snapshot_object")))
            if obj is None:
                continue
            data = obj.data if obj.type == "MESH" else None
            materials = list(getattr(data, "materials", []) or []) if data else []
            bpy.data.objects.remove(obj, do_unlink=True)
            if data is not None and data.users == 0:
                try:
                    bpy.data.meshes.remove(data)
                except Exception:
                    pass
            for material in materials:
                if material is not None and material.users == 0:
                    try:
                        bpy.data.materials.remove(material)
                    except Exception:
                        pass
    session["snapshots"] = {}


# ---------------------------------------------------------------------------
# V0.5 observation / planning / action / evaluation loop.
# ---------------------------------------------------------------------------


def _session() -> dict[str, Any]:
    if _ITERATION_SESSION is None:
        raise RuntimeError("nenhuma sessao iterativa ativa")
    return _ITERATION_SESSION


def _iteration_status() -> dict[str, Any]:
    if _ITERATION_SESSION is None:
        return dict(_ITERATION_LAST_STATUS or {"state": "idle"})
    session = _ITERATION_SESSION
    config = session["config"]
    return {
        "state": session["state"],
        "session_id": session["session_id"],
        "stage_id": session["stage_id"],
        "target_objects": config["target_objects"],
        "iteration_count": session["iteration_count"],
        "max_iterations": config["max_iterations"],
        "remaining_iterations": max(0, config["max_iterations"] - session["iteration_count"]),
        "failed_actions": session["failed_actions"],
        "rollbacks": session["rollbacks"],
        "require_human_approval": config["require_human_approval"],
        "pending_proposal": session.get("pending_proposal"),
        "last_observation": session.get("last_observation"),
        "last_evaluation": session.get("last_evaluation"),
        "criteria": session.get("criteria_result"),
        "started_ns": session["started_ns"],
    }


def _capture_iteration_views(session: dict[str, Any], *, label: str) -> list[dict[str, Any]]:
    captures: list[dict[str, Any]] = []
    for index, view in enumerate(session["config"]["views"]):
        state = _begin_focused_capture(
            str(view["target_object"]),
            preset=str(view["preset"]),
            shading=str(view["shading"]),
        )
        try:
            _settle_redraw()
            filename = sanitize_filename(
                f"{session['session_id']}-{label}-{index:02d}-{view['name']}-{view['filename']}",
                "iteration-capture.png",
            )
            if not filename.lower().endswith(".png"):
                filename = sanitize_filename(f"{filename}.png", "iteration-capture.png")
            result = core._viewport_capture({"filename": filename})
            captures.append({
                "name": view["name"],
                "preset": view["preset"],
                "shading": view["shading"],
                "target_object": view["target_object"],
                "isolated_target": True,
                **result,
            })
        finally:
            _restore_capture_state(state)
    return captures


def _evaluate_current(session: dict[str, Any], *, visual_score: float | None, visual_reviewed: bool) -> dict[str, Any]:
    metrics = _collect_metrics(session["config"]["target_objects"])
    result = evaluate_criteria(
        session["config"]["criteria"],
        metrics,
        visual_score=visual_score,
        visual_reviewed=visual_reviewed,
        failed_actions=session["failed_actions"],
        rollbacks=session["rollbacks"],
        iteration_count=session["iteration_count"],
        max_iterations=session["config"]["max_iterations"],
    )
    result["metrics"] = metrics
    session["criteria_result"] = result
    return result


def _iteration_start(params: dict[str, Any]) -> dict[str, Any]:
    global _ITERATION_SESSION, _ITERATION_LAST_STATUS
    if _ITERATION_SESSION is not None:
        raise RuntimeError("ja existe sessao iterativa ativa")

    validated = validate_iteration_config(params.get("config") or params)
    config = validated["config"]
    for target_name in config["target_objects"]:
        if bpy.data.objects.get(target_name) is None:
            raise ValueError(f"target iterativo nao encontrado: {target_name}")

    previous_stage_id = get_active_stage_id()
    if config["create_stage"]:
        stage = create_stage(
            f"Iterative 3D {config['label']}",
            tags=["blender", "iteration", "v0.5", *config.get("tags", [])],
        )
    else:
        stage = ensure_stage()
    stage_id = str(stage["stage_id"])
    session_id = sanitize_label(
        f"iter-{config['label']}-{time.time_ns()}",
        f"iter-{time.time_ns()}",
    )
    window = bpy.context.window
    if window is None:
        raise RuntimeError("nenhuma janela Blender ativa")

    session = {
        "version": 1,
        "session_id": session_id,
        "config": config,
        "config_hash": validated["config_hash"],
        "state": "ready",
        "stage_id": stage_id,
        "previous_stage_id": previous_stage_id,
        "original_workspace": window.workspace.name,
        "source_recipe": params.get("source_recipe"),
        "iteration_count": 0,
        "failed_actions": 0,
        "rollbacks": 0,
        "started_ns": time.time_ns(),
        "baseline_metrics": _collect_metrics(config["target_objects"]),
        "last_observation": None,
        "pending_proposal": None,
        "iterations": [],
        "snapshots": {},
        "last_evaluation": None,
        "criteria_result": None,
    }
    _ITERATION_SESSION = session
    baseline = _evaluate_current(session, visual_score=None, visual_reviewed=False)
    record_event(
        action="iteration.start",
        params={
            "session_id": session_id,
            "config": config,
            "config_hash": validated["config_hash"],
            "source_recipe": params.get("source_recipe"),
        },
        result={"baseline_metrics": session["baseline_metrics"], "criteria": baseline},
        ok=True,
        tags=["iteration", "v0.5", "start"],
        stage_id=stage_id,
    )
    _ITERATION_LAST_STATUS = None
    return _iteration_status()


def _iteration_observe(params: dict[str, Any]) -> dict[str, Any]:
    session = _session()
    captures = _capture_iteration_views(
        session,
        label=f"observe-{session['iteration_count']:02d}-{time.time_ns()}",
    )
    metrics = _collect_metrics(session["config"]["target_objects"])
    observation = {
        "created_ns": time.time_ns(),
        "iteration_index": session["iteration_count"],
        "metrics": metrics,
        "captures": captures,
        "metrics_hash": structure_hash(metrics),
    }
    session["last_observation"] = observation
    if session["state"] not in {"awaiting_evaluation", "awaiting_approval"}:
        session["state"] = "observed"
    record_event(
        action="iteration.observe",
        params={"session_id": session["session_id"], "iteration_index": session["iteration_count"]},
        result=observation,
        ok=True,
        tags=["iteration", "observe"],
        stage_id=session["stage_id"],
    )
    return observation


def _iteration_context() -> dict[str, Any]:
    session = _session()
    return {
        "status": _iteration_status(),
        "config": session["config"],
        "config_hash": session["config_hash"],
        "source_recipe": session.get("source_recipe"),
        "baseline_metrics": session["baseline_metrics"],
        "last_observation": session.get("last_observation"),
        "recent_iterations": session["iterations"][-5:],
    }


def _iteration_propose(params: dict[str, Any]) -> dict[str, Any]:
    session = _session()
    if session["state"] == "awaiting_evaluation":
        raise RuntimeError("avalie a ultima iteracao antes de propor outra")
    if session["iteration_count"] >= session["config"]["max_iterations"]:
        raise RuntimeError("orcamento de iteracoes esgotado")
    if session.get("last_observation") is None:
        raise RuntimeError("execute iteration.observe antes de propor uma alteracao")

    validated = validate_proposal(
        params.get("proposal") or params,
        targets=session["config"]["target_objects"],
    )
    pending = {
        **validated,
        "iteration_index": session["iteration_count"],
        "created_ns": time.time_ns(),
        "approval_required": bool(session["config"]["require_human_approval"]),
    }
    session["pending_proposal"] = pending
    session["state"] = "awaiting_approval" if pending["approval_required"] else "proposal_ready"
    record_event(
        action="iteration.propose",
        params={
            "session_id": session["session_id"],
            "iteration_index": session["iteration_count"],
            "proposal": pending["proposal"],
            "proposal_hash": pending["proposal_hash"],
        },
        result={"state": session["state"], "approval_required": pending["approval_required"]},
        ok=True,
        tags=["iteration", "proposal"],
        stage_id=session["stage_id"],
    )
    return pending


def _iteration_apply(params: dict[str, Any]) -> dict[str, Any]:
    session = _session()
    pending = session.get("pending_proposal")
    if not pending:
        raise RuntimeError("nenhuma proposta pendente")
    if session["iteration_count"] >= session["config"]["max_iterations"]:
        raise RuntimeError("orcamento de iteracoes esgotado")
    if pending["approval_required"] and not bool(params.get("approved", False)):
        raise PermissionError("esta sessao exige aprovacao humana; use approved=true")

    proposal = pending["proposal"]
    before_observation = session.get("last_observation")
    if before_observation is None:
        raise RuntimeError("iteration.apply exige observation anterior")

    snapshot = _create_iteration_snapshot(session, proposal["action"].replace(".", "-"))
    checkpoint = _CORE_DISPATCH("checkpoint.create", {
        "label": sanitize_label(
            f"{session['session_id']}-iter-{session['iteration_count']:02d}-{proposal['action']}",
            "iteration-checkpoint",
        )
    })
    before_metrics = _collect_metrics(session["config"]["target_objects"])
    try:
        if proposal["action"] == "sculpt.stroke":
            active = bpy.context.view_layer.objects.active
            if active is None or active.name not in session["config"]["target_objects"]:
                raise RuntimeError("sculpt.stroke iterativo exige um target ativo em Sculpt Mode")
        action_result = _CORE_DISPATCH(proposal["action"], proposal["params"])
        bpy.context.view_layer.update()
    except Exception as exc:
        session["failed_actions"] += 1
        rollback = _restore_iteration_snapshot(session, snapshot["snapshot_id"])
        session["rollbacks"] += 1
        session["pending_proposal"] = None
        session["state"] = "ready"
        error = f"{type(exc).__name__}: {exc}"
        record_event(
            action="iteration.apply",
            params={
                "session_id": session["session_id"],
                "iteration_index": session["iteration_count"],
                "proposal": proposal,
                "snapshot_id": snapshot["snapshot_id"],
            },
            result={"automatic_rollback": rollback, "checkpoint": checkpoint},
            ok=False,
            error=error,
            tags=["iteration", "apply", "rollback"],
            stage_id=session["stage_id"],
        )
        raise RuntimeError(error) from exc

    session["iteration_count"] += 1
    after_metrics = _collect_metrics(session["config"]["target_objects"])
    after_captures = _capture_iteration_views(
        session,
        label=f"after-{session['iteration_count']:02d}-{time.time_ns()}",
    )
    diff = metrics_diff(before_metrics, after_metrics)
    iteration = {
        "iteration_index": session["iteration_count"],
        "proposal": proposal,
        "proposal_hash": pending["proposal_hash"],
        "approved": bool(params.get("approved", False)) or not pending["approval_required"],
        "checkpoint": checkpoint,
        "snapshot_id": snapshot["snapshot_id"],
        "before": {
            "metrics": before_metrics,
            "captures": before_observation.get("captures", []),
        },
        "after": {
            "metrics": after_metrics,
            "captures": after_captures,
        },
        "diff": diff,
        "action_result": action_result,
        "state": "awaiting_evaluation",
        "created_ns": time.time_ns(),
    }
    session["iterations"].append(iteration)
    session["last_observation"] = {
        "created_ns": time.time_ns(),
        "iteration_index": session["iteration_count"],
        "metrics": after_metrics,
        "captures": after_captures,
        "metrics_hash": structure_hash(after_metrics),
    }
    session["pending_proposal"] = None
    session["state"] = "awaiting_evaluation"
    record_event(
        action="iteration.apply",
        params={
            "session_id": session["session_id"],
            "iteration_index": session["iteration_count"],
            "proposal": proposal,
            "proposal_hash": pending["proposal_hash"],
            "snapshot_id": snapshot["snapshot_id"],
        },
        result=iteration,
        ok=True,
        tags=["iteration", "apply", proposal["action"].replace(".", "-")],
        stage_id=session["stage_id"],
    )
    return iteration


def _iteration_evaluate(params: dict[str, Any]) -> dict[str, Any]:
    session = _session()
    if not session["iterations"]:
        raise RuntimeError("nenhuma iteracao aplicada para avaliar")
    iteration = session["iterations"][-1]
    if iteration.get("state") != "awaiting_evaluation":
        raise RuntimeError("a ultima iteracao ja foi avaliada")

    decision = str(params.get("decision", "continue")).lower()
    if decision not in {"keep", "continue", "rollback", "finish"}:
        raise ValueError("decision deve ser keep, continue, rollback ou finish")
    visual_score = params.get("visual_score")
    visual_reviewed = bool(params.get("visual_reviewed", visual_score is not None))
    visual_notes = str(params.get("visual_notes") or "")[:4_000]
    view_scores = params.get("view_scores") or {}
    if not isinstance(view_scores, dict):
        raise ValueError("view_scores deve ser objeto")

    rollback_result = None
    if decision == "rollback":
        rollback_result = _restore_iteration_snapshot(session, iteration["snapshot_id"])
        session["rollbacks"] += 1
        iteration["state"] = "rolled_back"
        session["last_observation"] = None
    else:
        iteration["state"] = "accepted"

    criteria = _evaluate_current(
        session,
        visual_score=float(visual_score) if visual_score is not None else None,
        visual_reviewed=visual_reviewed,
    )
    evaluation = {
        "iteration_index": iteration["iteration_index"],
        "decision": decision,
        "visual_score": float(visual_score) if visual_score is not None else None,
        "visual_reviewed": visual_reviewed,
        "visual_notes": visual_notes,
        "view_scores": view_scores,
        "criteria": criteria,
        "rollback": rollback_result,
        "created_ns": time.time_ns(),
    }
    iteration["evaluation"] = evaluation
    session["last_evaluation"] = evaluation
    if decision == "finish":
        session["state"] = "ready_to_finish"
    else:
        session["state"] = "ready"

    record_event(
        action="iteration.evaluate",
        params={
            "session_id": session["session_id"],
            "iteration_index": iteration["iteration_index"],
            "decision": decision,
            "visual_score": evaluation["visual_score"],
            "visual_reviewed": visual_reviewed,
            "view_scores": view_scores,
        },
        result=evaluation,
        ok=True,
        tags=["iteration", "evaluate", decision],
        stage_id=session["stage_id"],
    )
    return evaluation


def _iteration_rollback(params: dict[str, Any]) -> dict[str, Any]:
    session = _session()
    if not session["iterations"]:
        raise RuntimeError("nenhuma iteracao disponivel para rollback")
    iteration = session["iterations"][-1]
    if iteration.get("state") == "rolled_back":
        raise RuntimeError("ultima iteracao ja foi revertida")
    result = _restore_iteration_snapshot(session, iteration["snapshot_id"])
    session["rollbacks"] += 1
    iteration["state"] = "rolled_back"
    session["state"] = "ready"
    session["last_observation"] = None
    record_event(
        action="iteration.rollback",
        params={
            "session_id": session["session_id"],
            "iteration_index": iteration["iteration_index"],
            "snapshot_id": iteration["snapshot_id"],
            "reason": str(params.get("reason") or "manual rollback")[:2_000],
        },
        result=result,
        ok=True,
        tags=["iteration", "rollback"],
        stage_id=session["stage_id"],
    )
    return result


def _iteration_finish(params: dict[str, Any]) -> dict[str, Any]:
    global _ITERATION_SESSION, _ITERATION_LAST_STATUS
    session = _session()
    if session["state"] == "awaiting_evaluation" and not bool(params.get("force", False)):
        raise RuntimeError("avalie a ultima iteracao antes de finalizar ou use force=true")

    latest_eval = session.get("last_evaluation") or {}
    criteria = _evaluate_current(
        session,
        visual_score=latest_eval.get("visual_score"),
        visual_reviewed=bool(latest_eval.get("visual_reviewed", False)),
    )
    final_metrics = criteria["metrics"]

    receipt = {
        "version": 1,
        "action": "iteration.finish",
        "session_id": session["session_id"],
        "status": "passed" if criteria["passed"] else "completed_with_unmet_criteria",
        "config": session["config"],
        "config_hash": session["config_hash"],
        "source_recipe": session.get("source_recipe"),
        "stage_id": session["stage_id"],
        "previous_stage_id": session["previous_stage_id"],
        "started_ns": session["started_ns"],
        "finished_ns": time.time_ns(),
        "baseline_metrics": session["baseline_metrics"],
        "final_metrics": final_metrics,
        "criteria": criteria,
        "iteration_count": session["iteration_count"],
        "failed_actions": session["failed_actions"],
        "rollbacks": session["rollbacks"],
        "iterations": session["iterations"],
    }
    receipt["receipt_hash"] = structure_hash(receipt)
    receipt_path = attachment_output_path(f"{session['session_id']}-iteration-receipt.json")
    receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2), encoding="utf-8")

    restored_workspace = None
    window = bpy.context.window
    if window is not None and session["config"]["restore_workspace"]:
        original = bpy.data.workspaces.get(session["original_workspace"])
        if original is not None:
            window.workspace = original
            _settle_redraw()
            restored_workspace = window.workspace.name

    restored_stage = None
    if session["config"]["restore_stage"] and session["previous_stage_id"]:
        restored_stage = set_active_stage(session["previous_stage_id"])["stage_id"]

    result = {
        "session_id": session["session_id"],
        "status": receipt["status"],
        "passed": bool(criteria["passed"]),
        "criteria": criteria,
        "iteration_count": session["iteration_count"],
        "failed_actions": session["failed_actions"],
        "rollbacks": session["rollbacks"],
        "stage_id": session["stage_id"],
        "restored_stage_id": restored_stage,
        "restored_workspace": restored_workspace,
        "receipt": str(receipt_path),
        "receipt_hash": receipt["receipt_hash"],
    }
    record_event(
        action="iteration.finish",
        params={"session_id": session["session_id"], "force": bool(params.get("force", False))},
        result=result,
        ok=True,
        tags=["iteration", "finish", receipt["status"]],
        stage_id=session["stage_id"],
    )
    _cleanup_iteration_snapshots(session)
    _ITERATION_LAST_STATUS = {"state": "finished", **result}
    _ITERATION_SESSION = None
    return result


def _dispatch_extended(action: str, params: dict[str, Any]) -> Any:
    if action == "iteration.validate":
        return validate_iteration_config(params.get("config") or params)
    if action == "iteration.start":
        return _iteration_start(params)
    if action == "iteration.status":
        return _iteration_status()
    if action == "iteration.context":
        return _iteration_context()
    if action == "iteration.observe":
        return _iteration_observe(params)
    if action == "iteration.propose":
        return _iteration_propose(params)
    if action == "iteration.apply":
        return _iteration_apply(params)
    if action == "iteration.evaluate":
        return _iteration_evaluate(params)
    if action == "iteration.rollback":
        return _iteration_rollback(params)
    if action == "iteration.finish":
        return _iteration_finish(params)
    return _CORE_DISPATCH(action, params)


# Patch the stable V0.1-V0.4 bridge rather than duplicating it. Existing
# behavior remains the source of truth; V0.5 adds focused recipe captures and
# the iterative control plane.
core._recipe_configure_capture = _recipe_configure_capture_focused
core._recipe_capture = _recipe_capture_focused
core._dispatch = _dispatch_extended


if __name__ == "__main__":
    core.start_bridge()
