from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

PROTOCOL_VERSION = 1
DEFAULT_HOST = "127.0.0.1"
DEFAULT_TIMEOUT_SECONDS = 30.0
MAX_JSON_BYTES = 1_000_000

ALLOWED_ACTIONS = {
    "health",
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
    "render.still",
    "checkpoint.create",
    "export.glb",
    "export.obj",
    "ui.window",
    "ui.view3d",
    "ui.dismiss_modal",
    "ui.event",
    "ui.click",
    "ui.drag",
    "ui.orbit",
    "ui.wheel",
    "viewport.describe",
    "viewport.set_view",
    "viewport.frame_all",
    "viewport.set_shading",
    "viewport.capture",
    "workspace.list",
    "workspace.describe",
    "workspace.capture_set",
    "history.stage.create",
    "history.stage.list",
    "history.stage.activate",
    "history.stage.describe",
    "history.search",
    "history.note",
    "sculpt.status",
    "sculpt.prepare",
    "sculpt.stroke",
    "sculpt.finish",
}

_ID_RE = re.compile(r"^[A-Za-z0-9._:-]{1,120}$")
_LABEL_RE = re.compile(r"[^A-Za-z0-9._-]+")


class ProtocolError(ValueError):
    pass


class SecurityError(RuntimeError):
    pass


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def runtime_root() -> Path:
    override = os.environ.get("CC_BLENDER_RUNTIME")
    root = Path(override).expanduser() if override else repo_root() / ".runtime" / "blender-agent"
    root.mkdir(parents=True, exist_ok=True)
    return root.resolve()


def safe_runtime_path(category: str, filename: str) -> Path:
    if not category or "/" in category or "\\" in category or category in {".", ".."}:
        raise SecurityError("categoria de runtime inválida")
    clean = sanitize_label(filename)
    base = (runtime_root() / category).resolve()
    base.mkdir(parents=True, exist_ok=True)
    candidate = (base / clean).resolve()
    try:
        candidate.relative_to(base)
    except ValueError as exc:
        raise SecurityError("caminho fora do runtime permitido") from exc
    return candidate


def sanitize_label(value: str, fallback: str = "item") -> str:
    value = str(value or "").strip()
    value = _LABEL_RE.sub("-", value).strip("._-")
    return (value or fallback)[:100]


def normalize_request(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise ProtocolError("request deve ser objeto JSON")
    version = payload.get("version", PROTOCOL_VERSION)
    if version != PROTOCOL_VERSION:
        raise ProtocolError(f"version incompatível: {version}")
    request_id = str(payload.get("id", "")).strip()
    if not _ID_RE.fullmatch(request_id):
        raise ProtocolError("id inválido")
    action = str(payload.get("action", "")).strip()
    if action not in ALLOWED_ACTIONS:
        raise ProtocolError(f"action não permitida: {action}")
    params = payload.get("params", {})
    if not isinstance(params, dict):
        raise ProtocolError("params deve ser objeto JSON")
    token = payload.get("token")
    if token is not None and not isinstance(token, str):
        raise ProtocolError("token inválido")
    return {
        "version": PROTOCOL_VERSION,
        "id": request_id,
        "action": action,
        "params": params,
        "token": token,
    }


def encode_message(payload: dict[str, Any]) -> bytes:
    raw = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8") + b"\n"
    if len(raw) > MAX_JSON_BYTES:
        raise ProtocolError("mensagem excede limite")
    return raw


def decode_message(raw: bytes) -> dict[str, Any]:
    if len(raw) > MAX_JSON_BYTES:
        raise ProtocolError("mensagem excede limite")
    try:
        payload = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ProtocolError("JSON inválido") from exc
    return normalize_request(payload)


def session_path() -> Path:
    return safe_runtime_path("session", "bridge.json")
