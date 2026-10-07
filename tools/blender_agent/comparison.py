from __future__ import annotations

import json
import math
import os
from pathlib import Path
from typing import Any

from . import assets, history, protocol
from .client import call
from .comparison_alignment import (
    ComparisonAlignmentError,
    anchors_alignment,
    apply_alignment,
    apply_manual_overrides,
    auto_alignment_from_bbox,
    manual_alignment,
    parse_anchor,
)
from .comparison_geometry import (
    apply_object_transform,
    camera_pixel_projection,
    canonical_pixel_projection,
    cube_mesh,
    normalize_mesh,
    project_vertices,
)
from .comparison_receipt import (
    FEATURE_VERSION,
    RECEIPT_SCHEMA_VERSION,
    dependency_versions,
    public_path,
    receipt_path_for,
    sha256_file,
    write_json_atomic,
)
from .comparison_render import render_comparison, require_pillow, save_png_atomic
from .recipes import load_recipe, plan_recipe
from .runtime_compat import RUNTIME_PROFILE, safe_runtime_path


class ComparisonError(RuntimeError):
    pass


MAX_IMAGE_DIMENSION = max(256, min(8192, int(os.environ.get("CC_BLENDER_COMPARE_MAX_IMAGE_DIMENSION", "4096"))))
MAX_IMAGE_PIXELS = max(1_000_000, min(67_108_864, int(os.environ.get("CC_BLENDER_COMPARE_MAX_IMAGE_PIXELS", "16777216"))))
MAX_OUTPUT_BYTES = max(1_048_576, min(134_217_728, int(os.environ.get("CC_BLENDER_COMPARE_MAX_OUTPUT_BYTES", "33554432"))))
AUTO_CONFIDENCE_THRESHOLD = max(0.0, min(1.0, float(os.environ.get("CC_BLENDER_COMPARE_AUTO_CONFIDENCE", "0.65"))))


def _inside(candidate: Path, root: Path) -> bool:
    try:
        candidate.relative_to(root)
        return True
    except ValueError:
        return False


def _resolve_allowed_input(value: str | Path, suffixes: set[str], label: str) -> Path:
    raw = str(value or "").strip()
    if not raw:
        raise ComparisonError(f"{label} obrigatorio")
    candidate = Path(raw).expanduser()
    if not candidate.is_absolute():
        candidate = protocol.repo_root() / candidate
    try:
        candidate = candidate.resolve(strict=True)
    except FileNotFoundError as exc:
        raise ComparisonError(f"{label} nao encontrado: {raw}") from exc
    if not candidate.is_file():
        raise ComparisonError(f"{label} nao e arquivo: {candidate}")
    if candidate.suffix.lower() not in suffixes:
        raise ComparisonError(
            f"{label} possui extensao nao permitida: {candidate.suffix}; permitidas={sorted(suffixes)}"
        )
    roots = assets.asset_roots()
    if not any(_inside(candidate, root) for root in roots):
        raise protocol.SecurityError(
            f"{label} fora das raizes permitidas; mova para repositorio/runtime "
            "ou configure CC_BLENDER_ASSET_ROOT"
        )
    return candidate


def _resolve_export_path(value: str | None, *, object_name: str, view: str, force: bool) -> Path:
    export_root = (protocol.runtime_root() / "exports").resolve()
    export_root.mkdir(parents=True, exist_ok=True)
    explicit = bool(str(value or "").strip())
    if explicit:
        raw = Path(str(value)).expanduser()
        if not raw.is_absolute():
            raw = protocol.repo_root() / raw
        candidate = raw.resolve(strict=False)
        if candidate.suffix.lower() != ".png":
            raise ComparisonError("--output deve terminar em .png")
        if not _inside(candidate, export_root):
            raise protocol.SecurityError(
                f"output deve ficar em {export_root}; nao e permitido gravar comparacao fora de runtime/exports"
            )
    else:
        logical = f"{protocol.sanitize_label(object_name, 'mesh')}-{view.lower()}-comparison.png"
        candidate = safe_runtime_path("exports", logical)

    if candidate.exists() and not force:
        if explicit:
            raise ComparisonError(
                f"output ja existe: {candidate}; use --force ou escolha outro --output"
            )
        stem, suffix = candidate.stem, candidate.suffix
        for index in range(2, 10_000):
            alternative = candidate.with_name(f"{stem}-{index}{suffix}")
            if not alternative.exists():
                candidate = alternative
                break
        else:
            raise ComparisonError("nao foi possivel gerar nome unico de output")
    return candidate


