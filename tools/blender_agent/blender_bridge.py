from __future__ import annotations

import hashlib
import hmac
import json
import math
import os
import queue
import secrets
import socketserver
import sys
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import bpy
import imbuf
from mathutils import Vector

from tools.blender_agent.history import (
    attachment_output_path,
    create_stage,
    describe_stage,
    ensure_stage,
    get_active_stage_id,
    list_stages,
    record_event,
    record_note,
    search_events,
    set_active_stage,
)

from tools.blender_agent.recipes import (
    RecipeError,
    plan_recipe,
    recipe_hash,
    validate_recipe,
)

from tools.blender_agent.protocol import (
    DEFAULT_HOST,
    MAX_JSON_BYTES,
    PROTOCOL_VERSION,
    decode_message,
    encode_message,
    safe_runtime_path,
    sanitize_label,
    session_path,
)

_TASKS: "queue.Queue[Task]" = queue.Queue()
_TOKEN = secrets.token_urlsafe(32)
_SERVER = None
_CAPTURE_JOB = None
_SCULPT_PREPARE_JOB = None
_SCULPT_FINISH_JOB = None
_RECIPE_RUN_JOB = None
_RECIPE_LAST_STATUS: dict[str, Any] | None = None
_SCULPT_SESSION = None
_WORKSPACE_CAPTURE_SETTLE_TICKS = max(1, min(10, int(os.environ.get("CC_BLENDER_WORKSPACE_SETTLE_TICKS", "3"))))

_MOUSE_BUTTONS = {"left": "LEFTMOUSE", "middle": "MIDDLEMOUSE", "right": "RIGHTMOUSE"}
_UI_EVENT_TYPES = {
    "LEFTMOUSE",
    "MIDDLEMOUSE",
    "RIGHTMOUSE",
    "MOUSEMOVE",
    "ESC",
    "WHEELUPMOUSE",
    "WHEELDOWNMOUSE",
    "PEN",
    "ERASER",
}
_UI_EVENT_VALUES = {"PRESS", "RELEASE", "CLICK", "DOUBLE_CLICK", "NOTHING"}
_PRIMITIVES = {
    "cube": bpy.ops.mesh.primitive_cube_add,
    "cylinder": bpy.ops.mesh.primitive_cylinder_add,
    "uv_sphere": bpy.ops.mesh.primitive_uv_sphere_add,
    "ico_sphere": bpy.ops.mesh.primitive_ico_sphere_add,
    "torus": bpy.ops.mesh.primitive_torus_add,
}
_MODIFIER_PROPERTIES = {
    "BEVEL": {"width", "segments", "limit_method", "angle_limit"},
    "SUBSURF": {"levels", "render_levels", "subdivision_type"},
    "SOLIDIFY": {"thickness", "offset"},
    "SMOOTH": {"factor", "iterations", "use_x", "use_y", "use_z"},
    "SIMPLE_DEFORM": {"deform_method", "deform_axis", "angle", "factor", "limits"},
}
_VIEW_AXIS_TYPES = {"LEFT", "RIGHT", "BOTTOM", "TOP", "FRONT", "BACK", "CAMERA", "THREE_QUARTER"}
_VIEW_SHADING_TYPES = {"WIREFRAME", "SOLID", "MATERIAL", "RENDERED"}
_SCULPT_BRUSH_TYPES = {
    "DRAW",
    "SMOOTH",
    "GRAB",
    "INFLATE",
    "CLAY_STRIPS",
    "CREASE",
    "SNAKE_HOOK",
}
_SCULPT_TOOL_IDS = {
    "DRAW": "builtin_brush.Draw",
    "SMOOTH": "builtin_brush.Smooth",
    "GRAB": "builtin_brush.Grab",
    "INFLATE": "builtin_brush.Inflate",
    "CLAY_STRIPS": "builtin_brush.Clay Strips",
    "CREASE": "builtin_brush.Crease",
    "SNAKE_HOOK": "builtin_brush.Snake Hook",
}
_SCULPT_STROKE_MODES = {"NORMAL", "INVERT", "SMOOTH", "ERASE", "MASK"}


@dataclass
class Task:
    request: dict[str, Any]
    done: threading.Event = field(default_factory=threading.Event)
    response: dict[str, Any] | None = None


@dataclass
class WorkspaceCaptureJob:
    task: Task
    params: dict[str, Any]
    captures: list[dict[str, Any]]
    label: str
    original_workspace_name: str
    results: list[dict[str, Any]] = field(default_factory=list)
    index: int = 0
    phase: str = "switch"
    settle_remaining: int = 0
    requested_workspace_name: str | None = None
    last_screen_name: str | None = None
    started_ns: int = field(default_factory=time.time_ns)


@dataclass
class SculptPrepareJob:
    task: Task
    params: dict[str, Any]
    original_workspace_name: str
    requested_workspace_name: str
    phase: str = "switch"
    settle_remaining: int = 0
    last_screen_name: str | None = None
    error: str | None = None


@dataclass
class SculptFinishJob:
    task: Task
    params: dict[str, Any]
    session: dict[str, Any]
    phase: str = "exit_mode"
    settle_remaining: int = 0
    last_screen_name: str | None = None


@dataclass
class RecipeRunJob:
    task: Task
    plan: dict[str, Any]
    run_id: str
    stage_id: str
    previous_stage_id: str | None
    restore_stage: bool
    results: list[dict[str, Any]] = field(default_factory=list)
    captures: list[dict[str, Any]] = field(default_factory=list)
    failed_steps: int = 0
    step_index: int = 0
    view_index: int = 0
    phase: str = "step"
    settle_remaining: int = 0
    current_capture: dict[str, Any] | None = None
    fatal_error: str | None = None
    started_ns: int = field(default_factory=time.time_ns)


class ReusableThreadingTCPServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


class Handler(socketserver.StreamRequestHandler):
    def handle(self) -> None:
        try:
            raw = self.rfile.readline(MAX_JSON_BYTES + 1)
            if len(raw) > MAX_JSON_BYTES:
                raise ValueError("request excede limite")
            request = decode_message(raw.rstrip(b"\r\n"))
            if not hmac.compare_digest(request.get("token") or "", _TOKEN):
                raise PermissionError("token de sessão inválido")

            task = Task(request=request)
            _TASKS.put(task)
            wait_timeout = 120 if request.get("action") == "recipe.run" else 30
            if not task.done.wait(timeout=wait_timeout):
                raise TimeoutError("Blender não processou a action no prazo")
            response = task.response or {"ok": False, "error": "resposta vazia"}
        except Exception as exc:
            response = {"ok": False, "error": f"{type(exc).__name__}: {exc}"}

        self.wfile.write(encode_message(response))


def _vec3(value: Any, name: str) -> tuple[float, float, float]:
    if not isinstance(value, (list, tuple)) or len(value) != 3:
        raise ValueError(f"{name} deve ter 3 números")
    return tuple(float(v) for v in value)


def _selected_object(name: str):
    obj = bpy.data.objects.get(name)
    if obj is None:
        raise ValueError(f"objeto não encontrado: {name}")
    return obj


def _object_snapshot(obj) -> dict[str, Any]:
    return {
        "name": obj.name,
        "type": obj.type,
        "location": [round(float(v), 6) for v in obj.location],
        "rotation_euler": [round(float(v), 6) for v in obj.rotation_euler],
        "scale": [round(float(v), 6) for v in obj.scale],
        "dimensions": [round(float(v), 6) for v in obj.dimensions],
        "selected": bool(obj.select_get()),
    }


def _event_simulate(event_type: str, value: str, params: dict[str, Any]):
    if event_type not in _UI_EVENT_TYPES:
        raise ValueError(f"evento de UI não permitido: {event_type}")
    if value not in _UI_EVENT_VALUES:
        raise ValueError(f"valor de evento não permitido: {value}")
    window = bpy.context.window
    if window is None:
        raise RuntimeError("nenhuma janela Blender ativa")
    kwargs = {
        "x": int(params.get("x", 0)),
        "y": int(params.get("y", 0)),
        "shift": bool(params.get("shift", False)),
        "ctrl": bool(params.get("ctrl", False)),
        "alt": bool(params.get("alt", False)),
    }
    if not (0 <= kwargs["x"] < window.width and 0 <= kwargs["y"] < window.height):
        raise ValueError(f"coordenada fora da janela Blender {window.width}x{window.height}")
    try:
        return window.event_simulate(event_type, value, **kwargs)
    except Exception as exc:
        raise RuntimeError(
            "event_simulate falhou; inicie o Blender com --enable-event-simulate"
        ) from exc


def _modal_operator_names(window) -> list[str]:
    names: list[str] = []
    for operator in window.modal_operators:
        identifier = getattr(operator, "bl_idname", None) or getattr(operator, "name", None)
        names.append(str(identifier or type(operator).__name__))
    return names


def _largest_view3d_area():
    window = bpy.context.window
    if window is None or window.screen is None:
        raise RuntimeError("nenhuma janela Blender ativa")
    areas = [area for area in window.screen.areas if area.type == "VIEW_3D"]
    if not areas:
        raise RuntimeError("nenhuma VIEW_3D encontrada")
    return max(areas, key=lambda area: area.width * area.height)


def _view3d_context():
    area = _largest_view3d_area()
    regions = [region for region in area.regions if region.type == "WINDOW"]
    if not regions:
        raise RuntimeError("VIEW_3D sem região WINDOW")
    region = max(regions, key=lambda item: item.width * item.height)
    space = area.spaces.active
    region_3d = getattr(space, "region_3d", None)
    if region_3d is None:
        raise RuntimeError("VIEW_3D sem RegionView3D")
    return area, region, space, region_3d


