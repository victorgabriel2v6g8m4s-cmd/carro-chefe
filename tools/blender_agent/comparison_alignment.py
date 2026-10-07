from __future__ import annotations

import math
from typing import Any, Iterable

from .comparison_geometry import point_bounds


class ComparisonAlignmentError(ValueError):
    pass


_EPS = 1.0e-9
MAX_SCALE = 1_000.0
MAX_OFFSET = 100_000.0
MAX_ROTATION = 360_000.0


def _finite(value: Any, label: str) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError) as exc:
        raise ComparisonAlignmentError(f"{label} deve ser numero finito") from exc
    if not math.isfinite(result):
        raise ComparisonAlignmentError(f"{label} deve ser numero finito")
    return result


def validate_manual_parameters(
    *,
    scale: float = 1.0,
    offset_x: float = 0.0,
    offset_y: float = 0.0,
    rotate_deg: float = 0.0,
) -> tuple[float, float, float, float]:
    scale = _finite(scale, "scale")
    offset_x = _finite(offset_x, "offset_x")
    offset_y = _finite(offset_y, "offset_y")
    rotate_deg = _finite(rotate_deg, "rotate")
    if scale <= 0.0 or scale > MAX_SCALE:
        raise ComparisonAlignmentError(f"scale deve estar em (0,{MAX_SCALE:g}]")
    if abs(offset_x) > MAX_OFFSET or abs(offset_y) > MAX_OFFSET:
        raise ComparisonAlignmentError(f"offset excede limite seguro {MAX_OFFSET:g}px")
    if abs(rotate_deg) > MAX_ROTATION:
        raise ComparisonAlignmentError(f"rotate excede limite seguro {MAX_ROTATION:g} graus")
    return scale, offset_x, offset_y, rotate_deg


def transform_points(
    points: Iterable[tuple[float, float]],
    *,
    scale: float = 1.0,
    offset_x: float = 0.0,
    offset_y: float = 0.0,
    rotate_deg: float = 0.0,
    pivot: tuple[float, float] | None = None,
) -> list[tuple[float, float]]:
    clean_scale, clean_x, clean_y, clean_rotate = validate_manual_parameters(
        scale=scale,
        offset_x=offset_x,
        offset_y=offset_y,
        rotate_deg=rotate_deg,
    )
    rows = list(points)
    if not rows:
        return []
    if pivot is None:
        bounds = point_bounds(rows)
        pivot = ((bounds[0] + bounds[2]) / 2.0, (bounds[1] + bounds[3]) / 2.0)
    px, py = pivot
    radians = math.radians(clean_rotate)
    cosine = math.cos(radians)
    sine = math.sin(radians)
    result: list[tuple[float, float]] = []
    for x, y in rows:
        dx, dy = x - px, y - py
        rotated_x = dx * cosine - dy * sine
        rotated_y = dx * sine + dy * cosine
        result.append((
            px + rotated_x * clean_scale + clean_x,
            py + rotated_y * clean_scale + clean_y,
        ))
    return result


def manual_alignment(
    points: list[tuple[float, float]],
    *,
    scale: float = 1.0,
    offset_x: float = 0.0,
    offset_y: float = 0.0,
    rotate_deg: float = 0.0,
) -> dict[str, Any]:
    clean_scale, clean_x, clean_y, clean_rotate = validate_manual_parameters(
        scale=scale,
        offset_x=offset_x,
        offset_y=offset_y,
        rotate_deg=rotate_deg,
    )
    bounds = point_bounds(points)
    pivot = ((bounds[0] + bounds[2]) / 2.0, (bounds[1] + bounds[3]) / 2.0)
    return {
        "method": "manual",
        "confidence": 1.0,
        "uncertainty": None,
        "scale": clean_scale,
        "offset_x": clean_x,
        "offset_y": clean_y,
        "rotate_deg": clean_rotate,
        "pivot": [pivot[0], pivot[1]],
        "sources": {
            "scale": "cli-override" if clean_scale != 1.0 else "default",
            "offset_x": "cli-override" if clean_x != 0.0 else "default",
            "offset_y": "cli-override" if clean_y != 0.0 else "default",
            "rotate_deg": "cli-override" if clean_rotate != 0.0 else "default",
        },
        "warnings": [],
    }