def _resolve_report_path(value: str | None, *, force: bool) -> Path | None:
    if not value:
        return None
    export_root = (protocol.runtime_root() / "exports").resolve()
    raw = Path(value).expanduser()
    if not raw.is_absolute():
        raw = protocol.repo_root() / raw
    target = raw.resolve(strict=False)
    if not _inside(target, export_root):
        raise protocol.SecurityError("align-report deve ficar em runtime/exports")
    if target.suffix.lower() != ".json":
        raise ComparisonError("--align-report deve terminar em .json")
    if target.exists() and not force:
        raise ComparisonError(
            f"align-report ja existe: {target}; use --force ou escolha outro arquivo"
        )
    return target


def _primitive_or_mesh_from_step(step: dict[str, Any]) -> tuple[list[list[float]], list[list[int]]]:
    action = str(step.get("action") or "")
    params = step.get("params") or {}
    if action == "object.add_mesh":
        vertices = params.get("vertices")
        faces = params.get("faces")
        if not isinstance(vertices, list) or not isinstance(faces, list):
            raise ComparisonError("object.add_mesh da recipe nao contem vertices/faces declarativos")
        return vertices, faces
    if action == "object.add_primitive" and str(params.get("kind") or "").lower() == "cube":
        return cube_mesh()
    raise ComparisonError(
        "recipe source v1 exige object.add_mesh declarativo ou primitive cube para o objeto alvo; "
        f"action recebida={action!r}"
    )


def _recipe_geometry(recipe_path: Path, object_name: str) -> tuple[dict[str, Any], dict[str, Any]]:
    recipe = load_recipe(recipe_path)
    plan_result = plan_recipe(recipe)
    plan = plan_result["plan"]
    components = [
        component for component in plan.get("components", [])
        if str(component.get("object_name") or "") == object_name
    ]
    candidates = [str(component.get("object_name")) for component in plan.get("components", [])]
    if len(components) > 1:
        raise ComparisonError(f"recipe possui object_name ambiguo {object_name!r}")

    creation = None
    creation_index = -1
    for index, step in enumerate(plan.get("steps", [])):
        params = step.get("params") or {}
        if str(params.get("name") or "") != object_name:
            continue
        if step.get("action") in {"object.add_mesh", "object.add_primitive"}:
            if creation is not None:
                raise ComparisonError(f"recipe cria {object_name!r} mais de uma vez")
            creation = step
            creation_index = index
    if creation is None:
        suffix = f"; objetos declarados={candidates}" if candidates else ""
        raise ComparisonError(
            f"nao foi encontrado step de criacao declarativa para {object_name!r}{suffix}"
        )

    vertices, faces = _primitive_or_mesh_from_step(creation)
    params = creation.get("params") or {}
    transform = {
        "location": params.get("location", [0.0, 0.0, 0.0]),
        "rotation_deg": params.get("rotation_deg", [0.0, 0.0, 0.0]),
        "scale": params.get("scale", [1.0, 1.0, 1.0]),
    }
    warnings: list[str] = []
    unsupported_geometry_steps: list[str] = []
    for step in plan.get("steps", [])[creation_index + 1:]:
        step_params = step.get("params") or {}
        if str(step_params.get("name") or "") != object_name:
            continue
        action = str(step.get("action") or "")
        if action == "object.transform":
            for key in ("location", "rotation_deg", "scale"):
                if key in step_params:
                    transform[key] = step_params[key]
        elif action in {"modifier.add", "object.irregularize"}:
            unsupported_geometry_steps.append(action)
    if unsupported_geometry_steps:
        warnings.append(
            "recipe-source compara a malha declarativa antes de efeitos nao reproduzidos offline: "
            + ", ".join(sorted(set(unsupported_geometry_steps)))
            + "; para geometria avaliada use --source scene"
        )

    transformed = apply_object_transform(
        vertices,
        location=transform["location"],
        rotation_deg=transform["rotation_deg"],
        scale=transform["scale"],
    )
    mesh = normalize_mesh(
        name=object_name,
        vertices=transformed,
        faces=faces,
        coordinate_space="WORLD",
        unit_scale=1.0,
        warnings=warnings,
        metadata={
            "recipe_id": plan.get("recipe_id"),
            "recipe_version": plan.get("recipe_version"),
            "recipe_hash": plan.get("recipe_hash"),
            "plan_hash": plan.get("plan_hash"),
            "creation_step": creation.get("id"),
            "transform": transform,
            "offline_geometry_steps_omitted": sorted(set(unsupported_geometry_steps)),
        },
    )
    source = {
        "type": "recipe",
        "path": str(recipe_path),
        "recipe_id": plan.get("recipe_id"),
        "recipe_version": plan.get("recipe_version"),
        "recipe_hash": plan.get("recipe_hash"),
        "plan_hash": plan.get("plan_hash"),
        "object": object_name,
    }
    return mesh, source