def _view3d_snapshot() -> dict[str, Any]:
    area, region, _space, _region_3d = _view3d_context()
    return {
        "x": int(region.x),
        "y": int(region.y),
        "width": int(region.width),
        "height": int(region.height),
        "center_x": int(region.x + region.width // 2),
        "center_y": int(region.y + region.height // 2),
        "area": {
            "x": int(area.x),
            "y": int(area.y),
            "width": int(area.width),
            "height": int(area.height),
        },
    }


def _viewport_description() -> dict[str, Any]:
    area, region, space, region_3d = _view3d_context()
    active = bpy.context.view_layer.objects.active
    view_location = getattr(region_3d, "view_location", None)
    view_rotation = getattr(region_3d, "view_rotation", None)
    return {
        "bounds": _view3d_snapshot(),
        "area_type": area.type,
        "region_type": region.type,
        "shading": getattr(space.shading, "type", None),
        "view_perspective": getattr(region_3d, "view_perspective", None),
        "is_perspective": bool(getattr(region_3d, "is_perspective", False)),
        "view_distance": float(getattr(region_3d, "view_distance", 0.0)),
        "view_location": [round(float(v), 6) for v in view_location] if view_location is not None else None,
        "view_rotation": [round(float(v), 6) for v in view_rotation] if view_rotation is not None else None,
        "mode": bpy.context.mode,
        "active_object": active.name if active else None,
        "selected_objects": [obj.name for obj in bpy.context.selected_objects],
    }


def _viewport_frame_all() -> dict[str, Any]:
    window = bpy.context.window
    if window is None:
        raise RuntimeError("nenhuma janela Blender ativa")
    area, region, _space, _region_3d = _view3d_context()
    with bpy.context.temp_override(window=window, screen=window.screen, area=area, region=region):
        result = bpy.ops.view3d.view_all(use_all_regions=False, center=False)
    area.tag_redraw()
    return {"operator": sorted(result), "view": _viewport_description()}


def _viewport_set_view(params: dict[str, Any]) -> dict[str, Any]:
    preset = str(params.get("preset", "FRONT")).upper()
    if preset not in _VIEW_AXIS_TYPES:
        raise ValueError(f"preset de viewport não permitido: {preset}")

    window = bpy.context.window
    if window is None:
        raise RuntimeError("nenhuma janela Blender ativa")
    area, region, _space, _region_3d = _view3d_context()

    results: list[str] = []
    with bpy.context.temp_override(window=window, screen=window.screen, area=area, region=region):
        if preset == "CAMERA":
            results.extend(sorted(bpy.ops.view3d.view_camera()))
        elif preset == "THREE_QUARTER":
            results.extend(sorted(bpy.ops.view3d.view_axis(type="FRONT", align_active=False, relative=False)))
            results.extend(sorted(bpy.ops.view3d.view_orbit(angle=math.radians(35.0), type="ORBITRIGHT")))
            results.extend(sorted(bpy.ops.view3d.view_orbit(angle=math.radians(20.0), type="ORBITUP")))
        else:
            results.extend(sorted(bpy.ops.view3d.view_axis(type=preset, align_active=False, relative=False)))

        if bool(params.get("frame_all", True)):
            results.extend(sorted(bpy.ops.view3d.view_all(use_all_regions=False, center=False)))

    area.tag_redraw()
    return {"preset": preset, "operator": results, "view": _viewport_description()}


def _viewport_set_shading(params: dict[str, Any]) -> dict[str, Any]:
    shading = str(params.get("type", "SOLID")).upper()
    if shading not in _VIEW_SHADING_TYPES:
        raise ValueError(f"shading não permitido: {shading}")
    area, _region, space, _region_3d = _view3d_context()
    space.shading.type = shading
    area.tag_redraw()
    return {"shading": shading, "view": _viewport_description()}


def _viewport_capture(params: dict[str, Any]) -> dict[str, Any]:
    window = bpy.context.window
    if window is None:
        raise RuntimeError("nenhuma janela Blender ativa")
    if not hasattr(window, "screenshot"):
        raise RuntimeError("viewport.capture requer Blender 5.2+ com Window.screenshot")

    _area, region, _space, _region_3d = _view3d_context()
    filename = str(params.get("filename", f"viewport-{time.time_ns()}.png"))
    if not filename.lower().endswith(".png"):
        filename += ".png"
    output = attachment_output_path(filename)

    region_rect = (
        (int(region.x), int(region.y)),
        (int(region.x + region.width), int(region.y + region.height)),
    )
    pixels = window.screenshot(region=region_rect)
    height, width = int(pixels.shape[0]), int(pixels.shape[1])
    if width <= 0 or height <= 0:
        raise RuntimeError("captura retornou dimensões inválidas")

    image = imbuf.new((width, height))
    try:
        image.file_type = "PNG"
        with image.with_buffer(write=True) as buffer:
            buffer.cast("B")[:] = pixels.cast("B")
        imbuf.write(image, filepath=str(output))
    finally:
        image.free()

    if not output.exists() or output.stat().st_size <= 0:
        raise RuntimeError("arquivo de viewport não foi gravado")

    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    view = _viewport_description()
    receipt = {
        "protocol": PROTOCOL_VERSION,
        "action": "viewport.capture",
        "created_ns": time.time_ns(),
        "image": str(output),
        "sha256": digest,
        "width": width,
        "height": height,
        "scene": bpy.context.scene.name,
        "view": view,
    }
    receipt_path = attachment_output_path(f"{output.stem}.json")
    receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2), encoding="utf-8")

    return {
        "path": str(output),
        "receipt": str(receipt_path),
        "sha256": digest,
        "width": width,
        "height": height,
        "view": view,
    }


def _redraw_window() -> None:
    window = bpy.context.window
    if window is None or window.screen is None:
        return
    for area in window.screen.areas:
        try:
            area.tag_redraw()
        except Exception:
            pass
    try:
        bpy.ops.wm.redraw_timer(type="DRAW_WIN_SWAP", iterations=1)
    except Exception:
        pass


def _workspace_by_name(name: str | None):
    window = bpy.context.window
    if window is None:
        raise RuntimeError("nenhuma janela Blender ativa")
    if not name:
        return window.workspace
    workspace = bpy.data.workspaces.get(str(name))
    if workspace is None:
        raise ValueError(f"workspace nao encontrado: {name}")
    return workspace


def _area_summary(area) -> dict[str, Any]:
    space = area.spaces.active
    summary: dict[str, Any] = {
        "type": area.type,
        "ui_type": getattr(area, "ui_type", None),
        "x": int(area.x),
        "y": int(area.y),
        "width": int(area.width),
        "height": int(area.height),
    }
    if area.type == "VIEW_3D":
        region_3d = getattr(space, "region_3d", None)
        summary["shading"] = getattr(getattr(space, "shading", None), "type", None)
        summary["view_perspective"] = getattr(region_3d, "view_perspective", None) if region_3d else None
        summary["view_distance"] = float(getattr(region_3d, "view_distance", 0.0)) if region_3d else None
    elif area.type == "OUTLINER":
        summary["display_mode"] = getattr(space, "display_mode", None)
    elif area.type == "PROPERTIES":
        summary["context"] = getattr(space, "context", None)
    elif area.type == "TEXT_EDITOR":
        text = getattr(space, "text", None)
        summary["text"] = getattr(text, "name", None)
    elif area.type == "IMAGE_EDITOR":
        image = getattr(space, "image", None)
        summary["image"] = getattr(image, "name", None)
    elif area.type == "NODE_EDITOR":
        summary["tree_type"] = getattr(space, "tree_type", None)
        summary["shader_type"] = getattr(space, "shader_type", None)
        summary["geometry_nodes_type"] = getattr(space, "geometry_nodes_type", None)
    elif area.type == "DOPESHEET_EDITOR":
        summary["mode"] = getattr(space, "mode", None)
    return summary


def _workspace_description_one(name: str | None = None) -> dict[str, Any]:
    window = bpy.context.window
    if window is None:
        raise RuntimeError("nenhuma janela Blender ativa")

    original = window.workspace
    target = _workspace_by_name(name)
    try:
        if target != original:
            window.workspace = target
            _redraw_window()

        scene = bpy.context.scene
        active = bpy.context.view_layer.objects.active
        selected = [obj.name for obj in bpy.context.selected_objects]
        counts: dict[str, int] = {}
        objects = []
        for obj in scene.objects:
            counts[obj.type] = counts.get(obj.type, 0) + 1
            if len(objects) < 100:
                objects.append({
                    "name": obj.name,
                    "type": obj.type,
                    "visible": bool(obj.visible_get()),
                    "hide_viewport": bool(obj.hide_viewport),
                    "hide_render": bool(obj.hide_render),
                })

        areas = [_area_summary(area) for area in window.screen.areas]
        return {
            "workspace": target.name,
            "current": target == original,
            "screen": window.screen.name,
            "scene": scene.name,
            "mode": bpy.context.mode,
            "active_object": active.name if active else None,
            "selected_objects": selected,
            "object_counts": counts,
            "objects": objects,
            "objects_truncated": max(0, len(scene.objects) - len(objects)),
            "areas": areas,
        }
    finally:
        if window.workspace != original:
            window.workspace = original
            _redraw_window()


def _workspace_list() -> dict[str, Any]:
    window = bpy.context.window
    if window is None:
        raise RuntimeError("nenhuma janela Blender ativa")
    current = window.workspace.name
    return {
        "current": current,
        "workspaces": [
            {
                "name": workspace.name,
                "current": workspace.name == current,
            }
            for workspace in bpy.data.workspaces
        ],
    }


def _workspace_describe(params: dict[str, Any]) -> dict[str, Any]:
    names = params.get("names")
    if names is None and params.get("all"):
        names = [workspace.name for workspace in bpy.data.workspaces]
    if names is None:
        name = params.get("name")
        return {"workspaces": [_workspace_description_one(str(name) if name else None)]}
    if not isinstance(names, list):
        raise ValueError("names deve ser lista")
    if len(names) > 20:
        raise ValueError("limite de 20 workspaces por consulta")
    return {"workspaces": [_workspace_description_one(str(name)) for name in names]}


def _save_window_pixels(pixels, output: Path) -> dict[str, Any]:
    height, width = int(pixels.shape[0]), int(pixels.shape[1])
    if width <= 0 or height <= 0:
        raise RuntimeError("captura retornou dimensoes invalidas")
    image = imbuf.new((width, height))
    try:
        image.file_type = "PNG"
        with image.with_buffer(write=True) as buffer:
            buffer.cast("B")[:] = pixels.cast("B")
        imbuf.write(image, filepath=str(output))
    finally:
        image.free()
    if not output.exists() or output.stat().st_size <= 0:
        raise RuntimeError("arquivo de captura nao foi gravado")
    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    return {
        "path": str(output),
        "sha256": digest,
        "width": width,
        "height": height,
    }


def _normalize_workspace_capture_specs(params: dict[str, Any]) -> list[dict[str, Any]]:
    captures = params.get("captures")
    if captures is None:
        workspaces = params.get("workspaces")
        if workspaces is None:
            workspaces = [workspace.name for workspace in bpy.data.workspaces]
        if not isinstance(workspaces, list):
            raise ValueError("workspaces deve ser lista")
        captures = [
            {
                "workspace": name,
                "target": params.get("target", "VIEW_3D"),
                "area_type": params.get("area_type"),
                "shading": params.get("shading"),
            }
            for name in workspaces
        ]
    if not isinstance(captures, list):
        raise ValueError("captures deve ser lista")
    if len(captures) == 0 or len(captures) > 20:
        raise ValueError("capture_set exige entre 1 e 20 capturas")

    normalized: list[dict[str, Any]] = []
    for spec in captures:
        if not isinstance(spec, dict):
            raise ValueError("cada captura deve ser objeto")
        target = str(spec.get("target", "VIEW_3D")).upper()
        if target not in {"VIEW_3D", "WINDOW", "AREA"}:
            raise ValueError(f"target de captura invalido: {target}")
        normalized.append({
            **spec,
            "target": target,
        })
    return normalized


def _capture_active_workspace_item(
    spec: dict[str, Any],
    index: int,
    requested_workspace_name: str,
) -> dict[str, Any]:
    window = bpy.context.window
    if window is None:
        raise RuntimeError("nenhuma janela Blender ativa")
    if not hasattr(window, "screenshot"):
        raise RuntimeError("workspace.capture_set requer Blender 5.2+ com Window.screenshot")

    captured_workspace_name = window.workspace.name
    captured_screen_name = window.screen.name
    if captured_workspace_name != requested_workspace_name:
        raise RuntimeError(
            "workspace mismatch antes da captura: "
            f"solicitado={requested_workspace_name!r}, ativo={captured_workspace_name!r}, "
            f"screen={captured_screen_name!r}"
        )

    target = str(spec.get("target", "VIEW_3D")).upper()
    region_rect = None
    area_type = None

    if target == "VIEW_3D":
        _area, region, _space, _region_3d = _view3d_context()
        region_rect = (
            (int(region.x), int(region.y)),
            (int(region.x + region.width), int(region.y + region.height)),
        )
        area_type = "VIEW_3D"
    elif target == "AREA":
        requested_area = str(spec.get("area_type") or "VIEW_3D").upper()
        areas = [area for area in window.screen.areas if area.type == requested_area]
        if not areas:
            raise ValueError(
                f"area nao encontrada no workspace {requested_workspace_name}: {requested_area}"
            )
        area = max(areas, key=lambda item: item.width * item.height)
        region_rect = (
            (int(area.x), int(area.y)),
            (int(area.x + area.width), int(area.y + area.height)),
        )
        area_type = requested_area

    filename = str(
        spec.get("filename")
        or f"{index:02d}-{requested_workspace_name}-{target.lower()}.png"
    )
    if not filename.lower().endswith(".png"):
        filename += ".png"
    output = attachment_output_path(filename)

    pixels = window.screenshot(region=region_rect) if region_rect else window.screenshot()

    workspace_after = window.workspace.name
    screen_after = window.screen.name
    if workspace_after != requested_workspace_name:
        raise RuntimeError(
            "workspace mudou durante a captura: "
            f"solicitado={requested_workspace_name!r}, depois={workspace_after!r}, "
            f"screen={screen_after!r}"
        )

    capture = _save_window_pixels(pixels, output)
    capture.update({
        "workspace_requested": requested_workspace_name,
        "workspace_captured": workspace_after,
        "workspace_match": workspace_after == requested_workspace_name,
        "screen_captured": screen_after,
        "target": target,
        "area_type": area_type,
    })
    return capture


