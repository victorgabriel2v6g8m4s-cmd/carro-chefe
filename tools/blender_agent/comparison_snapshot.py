from __future__ import annotations

import hashlib
import json
import os
from difflib import get_close_matches
from typing import Any

from . import protocol


ACTION = "mesh.comparison_snapshot"
DEFAULT_MAX_PAYLOAD_BYTES = 850_000
HARD_MAX_PAYLOAD_BYTES = 950_000


def _env_limit(name: str, default: int, hard_maximum: int) -> int:
    try:
        value = int(os.environ.get(name, str(default)))
    except ValueError:
        value = default
    return max(1, min(hard_maximum, value))


MAX_VERTICES = _env_limit("CC_BLENDER_COMPARE_MAX_VERTICES", 8_000, 50_000)
MAX_FACES = _env_limit("CC_BLENDER_COMPARE_MAX_FACES", 16_000, 50_000)
MAX_FACE_INDICES = _env_limit("CC_BLENDER_COMPARE_MAX_FACE_INDICES", 120_000, 400_000)
MAX_PAYLOAD_BYTES = _env_limit(
    "CC_BLENDER_COMPARE_MAX_PAYLOAD_BYTES",
    DEFAULT_MAX_PAYLOAD_BYTES,
    HARD_MAX_PAYLOAD_BYTES,
)


def _round(value: float) -> float:
    return round(float(value), 8)


def _matrix_rows(matrix) -> list[list[float]]:
    return [[_round(matrix[row][column]) for column in range(4)] for row in range(4)]


def _context_signature(core: Any) -> dict[str, Any]:
    window = core.bpy.context.window
    active = core.bpy.context.view_layer.objects.active
    return {
        "workspace": window.workspace.name if window else None,
        "mode": core.bpy.context.mode,
        "active_object": active.name if active else None,
        "selected_objects": sorted(obj.name for obj in core.bpy.context.selected_objects),
    }


def _object_or_error(core: Any, name: str):
    obj = core.bpy.data.objects.get(name)
    if obj is not None:
        return obj
    names = [item.name for item in core.bpy.data.objects]
    contains = [item for item in names if name.casefold() in item.casefold()][:8]
    close = get_close_matches(name, names, n=8, cutoff=0.45)
    suggestions = []
    for item in [*contains, *close]:
        if item not in suggestions:
            suggestions.append(item)
    suffix = f"; candidatos={suggestions}" if suggestions else ""
    raise ValueError(f"objeto nao encontrado por nome exato: {name!r}{suffix}")


def _hash_json(value: Any) -> str:
    raw = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def _bounds(vertices: list[list[float]]) -> dict[str, list[float]]:
    return {
        "min": [min(vertex[axis] for vertex in vertices) for axis in range(3)],
        "max": [max(vertex[axis] for vertex in vertices) for axis in range(3)],
    }


def _camera_projection(core: Any, vertices_world: list[list[float]]) -> dict[str, Any]:
    scene = core.bpy.context.scene
    camera = scene.camera
    if camera is None or camera.type != "CAMERA":
        raise RuntimeError("view=CAMERA exige camera ativa valida na cena")
    try:
        from bpy_extras.object_utils import world_to_camera_view
        from mathutils import Vector
    except Exception as exc:
        raise RuntimeError("Blender nao disponibilizou helpers de projecao de camera") from exc

    projected: list[list[float]] = []
    for vertex in vertices_world:
        ndc = world_to_camera_view(scene, camera, Vector(vertex))
        projected.append([_round(ndc.x), _round(ndc.y), _round(ndc.z)])
    return {
        "camera": camera.name,
        "projection": projected,
        "convention": "Blender world_to_camera_view; x/y NDC with bottom-left origin",
    }