def _scene_geometry(object_name: str, view: str) -> tuple[dict[str, Any], dict[str, Any]]:
    try:
        response = call("mesh.comparison_snapshot", {
            "name": object_name,
            "space": "WORLD",
            "modifiers": "evaluated",
            "include_camera_projection": str(view).upper() == "CAMERA",
        })
    except Exception as exc:
        raise ComparisonError(
            "nao foi possivel ler a cena pelo bridge. Execute 'blenagent status' e, se necessario, "
            "'blenagent restart'. Erro: " + str(exc)
        ) from exc
    snapshot = response.get("result") or {}
    mesh = normalize_mesh(
        name=str(snapshot.get("name") or object_name),
        vertices=snapshot.get("vertices"),
        faces=snapshot.get("faces"),
        coordinate_space=str(snapshot.get("coordinate_space") or "WORLD"),
        matrix_world=snapshot.get("matrix_world"),
        unit_scale=float((snapshot.get("scene_unit") or {}).get("scale_length") or 1.0),
        warnings=snapshot.get("warnings") or [],
        metadata={
            "snapshot_geometry_hash": snapshot.get("geometry_hash"),
            "snapshot_world_geometry_hash": snapshot.get("world_geometry_hash"),
            "snapshot_transform_hash": snapshot.get("transform_hash"),
            "modifier_policy": snapshot.get("modifier_policy"),
            "modifiers_evaluated": snapshot.get("modifiers_evaluated"),
            "modifiers": snapshot.get("modifiers") or [],
            "context_unchanged": snapshot.get("context_unchanged"),
            "camera_projection": snapshot.get("camera_projection"),
            "payload_bytes": snapshot.get("payload_bytes"),
        },
    )
    source = {
        "type": "scene",
        "object": object_name,
        "geometry_hash": snapshot.get("geometry_hash"),
        "world_geometry_hash": snapshot.get("world_geometry_hash"),
        "transform_hash": snapshot.get("transform_hash"),
        "modifier_policy": snapshot.get("modifier_policy"),
        "modifiers_evaluated": bool(snapshot.get("modifiers_evaluated")),
        "context_unchanged": bool(snapshot.get("context_unchanged")),
    }
    return mesh, source


def _validate_resolution(width: int, height: int) -> tuple[int, int]:
    width, height = int(width), int(height)
    if width < 1 or height < 1:
        raise ComparisonError("resolution deve ser positiva")
    if width > MAX_IMAGE_DIMENSION or height > MAX_IMAGE_DIMENSION:
        raise ComparisonError(
            f"resolution excede limite por eixo {MAX_IMAGE_DIMENSION}: {width}x{height}"
        )
    if width * height > MAX_IMAGE_PIXELS:
        raise ComparisonError(
            f"resolution excede limite de pixels {MAX_IMAGE_PIXELS}: {width}x{height}"
        )
    return width, height