def _write_workspace_capture_manifest(job: WorkspaceCaptureJob) -> dict[str, Any]:
    manifest_path = attachment_output_path(f"{job.label}.json")
    window = bpy.context.window
    final_workspace = window.workspace.name if window else None
    final_screen = window.screen.name if window else None
    restored = final_workspace == job.original_workspace_name
    manifest = {
        "version": 2,
        "action": "workspace.capture_set",
        "created_ns": time.time_ns(),
        "started_ns": job.started_ns,
        "active_stage": get_active_stage_id(),
        "synchronization": {
            "strategy": "timer-yield",
            "settle_ticks": _WORKSPACE_CAPTURE_SETTLE_TICKS,
        },
        "original_workspace": job.original_workspace_name,
        "final_workspace": final_workspace,
        "final_screen": final_screen,
        "restored_original_workspace": restored,
        "captures": job.results,
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return {
        "manifest": str(manifest_path),
        "captures": job.results,
        "success_count": sum(1 for item in job.results if item.get("ok")),
        "failure_count": sum(1 for item in job.results if not item.get("ok")),
        "requested_count": len(job.captures),
        "original_workspace": job.original_workspace_name,
        "final_workspace": final_workspace,
        "restored_original_workspace": restored,
        "synchronization": manifest["synchronization"],
    }


def _start_workspace_capture_job(task: Task) -> None:
    global _CAPTURE_JOB
    if _CAPTURE_JOB is not None:
        raise RuntimeError("ja existe workspace.capture_set em andamento")
    window = bpy.context.window
    if window is None:
        raise RuntimeError("nenhuma janela Blender ativa")
    captures = _normalize_workspace_capture_specs(task.request.get("params") or {})
    label = sanitize_label(
        str(task.request.get("params", {}).get("label", "workspace-capture-set")),
        "workspace-capture-set",
    )
    _CAPTURE_JOB = WorkspaceCaptureJob(
        task=task,
        params=task.request.get("params") or {},
        captures=captures,
        label=label,
        original_workspace_name=window.workspace.name,
    )


def _capture_job_fail_current(job: WorkspaceCaptureJob, exc: Exception) -> None:
    window = bpy.context.window
    spec = job.captures[job.index] if job.index < len(job.captures) else {}
    job.results.append({
        "ok": False,
        "workspace_requested": job.requested_workspace_name or spec.get("workspace"),
        "workspace_captured": window.workspace.name if window else None,
        "screen_captured": window.screen.name if window else None,
        "workspace_match": bool(
            window
            and job.requested_workspace_name
            and window.workspace.name == job.requested_workspace_name
        ),
        "target": spec.get("target", "VIEW_3D"),
        "area_type": spec.get("area_type"),
        "error": f"{type(exc).__name__}: {exc}",
    })
    job.index += 1
    job.phase = "switch"
    job.settle_remaining = 0
    job.requested_workspace_name = None
    job.last_screen_name = None


def _advance_workspace_capture_job() -> float:
    global _CAPTURE_JOB
    job = _CAPTURE_JOB
    if job is None:
        return 0.05

    window = bpy.context.window
    if window is None:
        error = RuntimeError("janela Blender desapareceu durante workspace.capture_set")
        job.task.response = {
            "id": job.task.request["id"],
            "ok": False,
            "error": f"{type(error).__name__}: {error}",
        }
        _record_task_history(job.task, ok=False, error=str(error))
        job.task.done.set()
        _CAPTURE_JOB = None
        return 0.05

    try:
        if job.index >= len(job.captures):
            if job.phase not in {"restore", "restore_settle", "finalize"}:
                job.phase = "restore"

            if job.phase == "restore":
                original = bpy.data.workspaces.get(job.original_workspace_name)
                if original is None:
                    raise RuntimeError(
                        f"workspace original nao existe mais: {job.original_workspace_name}"
                    )
                window.workspace = original
                _redraw_window()
                job.phase = "restore_settle"
                job.settle_remaining = _WORKSPACE_CAPTURE_SETTLE_TICKS
                job.last_screen_name = window.screen.name
                return 0.05

            if job.phase == "restore_settle":
                if window.workspace.name != job.original_workspace_name:
                    original = bpy.data.workspaces.get(job.original_workspace_name)
                    if original is None:
                        raise RuntimeError(
                            f"workspace original nao existe mais: {job.original_workspace_name}"
                        )
                    window.workspace = original
                    job.settle_remaining = _WORKSPACE_CAPTURE_SETTLE_TICKS
                    job.last_screen_name = window.screen.name
                    _redraw_window()
                    return 0.05

                current_screen = window.screen.name
                if current_screen != job.last_screen_name:
                    job.last_screen_name = current_screen
                    job.settle_remaining = _WORKSPACE_CAPTURE_SETTLE_TICKS
                    _redraw_window()
                    return 0.05

                if job.settle_remaining > 0:
                    job.settle_remaining -= 1
                    _redraw_window()
                    return 0.05

                job.phase = "finalize"

            if job.phase == "finalize":
                result = _write_workspace_capture_manifest(job)
                if not result["restored_original_workspace"]:
                    raise RuntimeError(
                        "workspace original nao foi restaurado ao final do capture_set"
                    )
                job.task.response = {
                    "id": job.task.request["id"],
                    "ok": True,
                    "result": result,
                }
                _record_task_history(job.task, ok=True, result=result)
                job.task.done.set()
                _CAPTURE_JOB = None
                return 0.05

        spec = job.captures[job.index]

        if job.phase == "switch":
            requested = _workspace_by_name(
                str(spec.get("workspace")) if spec.get("workspace") else None
            )
            job.requested_workspace_name = requested.name
            window.workspace = requested
            _redraw_window()
            job.phase = "settle_workspace"
            job.settle_remaining = _WORKSPACE_CAPTURE_SETTLE_TICKS
            job.last_screen_name = window.screen.name
            return 0.05

        if job.phase == "settle_workspace":
            if window.workspace.name != job.requested_workspace_name:
                requested = _workspace_by_name(job.requested_workspace_name)
                window.workspace = requested
                job.settle_remaining = _WORKSPACE_CAPTURE_SETTLE_TICKS
                job.last_screen_name = window.screen.name
                _redraw_window()
                return 0.05

            current_screen = window.screen.name
            if current_screen != job.last_screen_name:
                job.last_screen_name = current_screen
                job.settle_remaining = _WORKSPACE_CAPTURE_SETTLE_TICKS
                _redraw_window()
                return 0.05

            if job.settle_remaining > 0:
                job.settle_remaining -= 1
                _redraw_window()
                return 0.05

            job.phase = "configure"
            return 0.05

        if job.phase == "configure":
            shading_value = spec.get("shading")
            if shading_value:
                shading = str(shading_value).upper()
                if shading not in _VIEW_SHADING_TYPES:
                    raise ValueError(f"shading nao permitido: {shading}")
                if any(area.type == "VIEW_3D" for area in window.screen.areas):
                    _viewport_set_shading({"type": shading})
            _redraw_window()
            job.phase = "settle_config"
            job.settle_remaining = _WORKSPACE_CAPTURE_SETTLE_TICKS
            job.last_screen_name = window.screen.name
            return 0.05

        if job.phase == "settle_config":
            if window.workspace.name != job.requested_workspace_name:
                raise RuntimeError(
                    "workspace mudou durante a configuracao: "
                    f"esperado={job.requested_workspace_name!r}, "
                    f"ativo={window.workspace.name!r}"
                )
            current_screen = window.screen.name
            if current_screen != job.last_screen_name:
                job.last_screen_name = current_screen
                job.settle_remaining = _WORKSPACE_CAPTURE_SETTLE_TICKS
                _redraw_window()
                return 0.05
            if job.settle_remaining > 0:
                job.settle_remaining -= 1
                _redraw_window()
                return 0.05
            job.phase = "capture"
            return 0.05

        if job.phase == "capture":
            requested_name = str(job.requested_workspace_name)
            capture = _capture_active_workspace_item(
                spec,
                job.index + 1,
                requested_name,
            )
            job.results.append({"ok": True, **capture})
            job.index += 1
            job.phase = "switch"
            job.settle_remaining = 0
            job.requested_workspace_name = None
            job.last_screen_name = None
            return 0.05

        raise RuntimeError(f"fase de workspace.capture_set invalida: {job.phase}")

    except Exception as exc:
        if job.index < len(job.captures):
            _capture_job_fail_current(job, exc)
            return 0.05

        error = f"{type(exc).__name__}: {exc}"
        job.task.response = {
            "id": job.task.request["id"],
            "ok": False,
            "error": error,
        }
        _record_task_history(job.task, ok=False, error=error)
        job.task.done.set()
        _CAPTURE_JOB = None
        return 0.05


def _sculpt_context():
    window = bpy.context.window
    if window is None:
        raise RuntimeError("nenhuma janela Blender ativa")
    area, region, space, region_3d = _view3d_context()
    return window, area, region, space, region_3d


def _sculpt_active_tool_id() -> str | None:
    window = bpy.context.window
    if window is None:
        return None
    try:
        tool = window.workspace.tools.from_space_view3d_mode("SCULPT", create=False)
        return getattr(tool, "idname", None) if tool else None
    except Exception:
        return None


def _sculpt_unified_paint_settings():
    tool_settings = bpy.context.scene.tool_settings

    # Blender 5.x moved UnifiedPaintSettings from ToolSettings to Paint/Sculpt.
    sculpt = getattr(tool_settings, "sculpt", None)
    if sculpt is not None:
        unified = getattr(sculpt, "unified_paint_settings", None)
        if unified is not None:
            return unified, "tool_settings.sculpt.unified_paint_settings"

    # Compatibility with Blender versions where the property lived directly
    # on ToolSettings (for example 4.x and older).
    unified = getattr(tool_settings, "unified_paint_settings", None)
    if unified is not None:
        return unified, "tool_settings.unified_paint_settings"

    raise RuntimeError(
        "UnifiedPaintSettings nao disponivel nesta versao do Blender "
        f"({bpy.app.version_string})"
    )


def _sculpt_status() -> dict[str, Any]:
    active = bpy.context.view_layer.objects.active
    unified, settings_source = _sculpt_unified_paint_settings()
    window = bpy.context.window
    has_view3d = bool(window and any(area.type == "VIEW_3D" for area in window.screen.areas))
    return {
        "mode": bpy.context.mode,
        "workspace": window.workspace.name if window else None,
        "active_object": active.name if active else None,
        "active_object_type": active.type if active else None,
        "brush_tool": _sculpt_active_tool_id(),
        "radius": int(getattr(unified, "size", 0)),
        "strength": float(getattr(unified, "strength", 0.0)),
        "settings_source": settings_source,
        "view": _viewport_description() if has_view3d else None,
        "allowed_brushes": sorted(_SCULPT_BRUSH_TYPES),
    }


def _sculpt_select_mesh(name: str | None):
    obj = _selected_object(name) if name else bpy.context.view_layer.objects.active
    if obj is None:
        raise ValueError("nenhum objeto ativo para Sculpt")
    if obj.type != "MESH":
        raise ValueError(f"Sculpt exige objeto MESH; recebido {obj.type}")

    if bpy.context.mode != "OBJECT":
        try:
            bpy.ops.object.mode_set(mode="OBJECT")
        except Exception as exc:
            raise RuntimeError(f"nao foi possivel sair do modo atual: {bpy.context.mode}") from exc

    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    return obj


def _sculpt_set_brush(brush: str) -> dict[str, Any]:
    normalized = str(brush or "DRAW").upper()
    if normalized not in _SCULPT_BRUSH_TYPES:
        raise ValueError(f"brush Sculpt nao permitido: {normalized}")

    window, area, region, _space, _region_3d = _sculpt_context()
    result = None
    first_error = None
    with bpy.context.temp_override(window=window, screen=window.screen, area=area, region=region):
        if hasattr(bpy.ops.wm, "tool_set_by_brush_type"):
            try:
                result = bpy.ops.wm.tool_set_by_brush_type(
                    brush_type=normalized,
                    space_type="VIEW_3D",
                )
            except Exception as exc:
                first_error = exc
        if not result or "FINISHED" not in result:
            try:
                result = bpy.ops.wm.tool_set_by_id(
                    name=_SCULPT_TOOL_IDS[normalized],
                    space_type="VIEW_3D",
                )
            except Exception as exc:
                if first_error:
                    raise RuntimeError(
                        f"falha ao ativar brush {normalized}: {first_error}; fallback: {exc}"
                    ) from exc
                raise RuntimeError(f"falha ao ativar brush {normalized}: {exc}") from exc

    if not result or "FINISHED" not in result:
        raise RuntimeError(f"Blender recusou brush Sculpt {normalized}: {sorted(result or [])}")

    return {
        "brush": normalized,
        "tool_id": _sculpt_active_tool_id(),
        "operator": sorted(result),
    }


def _sculpt_set_radius_strength(radius: int, strength: float) -> dict[str, Any]:
    radius = max(5, min(500, int(radius)))
    strength = max(0.001, min(1.0, float(strength)))
    unified, settings_source = _sculpt_unified_paint_settings()

    if hasattr(unified, "use_unified_size"):
        unified.use_unified_size = True
    if hasattr(unified, "use_unified_strength"):
        unified.use_unified_strength = True

    unified.size = radius
    unified.strength = strength
    return {
        "radius": radius,
        "strength": strength,
        "settings_source": settings_source,
    }


def _sculpt_prepare_active(
    params: dict[str, Any],
    *,
    original_workspace_name: str,
) -> dict[str, Any]:
    global _SCULPT_SESSION
    window = bpy.context.window
    if window is None:
        raise RuntimeError("nenhuma janela Blender ativa")
    if not any(area.type == "VIEW_3D" for area in window.screen.areas):
        raise RuntimeError(
            f"workspace ativo ainda nao possui VIEW_3D: {window.workspace.name} / {window.screen.name}"
        )

    obj = _sculpt_select_mesh(str(params["name"]) if params.get("name") else None)
    window, area, region, _space, _region_3d = _sculpt_context()
    with bpy.context.temp_override(window=window, screen=window.screen, area=area, region=region):
        result = bpy.ops.object.mode_set(mode="SCULPT")
        if result and "FINISHED" in result and bool(params.get("frame_selected", True)):
            try:
                bpy.ops.view3d.view_selected(use_all_regions=False)
            except Exception:
                pass
    if not result or "FINISHED" not in result:
        raise RuntimeError(f"nao foi possivel entrar em Sculpt Mode: {sorted(result or [])}")

    brush_info = _sculpt_set_brush(str(params.get("brush", "DRAW")))
    settings = _sculpt_set_radius_strength(
        int(params.get("radius", 60)),
        float(params.get("strength", 0.25)),
    )
    _SCULPT_SESSION = {
        "object": obj.name,
        "original_workspace": original_workspace_name,
        "sculpt_workspace": window.workspace.name,
        "started_ns": time.time_ns(),
    }
    _redraw_window()
    return {
        "object": obj.name,
        "workspace": window.workspace.name,
        "screen": window.screen.name,
        "original_workspace": original_workspace_name,
        "mode": bpy.context.mode,
        **brush_info,
        **settings,
        "view": _viewport_description(),
    }


def _resolve_sculpt_workspace_name(params: dict[str, Any]) -> str:
    window = bpy.context.window
    if window is None:
        raise RuntimeError("nenhuma janela Blender ativa")

    requested = str(params.get("workspace", "")).strip()
    if requested:
        if requested not in bpy.data.workspaces:
            raise ValueError(f"workspace Sculpt nao encontrado: {requested}")
        return requested

    if any(area.type == "VIEW_3D" for area in window.screen.areas):
        return window.workspace.name

    for fallback in ("Sculpting", "Layout"):
        if fallback in bpy.data.workspaces:
            return fallback
    raise RuntimeError("nenhum workspace Sculpting/Layout disponivel")


def _start_sculpt_prepare_job(task: Task) -> None:
    global _SCULPT_PREPARE_JOB
    if _SCULPT_PREPARE_JOB is not None:
        raise RuntimeError("ja existe sculpt.prepare em andamento")
    if _CAPTURE_JOB is not None:
        raise RuntimeError("workspace.capture_set em andamento; tente sculpt.prepare novamente")

    window = bpy.context.window
    if window is None:
        raise RuntimeError("nenhuma janela Blender ativa")

    requested_workspace_name = _resolve_sculpt_workspace_name(task.request.get("params") or {})
    _SCULPT_PREPARE_JOB = SculptPrepareJob(
        task=task,
        params=task.request.get("params") or {},
        original_workspace_name=window.workspace.name,
        requested_workspace_name=requested_workspace_name,
    )


def _sculpt_prepare_cleanup(job: SculptPrepareJob) -> None:
    global _SCULPT_SESSION
    window = bpy.context.window
    _SCULPT_SESSION = None
    if window is None:
        return
    try:
        if bpy.context.mode == "SCULPT":
            area = next((item for item in window.screen.areas if item.type == "VIEW_3D"), None)
            region = None
            if area is not None:
                region = next((item for item in area.regions if item.type == "WINDOW"), None)
            if area is not None and region is not None:
                with bpy.context.temp_override(window=window, screen=window.screen, area=area, region=region):
                    bpy.ops.object.mode_set(mode="OBJECT")
            else:
                bpy.ops.object.mode_set(mode="OBJECT")
    except Exception:
        pass

    original = bpy.data.workspaces.get(job.original_workspace_name)
    if original is not None:
        try:
            window.workspace = original
            _redraw_window()
        except Exception:
            pass


def _advance_sculpt_prepare_job() -> float:
    global _SCULPT_PREPARE_JOB
    job = _SCULPT_PREPARE_JOB
    if job is None:
        return 0.05

    window = bpy.context.window
    if window is None:
        error = "RuntimeError: janela Blender desapareceu durante sculpt.prepare"
        job.task.response = {"id": job.task.request["id"], "ok": False, "error": error}
        _record_task_history(job.task, ok=False, error=error)
        job.task.done.set()
        _SCULPT_PREPARE_JOB = None
        return 0.05

    try:
        if job.phase == "switch":
            target = bpy.data.workspaces.get(job.requested_workspace_name)
            if target is None:
                raise RuntimeError(f"workspace Sculpt desapareceu: {job.requested_workspace_name}")
            window.workspace = target
            _redraw_window()
            job.phase = "settle"
            job.settle_remaining = _WORKSPACE_CAPTURE_SETTLE_TICKS
            job.last_screen_name = window.screen.name
            return 0.05

        if job.phase == "settle":
            if window.workspace.name != job.requested_workspace_name:
                target = bpy.data.workspaces.get(job.requested_workspace_name)
                if target is None:
                    raise RuntimeError(f"workspace Sculpt desapareceu: {job.requested_workspace_name}")
                window.workspace = target
                _redraw_window()
                job.settle_remaining = _WORKSPACE_CAPTURE_SETTLE_TICKS
                job.last_screen_name = window.screen.name
                return 0.05

            current_screen = window.screen.name
            if current_screen != job.last_screen_name:
                job.last_screen_name = current_screen
                job.settle_remaining = _WORKSPACE_CAPTURE_SETTLE_TICKS
                _redraw_window()
                return 0.05

            if job.settle_remaining > 0:
                job.settle_remaining -= 1
                _redraw_window()
                return 0.05

            job.phase = "prepare"
            return 0.05

        if job.phase == "prepare":
            result = _sculpt_prepare_active(
                job.params,
                original_workspace_name=job.original_workspace_name,
            )
            job.task.response = {"id": job.task.request["id"], "ok": True, "result": result}
            _record_task_history(job.task, ok=True, result=result)
            job.task.done.set()
            _SCULPT_PREPARE_JOB = None
            return 0.05

        if job.phase == "restore_error":
            if window.workspace.name != job.original_workspace_name:
                original = bpy.data.workspaces.get(job.original_workspace_name)
                if original is not None:
                    window.workspace = original
                    _redraw_window()
                    job.settle_remaining = _WORKSPACE_CAPTURE_SETTLE_TICKS
                    job.last_screen_name = window.screen.name
                    return 0.05

            current_screen = window.screen.name
            if current_screen != job.last_screen_name:
                job.last_screen_name = current_screen
                job.settle_remaining = _WORKSPACE_CAPTURE_SETTLE_TICKS
                _redraw_window()
                return 0.05

            if job.settle_remaining > 0:
                job.settle_remaining -= 1
                _redraw_window()
                return 0.05

            error = job.error or "RuntimeError: sculpt.prepare falhou"
            job.task.response = {"id": job.task.request["id"], "ok": False, "error": error}
            _record_task_history(job.task, ok=False, error=error)
            job.task.done.set()
            _SCULPT_PREPARE_JOB = None
            return 0.05

        raise RuntimeError(f"fase de sculpt.prepare invalida: {job.phase}")

    except Exception as exc:
        job.error = f"{type(exc).__name__}: {exc}"
        _sculpt_prepare_cleanup(job)
        job.phase = "restore_error"
        job.settle_remaining = _WORKSPACE_CAPTURE_SETTLE_TICKS
        job.last_screen_name = window.screen.name
        return 0.05



def _sculpt_stroke_element_property_names(operator) -> set[str]:
    fallback = {
        "location",
        "mouse",
        "mouse_event",
        "pressure",
        "size",
        "time",
        "is_start",
    }
    try:
        rna = operator.get_rna_type()
        stroke_property = rna.properties.get("stroke")
        fixed_type = getattr(stroke_property, "fixed_type", None)
        if fixed_type is None:
            return fallback

        names: set[str] = set()
        try:
            for prop in fixed_type.properties:
                identifier = getattr(prop, "identifier", None)
                if identifier and identifier != "rna_type" and not getattr(prop, "is_readonly", False):
                    names.add(str(identifier))
        except Exception:
            try:
                names.update(
                    str(name)
                    for name in fixed_type.properties.keys()
                    if str(name) != "rna_type"
                )
            except Exception:
                pass

        return names or fallback
    except Exception:
        return fallback


def _normalize_sculpt_points(
    points: Any,
    *,
    coordinate_space: str,
    region,
    default_pressure: float,
    radius: int,
    allowed_properties: set[str],
) -> list[dict[str, Any]]:
    if not isinstance(points, list) or len(points) < 1:
        raise ValueError("sculpt.stroke exige lista points com pelo menos 1 ponto")
    if len(points) > 128:
        raise ValueError("sculpt.stroke limita cada stroke a 128 pontos")

    space = str(coordinate_space or "NORMALIZED").upper()
    if space not in {"NORMALIZED", "REGION"}:
        raise ValueError("coordinate_space deve ser NORMALIZED ou REGION")

    normalized: list[dict[str, Any]] = []
    for index, item in enumerate(points):
        if isinstance(item, dict):
            x = float(item["x"])
            y = float(item["y"])
            pressure = float(item.get("pressure", default_pressure))
        elif isinstance(item, (list, tuple)) and len(item) >= 2:
            x = float(item[0])
            y = float(item[1])
            pressure = float(item[2]) if len(item) >= 3 else default_pressure
        else:
            raise ValueError(f"ponto Sculpt invalido no indice {index}")

        if space == "NORMALIZED":
            if not (0.0 <= x <= 1.0 and 0.0 <= y <= 1.0):
                raise ValueError(f"ponto normalizado fora de 0..1 no indice {index}")
            px = x * max(1, region.width - 1)
            py = y * max(1, region.height - 1)
        else:
            px, py = x, y

        if not (0 <= px < region.width and 0 <= py < region.height):
            raise ValueError(
                f"ponto Sculpt fora da VIEW_3D no indice {index}: {(px, py)} "
                f"para {region.width}x{region.height}"
            )

        candidate = {
            "name": "CCSculptStroke",
            "location": (0.0, 0.0, 0.0),
            "mouse": (float(px), float(py)),
            "mouse_event": (float(px), float(py)),
            "pressure": max(0.0, min(1.0, pressure)),
            "size": float(radius),
            "time": float(index) * 0.02,
            "is_start": index == 0,
            "x_tilt": 0.0,
            "y_tilt": 0.0,
            "pen_flip": False,
        }
        element = {
            key: value
            for key, value in candidate.items()
            if key in allowed_properties
        }
        if "mouse" not in element and "mouse_event" not in element:
            raise RuntimeError(
                "OperatorStrokeElement desta versao nao expoe mouse nem mouse_event"
            )
        normalized.append(element)
    return normalized


def _sculpt_checkpoint(label: str) -> Path:
    stage = get_active_stage_id() or "stage"
    filename = sanitize_label(
        f"{stage}-{label}-{time.time_ns()}.blend",
        "sculpt-checkpoint.blend",
    )
    output = safe_runtime_path("checkpoints", filename)
    bpy.ops.wm.save_as_mainfile(filepath=str(output), copy=True)
    return output


def _start_sculpt_finish_job(task: Task) -> None:
    global _SCULPT_FINISH_JOB
    if _SCULPT_FINISH_JOB is not None:
        raise RuntimeError("ja existe sculpt.finish em andamento")
    if _SCULPT_PREPARE_JOB is not None or _CAPTURE_JOB is not None:
        raise RuntimeError("outro job de workspace esta em andamento; tente sculpt.finish novamente")

    window = bpy.context.window
    if window is None:
        raise RuntimeError("nenhuma janela Blender ativa")

    session = dict(_SCULPT_SESSION or {})
    _SCULPT_FINISH_JOB = SculptFinishJob(
        task=task,
        params=task.request.get("params") or {},
        session=session,
        last_screen_name=window.screen.name,
    )


def _advance_sculpt_finish_job() -> float:
    global _SCULPT_FINISH_JOB, _SCULPT_SESSION
    job = _SCULPT_FINISH_JOB
    if job is None:
        return 0.05

    window = bpy.context.window
    if window is None:
        error = "RuntimeError: janela Blender desapareceu durante sculpt.finish"
        job.task.response = {"id": job.task.request["id"], "ok": False, "error": error}
        _record_task_history(job.task, ok=False, error=error)
        job.task.done.set()
        _SCULPT_FINISH_JOB = None
        return 0.05

    try:
        if job.phase == "exit_mode":
            if bpy.context.mode == "SCULPT":
                active = bpy.context.view_layer.objects.active
                if active is not None and not job.session.get("object"):
                    job.session["object"] = active.name
                area, region = None, None
                try:
                    area, region, _space, _region_3d = _view3d_context()
                except Exception:
                    pass
                if area is not None and region is not None:
                    with bpy.context.temp_override(
                        window=window,
                        screen=window.screen,
                        area=area,
                        region=region,
                    ):
                        result = bpy.ops.object.mode_set(mode="OBJECT")
                else:
                    result = bpy.ops.object.mode_set(mode="OBJECT")
                if not result or "FINISHED" not in result:
                    raise RuntimeError(
                        f"nao foi possivel sair de Sculpt Mode: {sorted(result or [])}"
                    )

            _redraw_window()
            job.phase = "settle_object"
            job.settle_remaining = _WORKSPACE_CAPTURE_SETTLE_TICKS
            job.last_screen_name = window.screen.name
            return 0.05

        if job.phase == "settle_object":
            current_screen = window.screen.name
            if current_screen != job.last_screen_name:
                job.last_screen_name = current_screen
                job.settle_remaining = _WORKSPACE_CAPTURE_SETTLE_TICKS
                _redraw_window()
                return 0.05
            if job.settle_remaining > 0:
                job.settle_remaining -= 1
                _redraw_window()
                return 0.05
            job.phase = "switch_workspace"
            return 0.05

        if job.phase == "switch_workspace":
            restore = bool(job.params.get("restore_workspace", True))
            original_workspace = job.session.get("original_workspace")
            if restore and original_workspace:
                target = bpy.data.workspaces.get(str(original_workspace))
                if target is None:
                    raise RuntimeError(
                        f"workspace original nao encontrado: {original_workspace}"
                    )
                window.workspace = target
                _redraw_window()
                job.phase = "settle_workspace"
                job.settle_remaining = _WORKSPACE_CAPTURE_SETTLE_TICKS
                job.last_screen_name = window.screen.name
                return 0.05

            job.phase = "finalize"
            return 0.05

        if job.phase == "settle_workspace":
            original_workspace = str(job.session.get("original_workspace") or "")
            if window.workspace.name != original_workspace:
                target = bpy.data.workspaces.get(original_workspace)
                if target is None:
                    raise RuntimeError(
                        f"workspace original nao encontrado: {original_workspace}"
                    )
                window.workspace = target
                _redraw_window()
                job.settle_remaining = _WORKSPACE_CAPTURE_SETTLE_TICKS
                job.last_screen_name = window.screen.name
                return 0.05

            current_screen = window.screen.name
            if current_screen != job.last_screen_name:
                job.last_screen_name = current_screen
                job.settle_remaining = _WORKSPACE_CAPTURE_SETTLE_TICKS
                _redraw_window()
                return 0.05

            if job.settle_remaining > 0:
                job.settle_remaining -= 1
                _redraw_window()
                return 0.05

            job.phase = "finalize"
            return 0.05

        if job.phase == "finalize":
            restore = bool(job.params.get("restore_workspace", True))
            original_workspace = job.session.get("original_workspace")
            restored_workspace = window.workspace.name
            restored = bool(
                not restore
                or not original_workspace
                or restored_workspace == original_workspace
            )
            if restore and original_workspace and not restored:
                raise RuntimeError(
                    "workspace original nao foi restaurado: "
                    f"esperado={original_workspace!r}, ativo={restored_workspace!r}"
                )

            result = {
                "object": job.session.get("object"),
                "mode": bpy.context.mode,
                "restored_workspace": restored_workspace,
                "screen": window.screen.name,
                "original_workspace": original_workspace,
                "restored_original_workspace": restored,
                "synchronization": {
                    "strategy": "timer-yield",
                    "settle_ticks": _WORKSPACE_CAPTURE_SETTLE_TICKS,
                },
            }
            _SCULPT_SESSION = None
            job.task.response = {"id": job.task.request["id"], "ok": True, "result": result}
            _record_task_history(job.task, ok=True, result=result)
            job.task.done.set()
            _SCULPT_FINISH_JOB = None
            return 0.05

        raise RuntimeError(f"fase de sculpt.finish invalida: {job.phase}")

    except Exception as exc:
        error = f"{type(exc).__name__}: {exc}"
        job.task.response = {"id": job.task.request["id"], "ok": False, "error": error}
        _record_task_history(job.task, ok=False, error=error)
        job.task.done.set()
        _SCULPT_FINISH_JOB = None
        return 0.05



def _sculpt_stroke(params: dict[str, Any]) -> dict[str, Any]:
    if bpy.context.mode != "SCULPT":
        raise RuntimeError("sculpt.stroke exige Sculpt Mode; execute sculpt.prepare primeiro")

    active = bpy.context.view_layer.objects.active
    if active is None or active.type != "MESH":
        raise RuntimeError("sculpt.stroke exige MESH ativo")

    brush = str(params.get("brush", "")).upper()
    brush_info = _sculpt_set_brush(brush) if brush else {
        "brush": None,
        "tool_id": _sculpt_active_tool_id(),
        "operator": [],
    }

    radius = max(5, min(500, int(params.get("radius", 60))))
    strength = max(0.001, min(1.0, float(params.get("strength", 0.25))))
    settings = _sculpt_set_radius_strength(radius, strength)

    window, area, region, _space, _region_3d = _sculpt_context()
    operator = bpy.ops.sculpt.brush_stroke
    stroke_element_properties = _sculpt_stroke_element_property_names(operator)
    points = _normalize_sculpt_points(
        params.get("points"),
        coordinate_space=str(params.get("coordinate_space", "NORMALIZED")),
        region=region,
        default_pressure=float(params.get("pressure", 1.0)),
        radius=radius,
        allowed_properties=stroke_element_properties,
    )

    mode = str(params.get("mode", "NORMAL")).upper()
    if mode not in _SCULPT_STROKE_MODES:
        raise ValueError(f"modo de stroke Sculpt nao permitido: {mode}")

    checkpoint_path = None
    if bool(params.get("checkpoint", True)):
        checkpoint_path = _sculpt_checkpoint(str(params.get("label", "stroke")))

    before = None
    if bool(params.get("capture_before", True)):
        before_name = params.get("before_name") or f"sculpt-before-{time.time_ns()}.png"
        before = _viewport_capture({
            "filename": str(before_name)
        })

    rna = operator.get_rna_type()
    available = set(rna.properties.keys())
    kwargs: dict[str, Any] = {
        "stroke": points,
        "mode": mode if mode in {"NORMAL", "INVERT"} or "brush_toggle" not in available else "NORMAL",
    }
    if "override_location" in available:
        kwargs["override_location"] = True
    if "ignore_background_click" in available:
        kwargs["ignore_background_click"] = True
    if "brush_toggle" in available and mode in {"SMOOTH", "ERASE", "MASK"}:
        kwargs["brush_toggle"] = mode
    elif "brush_toggle" not in available and mode in {"SMOOTH", "ERASE"}:
        kwargs["mode"] = mode
    elif mode == "MASK":
        raise RuntimeError("esta versao do Blender nao expoe brush_toggle=MASK para sculpt.stroke")

    with bpy.context.temp_override(window=window, screen=window.screen, area=area, region=region):
        result = operator(**kwargs)

    if not result or "FINISHED" not in result:
        raise RuntimeError(f"Blender recusou sculpt stroke: {sorted(result or [])}")

    bpy.context.view_layer.update()
    area.tag_redraw()
    return {
        "object": active.name,
        "brush": brush_info.get("brush"),
        "tool_id": brush_info.get("tool_id"),
        **settings,
        "mode": mode,
        "coordinate_space": str(params.get("coordinate_space", "NORMALIZED")).upper(),
        "point_count": len(points),
        "stroke_element_properties": sorted(stroke_element_properties),
        "operator": sorted(result),
        "checkpoint": str(checkpoint_path) if checkpoint_path else None,
        "before_capture": before,
        "post_capture_recommended": True,
        "post_capture_reason": "o framebuffer precisa de um ciclo do event loop apos o stroke",
    }


def _recipe_status_snapshot() -> dict[str, Any]:
    if _RECIPE_RUN_JOB is not None:
        job = _RECIPE_RUN_JOB
        current_step = None
        if job.step_index < len(job.plan.get("steps", [])):
            step = job.plan["steps"][job.step_index]
            current_step = {"index": job.step_index, "id": step.get("id"), "action": step.get("action")}
        return {
            "state": "running",
            "run_id": job.run_id,
            "recipe_id": job.plan.get("recipe_id"),
            "recipe_version": job.plan.get("recipe_version"),
            "plan_hash": job.plan.get("plan_hash"),
            "stage_id": job.stage_id,
            "phase": job.phase,
            "current_step": current_step,
            "completed_steps": len(job.results),
            "failed_steps": job.failed_steps,
            "captures": len(job.captures),
            "started_ns": job.started_ns,
        }
    return dict(_RECIPE_LAST_STATUS or {"state": "idle"})


def _recipe_record_step(
    job: RecipeRunJob,
    step: dict[str, Any],
    *,
    ok: bool,
    result: Any = None,
    error: str | None = None,
    checkpoint: Any = None,
) -> None:
    payload = {
        "recipe_id": job.plan["recipe_id"],
        "recipe_version": job.plan["recipe_version"],
        "recipe_hash": job.plan["recipe_hash"],
        "plan_hash": job.plan["plan_hash"],
        "variant": job.plan.get("variant"),
        "run_id": job.run_id,
        "step_index": int(step["index"]),
        "step_id": step["id"],
        "step_action": step["action"],
        "step_params": step.get("params", {}),
        "checkpoint": checkpoint,
    }
    tags = ["recipe", job.plan["recipe_id"], step["id"], *(step.get("tags") or [])]
    record_event(
        action="recipe.step",
        params=payload,
        result=result,
        ok=ok,
        error=error,
        tags=tags,
        stage_id=job.stage_id,
    )


def _recipe_configure_capture(capture: dict[str, Any]) -> None:
    _viewport_set_shading({"type": capture.get("shading", "SOLID")})
    _viewport_set_view({
        "preset": capture.get("preset", "THREE_QUARTER"),
        "frame_all": bool(capture.get("frame_all", True)),
    })
    _redraw_window()


def _recipe_capture(capture: dict[str, Any], *, prefix: str) -> dict[str, Any]:
    filename = str(capture.get("filename") or f"{capture.get('name', 'capture')}.png")
    filename = sanitize_label(f"{prefix}-{filename}", "recipe-capture.png")
    if not filename.lower().endswith(".png"):
        filename += ".png"
    result = _viewport_capture({"filename": filename})
    return {
        "name": capture.get("name"),
        "preset": capture.get("preset"),
        "shading": capture.get("shading"),
        **result,
    }


def _recipe_write_initial_files(recipe: dict[str, Any], plan: dict[str, Any], run_id: str) -> dict[str, str]:
    recipe_path = attachment_output_path(f"{run_id}-recipe.json")
    plan_path = attachment_output_path(f"{run_id}-plan.json")
    recipe_path.write_text(json.dumps(recipe, ensure_ascii=False, indent=2), encoding="utf-8")
    plan_path.write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"recipe": str(recipe_path), "plan": str(plan_path)}


