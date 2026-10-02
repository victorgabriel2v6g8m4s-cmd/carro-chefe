from __future__ import annotations

import copy
import hashlib
import json
import re
from pathlib import Path
from typing import Any

SCHEMA_VERSION = 1
MAX_RECIPE_BYTES = 512_000
MAX_PARAMETERS = 50
MAX_COMPONENTS = 50
MAX_STEPS = 64
MAX_VALIDATION_VIEWS = 16
MAX_VARIANTS = 20
MAX_NESTING = 8

_ID_RE = re.compile(r"^[A-Za-z0-9._-]{1,100}$")
_VERSION_RE = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?$")
_PARAM_TOKEN_RE = re.compile(r"^\$\{([A-Za-z][A-Za-z0-9_]*)\}$")

RECIPE_SAFE_ACTIONS = {
    "scene.summary",
    "object.list",
    "object.select",
    "object.add_primitive",
    "object.add_mesh",
    "object.transform",
    "object.duplicate",
    "object.delete",
    "object.shade_smooth",
    "modifier.add",
    "material.simple",
    "camera.orbit",
    "checkpoint.create",
    "export.glb",
    "export.obj",
    "viewport.describe",
    "viewport.set_view",
    "viewport.frame_all",
    "viewport.set_shading",
    "viewport.capture",
}

_TOP_KEYS = {
    "schema_version",
    "id",
    "version",
    "label",
    "description",
    "tags",
    "parameters",
    "components",
    "steps",
    "validation_views",
    "criteria",
    "variants",
}
_PARAMETER_KEYS = {"type", "default", "minimum", "maximum", "enum", "description"}
_COMPONENT_KEYS = {"id", "label", "object_name", "kind", "tags"}
_STEP_KEYS = {
    "id",
    "label",
    "action",
    "params",
    "checkpoint_before",
    "checkpoint_label",
    "capture_after",
    "continue_on_error",
    "tags",
}
_CAPTURE_KEYS = {"name", "preset", "shading", "filename", "frame_all"}
_CRITERIA_KEYS = {"required_objects", "min_captures", "max_failed_steps"}
_VARIANT_KEYS = {"label", "description", "overrides", "tags"}


class RecipeError(ValueError):
    pass