def _target_bbox(reference, mask_path: Path | None) -> dict[str, Any]:
    Image, ImageChops, _ImageDraw, _ImageFilter = require_pillow()
    width, height = reference.size
    if mask_path is not None:
        with Image.open(mask_path) as raw_mask:
            mask = raw_mask.convert("L")
            if mask.size != reference.size:
                raise ComparisonError(
                    f"reference-mask deve ter mesma dimensao da referencia: mask={mask.size}, reference={reference.size}"
                )
            binary = mask.point(lambda value: 255 if value > 0 else 0)
            bbox = binary.getbbox()
        if bbox is None:
            return {"bbox": None, "confidence": 0.0, "method": "explicit-mask-empty", "warnings": ["mascara explicita vazia"]}
        return {"bbox": list(bbox), "confidence": 1.0, "method": "explicit-mask", "warnings": []}

    rgba = reference.convert("RGBA")
    alpha = rgba.getchannel("A")
    alpha_extrema = alpha.getextrema()
    if alpha_extrema[0] < 250:
        binary = alpha.point(lambda value: 255 if value >= 8 else 0)
        bbox = binary.getbbox()
        if bbox is not None:
            area = max(1, (bbox[2] - bbox[0]) * (bbox[3] - bbox[1]))
            fraction = area / float(width * height)
            confidence = 0.96 if 0.005 <= fraction <= 0.98 else 0.72
            return {
                "bbox": list(bbox),
                "confidence": confidence,
                "method": "reference-alpha",
                "warnings": [] if confidence >= AUTO_CONFIDENCE_THRESHOLD else ["alpha cobre area atipica da imagem"],
            }

    analysis = reference.convert("RGB")
    scale = min(1.0, 512.0 / max(width, height))
    if scale < 1.0:
        analysis = analysis.resize(
            (max(1, int(round(width * scale))), max(1, int(round(height * scale)))),
            Image.Resampling.BILINEAR,
        )
    aw, ah = analysis.size
    pixels = analysis.load()
    corners = [pixels[0, 0], pixels[aw - 1, 0], pixels[0, ah - 1], pixels[aw - 1, ah - 1]]
    background = tuple(int(round(sum(pixel[channel] for pixel in corners) / 4.0)) for channel in range(3))
    corner_spread = max(
        math.sqrt(sum((first[channel] - second[channel]) ** 2 for channel in range(3)))
        for first in corners
        for second in corners
    )
    solid = Image.new("RGB", analysis.size, background)
    difference = ImageChops.difference(analysis, solid).convert("L")
    threshold = 24
    foreground = difference.point(lambda value: 255 if value >= threshold else 0)
    bbox = foreground.getbbox()
    if bbox is None:
        return {
            "bbox": None,
            "confidence": 0.0,
            "method": "uniform-background",
            "warnings": ["segmentacao simples nao encontrou primeiro plano"],
        }
    scaled_bbox = [coordinate / scale for coordinate in bbox]
    bbox_area = max(1.0, (scaled_bbox[2] - scaled_bbox[0]) * (scaled_bbox[3] - scaled_bbox[1]))
    fraction = bbox_area / float(width * height)
    corner_confidence = max(0.0, min(1.0, 1.0 - corner_spread / 90.0))
    area_confidence = 1.0 if 0.02 <= fraction <= 0.85 else 0.45
    confidence = 0.82 * corner_confidence * area_confidence
    warnings = []
    if corner_spread > 35:
        warnings.append("cantos da referencia nao parecem fundo uniforme")
    if not (0.02 <= fraction <= 0.85):
        warnings.append("segmentacao estimou area de primeiro plano atipica")
    if confidence < AUTO_CONFIDENCE_THRESHOLD:
        warnings.append("auto-fit com baixa confianca; prefira --reference-mask, --align anchors ou ajuste manual")
    return {
        "bbox": scaled_bbox,
        "confidence": confidence,
        "method": "uniform-background",
        "warnings": warnings,
        "background_rgb": list(background),
        "corner_spread": corner_spread,
        "foreground_fraction": fraction,
    }