def _recipe_finalize(job: RecipeRunJob) -> dict[str, Any]:
    global _RECIPE_LAST_STATUS
    criteria = job.plan.get("criteria", {})
    required_objects = list(criteria.get("required_objects", []))
    missing_objects = [name for name in required_objects if bpy.data.objects.get(str(name)) is None]
    min_captures = int(criteria.get("min_captures", 0))
    max_failed_steps = int(criteria.get("max_failed_steps", 0))
    checks = {
        "required_objects": {
            "passed": not missing_objects,
            "required": required_objects,
            "missing": missing_objects,
        },
        "min_captures": {
            "passed": len(job.captures) >= min_captures,
            "required": min_captures,
            "actual": len(job.captures),
        },
        "max_failed_steps": {
            "passed": job.failed_steps <= max_failed_steps,
            "maximum": max_failed_steps,
            "actual": job.failed_steps,
        },
    }
    criteria_passed = all(item["passed"] for item in checks.values())
    status = "passed" if criteria_passed and not job.fatal_error else "failed"

    receipt = {
        "version": 1,
        "action": "recipe.run",
        "run_id": job.run_id,
        "status": status,
        "recipe_id": job.plan["recipe_id"],
        "recipe_version": job.plan["recipe_version"],
        "recipe_hash": job.plan["recipe_hash"],
        "plan_hash": job.plan["plan_hash"],
        "variant": job.plan.get("variant"),
        "parameters": job.plan.get("parameters", {}),
        "stage_id": job.stage_id,
        "previous_stage_id": job.previous_stage_id,
        "started_ns": job.started_ns,
        "finished_ns": time.time_ns(),
        "steps": job.results,
        "captures": job.captures,
        "failed_steps": job.failed_steps,
        "fatal_error": job.fatal_error,
        "criteria": checks,
        "criteria_passed": criteria_passed,
    }
    receipt["receipt_hash"] = recipe_hash(receipt)
    receipt_path = attachment_output_path(f"{job.run_id}-receipt.json")
    receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2), encoding="utf-8")

    restored_stage = None
    if job.restore_stage and job.previous_stage_id:
        restored_stage = set_active_stage(job.previous_stage_id)["stage_id"]

    result = {
        "run_id": job.run_id,
        "status": status,
        "passed": status == "passed",
        "recipe_id": job.plan["recipe_id"],
        "recipe_version": job.plan["recipe_version"],
        "recipe_hash": job.plan["recipe_hash"],
        "plan_hash": job.plan["plan_hash"],
        "stage_id": job.stage_id,
        "restored_stage_id": restored_stage,
        "completed_steps": len(job.results),
        "failed_steps": job.failed_steps,
        "captures": job.captures,
        "criteria": checks,
        "criteria_passed": criteria_passed,
        "receipt": str(receipt_path),
        "receipt_hash": receipt["receipt_hash"],
        "fatal_error": job.fatal_error,
    }
    _RECIPE_LAST_STATUS = {
        "state": "finished",
        **{key: result[key] for key in (
            "run_id", "status", "passed", "recipe_id", "recipe_version",
            "plan_hash", "stage_id", "completed_steps", "failed_steps",
            "criteria_passed", "receipt", "receipt_hash",
        )},
    }
    return result


