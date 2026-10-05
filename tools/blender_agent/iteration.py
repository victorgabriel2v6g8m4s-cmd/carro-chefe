from __future__ import annotations

import copy
import hashlib
import json
import re
from typing import Any

ITERATION_SCHEMA_VERSION = 1
MAX_TARGET_OBJECTS = 8
MAX_ITERATIONS = 20
MAX_VIEWS = 8
MAX_PROPOSAL_BYTES = 128_000
MAX_NESTING = 8

_ID_RE = re.compile(r"^[A-Za-z0-9._-]{1,100}$")

ITERATION_SAFE_ACTIONS = {
    "object.transform",
    "object.shade_smooth",
    "object.irregularize",
    "modifier.add",
    "material.simple",
    "material.preset",
    "sculpt.stroke",
}

_DESTRUCTIVE_ACTIONS = {"object.irregularize", "sculpt.stroke"}

_VIEW_KEYS = {"name", "preset", "shading", "target_object", "filename"}
_CRITERIA_KEYS = {
    "dimension_ranges",
    "vertex_ranges",
    "min_visual_score",
    "require_visual_review",
    "max_failed_actions",
    "max_rollbacks",
}
_CONFIG_KEYS = {
    "schema_version",
    "label",
    "target_objects",
    "max_iterations",
    "views",
    "criteria",
    "require_human_approval",
    "create_stage",
    "restore_stage",
    "restore_workspace",
    "tags",
}
_PROPOSAL_KEYS = {
    "action",
    "params",
    "rationale",
    "expected_effect",
    "confidence",
    "tags",
}


class IterationError(ValueError):
    pass


def _canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def structure_hash(value: Any) -> str:
    return hashlib.sha256(_canonical_json(value).encode("utf-8")).hexdigest()