def _validate_anchor_image_bounds(anchors: list[tuple[float, float, float, float]], width: int, height: int) -> None:
    for index, (_sx, _sy, image_x, image_y) in enumerate(anchors):
        if not (-width <= image_x <= width * 2 and -height <= image_y <= height * 2):
            raise ComparisonAlignmentError(
                f"anchor[{index}] image point muito fora dos bounds {width}x{height}: {(image_x, image_y)}"
            )


def compose(options: dict[str, Any]) -> dict[str, Any]:
    Image, _ImageChops, _ImageDraw, _ImageFilter = require_pillow()
    reference_path = assets.resolve_asset_path(str(options.get("reference") or ""))
    mask_path = None
    if options.get("reference_mask"):
        mask_path = assets.resolve_asset_path(str(options["reference_mask"]))

    source = str(options.get("source") or ("recipe" if options.get("recipe") else "scene")).lower()
    if source not in {"recipe", "scene"}:
        raise ComparisonError("source deve ser recipe ou scene")
    object_name = str(options.get("object") or "").strip()
    if not object_name:
        raise ComparisonError("--object e obrigatorio")
    view = str(options.get("view") or "FRONT").upper()
    if view not in {"FRONT", "RIGHT", "TOP", "CAMERA"}:
        raise ComparisonError("view deve ser FRONT, RIGHT, TOP ou CAMERA")

    if source == "recipe":
        if not options.get("recipe"):
            raise ComparisonError("--recipe e obrigatorio quando --source recipe")
        recipe_path = _resolve_allowed_input(str(options["recipe"]), {".json"}, "recipe")
        mesh, source_meta = _recipe_geometry(recipe_path, object_name)
    else:
        mesh, source_meta = _scene_geometry(object_name, view)

    with Image.open(reference_path) as raw_reference:
        raw_reference.load()
        reference = raw_reference.convert("RGBA")
    requested_resolution = options.get("resolution")
    if requested_resolution:
        if not isinstance(requested_resolution, (list, tuple)) or len(requested_resolution) != 2:
            raise ComparisonError("resolution deve conter WIDTH HEIGHT")
        width, height = _validate_resolution(int(requested_resolution[0]), int(requested_resolution[1]))
    else:
        width, height = _validate_resolution(*reference.size)

    if view == "CAMERA":
        if source != "scene":
            raise ComparisonError("view=CAMERA requer --source scene na primeira versao")
        camera_meta = (mesh.get("metadata") or {}).get("camera_projection") or {}
        projected, projection_meta = camera_pixel_projection(
            camera_meta.get("projection"), width, height
        )
        projection_meta["camera"] = camera_meta.get("camera")
    else:
        plane_points, convention = project_vertices(mesh["vertices"], view)
        projected, projection_meta = canonical_pixel_projection(plane_points, width, height)
        projection_meta["convention"] = convention

    align_mode = str(options.get("align") or "auto").lower()
    if align_mode not in {"auto", "manual", "anchors", "none"}:
        raise ComparisonError("align deve ser auto, manual, anchors ou none")
    scale_override = float(options.get("scale", 1.0))
    offset_x = float(options.get("offset_x", 0.0))
    offset_y = float(options.get("offset_y", 0.0))
    rotate = float(options.get("rotate", 0.0))
    alignment_target = None

    if align_mode == "none":
        alignment = manual_alignment(projected)
        alignment["method"] = "none"
        alignment["confidence"] = 1.0
    elif align_mode == "manual":
        alignment = manual_alignment(
            projected,
            scale=scale_override,
            offset_x=offset_x,
            offset_y=offset_y,
            rotate_deg=rotate,
        )
    elif align_mode == "anchors":
        raw_anchors = options.get("anchors") or []
        parsed_anchors = [parse_anchor(anchor) for anchor in raw_anchors]
        _validate_anchor_image_bounds(parsed_anchors, width, height)
        alignment = anchors_alignment(parsed_anchors)
    else:
        alignment_target = _target_bbox(reference, mask_path)
        if alignment_target.get("bbox") is None:
            alignment = manual_alignment(projected)
            alignment["method"] = str(alignment_target.get("method") or "auto-failed")
            alignment["confidence"] = float(alignment_target.get("confidence") or 0.0)
            alignment["warnings"] = list(alignment_target.get("warnings") or [])
        else:
            alignment = auto_alignment_from_bbox(
                projected,
                alignment_target["bbox"],
                confidence=float(alignment_target.get("confidence") or 0.0),
                method=str(alignment_target.get("method") or "auto-bbox"),
                warnings=alignment_target.get("warnings") or [],
            )
        alignment = apply_manual_overrides(
            alignment,
            scale=scale_override,
            offset_x=offset_x,
            offset_y=offset_y,
            rotate_deg=rotate,
        )
        if bool(options.get("strict_alignment", False)) and float(alignment.get("confidence") or 0.0) < AUTO_CONFIDENCE_THRESHOLD:
            raise ComparisonError(
                f"auto-fit abaixo do limiar estrito: score={alignment.get('confidence', 0):.3f}, "
                f"limiar={AUTO_CONFIDENCE_THRESHOLD:.3f}. Use --reference-mask, --align anchors ou manual."
            )

    aligned_points = apply_alignment(projected, alignment)
    fill_color = tuple(options.get("fill_color") or (0, 190, 255))
    line_color = tuple(options.get("line_color") or (255, 210, 0))
    border_color = tuple(options.get("border_color") or (255, 60, 60))
    background_color = tuple(options.get("background_color") or (255, 255, 255))

    render_options = {
        "fill": bool(options.get("fill", True)),
        "opacity": float(options.get("opacity", 50.0)),
        "fill_color": list(fill_color),
        "lines": bool(options.get("lines", True)),
        "line_mode": str(options.get("line_mode") or "all").lower(),
        "line_color": list(line_color),
        "line_opacity": float(options.get("line_opacity", 90.0)),
        "line_width": int(options.get("line_width", 1)),
        "border": bool(options.get("border", True)),
        "border_color": list(border_color),
        "border_width": int(options.get("border_width", 3)),
        "background": str(options.get("background") or "original").lower(),
        "background_color": list(background_color),
        "show_axes": bool(options.get("show_axes", False)),
    }
    if not (0.0 <= render_options["opacity"] <= 100.0):
        raise ComparisonError("opacity deve estar em 0..100")
    if not (0.0 <= render_options["line_opacity"] <= 100.0):
        raise ComparisonError("line-opacity deve estar em 0..100")

    force = bool(options.get("force", False))
    output_path = _resolve_export_path(
        str(options.get("output") or "") or None,
        object_name=object_name,
        view=view,
        force=force,
    )
    align_report_path = _resolve_report_path(
        str(options.get("align_report") or "") or None,
        force=force,
    )

    result_summary = {
        "source": source_meta,
        "object": object_name,
        "view": view,
        "resolution": [width, height],
        "mesh": {
            "counts": mesh["counts"],
            "geometry_hash": mesh["geometry_hash"],
            "warnings": mesh.get("warnings") or [],
        },
        "projection": projection_meta,
        "alignment": alignment,
        "alignment_target": alignment_target,
        "render": render_options,
        "dry_run": bool(options.get("dry_run", False)),
    }
    if options.get("dry_run"):
        return {
            "ok": True,
            "dry_run": True,
            **result_summary,
            "output": None,
            "receipt": None,
        }

    image, _mask = render_comparison(
        reference=reference,
        points=aligned_points,
        faces=mesh["faces"],
        width=width,
        height=height,
        fill=render_options["fill"],
        opacity=render_options["opacity"],
        fill_color=fill_color,
        lines=render_options["lines"],
        line_mode=render_options["line_mode"],
        line_color=line_color,
        line_opacity=render_options["line_opacity"],
        line_width=render_options["line_width"],
        border=render_options["border"],
        border_color=border_color,
        border_width=render_options["border_width"],
        background=render_options["background"],
        background_color=background_color,
        show_axes=render_options["show_axes"],
    )
    output_info = save_png_atomic(image, output_path)
    if output_info["bytes"] > MAX_OUTPUT_BYTES:
        output_path.unlink(missing_ok=True)
        raise ComparisonError(
            f"PNG excede limite de bytes {MAX_OUTPUT_BYTES}: {output_info['bytes']}; reduza a resolucao"
        )
    output_info["sha256"] = sha256_file(output_path)

    if align_report_path is not None:
        write_json_atomic(align_report_path, {
            "feature": FEATURE_VERSION,
            "view": view,
            "resolution": [width, height],
            "alignment_requested": align_mode,
            "alignment": alignment,
            "target": alignment_target,
        })

    stage_id = history.get_active_stage_id()
    runtime_root = protocol.runtime_root()
    receipt_path = receipt_path_for(output_path)
    receipt = {
        "schema_version": RECEIPT_SCHEMA_VERSION,
        "feature": FEATURE_VERSION,
        "runtime_profile": RUNTIME_PROFILE,
        "kind": "visual-comparison-not-metrology",
        "source": {
            **source_meta,
            "path": public_path(source_meta["path"], runtime_root=runtime_root) if source_meta.get("path") else None,
        },
        "reference": {
            "path": public_path(reference_path, runtime_root=runtime_root),
            "sha256": sha256_file(reference_path),
            "dimensions": list(reference.size),
        },
        "reference_mask": None if mask_path is None else {
            "path": public_path(mask_path, runtime_root=runtime_root),
            "sha256": sha256_file(mask_path),
        },
        "output_dimensions": [width, height],
        "view": view,
        "projection": projection_meta,
        "mesh": {
            "counts": mesh["counts"],
            "geometry_hash": mesh["geometry_hash"],
            "coordinate_space": mesh["coordinate_space"],
            "unit_scale": mesh["unit_scale"],
            "modifiers_evaluated": (mesh.get("metadata") or {}).get("modifiers_evaluated"),
        },
        "alignment_requested": align_mode,
        "alignment": alignment,
        "alignment_target": alignment_target,
        "render": render_options,
        "dependencies": dependency_versions(),
        "output": {
            **output_info,
            "path": public_path(output_path, runtime_root=runtime_root),
        },
        "align_report": public_path(align_report_path, runtime_root=runtime_root) if align_report_path else None,
        "stage_id": stage_id,
        "warnings": [*(mesh.get("warnings") or []), *(alignment.get("warnings") or [])],
        "notice": (
            "Esta imagem e uma visualizacao comparativa para edicao. "
            "Hashes e alinhamento visual nao constituem medicao metrologica nem aprovacao do produto."
        ),
    }
    try:
        write_json_atomic(receipt_path, receipt)
    except Exception as exc:
        raise ComparisonError(
            f"PNG salvo em {output_path}, mas receipt falhou; execucao incompleta: {type(exc).__name__}: {exc}"
        ) from exc

    history_event_id = None
    history_stage_id = stage_id
    if not bool(options.get("no_history", False)):
        event = history.record_event(
            action="mesh.reference.compare",
            params={
                "source": source,
                "object": object_name,
                "view": view,
                "alignment_requested": align_mode,
                "render": render_options,
                "reference_hash": receipt["reference"]["sha256"],
                "geometry_hash": mesh["geometry_hash"],
            },
            result={
                "output": str(output_path),
                "receipt": str(receipt_path),
                "align_report": str(align_report_path) if align_report_path else None,
                "alignment": {
                    "method": alignment.get("method"),
                    "confidence": alignment.get("confidence"),
                    "scale": alignment.get("scale"),
                    "offset_x": alignment.get("offset_x"),
                    "offset_y": alignment.get("offset_y"),
                    "rotate_deg": alignment.get("rotate_deg"),
                },
                "counts": mesh["counts"],
            },
            ok=True,
            tags=["comparison", "mesh-reference", source],
        )
        history_event_id = event.get("event_id")
        history_stage_id = event.get("stage_id")
        # Do not rewrite the receipt after record_event: history hashes attachments at
        # event creation time, so mutating the receipt afterward would make its stored
        # attachment SHA stale. The event id is returned separately by the CLI result.

    return {
        "ok": True,
        **result_summary,
        "output": output_info,
        "receipt": str(receipt_path),
        "align_report": str(align_report_path) if align_report_path else None,
        "stage_id": history_stage_id,
        "history_event_id": history_event_id,
    }