def _start_recipe_run_job(task: Task) -> None:
    global _RECIPE_RUN_JOB, _RECIPE_LAST_STATUS
    if _RECIPE_RUN_JOB is not None:
        raise RuntimeError("ja existe recipe.run em andamento")
    if _CAPTURE_JOB is not None or _SCULPT_PREPARE_JOB is not None or _SCULPT_FINISH_JOB is not None:
        raise RuntimeError("outro job visual esta em andamento; tente recipe.run novamente")

    params = task.request.get("params") or {}
    recipe = params.get("recipe")
    planned = plan_recipe(
        recipe,
        variant=str(params["variant"]) if params.get("variant") else None,
        overrides=params.get("overrides") or {},
    )
    plan = planned["plan"]

    if bool(params.get("dry_run", False)):
        result = {
            "status": "dry_run",
            "passed": True,
            "plan": plan,
            "summary": planned["summary"],
        }
        task.response = {"id": task.request["id"], "ok": True, "result": result}
        _record_task_history(task, ok=True, result=result)
        task.done.set()
        _RECIPE_LAST_STATUS = {
            "state": "dry_run",
            "recipe_id": plan["recipe_id"],
            "recipe_version": plan["recipe_version"],
            "plan_hash": plan["plan_hash"],
        }
        return

    previous_stage_id = get_active_stage_id()
    if bool(params.get("create_stage", True)):
        stage = create_stage(
            f"Recipe {plan['recipe_id']} {plan['recipe_version']}",
            tags=["recipe", plan["recipe_id"], *plan.get("tags", [])],
        )
    else:
        stage = ensure_stage()
    stage_id = str(stage["stage_id"])
    run_id = sanitize_label(
        f"recipe-{plan['recipe_id']}-{plan['recipe_version']}-{time.time_ns()}",
        f"recipe-{time.time_ns()}",
    )

    validated = validate_recipe(recipe)
    files = _recipe_write_initial_files(validated["recipe"], plan, run_id)
    record_event(
        action="recipe.start",
        params={
            "run_id": run_id,
            "recipe_id": plan["recipe_id"],
            "recipe_version": plan["recipe_version"],
            "recipe_hash": plan["recipe_hash"],
            "plan_hash": plan["plan_hash"],
            "variant": plan.get("variant"),
            "parameters": plan.get("parameters", {}),
        },
        result={"files": files},
        ok=True,
        tags=["recipe", plan["recipe_id"], "start"],
        stage_id=stage_id,
    )

    _RECIPE_RUN_JOB = RecipeRunJob(
        task=task,
        plan=plan,
        run_id=run_id,
        stage_id=stage_id,
        previous_stage_id=previous_stage_id,
        restore_stage=bool(params.get("restore_stage", False)),
    )
    _RECIPE_LAST_STATUS = _recipe_status_snapshot()


