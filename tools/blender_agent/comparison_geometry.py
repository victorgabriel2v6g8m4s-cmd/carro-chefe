from __future__ import annotations

import hashlib
import json
import math
import os
from typing import Any, Iterable


class ComparisonGeometryError(ValueError):
    pass


def _env_limit(name: str, default: int, hard_maximum: int) -> int:
    try:
        value = int(os.environ.get(name, str(default)))
    except ValueError:
        value = default
    return max(1, min(hard_maximum, value))


MAX_VERTICES = _env_limit("CC_BLENDER_COMPARE_MAX_VERTICES", 8_000, 50_000)
MAX_FACES = _env_limit("CC_BLENDER_COMPARE_MAX_FACES", 16_000, 50_000)
MAX_FACE_INDICES = _env_limit("CC_BLENDER_COMPARE_MAX_FACE_INDICES", 120_000, 400_000)
MAX_COORDINATE = 1.0e9
_EPS = 1.0e-9


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def stable_hash(value: Any) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def _finite_number(value: Any, label: str) -> float:
    if isinstance(value, bool):
        raise ComparisonGeometryError(f"{label} deve ser numero finito")
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise ComparisonGeometryError(f"{label} deve ser numero finito") from exc
    if not math.isfinite(number):
        raise ComparisonGeometryError(f"{label} deve ser numero finito")
    if abs(number) > MAX_COORDINATE:
        raise ComparisonGeometryError(f"{label} excede magnitude segura {MAX_COORDINATE:g}")
    return number


def normalize_vertices(vertices: Any) -> list[list[float]]:
    if not isinstance(vertices, list) or not vertices:
        raise ComparisonGeometryError("mesh precisa conter vertices")
    if len(vertices) > MAX_VERTICES:
        raise ComparisonGeometryError(
            f"mesh possui {len(vertices)} vertices; limite={MAX_VERTICES}. "
            "Reduza a geometria ou use um snapshot/export controlado."
        )
    result: list[list[float]] = []
    for index, vertex in enumerate(vertices):
        if not isinstance(vertex, (list, tuple)) or len(vertex) != 3:
            raise ComparisonGeometryError(f"vertex[{index}] deve ter 3 coordenadas")
        result.append([
            _finite_number(vertex[0], f"vertex[{index}].x"),
            _finite_number(vertex[1], f"vertex[{index}].y"),
            _finite_number(vertex[2], f"vertex[{index}].z"),
        ])
    return result


def normalize_faces(faces: Any, vertex_count: int) -> list[list[int]]:
    if not isinstance(faces, list) or not faces:
        raise ComparisonGeometryError("mesh precisa conter faces")
    if len(faces) > MAX_FACES:
        raise ComparisonGeometryError(
            f"mesh possui {len(faces)} faces; limite={MAX_FACES}. "
            "Reduza a geometria ou use um snapshot/export controlado."
        )
    total_indices = 0
    result: list[list[int]] = []
    for face_index, face in enumerate(faces):
        if not isinstance(face, (list, tuple)) or len(face) < 3:
            raise ComparisonGeometryError(f"face[{face_index}] deve ter ao menos 3 indices")
        clean: list[int] = []
        for corner_index, raw in enumerate(face):
            if isinstance(raw, bool) or not isinstance(raw, int):
                raise ComparisonGeometryError(
                    f"face[{face_index}][{corner_index}] deve ser indice inteiro"
                )
            if raw < 0 or raw >= vertex_count:
                raise ComparisonGeometryError(
                    f"face[{face_index}] referencia vertex inexistente {raw}; "
                    f"vertices={vertex_count}"
                )
            clean.append(int(raw))
        total_indices += len(clean)
        if total_indices > MAX_FACE_INDICES:
            raise ComparisonGeometryError(
                f"mesh excede {MAX_FACE_INDICES} indices de faces; reduza a geometria"
            )
        result.append(clean)
    return result


def deduplicate_edges(faces: Iterable[Iterable[int]]) -> list[tuple[int, int]]:
    edges: set[tuple[int, int]] = set()
    for face in faces:
        indices = list(face)
        for index, first in enumerate(indices):
            second = indices[(index + 1) % len(indices)]
            if first == second:
                continue
            edges.add((first, second) if first < second else (second, first))
    return sorted(edges)


