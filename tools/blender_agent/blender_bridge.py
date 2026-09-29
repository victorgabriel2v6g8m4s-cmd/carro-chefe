from __future__ import annotations

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
from mathutils import Vector

from tools.blender_agent.protocol import (
    DEFAULT_HOST,
    MAX_JSON_BYTES,
    PROTOCOL_VERSION,
    decode_message,
    encode_message,
    safe_runtime_path,
    session_path,
)

_TASKS: "queue.Queue[Task]" = queue.Queue()
_TOKEN = secrets.token_urlsafe(32)
_SERVER = None

_MOUSE_BUTTONS = {"left": "LEFTMOUSE", "middle": "MIDDLEMOUSE", "right": "RIGHTMOUSE"}
_UI_EVENT_TYPES = {
    "LEFTMOUSE",
    "MIDDLEMOUSE",
    "RIGHTMOUSE",
    "MOUSEMOVE",
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


@dataclass
class Task:
    request: dict[str, Any]
    done: threading.Event = field(default_factory=threading.Event)
    response: dict[str, Any] | None = None


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
            if not task.done.wait(timeout=30):
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
        }

    if action == "ui.window":
        window = bpy.context.window
        if window is None:
            raise RuntimeError("nenhuma janela Blender ativa")
        return {"width": int(window.width), "height": int(window.height)}

    if action == "ui.event":
        event_type = str(params["type"]).upper()
        value = str(params.get("value", "NOTHING")).upper()
        _event_simulate(event_type, value, params)
        return {"queued": True, "type": event_type, "value": value}

    if action == "ui.click":
        return _ui_click(params)

    if action == "ui.drag":
        return _ui_drag(params)

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


def _drain_queue() -> float:
    for _ in range(10):
        try:
            task = _TASKS.get_nowait()
        except queue.Empty:
            break
        try:
            result = _dispatch(task.request["action"], task.request["params"])
            task.response = {"id": task.request["id"], "ok": True, "result": result}
        except Exception as exc:
            task.response = {"id": task.request["id"], "ok": False, "error": f"{type(exc).__name__}: {exc}"}
        finally:
            task.done.set()
    return 0.05


def start_bridge() -> dict[str, Any]:
    global _SERVER
    if _SERVER is not None:
        return {"host": _SERVER.server_address[0], "port": _SERVER.server_address[1]}

    port = int(os.environ.get("CC_BLENDER_PORT", "0"))
    _SERVER = ReusableThreadingTCPServer((DEFAULT_HOST, port), Handler)
    thread = threading.Thread(target=_SERVER.serve_forever, name="cc-blender-agent", daemon=True)
    thread.start()
    bpy.app.timers.register(_drain_queue, persistent=True)

    info = {
        "version": PROTOCOL_VERSION,
        "host": _SERVER.server_address[0],
        "port": int(_SERVER.server_address[1]),
        "token": _TOKEN,
        "pid": os.getpid(),
        "blender": bpy.app.version_string,
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