def _advance_recipe_run_job() -> float:
    global _RECIPE_RUN_JOB
    job = _RECIPE_RUN_JOB
    if job is None:
        return 0.05

    try:
        steps = job.plan["steps"]
        views = job.plan.get("validation_views", [])

        if job.phase == "step":
            if job.fatal_error or job.step_index >= len(steps):
                job.phase = "validation" if not job.fatal_error else "finalize"
                return 0.05

            step = steps[job.step_index]
            checkpoint = None
            if bool(step.get("checkpoint_before", False)):
                checkpoint = _dispatch("checkpoint.create", {
                    "label": sanitize_label(
                        f"{job.run_id}-{step.get('checkpoint_label') or step['id']}",
                        f"{job.run_id}-checkpoint",
                    )
                })

            try:
                result = _dispatch(step["action"], step.get("params") or {})
                row = {
                    "index": step["index"],
                    "id": step["id"],
                    "action": step["action"],
                    "ok": True,
                    "result": result,
                    "checkpoint": checkpoint,
                }
                job.results.append(row)
                _recipe_record_step(job, step, ok=True, result=result, checkpoint=checkpoint)
            except Exception as exc:
                error = f"{type(exc).__name__}: {exc}"
                row = {
                    "index": step["index"],
                    "id": step["id"],
                    "action": step["action"],
                    "ok": False,
                    "error": error,
                    "checkpoint": checkpoint,
                }
                job.results.append(row)
                job.failed_steps += 1
                _recipe_record_step(job, step, ok=False, error=error, checkpoint=checkpoint)
                if not bool(step.get("continue_on_error", False)):
                    job.fatal_error = f"step {step['id']} falhou: {error}"
                    job.step_index += 1
                    job.phase = "finalize"
                    return 0.05

            capture = step.get("capture_after")
            job.step_index += 1
            if capture:
                job.current_capture = {
                    **capture,
                    "_prefix": f"{job.run_id}-step-{step['index']:02d}-{step['id']}",
                    "_source": f"step:{step['id']}",
                }
                _recipe_configure_capture(capture)
                job.phase = "capture_settle"
                job.settle_remaining = _WORKSPACE_CAPTURE_SETTLE_TICKS
                return 0.05
            return 0.05

        if job.phase == "capture_settle":
            if job.settle_remaining > 0:
                job.settle_remaining -= 1
                _redraw_window()
                return 0.05
            job.phase = "capture"
            return 0.05

        if job.phase == "capture":
            capture = job.current_capture or {}
            result = _recipe_capture(capture, prefix=str(capture.get("_prefix", job.run_id)))
            result["source"] = capture.get("_source")
            job.captures.append(result)
            record_event(
                action="recipe.capture",
                params={
                    "run_id": job.run_id,
                    "recipe_id": job.plan["recipe_id"],
                    "recipe_version": job.plan["recipe_version"],
                    "source": capture.get("_source"),
                    "capture": {key: value for key, value in capture.items() if not key.startswith("_")},
                },
                result=result,
                ok=True,
                tags=["recipe", job.plan["recipe_id"], "capture"],
                stage_id=job.stage_id,
            )
            job.current_capture = None
            job.phase = "step" if job.step_index < len(steps) and not job.fatal_error else (
                "validation" if not job.fatal_error else "finalize"
            )
            return 0.05

        if job.phase == "validation":
            if job.view_index >= len(views):
                job.phase = "finalize"
                return 0.05
            view = views[job.view_index]
            job.current_capture = {
                **view,
                "_prefix": f"{job.run_id}-validation-{job.view_index:02d}-{view['name']}",
                "_source": f"validation:{view['name']}",
            }
            job.view_index += 1
            _recipe_configure_capture(view)
            job.phase = "validation_settle"
            job.settle_remaining = _WORKSPACE_CAPTURE_SETTLE_TICKS
            return 0.05

        if job.phase == "validation_settle":
            if job.settle_remaining > 0:
                job.settle_remaining -= 1
                _redraw_window()
                return 0.05
            job.phase = "validation_capture"
            return 0.05

        if job.phase == "validation_capture":
            capture = job.current_capture or {}
            result = _recipe_capture(capture, prefix=str(capture.get("_prefix", job.run_id)))
            result["source"] = capture.get("_source")
            job.captures.append(result)
            record_event(
                action="recipe.capture",
                params={
                    "run_id": job.run_id,
                    "recipe_id": job.plan["recipe_id"],
                    "recipe_version": job.plan["recipe_version"],
                    "source": capture.get("_source"),
                },
                result=result,
                ok=True,
                tags=["recipe", job.plan["recipe_id"], "validation", "capture"],
                stage_id=job.stage_id,
            )
            job.current_capture = None
            job.phase = "validation"
            return 0.05

        if job.phase == "finalize":
            result = _recipe_finalize(job)
            record_event(
                action="recipe.finish",
                params={
                    "run_id": job.run_id,
                    "recipe_id": job.plan["recipe_id"],
                    "recipe_version": job.plan["recipe_version"],
                    "plan_hash": job.plan["plan_hash"],
                },
                result=result,
                ok=bool(result["passed"]),
                error=None if result["passed"] else result.get("fatal_error") or "recipe criteria failed",
                tags=["recipe", job.plan["recipe_id"], "finish"],
                stage_id=job.stage_id,
            )
            job.task.response = {"id": job.task.request["id"], "ok": True, "result": result}
            _record_task_history(job.task, ok=True, result=result)
            job.task.done.set()
            _RECIPE_RUN_JOB = None
            return 0.05

        raise RuntimeError(f"fase de recipe.run invalida: {job.phase}")

    except Exception as exc:
        error = f"{type(exc).__name__}: {exc}"
        job.fatal_error = error
        try:
            result = _recipe_finalize(job)
            job.task.response = {"id": job.task.request["id"], "ok": True, "result": result}
            _record_task_history(job.task, ok=True, result=result)
        except Exception as finalize_exc:
            final_error = f"{error}; finalize={type(finalize_exc).__name__}: {finalize_exc}"
            job.task.response = {"id": job.task.request["id"], "ok": False, "error": final_error}
            _record_task_history(job.task, ok=False, error=final_error)
        job.task.done.set()
        _RECIPE_RUN_JOB = None
        return 0.05