def snapshot(core: Any, params: dict[str, Any]) -> dict[str, Any]:
    name = str(params.get("name") or "").strip()
    if not name:
        raise ValueError("mesh.comparison_snapshot exige name")
    space = str(params.get("space", "WORLD")).upper()
    if space not in {"WORLD", "OBJECT"}:
        raise ValueError("space deve ser WORLD ou OBJECT")
    modifier_policy = str(params.get("modifiers", "evaluated")).lower()
    if modifier_policy not in {"evaluated", "base", "reject"}:
        raise ValueError("modifiers deve ser evaluated, base ou reject")
    include_camera = bool(params.get("include_camera_projection", False))

    before = _context_signature(core)
    obj = _object_or_error(core, name)
    if obj.type != "MESH":
        raise ValueError(f"tipo nao suportado para snapshot: {obj.type}; suporte inicial=MESH")

    modifiers = [
        {
            "name": modifier.name,
            "type": modifier.type,
            "show_viewport": bool(modifier.show_viewport),
            "show_render": bool(modifier.show_render),
        }
        for modifier in obj.modifiers
    ]
    if modifier_policy == "reject" and modifiers:
        raise RuntimeError(
            f"objeto possui {len(modifiers)} modifiers; use modifiers=base ou modifiers=evaluated explicitamente"
        )
    if modifier_policy == "evaluated" and any(item["type"] == "NODES" for item in modifiers):
        raise RuntimeError(
            "Geometry Nodes nao e suportado na primeira versao de mesh.comparison_snapshot; "
            "converta/prepare uma malha finita ou use modifiers=base conscientemente"
        )

    depsgraph = None
    evaluated_obj = None
    temporary_mesh = None
    warnings: list[str] = []
    if modifier_policy == "base":
        mesh = obj.data
        matrix_world = obj.matrix_world
        if modifiers:
            warnings.append(
                "snapshot base ignora modifiers existentes; resultado pode diferir da geometria visivel"
            )
        modifiers_evaluated = False
    else:
        depsgraph = core.bpy.context.evaluated_depsgraph_get()
        evaluated_obj = obj.evaluated_get(depsgraph)
        temporary_mesh = evaluated_obj.to_mesh(
            preserve_all_data_layers=False,
            depsgraph=depsgraph,
        )
        mesh = temporary_mesh
        matrix_world = evaluated_obj.matrix_world
        modifiers_evaluated = bool(modifiers)

    try:
        vertex_count = len(mesh.vertices)
        face_count = len(mesh.polygons)
        if vertex_count == 0 or face_count == 0:
            raise RuntimeError(
                f"mesh sem geometria comparavel: vertices={vertex_count}, faces={face_count}"
            )
        if vertex_count > MAX_VERTICES:
            raise RuntimeError(
                f"snapshot excede limite de vertices: {vertex_count}>{MAX_VERTICES}; "
                "reduza a malha ou prepare export controlado"
            )
        if face_count > MAX_FACES:
            raise RuntimeError(
                f"snapshot excede limite de faces: {face_count}>{MAX_FACES}; "
                "reduza a malha ou prepare export controlado"
            )

        local_vertices = [
            [_round(vertex.co.x), _round(vertex.co.y), _round(vertex.co.z)]
            for vertex in mesh.vertices
        ]
        face_indices = 0
        faces: list[list[int]] = []
        for polygon in mesh.polygons:
            indices = [int(index) for index in polygon.vertices]
            if len(indices) < 3:
                raise RuntimeError(f"polygon {polygon.index} possui menos de 3 vertices")
            face_indices += len(indices)
            if face_indices > MAX_FACE_INDICES:
                raise RuntimeError(
                    f"snapshot excede limite de indices de faces: {face_indices}>{MAX_FACE_INDICES}"
                )
            faces.append(indices)

        world_vertices = []
        for vertex in mesh.vertices:
            co = matrix_world @ vertex.co
            world_vertices.append([_round(co.x), _round(co.y), _round(co.z)])
        returned_vertices = world_vertices if space == "WORLD" else local_vertices

        matrix = _matrix_rows(matrix_world)
        geometry_hash = _hash_json({"vertices": local_vertices, "faces": faces})
        transform_hash = _hash_json(matrix)
        result: dict[str, Any] = {
            "schema_version": 1,
            "action": ACTION,
            "name": obj.name,
            "type": obj.type,
            "vertices": returned_vertices,
            "faces": faces,
            "coordinate_space": space,
            "matrix_world": matrix,
            "bounds": _bounds(returned_vertices),
            "counts": {
                "vertices": vertex_count,
                "edges": len(mesh.edges),
                "faces": face_count,
                "face_indices": face_indices,
            },
            "scene_unit": {
                "system": str(core.bpy.context.scene.unit_settings.system),
                "scale_length": float(core.bpy.context.scene.unit_settings.scale_length),
            },
            "geometry_hash": geometry_hash,
            "transform_hash": transform_hash,
            "world_geometry_hash": _hash_json({"vertices": world_vertices, "faces": faces}),
            "modifiers": modifiers,
            "modifier_policy": modifier_policy,
            "modifiers_evaluated": modifiers_evaluated,
            "warnings": warnings,
            "context_before": before,
        }
        if include_camera:
            result["camera_projection"] = _camera_projection(core, world_vertices)

        after = _context_signature(core)
        result["context_after"] = after
        result["context_unchanged"] = after == before
        if not result["context_unchanged"]:
            raise RuntimeError(
                "snapshot read-only alterou contexto Blender inesperadamente; operacao abortada"
            )

        payload_bytes = len(
            json.dumps(result, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        )
        result["payload_bytes"] = payload_bytes
        result["payload_limit_bytes"] = MAX_PAYLOAD_BYTES
        if payload_bytes > MAX_PAYLOAD_BYTES:
            raise RuntimeError(
                f"snapshot excede limite de payload: {payload_bytes}>{MAX_PAYLOAD_BYTES} bytes; "
                "reduza a malha ou prepare export controlado em runtime"
            )
        return result
    finally:
        if evaluated_obj is not None and temporary_mesh is not None:
            evaluated_obj.to_mesh_clear()


def install(core: Any, _v05: Any) -> None:
    protocol.ALLOWED_ACTIONS.add(ACTION)
    previous_dispatch = core._dispatch

    def _dispatch_with_comparison_snapshot(action: str, params: dict[str, Any]):
        if action == ACTION:
            return snapshot(core, params)
        return previous_dispatch(action, params)

    core._dispatch = _dispatch_with_comparison_snapshot