def _expect_dict(value: Any, path: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise IterationError(f"{path} deve ser objeto")
    return value


def _expect_list(value: Any, path: str) -> list[Any]:
    if not isinstance(value, list):
        raise IterationError(f"{path} deve ser lista")
    return value


def _reject_unknown(value: dict[str, Any], allowed: set[str], path: str) -> None:
    unknown = sorted(set(value) - allowed)
    if unknown:
        raise IterationError(f"{path} possui campos desconhecidos: {', '.join(unknown)}")


def _validate_id(value: Any, path: str) -> str:
    text = str(value or "")
    if not _ID_RE.fullmatch(text):
        raise IterationError(f"{path} invalido")
    return text


def _bounded_json(value: Any, path: str, depth: int = 0) -> None:
    if depth > MAX_NESTING:
        raise IterationError(f"{path} excede profundidade maxima")
    if value is None or isinstance(value, (bool, int, float)):
        return
    if isinstance(value, str):
        if len(value) > 8_000:
            raise IterationError(f"{path} string excede limite")
        return
    if isinstance(value, list):
        if len(value) > 20_000:
            raise IterationError(f"{path} lista excede limite")
        for index, item in enumerate(value):
            _bounded_json(item, f"{path}[{index}]", depth + 1)
        return
    if isinstance(value, dict):
        if len(value) > 200:
            raise IterationError(f"{path} objeto excede limite")
        for key, item in value.items():
            if not isinstance(key, str) or len(key) > 120:
                raise IterationError(f"{path} possui chave invalida")
            _bounded_json(item, f"{path}.{key}", depth + 1)
        return
    raise IterationError(f"{path} contem tipo nao suportado: {type(value).__name__}")


def _validate_tags(value: Any, path: str) -> list[str]:
    if value is None:
        return []
    items = _expect_list(value, path)
    if len(items) > 30:
        raise IterationError(f"{path} excede 30 tags")
    return [_validate_id(item, f"{path}[{index}]") for index, item in enumerate(items)]


def _validate_view(raw: Any, path: str, targets: list[str]) -> dict[str, Any]:
    view = _expect_dict(raw, path)
    _reject_unknown(view, _VIEW_KEYS, path)
    name = _validate_id(view.get("name") or "view", f"{path}.name")
    preset = str(view.get("preset", "THREE_QUARTER")).upper()
    if preset not in {"LEFT", "RIGHT", "BOTTOM", "TOP", "FRONT", "BACK", "THREE_QUARTER"}:
        raise IterationError(f"{path}.preset invalido: {preset}")
    shading = str(view.get("shading", "MATERIAL")).upper()
    if shading not in {"WIREFRAME", "SOLID", "MATERIAL", "RENDERED"}:
        raise IterationError(f"{path}.shading invalido: {shading}")
    target = str(view.get("target_object") or targets[0])
    if target not in targets:
        raise IterationError(f"{path}.target_object fora dos targets da sessao: {target}")
    filename = str(view.get("filename") or f"{name}.png")
    if not filename.lower().endswith(".png"):
        filename += ".png"
    if len(filename) > 140:
        raise IterationError(f"{path}.filename excede limite")
    return {
        "name": name,
        "preset": preset,
        "shading": shading,
        "target_object": target,
        "filename": filename,
    }


def _validate_range_pair(value: Any, path: str) -> list[float]:
    if not isinstance(value, list) or len(value) != 2:
        raise IterationError(f"{path} deve ser [min,max]")
    minimum, maximum = float(value[0]), float(value[1])
    if minimum > maximum:
        raise IterationError(f"{path} min maior que max")
    return [minimum, maximum]


def _validate_criteria(raw: Any, targets: list[str]) -> dict[str, Any]:
    criteria = _expect_dict(raw or {}, "iteration.criteria")
    _reject_unknown(criteria, _CRITERIA_KEYS, "iteration.criteria")

    dimension_ranges_raw = _expect_dict(criteria.get("dimension_ranges", {}), "iteration.criteria.dimension_ranges")
    dimension_ranges: dict[str, dict[str, list[float]]] = {}
    for object_name, axes_raw in dimension_ranges_raw.items():
        if object_name not in targets:
            raise IterationError(f"dimension_ranges referencia target desconhecido: {object_name}")
        axes = _expect_dict(axes_raw, f"dimension_ranges.{object_name}")
        unknown_axes = sorted(set(axes) - {"x", "y", "z"})
        if unknown_axes:
            raise IterationError(f"dimension_ranges.{object_name} eixos invalidos: {', '.join(unknown_axes)}")
        dimension_ranges[object_name] = {
            axis: _validate_range_pair(pair, f"dimension_ranges.{object_name}.{axis}")
            for axis, pair in axes.items()
        }

    vertex_ranges_raw = _expect_dict(criteria.get("vertex_ranges", {}), "iteration.criteria.vertex_ranges")
    vertex_ranges: dict[str, list[int]] = {}
    for object_name, pair in vertex_ranges_raw.items():
        if object_name not in targets:
            raise IterationError(f"vertex_ranges referencia target desconhecido: {object_name}")
        values = _validate_range_pair(pair, f"vertex_ranges.{object_name}")
        if values[0] < 0:
            raise IterationError(f"vertex_ranges.{object_name} nao pode ser negativo")
        vertex_ranges[object_name] = [int(values[0]), int(values[1])]

    min_visual_score = criteria.get("min_visual_score")
    if min_visual_score is not None:
        min_visual_score = float(min_visual_score)
        if not 0.0 <= min_visual_score <= 1.0:
            raise IterationError("min_visual_score deve ficar em 0..1")

    max_failed_actions = int(criteria.get("max_failed_actions", 0))
    max_rollbacks = int(criteria.get("max_rollbacks", 5))
    if not 0 <= max_failed_actions <= MAX_ITERATIONS:
        raise IterationError("max_failed_actions invalido")
    if not 0 <= max_rollbacks <= MAX_ITERATIONS:
        raise IterationError("max_rollbacks invalido")

    return {
        "dimension_ranges": dimension_ranges,
        "vertex_ranges": vertex_ranges,
        "min_visual_score": min_visual_score,
        "require_visual_review": bool(criteria.get("require_visual_review", min_visual_score is not None)),
        "max_failed_actions": max_failed_actions,
        "max_rollbacks": max_rollbacks,
    }


def validate_iteration_config(config: Any) -> dict[str, Any]:
    root = _expect_dict(config, "iteration")
    _reject_unknown(root, _CONFIG_KEYS, "iteration")
    _bounded_json(root, "iteration")
    if root.get("schema_version", ITERATION_SCHEMA_VERSION) != ITERATION_SCHEMA_VERSION:
        raise IterationError(f"schema_version deve ser {ITERATION_SCHEMA_VERSION}")

    label = str(root.get("label") or "iterative-session").strip()
    if not label or len(label) > 200:
        raise IterationError("iteration.label invalido")

    targets_raw = _expect_list(root.get("target_objects"), "iteration.target_objects")
    if not 1 <= len(targets_raw) <= MAX_TARGET_OBJECTS:
        raise IterationError(f"iteration.target_objects exige 1..{MAX_TARGET_OBJECTS}")
    targets: list[str] = []
    for index, value in enumerate(targets_raw):
        name = str(value or "").strip()
        if not name or len(name) > 63:
            raise IterationError(f"iteration.target_objects[{index}] invalido")
        if name in targets:
            raise IterationError(f"target duplicado: {name}")
        targets.append(name)

    max_iterations = int(root.get("max_iterations", 6))
    if not 1 <= max_iterations <= MAX_ITERATIONS:
        raise IterationError(f"max_iterations deve ficar em 1..{MAX_ITERATIONS}")

    views_raw = root.get("views") or [
        {"name": "front", "preset": "FRONT", "shading": "MATERIAL", "target_object": targets[0]},
        {"name": "right", "preset": "RIGHT", "shading": "MATERIAL", "target_object": targets[0]},
        {"name": "top", "preset": "TOP", "shading": "MATERIAL", "target_object": targets[0]},
        {"name": "three-quarter", "preset": "THREE_QUARTER", "shading": "MATERIAL", "target_object": targets[0]},
    ]
    views_list = _expect_list(views_raw, "iteration.views")
    if not 1 <= len(views_list) <= MAX_VIEWS:
        raise IterationError(f"iteration.views exige 1..{MAX_VIEWS}")
    views = [_validate_view(item, f"iteration.views[{index}]", targets) for index, item in enumerate(views_list)]

    normalized = {
        "schema_version": ITERATION_SCHEMA_VERSION,
        "label": label,
        "target_objects": targets,
        "max_iterations": max_iterations,
        "views": views,
        "criteria": _validate_criteria(root.get("criteria", {}), targets),
        "require_human_approval": bool(root.get("require_human_approval", False)),
        "create_stage": bool(root.get("create_stage", True)),
        "restore_stage": bool(root.get("restore_stage", False)),
        "restore_workspace": bool(root.get("restore_workspace", True)),
        "tags": _validate_tags(root.get("tags", []), "iteration.tags"),
    }
    return {
        "ok": True,
        "config": normalized,
        "config_hash": structure_hash(normalized),
    }


def validate_proposal(proposal: Any, *, targets: list[str]) -> dict[str, Any]:
    root = _expect_dict(proposal, "proposal")
    _reject_unknown(root, _PROPOSAL_KEYS, "proposal")
    _bounded_json(root, "proposal")
    raw_size = len(_canonical_json(root).encode("utf-8"))
    if raw_size > MAX_PROPOSAL_BYTES:
        raise IterationError("proposal excede limite")

    action = str(root.get("action") or "")
    if action not in ITERATION_SAFE_ACTIONS:
        raise IterationError(f"proposal.action nao permitida: {action}")
    params = _expect_dict(root.get("params", {}), "proposal.params")

    target_name = params.get("name")
    if target_name is not None and str(target_name) not in targets:
        raise IterationError(f"proposal tenta alterar objeto fora dos targets: {target_name}")
    if action != "sculpt.stroke" and target_name is None:
        raise IterationError(f"proposal.params.name obrigatorio para {action}")

    rationale = str(root.get("rationale") or "").strip()
    expected_effect = str(root.get("expected_effect") or "").strip()
    if len(rationale) > 2_000:
        raise IterationError("proposal.rationale excede limite")
    if len(expected_effect) > 2_000:
        raise IterationError("proposal.expected_effect excede limite")
    confidence = float(root.get("confidence", 0.5))
    if not 0.0 <= confidence <= 1.0:
        raise IterationError("proposal.confidence deve ficar em 0..1")

    normalized = {
        "action": action,
        "params": copy.deepcopy(params),
        "rationale": rationale,
        "expected_effect": expected_effect,
        "confidence": confidence,
        "tags": _validate_tags(root.get("tags", []), "proposal.tags"),
        "destructive": action in _DESTRUCTIVE_ACTIONS,
    }
    return {
        "ok": True,
        "proposal": normalized,
        "proposal_hash": structure_hash(normalized),
    }


def metrics_diff(before: dict[str, Any], after: dict[str, Any]) -> dict[str, Any]:
    object_names = sorted(set(before) | set(after))
    result: dict[str, Any] = {}
    for name in object_names:
        left = before.get(name)
        right = after.get(name)
        if left is None or right is None:
            result[name] = {
                "present_before": left is not None,
                "present_after": right is not None,
            }
            continue
        row: dict[str, Any] = {}
        for key in ("location", "rotation_euler", "scale", "dimensions"):
            a = left.get(key)
            b = right.get(key)
            if isinstance(a, list) and isinstance(b, list) and len(a) == len(b):
                row[f"{key}_delta"] = [round(float(y) - float(x), 9) for x, y in zip(a, b)]
        for key in ("vertex_count", "edge_count", "polygon_count", "modifier_count", "material_count"):
            if key in left and key in right:
                row[f"{key}_delta"] = int(right[key]) - int(left[key])
        row["geometry_changed"] = left.get("geometry_hash") != right.get("geometry_hash")
        row["state_hash_changed"] = left.get("state_hash") != right.get("state_hash")
        result[name] = row
    return result


def evaluate_criteria(
    criteria: dict[str, Any],
    metrics: dict[str, Any],
    *,
    visual_score: float | None,
    visual_reviewed: bool,
    failed_actions: int,
    rollbacks: int,
    iteration_count: int,
    max_iterations: int,
) -> dict[str, Any]:
    checks: dict[str, Any] = {}

    dimension_checks: list[dict[str, Any]] = []
    for object_name, axes in criteria.get("dimension_ranges", {}).items():
        dimensions = (metrics.get(object_name) or {}).get("dimensions")
        for axis_index, axis in enumerate(("x", "y", "z")):
            if axis not in axes:
                continue
            minimum, maximum = axes[axis]
            actual = None if not isinstance(dimensions, list) or len(dimensions) != 3 else float(dimensions[axis_index])
            passed = actual is not None and float(minimum) <= actual <= float(maximum)
            dimension_checks.append({
                "object": object_name,
                "axis": axis,
                "minimum": minimum,
                "maximum": maximum,
                "actual": actual,
                "passed": passed,
            })
    checks["dimensions"] = {
        "passed": all(item["passed"] for item in dimension_checks),
        "items": dimension_checks,
    }

    vertex_checks: list[dict[str, Any]] = []
    for object_name, pair in criteria.get("vertex_ranges", {}).items():
        actual = (metrics.get(object_name) or {}).get("vertex_count")
        minimum, maximum = pair
        passed = actual is not None and int(minimum) <= int(actual) <= int(maximum)
        vertex_checks.append({
            "object": object_name,
            "minimum": minimum,
            "maximum": maximum,
            "actual": actual,
            "passed": passed,
        })
    checks["vertices"] = {
        "passed": all(item["passed"] for item in vertex_checks),
        "items": vertex_checks,
    }

    min_visual_score = criteria.get("min_visual_score")
    require_visual_review = bool(criteria.get("require_visual_review", False))
    if visual_score is not None:
        visual_score = float(visual_score)
        if not 0.0 <= visual_score <= 1.0:
            raise IterationError("visual_score deve ficar em 0..1")
    visual_passed = True
    if require_visual_review and not visual_reviewed:
        visual_passed = False
    if min_visual_score is not None:
        visual_passed = visual_passed and visual_score is not None and visual_score >= float(min_visual_score)
    checks["visual"] = {
        "passed": visual_passed,
        "reviewed": bool(visual_reviewed),
        "score": visual_score,
        "minimum": min_visual_score,
        "required": require_visual_review,
    }

    checks["failed_actions"] = {
        "passed": int(failed_actions) <= int(criteria.get("max_failed_actions", 0)),
        "actual": int(failed_actions),
        "maximum": int(criteria.get("max_failed_actions", 0)),
    }
    checks["rollbacks"] = {
        "passed": int(rollbacks) <= int(criteria.get("max_rollbacks", 5)),
        "actual": int(rollbacks),
        "maximum": int(criteria.get("max_rollbacks", 5)),
    }
    checks["budget"] = {
        "passed": int(iteration_count) <= int(max_iterations),
        "actual": int(iteration_count),
        "maximum": int(max_iterations),
        "remaining": max(0, int(max_iterations) - int(iteration_count)),
    }

    passed = all(item["passed"] for item in checks.values())
    return {"passed": passed, "checks": checks}