def parse_anchor(value: str | Iterable[float]) -> tuple[float, float, float, float]:
    if isinstance(value, str):
        parts = [part.strip() for part in value.split(",")]
    else:
        parts = list(value)
    if len(parts) != 4:
        raise ComparisonAlignmentError(
            "anchor deve usar PROJECTED_X,PROJECTED_Y,IMAGE_X,IMAGE_Y"
        )
    values = tuple(_finite(part, f"anchor[{index}]") for index, part in enumerate(parts))
    return values  # type: ignore[return-value]


def anchors_alignment(anchors: Iterable[str | Iterable[float]]) -> dict[str, Any]:
    rows = [parse_anchor(anchor) for anchor in anchors]
    if len(rows) < 2:
        raise ComparisonAlignmentError("align=anchors exige pelo menos dois anchors distintos")

    src = [(row[0], row[1]) for row in rows]
    dst = [(row[2], row[3]) for row in rows]
    src_unique = {(round(x, 9), round(y, 9)) for x, y in src}
    dst_unique = {(round(x, 9), round(y, 9)) for x, y in dst}
    if len(src_unique) < 2:
        raise ComparisonAlignmentError("anchors projetados sao duplicados/degenerados")
    if len(dst_unique) < 2:
        raise ComparisonAlignmentError("anchors da imagem sao duplicados/degenerados")

    src_cx = sum(x for x, _ in src) / len(src)
    src_cy = sum(y for _, y in src) / len(src)
    dst_cx = sum(x for x, _ in dst) / len(dst)
    dst_cy = sum(y for _, y in dst) / len(dst)

    denominator = 0.0
    numerator_a = 0.0
    numerator_b = 0.0
    for (sx, sy), (dx, dy) in zip(src, dst):
        xs, ys = sx - src_cx, sy - src_cy
        xd, yd = dx - dst_cx, dy - dst_cy
        denominator += xs * xs + ys * ys
        numerator_a += xs * xd + ys * yd
        numerator_b += xs * yd - ys * xd

    if denominator <= _EPS:
        raise ComparisonAlignmentError("anchors nao determinam escala/rotacao: variancia de origem zero")
    a = numerator_a / denominator
    b = numerator_b / denominator
    scale = math.hypot(a, b)
    if scale <= _EPS or scale > MAX_SCALE:
        raise ComparisonAlignmentError(f"anchors resultaram em scale invalido: {scale:g}")
    rotation = math.degrees(math.atan2(b, a))
    tx = dst_cx - (a * src_cx - b * src_cy)
    ty = dst_cy - (b * src_cx + a * src_cy)
    if abs(tx) > MAX_OFFSET or abs(ty) > MAX_OFFSET:
        raise ComparisonAlignmentError("anchors resultaram em deslocamento fora do limite seguro")

    residuals: list[float] = []
    for (sx, sy), (dx, dy) in zip(src, dst):
        predicted_x = a * sx - b * sy + tx
        predicted_y = b * sx + a * sy + ty
        residuals.append(math.hypot(predicted_x - dx, predicted_y - dy))
    mean_residual = sum(residuals) / len(residuals)
    max_residual = max(residuals)

    return {
        "method": "anchors-least-squares",
        "confidence": max(0.0, min(1.0, 1.0 / (1.0 + mean_residual / 4.0))),
        "uncertainty": {
            "mean_residual_px": mean_residual,
            "max_residual_px": max_residual,
        },
        "scale": scale,
        "offset_x": tx,
        "offset_y": ty,
        "rotate_deg": rotation,
        "pivot": [0.0, 0.0],
        "matrix": [a, -b, tx, b, a, ty],
        "anchors": [list(row) for row in rows],
        "residuals_px": residuals,
        "sources": {
            "scale": "anchors",
            "offset_x": "anchors",
            "offset_y": "anchors",
            "rotate_deg": "anchors",
        },
        "warnings": [] if len(rows) >= 3 else [
            "dois anchors resolvem similaridade, mas nao permitem detectar outlier"
        ],
    }