def bounds3(vertices: list[list[float]]) -> dict[str, list[float]]:
    return {
        "min": [min(vertex[axis] for vertex in vertices) for axis in range(3)],
        "max": [max(vertex[axis] for vertex in vertices) for axis in range(3)],
    }


def normalize_mesh(
    *,
    name: str,
    vertices: Any,
    faces: Any,
    coordinate_space: str = "WORLD",
    matrix_world: Any = None,
    unit_scale: float = 1.0,
    warnings: Iterable[str] | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    clean_vertices = normalize_vertices(vertices)
    clean_faces = normalize_faces(faces, len(clean_vertices))
    edges = deduplicate_edges(clean_faces)
    clean_unit_scale = _finite_number(unit_scale, "unit_scale")
    if clean_unit_scale <= 0:
        raise ComparisonGeometryError("unit_scale deve ser positivo")
    return {
        "name": str(name),
        "type": "MESH",
        "vertices": clean_vertices,
        "faces": clean_faces,
        "coordinate_space": str(coordinate_space).upper(),
        "matrix_world": matrix_world,
        "unit_scale": clean_unit_scale,
        "bounds": bounds3(clean_vertices),
        "counts": {
            "vertices": len(clean_vertices),
            "faces": len(clean_faces),
            "edges": len(edges),
            "face_indices": sum(len(face) for face in clean_faces),
        },
        "geometry_hash": stable_hash({"vertices": clean_vertices, "faces": clean_faces}),
        "warnings": list(warnings or []),
        "metadata": dict(metadata or {}),
    }


def _vec3(value: Any, default: tuple[float, float, float], label: str) -> tuple[float, float, float]:
    if value is None:
        return default
    if not isinstance(value, (list, tuple)) or len(value) != 3:
        raise ComparisonGeometryError(f"{label} deve ter 3 valores")
    return tuple(_finite_number(item, f"{label}[{index}]") for index, item in enumerate(value))


def apply_object_transform(
    vertices: list[list[float]],
    *,
    location: Any = None,
    rotation_deg: Any = None,
    scale: Any = None,
) -> list[list[float]]:
    tx, ty, tz = _vec3(location, (0.0, 0.0, 0.0), "location")
    rx, ry, rz = [math.radians(value) for value in _vec3(rotation_deg, (0.0, 0.0, 0.0), "rotation_deg")]
    sx, sy, sz = _vec3(scale, (1.0, 1.0, 1.0), "scale")
    if min(abs(sx), abs(sy), abs(sz)) <= _EPS:
        raise ComparisonGeometryError("scale 3D nao pode conter eixo zero")

    cx, sxn = math.cos(rx), math.sin(rx)
    cy, syn = math.cos(ry), math.sin(ry)
    cz, szn = math.cos(rz), math.sin(rz)

    result: list[list[float]] = []
    for x0, y0, z0 in vertices:
        x, y, z = x0 * sx, y0 * sy, z0 * sz
        # Euler XYZ: rotate around X, then Y, then Z.
        y, z = y * cx - z * sxn, y * sxn + z * cx
        x, z = x * cy + z * syn, -x * syn + z * cy
        x, y = x * cz - y * szn, x * szn + y * cz
        result.append([x + tx, y + ty, z + tz])
    return result


def cube_mesh() -> tuple[list[list[float]], list[list[int]]]:
    vertices = [
        [-1.0, -1.0, -1.0],
        [1.0, -1.0, -1.0],
        [1.0, 1.0, -1.0],
        [-1.0, 1.0, -1.0],
        [-1.0, -1.0, 1.0],
        [1.0, -1.0, 1.0],
        [1.0, 1.0, 1.0],
        [-1.0, 1.0, 1.0],
    ]
    faces = [
        [0, 1, 2, 3],
        [4, 7, 6, 5],
        [0, 4, 5, 1],
        [1, 5, 6, 2],
        [2, 6, 7, 3],
        [4, 0, 3, 7],
    ]
    return vertices, faces


def project_vertices(vertices: list[list[float]], view: str) -> tuple[list[tuple[float, float]], dict[str, str]]:
    normalized = str(view).upper()
    if normalized == "FRONT":
        return [(vertex[0], vertex[2]) for vertex in vertices], {
            "horizontal": "X",
            "vertical": "Z",
            "pixel_y": "inverted-at-rasterization",
        }
    if normalized == "RIGHT":
        return [(vertex[1], vertex[2]) for vertex in vertices], {
            "horizontal": "Y",
            "vertical": "Z",
            "pixel_y": "inverted-at-rasterization",
        }
    if normalized == "TOP":
        return [(vertex[0], vertex[1]) for vertex in vertices], {
            "horizontal": "X",
            "vertical": "Y",
            "pixel_y": "inverted-at-rasterization",
        }
    if normalized == "CAMERA":
        raise ComparisonGeometryError(
            "CAMERA exige projeção da câmera fornecida pelo snapshot da cena; "
            "recipe source sem câmera não é suportado"
        )
    raise ComparisonGeometryError(f"view nao suportada: {view}")


def canonical_pixel_projection(
    points: list[tuple[float, float]],
    width: int,
    height: int,
    *,
    padding_ratio: float = 0.05,
) -> tuple[list[tuple[float, float]], dict[str, Any]]:
    if width <= 0 or height <= 0:
        raise ComparisonGeometryError("resolution deve ser positiva")
    if not points:
        raise ComparisonGeometryError("projecao sem pontos")
    min_x = min(point[0] for point in points)
    max_x = max(point[0] for point in points)
    min_y = min(point[1] for point in points)
    max_y = max(point[1] for point in points)
    span_x = max_x - min_x
    span_y = max_y - min_y
    if span_x <= _EPS or span_y <= _EPS:
        raise ComparisonGeometryError(
            f"bounds projetados degenerados: width={span_x:g}, height={span_y:g}"
        )
    padding = max(0.0, min(0.45, float(padding_ratio)))
    usable_width = width * (1.0 - 2.0 * padding)
    usable_height = height * (1.0 - 2.0 * padding)
    pixel_scale = min(usable_width / span_x, usable_height / span_y)
    model_cx = (min_x + max_x) / 2.0
    model_cy = (min_y + max_y) / 2.0
    canvas_cx = width / 2.0
    canvas_cy = height / 2.0
    projected = [
        (
            canvas_cx + (x - model_cx) * pixel_scale,
            canvas_cy - (y - model_cy) * pixel_scale,
        )
        for x, y in points
    ]
    return projected, {
        "method": "fit-canvas-uniform",
        "padding_ratio": padding,
        "scale_px_per_unit": pixel_scale,
        "model_center": [model_cx, model_cy],
        "canvas_center": [canvas_cx, canvas_cy],
        "source_bounds": [min_x, min_y, max_x, max_y],
        "pixel_bounds": point_bounds(projected),
    }


def camera_pixel_projection(
    camera_points: Any,
    width: int,
    height: int,
) -> tuple[list[tuple[float, float]], dict[str, Any]]:
    if not isinstance(camera_points, list) or not camera_points:
        raise ComparisonGeometryError("snapshot CAMERA sem pontos projetados")
    result: list[tuple[float, float]] = []
    for index, item in enumerate(camera_points):
        if not isinstance(item, (list, tuple)) or len(item) < 2:
            raise ComparisonGeometryError(f"camera_projection[{index}] invalida")
        x = _finite_number(item[0], f"camera_projection[{index}].x")
        y = _finite_number(item[1], f"camera_projection[{index}].y")
        result.append((x * width, (1.0 - y) * height))
    return result, {
        "method": "camera-ndc",
        "ndc_origin": "bottom-left",
        "pixel_origin": "top-left",
        "pixel_bounds": point_bounds(result),
    }


def point_bounds(points: Iterable[tuple[float, float]]) -> list[float]:
    rows = list(points)
    if not rows:
        raise ComparisonGeometryError("bounds exige pontos")
    return [
        min(point[0] for point in rows),
        min(point[1] for point in rows),
        max(point[0] for point in rows),
        max(point[1] for point in rows),
    ]