def _dismiss_modal_event() -> dict[str, Any]:
    window = bpy.context.window
    if window is None:
        raise RuntimeError("nenhuma janela Blender ativa")
    before = _modal_operator_names(window)
    x = int(window.width // 2)
    y = int(window.height // 2)
    _event_simulate("ESC", "PRESS", {"x": x, "y": y})
    _event_simulate("ESC", "RELEASE", {"x": x, "y": y})
    return {"queued": True, "modal_before": before}


def _dismiss_startup_modal() -> None:
    if os.environ.get("CC_BLENDER_KEEP_SPLASH") == "1":
        return None
    try:
        _dismiss_modal_event()
    except Exception as exc:
        print(f"[Carro Chefe Blender Agent] não foi possível fechar splash automaticamente: {exc}")
    return None


def _ui_click(params: dict[str, Any]) -> dict[str, Any]:
    event_type = _MOUSE_BUTTONS[str(params.get("button", "left"))]
    _event_simulate("MOUSEMOVE", "NOTHING", params)
    _event_simulate(event_type, "PRESS", params)
    _event_simulate(event_type, "RELEASE", params)
    return {"queued": True, "button": params.get("button", "left"), "x": int(params["x"]), "y": int(params["y"])}


def _ui_drag(params: dict[str, Any]) -> dict[str, Any]:
    x1, y1 = int(params["x1"]), int(params["y1"])
    x2, y2 = int(params["x2"]), int(params["y2"])
    steps = max(1, min(120, int(params.get("steps", 18))))
    event_type = _MOUSE_BUTTONS[str(params.get("button", "left"))]
    base = {k: bool(params.get(k, False)) for k in ("shift", "ctrl", "alt")}

    _event_simulate("MOUSEMOVE", "NOTHING", {**base, "x": x1, "y": y1})
    _event_simulate(event_type, "PRESS", {**base, "x": x1, "y": y1})
    for index in range(1, steps + 1):
        t = index / steps
        x = round(x1 + (x2 - x1) * t)
        y = round(y1 + (y2 - y1) * t)
        _event_simulate("MOUSEMOVE", "NOTHING", {**base, "x": x, "y": y})
    _event_simulate(event_type, "RELEASE", {**base, "x": x2, "y": y2})
    return {"queued": True, "button": params.get("button", "left"), "from": [x1, y1], "to": [x2, y2], "steps": steps}


def _dispatch(action: str, params: dict[str, Any]) -> dict[str, Any]:
    if action == "health":
        return {
            "protocol": PROTOCOL_VERSION,
            "blender": bpy.app.version_string,
            "pid": os.getpid(),
            "file": bpy.data.filepath or None,
            "event_simulation": hasattr(bpy.context.window, "event_simulate") if bpy.context.window else False,
            "modal_operators": _modal_operator_names(bpy.context.window) if bpy.context.window else [],
            "view3d": _view3d_snapshot() if bpy.context.window and any(a.type == "VIEW_3D" for a in bpy.context.window.screen.areas) else None,
            "active_stage_id": get_active_stage_id(),
        }

    if action == "recipe.validate":
        return validate_recipe(params.get("recipe"))

    if action == "recipe.plan":
        return plan_recipe(
            params.get("recipe"),
            variant=str(params["variant"]) if params.get("variant") else None,
            overrides=params.get("overrides") or {},
        )

    if action == "recipe.status":
        return _recipe_status_snapshot()

    if action == "recipe.run":
        raise RuntimeError("recipe.run deve ser executado pelo scheduler assincrono")

    if action == "sculpt.status":
        return _sculpt_status()

    if action == "sculpt.prepare":
        raise RuntimeError("sculpt.prepare deve ser executado pelo scheduler assincrono")

    if action == "sculpt.stroke":
        return _sculpt_stroke(params)

    if action == "sculpt.finish":
        raise RuntimeError("sculpt.finish deve ser executado pelo scheduler assincrono")

    if action == "workspace.list":
        return _workspace_list()

    if action == "workspace.describe":
        return _workspace_describe(params)

    if action == "workspace.capture_set":
        raise RuntimeError("workspace.capture_set deve ser executado pelo scheduler assíncrono")

    if action == "history.stage.create":
        metadata = create_stage(
            str(params.get("label", "stage")),
            stage_id=str(params["stage_id"]) if params.get("stage_id") else None,
            previous_stage_id=str(params["previous_stage_id"]) if params.get("previous_stage_id") else None,
            activate=bool(params.get("activate", True)),
            tags=params.get("tags") or [],
        )
        record_event(
            action="history.stage.create",
            params={
                "label": metadata["label"],
                "previous_stage_id": metadata.get("previous_stage_id"),
            },
            result={"stage_id": metadata["stage_id"]},
            ok=True,
            stage_id=str(metadata["stage_id"]),
            tags=["history", "stage"],
        )
        return metadata

    if action == "history.stage.list":
        return {
            "active_stage_id": get_active_stage_id(),
            "stages": list_stages(limit=int(params.get("limit", 100))),
        }

    if action == "history.stage.activate":
        metadata = set_active_stage(str(params["stage_id"]))
        record_event(
            action="history.stage.activate",
            params={"stage_id": metadata["stage_id"]},
            result={"active": True},
            ok=True,
            stage_id=str(metadata["stage_id"]),
            tags=["history", "stage"],
        )
        return metadata

    if action == "history.stage.describe":
        return describe_stage(
            str(params["stage_id"]) if params.get("stage_id") else None,
            recent=int(params.get("recent", 20)),
        )

    if action == "history.search":
        return search_events(
            query=str(params["query"]) if params.get("query") is not None else None,
            stage_id=str(params["stage_id"]) if params.get("stage_id") else None,
            action=str(params["action"]) if params.get("action") else None,
            since=str(params["since"]) if params.get("since") else None,
            until=str(params["until"]) if params.get("until") else None,
            success=bool(params["success"]) if params.get("success") is not None else None,
            has_attachment=bool(params["has_attachment"]) if params.get("has_attachment") is not None else None,
            tags=params.get("tags") or [],
            limit=int(params.get("limit", 50)),
        )

    if action == "history.note":
        return record_note(
            str(params.get("text", "")),
            tags=params.get("tags") or [],
            stage_id=str(params["stage_id"]) if params.get("stage_id") else None,
        )

    if action == "viewport.describe":
        return _viewport_description()

    if action == "viewport.set_view":
        return _viewport_set_view(params)

    if action == "viewport.frame_all":
        return _viewport_frame_all()

    if action == "viewport.set_shading":
        return _viewport_set_shading(params)

    if action == "viewport.capture":
        return _viewport_capture(params)

    if action == "ui.window":
        window = bpy.context.window
        if window is None:
            raise RuntimeError("nenhuma janela Blender ativa")
        return {"width": int(window.width), "height": int(window.height)}

    if action == "ui.view3d":
        return _view3d_snapshot()

    if action == "ui.dismiss_modal":
        return _dismiss_modal_event()

    if action == "ui.event":
        event_type = str(params["type"]).upper()
        value = str(params.get("value", "NOTHING")).upper()
        _event_simulate(event_type, value, params)
        return {"queued": True, "type": event_type, "value": value}

    if action == "ui.click":
        return _ui_click(params)

    if action == "ui.drag":
        return _ui_drag(params)

    if action == "ui.orbit":
        view = _view3d_snapshot()
        dx = max(-500, min(500, int(params.get("dx", 120))))
        dy = max(-500, min(500, int(params.get("dy", 60))))
        x1, y1 = view["center_x"], view["center_y"]
        x2 = max(view["x"] + 4, min(view["x"] + view["width"] - 4, x1 + dx))
        y2 = max(view["y"] + 4, min(view["y"] + view["height"] - 4, y1 + dy))
        result = _ui_drag({
            "x1": x1,
            "y1": y1,
            "x2": x2,
            "y2": y2,
            "button": "middle",
            "steps": max(4, min(60, int(params.get("steps", 18)))),
        })
        result["view3d"] = view
        return result

    if action == "ui.wheel":
        steps = int(params.get("steps", 0))
        if steps == 0 or abs(steps) > 20:
            raise ValueError("steps deve estar entre -20 e 20, exceto zero")
        window = bpy.context.window
        x = int(params["x"]) if params.get("x") is not None else int(window.width // 2)
        y = int(params["y"]) if params.get("y") is not None else int(window.height // 2)
        event_type = "WHEELUPMOUSE" if steps > 0 else "WHEELDOWNMOUSE"
        for _ in range(abs(steps)):
            _event_simulate(event_type, "PRESS", {"x": x, "y": y})
        return {"queued": True, "steps": steps, "x": x, "y": y}

    if action in {"scene.summary", "object.list"}:
        objects = [_object_snapshot(obj) for obj in bpy.context.scene.objects]
        return {
            "scene": bpy.context.scene.name,
            "active": bpy.context.view_layer.objects.active.name if bpy.context.view_layer.objects.active else None,
            "objects": objects,
        }

    if action == "object.select":
        name = str(params["name"])
        obj = _selected_object(name)
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        return _object_snapshot(obj)

    if action == "object.add_primitive":
        kind = str(params.get("kind", "cube"))
        operator = _PRIMITIVES.get(kind)
        if operator is None:
            raise ValueError(f"primitiva não permitida: {kind}")
        location = _vec3(params.get("location", [0, 0, 0]), "location")
        operator(location=location)
        obj = bpy.context.object
        if params.get("name"):
            obj.name = str(params["name"])[:63]
        if params.get("scale") is not None:
            obj.scale = _vec3(params["scale"], "scale")
        return _object_snapshot(obj)

    if action == "object.add_mesh":
        vertices = params.get("vertices", [])
        faces = params.get("faces", [])
        if not isinstance(vertices, list) or not isinstance(faces, list):
            raise ValueError("vertices/faces devem ser listas")
        if len(vertices) > 50000 or len(faces) > 100000:
            raise ValueError("mesh excede limite seguro")
        verts = [_vec3(v, "vertex") for v in vertices]
        clean_faces = [tuple(int(i) for i in face) for face in faces]
        mesh = bpy.data.meshes.new(str(params.get("name", "AgentMesh"))[:63] + "Mesh")
        mesh.from_pydata(verts, [], clean_faces)
        mesh.update()
        obj = bpy.data.objects.new(str(params.get("name", "AgentMesh"))[:63], mesh)
        bpy.context.collection.objects.link(obj)
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        return _object_snapshot(obj)

    if action == "object.transform":
        obj = _selected_object(str(params["name"]))
        if "location" in params:
            obj.location = _vec3(params["location"], "location")
        if "scale" in params:
            obj.scale = _vec3(params["scale"], "scale")
        if "rotation_deg" in params:
            obj.rotation_euler = tuple(math.radians(v) for v in _vec3(params["rotation_deg"], "rotation_deg"))
        return _object_snapshot(obj)

    if action == "object.duplicate":
        source = _selected_object(str(params["name"]))
        clone = source.copy()
        if source.data is not None:
            clone.data = source.data.copy()
        clone.name = str(params.get("new_name", f"{source.name}_copy"))[:63]
        bpy.context.collection.objects.link(clone)
        return _object_snapshot(clone)

    if action == "object.delete":
        obj = _selected_object(str(params["name"]))
        name = obj.name
        bpy.data.objects.remove(obj, do_unlink=True)
        return {"deleted": name}

    if action == "object.shade_smooth":
        obj = _selected_object(str(params["name"]))
        if obj.type != "MESH":
            raise ValueError("shade smooth exige mesh")
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
        return _object_snapshot(obj)

    if action == "modifier.add":
        obj = _selected_object(str(params["name"]))
        modifier_type = str(params["type"]).upper()
        if modifier_type not in _MODIFIER_PROPERTIES:
            raise ValueError(f"modifier não permitido: {modifier_type}")
        modifier = obj.modifiers.new(str(params.get("modifier_name", modifier_type.title()))[:63], modifier_type)
        for key, value in dict(params.get("properties", {})).items():
            if key not in _MODIFIER_PROPERTIES[modifier_type]:
                raise ValueError(f"propriedade não permitida para {modifier_type}: {key}")
            setattr(modifier, key, value)
        return {"name": modifier.name, "type": modifier.type}

    if action == "material.simple":
        obj = _selected_object(str(params["name"]))
        mat = bpy.data.materials.get(str(params.get("material_name", f"{obj.name}_Material"))) or bpy.data.materials.new(
            str(params.get("material_name", f"{obj.name}_Material"))
        )
        mat.use_nodes = True
        principled = mat.node_tree.nodes.get("Principled BSDF")
        color = params.get("base_color", [0.8, 0.8, 0.8, 1.0])
        if len(color) != 4:
            raise ValueError("base_color deve ter RGBA")
        principled.inputs["Base Color"].default_value = tuple(float(v) for v in color)
        if "roughness" in params:
            principled.inputs["Roughness"].default_value = float(params["roughness"])
        if "metallic" in params:
            principled.inputs["Metallic"].default_value = float(params["metallic"])
        if obj.data and hasattr(obj.data, "materials"):
            if obj.data.materials:
                obj.data.materials[0] = mat
            else:
                obj.data.materials.append(mat)
        return {"material": mat.name}

    if action == "camera.orbit":
        target = Vector(_vec3(params.get("target", [0, 0, 0]), "target"))
        distance = max(0.05, float(params.get("distance", 5.0)))
        azimuth = math.radians(float(params.get("azimuth_deg", 45.0)))
        elevation = math.radians(float(params.get("elevation_deg", 25.0)))
        camera_name = str(params.get("name", "AgentCamera"))[:63]
        camera = bpy.data.objects.get(camera_name)
        if camera is None:
            data = bpy.data.cameras.new(camera_name + "Data")
            camera = bpy.data.objects.new(camera_name, data)
            bpy.context.collection.objects.link(camera)
        offset = Vector((
            distance * math.cos(elevation) * math.cos(azimuth),
            distance * math.cos(elevation) * math.sin(azimuth),
            distance * math.sin(elevation),
        ))
        camera.location = target + offset
        camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
        bpy.context.scene.camera = camera
        return _object_snapshot(camera)

    if action == "render.still":
        filename = str(params.get("filename", "render.png"))
        if not filename.lower().endswith(".png"):
            filename += ".png"
        output = safe_runtime_path("renders", filename)
        scene = bpy.context.scene
        if scene.camera is None:
            raise RuntimeError("scene não possui câmera")
        scene.render.filepath = str(output)
        scene.render.image_settings.file_format = "PNG"
        if "resolution_x" in params:
            scene.render.resolution_x = max(64, min(4096, int(params["resolution_x"])))
        if "resolution_y" in params:
            scene.render.resolution_y = max(64, min(4096, int(params["resolution_y"])))
        bpy.ops.render.render(write_still=True)
        return {"path": str(output)}

    if action == "checkpoint.create":
        label = str(params.get("label", f"checkpoint-{time.time_ns()}"))
        output = safe_runtime_path("checkpoints", label if label.lower().endswith(".blend") else f"{label}.blend")
        bpy.ops.wm.save_as_mainfile(filepath=str(output), copy=True)
        return {"path": str(output)}

    if action == "export.glb":
        filename = str(params.get("filename", "model.glb"))
        if not filename.lower().endswith(".glb"):
            filename += ".glb"
        output = safe_runtime_path("exports", filename)
        bpy.ops.export_scene.gltf(
            filepath=str(output),
            export_format="GLB",
            use_selection=bool(params.get("selection_only", False)),
        )
        return {"path": str(output)}

    if action == "export.obj":
        filename = str(params.get("filename", "model.obj"))
        if not filename.lower().endswith(".obj"):
            filename += ".obj"
        output = safe_runtime_path("exports", filename)
        selected = bool(params.get("selection_only", False))
        if hasattr(bpy.ops.wm, "obj_export"):
            bpy.ops.wm.obj_export(filepath=str(output), export_selected_objects=selected)
        elif hasattr(bpy.ops.export_scene, "obj"):
            bpy.ops.export_scene.obj(filepath=str(output), use_selection=selected)
        else:
            raise RuntimeError("export OBJ não disponível nesta versão do Blender")
        return {"path": str(output)}

    raise ValueError(f"action sem dispatcher: {action}")


def _record_task_history(task: Task, *, ok: bool, result: Any = None, error: str | None = None) -> None:
    action = str(task.request.get("action", ""))
    if action.startswith("history."):
        return
    try:
        record_event(
            action=action,
            params=task.request.get("params") or {},
            result=result,
            ok=ok,
            error=error,
            request_id=str(task.request.get("id") or ""),
        )
    except Exception as exc:
        print(f"[Carro Chefe Blender Agent] history warning: {type(exc).__name__}: {exc}")


def _drain_queue() -> float:
    if _CAPTURE_JOB is not None:
        return _advance_workspace_capture_job()
    if _SCULPT_PREPARE_JOB is not None:
        return _advance_sculpt_prepare_job()
    if _SCULPT_FINISH_JOB is not None:
        return _advance_sculpt_finish_job()
    if _RECIPE_RUN_JOB is not None:
        return _advance_recipe_run_job()

    for _ in range(10):
        try:
            task = _TASKS.get_nowait()
        except queue.Empty:
            break

        if task.request.get("action") == "workspace.capture_set":
            try:
                _start_workspace_capture_job(task)
            except Exception as exc:
                error = f"{type(exc).__name__}: {exc}"
                task.response = {"id": task.request["id"], "ok": False, "error": error}
                _record_task_history(task, ok=False, error=error)
                task.done.set()
            break

        if task.request.get("action") == "sculpt.prepare":
            try:
                _start_sculpt_prepare_job(task)
            except Exception as exc:
                error = f"{type(exc).__name__}: {exc}"
                task.response = {"id": task.request["id"], "ok": False, "error": error}
                _record_task_history(task, ok=False, error=error)
                task.done.set()
            break

        if task.request.get("action") == "sculpt.finish":
            try:
                _start_sculpt_finish_job(task)
            except Exception as exc:
                error = f"{type(exc).__name__}: {exc}"
                task.response = {"id": task.request["id"], "ok": False, "error": error}
                _record_task_history(task, ok=False, error=error)
                task.done.set()
            break

        if task.request.get("action") == "recipe.run":
            try:
                _start_recipe_run_job(task)
            except Exception as exc:
                error = f"{type(exc).__name__}: {exc}"
                task.response = {"id": task.request["id"], "ok": False, "error": error}
                _record_task_history(task, ok=False, error=error)
                task.done.set()
            break

        try:
            result = _dispatch(task.request["action"], task.request["params"])
            task.response = {"id": task.request["id"], "ok": True, "result": result}
            _record_task_history(task, ok=True, result=result)
        except Exception as exc:
            error = f"{type(exc).__name__}: {exc}"
            task.response = {"id": task.request["id"], "ok": False, "error": error}
            _record_task_history(task, ok=False, error=error)
        finally:
            task.done.set()
    return 0.05


def start_bridge() -> dict[str, Any]:
    global _SERVER
    if _SERVER is not None:
        return {"host": _SERVER.server_address[0], "port": _SERVER.server_address[1]}

    stage = ensure_stage()
    port = int(os.environ.get("CC_BLENDER_PORT", "0"))
    _SERVER = ReusableThreadingTCPServer((DEFAULT_HOST, port), Handler)
    thread = threading.Thread(target=_SERVER.serve_forever, name="cc-blender-agent", daemon=True)
    thread.start()
    bpy.app.timers.register(_drain_queue, persistent=True)
    bpy.app.timers.register(_dismiss_startup_modal, first_interval=0.75)

    info = {
        "version": PROTOCOL_VERSION,
        "host": _SERVER.server_address[0],
        "port": int(_SERVER.server_address[1]),
        "token": _TOKEN,
        "pid": os.getpid(),
        "blender": bpy.app.version_string,
        "active_stage_id": stage["stage_id"],
    }
    target = session_path()
    target.write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding="utf-8")
    try:
        os.chmod(target, 0o600)
    except OSError:
        pass
    print(f"[Carro Chefe Blender Agent] bridge em {info['host']}:{info['port']}")
    return info


start_bridge()