def apply_alignment(points: list[tuple[float, float]], alignment: dict[str, Any]) -> list[tuple[float, float]]:
    matrix = alignment.get("matrix")
    if matrix:
        if not isinstance(matrix, list) or len(matrix) != 6:
            raise ComparisonAlignmentError("alignment.matrix invalida")
        a, c, tx, b, d, ty = [float(value) for value in matrix]
        return [(a * x + c * y + tx, b * x + d * y + ty) for x, y in points]
    pivot_value = alignment.get("pivot")
    pivot = None
    if isinstance(pivot_value, (list, tuple)) and len(pivot_value) == 2:
        pivot = (float(pivot_value[0]), float(pivot_value[1]))
    return transform_points(
        points,
        scale=float(alignment.get("scale", 1.0)),
        offset_x=float(alignment.get("offset_x", 0.0)),
        offset_y=float(alignment.get("offset_y", 0.0)),
        rotate_deg=float(alignment.get("rotate_deg", 0.0)),
        pivot=pivot,
    )


def auto_alignment_from_bbox(
    points: list[tuple[float, float]],
    target_bbox: tuple[float, float, float, float] | list[float],
    *,
    confidence: float,
    method: str,
    warnings: Iterable[str] | None = None,
) -> dict[str, Any]:
    source = point_bounds(points)
    target = [float(value) for value in target_bbox]
    source_width = source[2] - source[0]
    source_height = source[3] - source[1]
    target_width = target[2] - target[0]
    target_height = target[3] - target[1]
    if min(source_width, source_height, target_width, target_height) <= _EPS:
        raise ComparisonAlignmentError("auto-fit recebeu bounds degenerados")
    scale = min(target_width / source_width, target_height / source_height)
    if scale <= _EPS or scale > MAX_SCALE:
        raise ComparisonAlignmentError(f"auto-fit resultou em scale invalido: {scale:g}")
    source_cx = (source[0] + source[2]) / 2.0
    source_cy = (source[1] + source[3]) / 2.0
    target_cx = (target[0] + target[2]) / 2.0
    target_cy = (target[1] + target[3]) / 2.0
    return {
        "method": method,
        "confidence": max(0.0, min(1.0, float(confidence))),
        "uncertainty": None,
        "scale": scale,
        "offset_x": target_cx - source_cx,
        "offset_y": target_cy - source_cy,
        "rotate_deg": 0.0,
        "pivot": [source_cx, source_cy],
        "source_bbox": source,
        "target_bbox": target,
        "sources": {
            "scale": "auto-estimate",
            "offset_x": "auto-estimate",
            "offset_y": "auto-estimate",
            "rotate_deg": "default",
        },
        "warnings": list(warnings or []),
    }


def apply_manual_overrides(
    alignment: dict[str, Any],
    *,
    scale: float = 1.0,
    offset_x: float = 0.0,
    offset_y: float = 0.0,
    rotate_deg: float = 0.0,
) -> dict[str, Any]:
    clean_scale, clean_x, clean_y, clean_rotate = validate_manual_parameters(
        scale=scale,
        offset_x=offset_x,
        offset_y=offset_y,
        rotate_deg=rotate_deg,
    )
    result = dict(alignment)
    result["scale"] = float(result.get("scale", 1.0)) * clean_scale
    result["offset_x"] = float(result.get("offset_x", 0.0)) + clean_x
    result["offset_y"] = float(result.get("offset_y", 0.0)) + clean_y
    result["rotate_deg"] = float(result.get("rotate_deg", 0.0)) + clean_rotate
    sources = dict(result.get("sources") or {})
    if clean_scale != 1.0:
        sources["scale"] = "auto-estimate+cli-override"
    if clean_x != 0.0:
        sources["offset_x"] = "auto-estimate+cli-override"
    if clean_y != 0.0:
        sources["offset_y"] = "auto-estimate+cli-override"
    if clean_rotate != 0.0:
        sources["rotate_deg"] = "auto-estimate+cli-override"
    result["sources"] = sources
    result.pop("matrix", None)
    return result