def _expect_dict(value: Any, path: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise RecipeError(f"{path} deve ser objeto")
    return value


def _expect_list(value: Any, path: str) -> list[Any]:
    if not isinstance(value, list):
        raise RecipeError(f"{path} deve ser lista")
    return value


def _reject_unknown(value: dict[str, Any], allowed: set[str], path: str) -> None:
    unknown = sorted(set(value) - allowed)
    if unknown:
        raise RecipeError(f"{path} possui campos desconhecidos: {', '.join(unknown)}")


def _validate_id(value: Any, path: str) -> str:
    text = str(value or "")
    if not _ID_RE.fullmatch(text):
        raise RecipeError(f"{path} invalido")
    return text


def _validate_tags(value: Any, path: str) -> list[str]:
    if value is None:
        return []
    tags = _expect_list(value, path)
    if len(tags) > 30:
        raise RecipeError(f"{path} excede 30 tags")
    result: list[str] = []
    for index, tag in enumerate(tags):
        result.append(_validate_id(tag, f"{path}[{index}]"))
    return result


def _bounded_json(value: Any, path: str, depth: int = 0) -> None:
    if depth > MAX_NESTING:
        raise RecipeError(f"{path} excede profundidade maxima")
    if value is None or isinstance(value, (bool, int, float)):
        return
    if isinstance(value, str):
        if len(value) > 8_000:
            raise RecipeError(f"{path} string excede limite")
        return
    if isinstance(value, list):
        if len(value) > 50_000:
            raise RecipeError(f"{path} lista excede limite")
        for index, item in enumerate(value):
            _bounded_json(item, f"{path}[{index}]", depth + 1)
        return
    if isinstance(value, dict):
        if len(value) > 200:
            raise RecipeError(f"{path} objeto excede limite")
        for key, item in value.items():
            if not isinstance(key, str) or len(key) > 120:
                raise RecipeError(f"{path} possui chave invalida")
            _bounded_json(item, f"{path}.{key}", depth + 1)
        return
    raise RecipeError(f"{path} contem tipo JSON nao suportado: {type(value).__name__}")


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def recipe_hash(value: Any) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def _validate_parameter_value(name: str, spec: dict[str, Any], value: Any) -> Any:
    ptype = str(spec.get("type", "number"))
    path = f"parameter.{name}"
    if ptype == "number":
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise RecipeError(f"{path} deve ser number")
        result: Any = float(value)
    elif ptype == "integer":
        if isinstance(value, bool) or not isinstance(value, int):
            raise RecipeError(f"{path} deve ser integer")
        result = int(value)
    elif ptype == "boolean":
        if not isinstance(value, bool):
            raise RecipeError(f"{path} deve ser boolean")
        result = value
    elif ptype == "string":
        if not isinstance(value, str):
            raise RecipeError(f"{path} deve ser string")
        if len(value) > 500:
            raise RecipeError(f"{path} string excede limite")
        result = value
    elif ptype == "vec3":
        if not isinstance(value, list) or len(value) != 3:
            raise RecipeError(f"{path} deve ser vec3")
        if any(isinstance(item, bool) or not isinstance(item, (int, float)) for item in value):
            raise RecipeError(f"{path} vec3 deve conter numeros")
        result = [float(item) for item in value]
    else:
        raise RecipeError(f"{path} type nao suportado: {ptype}")

    if isinstance(result, (int, float)) and not isinstance(result, bool):
        minimum = spec.get("minimum")
        maximum = spec.get("maximum")
        if minimum is not None and result < float(minimum):
            raise RecipeError(f"{path} abaixo do minimo {minimum}")
        if maximum is not None and result > float(maximum):
            raise RecipeError(f"{path} acima do maximo {maximum}")

    enum = spec.get("enum")
    if enum is not None:
        if not isinstance(enum, list) or not enum:
            raise RecipeError(f"{path}.enum deve ser lista nao vazia")
        if result not in enum:
            raise RecipeError(f"{path} fora do enum permitido")
    return result


def validate_recipe(recipe: Any) -> dict[str, Any]:
    root = _expect_dict(recipe, "recipe")
    _reject_unknown(root, _TOP_KEYS, "recipe")
    _bounded_json(root, "recipe")

    raw_size = len(canonical_json(root).encode("utf-8"))
    if raw_size > MAX_RECIPE_BYTES:
        raise RecipeError("recipe excede limite de bytes")

    if root.get("schema_version") != SCHEMA_VERSION:
        raise RecipeError(f"schema_version deve ser {SCHEMA_VERSION}")

    recipe_id = _validate_id(root.get("id"), "recipe.id")
    version = str(root.get("version") or "")
    if not _VERSION_RE.fullmatch(version):
        raise RecipeError("recipe.version deve ser semver simples, ex.: 1.0.0")

    label = str(root.get("label") or recipe_id).strip()
    if not label or len(label) > 200:
        raise RecipeError("recipe.label invalido")
    description = str(root.get("description") or "")
    if len(description) > 2_000:
        raise RecipeError("recipe.description excede limite")
    tags = _validate_tags(root.get("tags", []), "recipe.tags")

    parameters = _expect_dict(root.get("parameters", {}), "recipe.parameters")
    if len(parameters) > MAX_PARAMETERS:
        raise RecipeError(f"recipe.parameters excede {MAX_PARAMETERS}")
    clean_parameters: dict[str, dict[str, Any]] = {}
    for name, raw_spec in parameters.items():
        _validate_id(name, f"recipe.parameters.{name}")
        spec = _expect_dict(raw_spec, f"recipe.parameters.{name}")
        _reject_unknown(spec, _PARAMETER_KEYS, f"recipe.parameters.{name}")
        if "default" not in spec:
            raise RecipeError(f"recipe.parameters.{name}.default ausente")
        clean = copy.deepcopy(spec)
        clean["type"] = str(clean.get("type", "number"))
        clean["default"] = _validate_parameter_value(name, clean, clean["default"])
        clean_parameters[name] = clean

    components = _expect_list(root.get("components", []), "recipe.components")
    if len(components) > MAX_COMPONENTS:
        raise RecipeError(f"recipe.components excede {MAX_COMPONENTS}")
    clean_components: list[dict[str, Any]] = []
    component_ids: set[str] = set()
    for index, raw_component in enumerate(components):
        path = f"recipe.components[{index}]"
        component = _expect_dict(raw_component, path)
        _reject_unknown(component, _COMPONENT_KEYS, path)
        cid = _validate_id(component.get("id"), f"{path}.id")
        if cid in component_ids:
            raise RecipeError(f"component id duplicado: {cid}")
        component_ids.add(cid)
        object_name = str(component.get("object_name") or "").strip()
        if not object_name or len(object_name) > 63:
            raise RecipeError(f"{path}.object_name invalido")
        clean_components.append({
            "id": cid,
            "label": str(component.get("label") or cid)[:200],
            "object_name": object_name,
            "kind": str(component.get("kind") or "mesh")[:80],
            "tags": _validate_tags(component.get("tags", []), f"{path}.tags"),
        })

    steps = _expect_list(root.get("steps"), "recipe.steps")
    if not steps:
        raise RecipeError("recipe.steps nao pode ser vazia")
    if len(steps) > MAX_STEPS:
        raise RecipeError(f"recipe.steps excede {MAX_STEPS}")
    step_ids: set[str] = set()
    clean_steps: list[dict[str, Any]] = []
    for index, raw_step in enumerate(steps):
        path = f"recipe.steps[{index}]"
        step = _expect_dict(raw_step, path)
        _reject_unknown(step, _STEP_KEYS, path)
        sid = _validate_id(step.get("id"), f"{path}.id")
        if sid in step_ids:
            raise RecipeError(f"step id duplicado: {sid}")
        step_ids.add(sid)
        action = str(step.get("action") or "")
        if action not in RECIPE_SAFE_ACTIONS:
            raise RecipeError(f"{path}.action nao permitida em recipe: {action}")
        params = _expect_dict(step.get("params", {}), f"{path}.params")
        capture_after = step.get("capture_after")
        if capture_after is not None:
            capture_after = _validate_capture(capture_after, f"{path}.capture_after")
        clean_steps.append({
            "id": sid,
            "label": str(step.get("label") or sid)[:200],
            "action": action,
            "params": copy.deepcopy(params),
            "checkpoint_before": bool(step.get("checkpoint_before", False)),
            "checkpoint_label": str(step.get("checkpoint_label") or sid)[:100],
            "capture_after": capture_after,
            "continue_on_error": bool(step.get("continue_on_error", False)),
            "tags": _validate_tags(step.get("tags", []), f"{path}.tags"),
        })

    validation_views = _expect_list(root.get("validation_views", []), "recipe.validation_views")
    if len(validation_views) > MAX_VALIDATION_VIEWS:
        raise RecipeError(f"recipe.validation_views excede {MAX_VALIDATION_VIEWS}")
    clean_views = [
        _validate_capture(item, f"recipe.validation_views[{index}]")
        for index, item in enumerate(validation_views)
    ]

    criteria = _expect_dict(root.get("criteria", {}), "recipe.criteria")
    _reject_unknown(criteria, _CRITERIA_KEYS, "recipe.criteria")
    required_objects = _expect_list(criteria.get("required_objects", []), "recipe.criteria.required_objects")
    if len(required_objects) > 100 or any(not isinstance(item, str) or not item for item in required_objects):
        raise RecipeError("recipe.criteria.required_objects invalido")
    min_captures = int(criteria.get("min_captures", 0))
    max_failed_steps = int(criteria.get("max_failed_steps", 0))
    if min_captures < 0 or min_captures > 100:
        raise RecipeError("recipe.criteria.min_captures invalido")
    if max_failed_steps < 0 or max_failed_steps > MAX_STEPS:
        raise RecipeError("recipe.criteria.max_failed_steps invalido")

    variants = _expect_dict(root.get("variants", {}), "recipe.variants")
    if len(variants) > MAX_VARIANTS:
        raise RecipeError(f"recipe.variants excede {MAX_VARIANTS}")
    clean_variants: dict[str, dict[str, Any]] = {}
    for name, raw_variant in variants.items():
        _validate_id(name, f"recipe.variants.{name}")
        variant = _expect_dict(raw_variant, f"recipe.variants.{name}")
        _reject_unknown(variant, _VARIANT_KEYS, f"recipe.variants.{name}")
        overrides = _expect_dict(variant.get("overrides", {}), f"recipe.variants.{name}.overrides")
        unknown_parameters = sorted(set(overrides) - set(clean_parameters))
        if unknown_parameters:
            raise RecipeError(
                f"variant {name} referencia parametros desconhecidos: {', '.join(unknown_parameters)}"
            )
        clean_overrides = {
            key: _validate_parameter_value(key, clean_parameters[key], value)
            for key, value in overrides.items()
        }
        clean_variants[name] = {
            "label": str(variant.get("label") or name)[:200],
            "description": str(variant.get("description") or "")[:1_000],
            "overrides": clean_overrides,
            "tags": _validate_tags(variant.get("tags", []), f"recipe.variants.{name}.tags"),
        }

    normalized = {
        "schema_version": SCHEMA_VERSION,
        "id": recipe_id,
        "version": version,
        "label": label,
        "description": description,
        "tags": tags,
        "parameters": clean_parameters,
        "components": clean_components,
        "steps": clean_steps,
        "validation_views": clean_views,
        "criteria": {
            "required_objects": list(required_objects),
            "min_captures": min_captures,
            "max_failed_steps": max_failed_steps,
        },
        "variants": clean_variants,
    }
    return {
        "ok": True,
        "recipe": normalized,
        "recipe_hash": recipe_hash(normalized),
        "summary": {
            "id": recipe_id,
            "version": version,
            "parameters": len(clean_parameters),
            "components": len(clean_components),
            "steps": len(clean_steps),
            "validation_views": len(clean_views),
            "variants": sorted(clean_variants),
        },
    }


def _validate_capture(value: Any, path: str) -> dict[str, Any]:
    item = _expect_dict(value, path)
    _reject_unknown(item, _CAPTURE_KEYS, path)
    name = _validate_id(item.get("name") or "capture", f"{path}.name")
    preset = str(item.get("preset", "THREE_QUARTER")).upper()
    allowed_presets = {"LEFT", "RIGHT", "BOTTOM", "TOP", "FRONT", "BACK", "CAMERA", "THREE_QUARTER"}
    if preset not in allowed_presets:
        raise RecipeError(f"{path}.preset invalido: {preset}")
    shading = str(item.get("shading", "SOLID")).upper()
    if shading not in {"WIREFRAME", "SOLID", "MATERIAL", "RENDERED"}:
        raise RecipeError(f"{path}.shading invalido: {shading}")
    filename = str(item.get("filename") or f"{name}.png")
    if not filename.lower().endswith(".png"):
        filename += ".png"
    if len(filename) > 120:
        raise RecipeError(f"{path}.filename excede limite")
    return {
        "name": name,
        "preset": preset,
        "shading": shading,
        "filename": filename,
        "frame_all": bool(item.get("frame_all", True)),
    }


def _resolve_value(value: Any, parameters: dict[str, Any], path: str = "value") -> Any:
    if isinstance(value, str):
        match = _PARAM_TOKEN_RE.fullmatch(value)
        if match:
            name = match.group(1)
            if name not in parameters:
                raise RecipeError(f"{path} referencia parametro desconhecido: {name}")
            return copy.deepcopy(parameters[name])
        return value
    if isinstance(value, list):
        return [_resolve_value(item, parameters, f"{path}[]") for item in value]
    if isinstance(value, dict):
        return {
            key: _resolve_value(item, parameters, f"{path}.{key}")
            for key, item in value.items()
        }
    return copy.deepcopy(value)


def plan_recipe(
    recipe: Any,
    *,
    variant: str | None = None,
    overrides: dict[str, Any] | None = None,
) -> dict[str, Any]:
    validated = validate_recipe(recipe)
    normalized = validated["recipe"]
    specs = normalized["parameters"]
    values = {name: copy.deepcopy(spec["default"]) for name, spec in specs.items()}

    variant_meta = None
    if variant:
        variants = normalized["variants"]
        if variant not in variants:
            raise RecipeError(f"variant inexistente: {variant}")
        variant_meta = copy.deepcopy(variants[variant])
        for name, value in variant_meta["overrides"].items():
            values[name] = copy.deepcopy(value)

    raw_overrides = overrides or {}
    if not isinstance(raw_overrides, dict):
        raise RecipeError("overrides deve ser objeto")
    unknown = sorted(set(raw_overrides) - set(specs))
    if unknown:
        raise RecipeError(f"overrides desconhecidos: {', '.join(unknown)}")
    for name, value in raw_overrides.items():
        values[name] = _validate_parameter_value(name, specs[name], value)

    resolved_steps = []
    for index, step in enumerate(normalized["steps"]):
        resolved_steps.append({
            **copy.deepcopy(step),
            "index": index,
            "params": _resolve_value(step["params"], values, f"steps[{index}].params"),
        })

    plan = {
        "schema_version": SCHEMA_VERSION,
        "recipe_id": normalized["id"],
        "recipe_version": normalized["version"],
        "recipe_hash": validated["recipe_hash"],
        "variant": variant,
        "variant_meta": variant_meta,
        "parameters": values,
        "components": _resolve_value(normalized["components"], values, "components"),
        "steps": resolved_steps,
        "validation_views": _resolve_value(normalized["validation_views"], values, "validation_views"),
        "criteria": _resolve_value(normalized["criteria"], values, "criteria"),
        "tags": sorted(set(normalized["tags"] + (variant_meta or {}).get("tags", []))),
    }
    plan["plan_hash"] = recipe_hash(plan)
    return {
        "ok": True,
        "plan": plan,
        "summary": {
            "recipe_id": plan["recipe_id"],
            "recipe_version": plan["recipe_version"],
            "variant": variant,
            "steps": len(resolved_steps),
            "validation_views": len(plan["validation_views"]),
            "plan_hash": plan["plan_hash"],
        },
    }


def load_recipe(path: str | Path) -> dict[str, Any]:
    target = Path(path).expanduser().resolve()
    raw = target.read_bytes()
    if len(raw) > MAX_RECIPE_BYTES:
        raise RecipeError("arquivo de recipe excede limite")
    try:
        value = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise RecipeError(f"recipe JSON invalida: {exc}") from exc
    if not isinstance(value, dict):
        raise RecipeError("recipe raiz deve ser objeto")
    return value
