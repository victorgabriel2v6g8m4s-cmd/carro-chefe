from __future__ import annotations

import argparse
import json
import socket
import sys
import time
from pathlib import Path
from typing import Any

from .protocol import (
    DEFAULT_TIMEOUT_SECONDS,
    PROTOCOL_VERSION,
    encode_message,
    sanitize_label,
    session_path,
)


def load_session(path: Path | None = None) -> dict[str, Any]:
    target = path or session_path()
    data = json.loads(target.read_text(encoding="utf-8"))
    for key in ("host", "port", "token"):
        if key not in data:
            raise RuntimeError(f"sessão inválida: campo ausente {key}")
    return data


def call(action: str, params: dict[str, Any] | None = None, timeout: float = DEFAULT_TIMEOUT_SECONDS) -> dict[str, Any]:
    session = load_session()
    request = {
        "version": PROTOCOL_VERSION,
        "id": f"cli-{time.time_ns()}",
        "action": action,
        "params": params or {},
        "token": session["token"],
    }
    with socket.create_connection((session["host"], int(session["port"])), timeout=timeout) as sock:
        sock.settimeout(timeout)
        sock.sendall(encode_message(request))
        chunks: list[bytes] = []
        total = 0
        while True:
            chunk = sock.recv(65536)
            if not chunk:
                break
            chunks.append(chunk)
            total += len(chunk)
            if total > 1_000_000:
                raise RuntimeError("resposta excedeu limite")
            if b"\n" in chunk:
                break
    raw = b"".join(chunks).split(b"\n", 1)[0]
    response = json.loads(raw.decode("utf-8"))
    if not response.get("ok"):
        raise RuntimeError(response.get("error", "erro desconhecido do Blender bridge"))
    return response


def _json_text(value: Any) -> str:
    # ASCII-safe JSON survives Windows PowerShell 5.1 native-process decoding.
    # Non-ASCII filesystem paths are represented as JSON \\uXXXX escapes and
    # ConvertFrom-Json reconstructs the original Unicode string correctly.
    return json.dumps(value, ensure_ascii=True, indent=2)


def _json_params(value: str) -> dict[str, Any]:
    parsed = json.loads(value)
    if not isinstance(parsed, dict):
        raise argparse.ArgumentTypeError("--json precisa ser um objeto JSON")
    return parsed


def capture_set(
    label: str,
    views: list[str],
    *,
    wait_seconds: float = 0.25,
    shading: str | None = None,
) -> dict[str, Any]:
    clean_label = sanitize_label(label, "capture-set")
    if not views:
        raise ValueError("capture-set exige pelo menos uma vista")
    wait_seconds = max(0.05, min(2.0, float(wait_seconds)))

    if shading:
        call("viewport.set_shading", {"type": shading})

    captures: list[dict[str, Any]] = []
    for preset in views:
        normalized = preset.upper()
        call("viewport.set_view", {"preset": normalized, "frame_all": True})
        time.sleep(wait_seconds)
        capture = call("viewport.capture", {
            "filename": f"{clean_label}-{normalized.lower().replace('_', '-')}.png"
        })
        captures.append({
            "preset": normalized,
            "capture": capture["result"],
        })

    return {
        "ok": True,
        "label": clean_label,
        "views": [item["preset"] for item in captures],
        "captures": captures,
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Cliente local do Blender Agent do Carro Chefe")
    sub = parser.add_subparsers(dest="command", required=True)

    status = sub.add_parser("status", help="testa conexão com o bridge")
    status.set_defaults(handler=lambda _a: call("health"))

    invoke = sub.add_parser("call", help="executa qualquer action allowlisted")
    invoke.add_argument("action")
    invoke.add_argument("--json", default="{}", type=_json_params, dest="params")
    invoke.set_defaults(handler=lambda a: call(a.action, a.params))

    viewport = sub.add_parser("viewport-describe", help="descreve estado e bounds da VIEW_3D")
    viewport.set_defaults(handler=lambda _a: call("viewport.describe"))

    set_view = sub.add_parser("viewport-view", help="define uma vista previsível da VIEW_3D")
    set_view.add_argument(
        "preset",
        choices=["LEFT", "RIGHT", "BOTTOM", "TOP", "FRONT", "BACK", "CAMERA", "THREE_QUARTER"],
    )
    set_view.add_argument("--no-frame-all", action="store_true")
    set_view.set_defaults(handler=lambda a: call("viewport.set_view", {
        "preset": a.preset,
        "frame_all": not a.no_frame_all,
    }))

    frame = sub.add_parser("viewport-frame", help="enquadra todos os objetos na VIEW_3D")
    frame.set_defaults(handler=lambda _a: call("viewport.frame_all"))

    shading = sub.add_parser("viewport-shading", help="define shading da VIEW_3D")
    shading.add_argument("type", choices=["WIREFRAME", "SOLID", "MATERIAL", "RENDERED"])
    shading.set_defaults(handler=lambda a: call("viewport.set_shading", {"type": a.type}))

    capture = sub.add_parser("viewport-capture", help="salva PNG somente da região 3D")
    capture.add_argument("--name", default="viewport.png")
    capture.set_defaults(handler=lambda a: call("viewport.capture", {"filename": a.name}))

    capture_many = sub.add_parser("viewport-capture-set", help="captura conjunto de vistas previsíveis")
    capture_many.add_argument("--label", default="viewport-set")
    capture_many.add_argument(
        "--views",
        nargs="+",
        choices=["LEFT", "RIGHT", "BOTTOM", "TOP", "FRONT", "BACK", "CAMERA", "THREE_QUARTER"],
        default=["FRONT", "RIGHT", "TOP", "THREE_QUARTER"],
    )
    capture_many.add_argument("--shading", choices=["WIREFRAME", "SOLID", "MATERIAL", "RENDERED"], default="SOLID")
    capture_many.add_argument("--wait", type=float, default=0.25)
    capture_many.set_defaults(handler=lambda a: capture_set(
        a.label,
        a.views,
        wait_seconds=a.wait,
        shading=a.shading,
    ))

    window = sub.add_parser("ui-window", help="retorna tamanho da janela Blender")
    window.set_defaults(handler=lambda _a: call("ui.window"))

    dismiss = sub.add_parser("ui-dismiss", help="fecha splash/modal inicial com ESC")
    dismiss.set_defaults(handler=lambda _a: call("ui.dismiss_modal"))

    view3d = sub.add_parser("ui-view3d", help="retorna bounds da maior VIEW_3D")
    view3d.set_defaults(handler=lambda _a: call("ui.view3d"))

    orbit = sub.add_parser("ui-orbit", help="orbita a maior VIEW_3D com middle mouse")
    orbit.add_argument("--dx", type=int, default=120)
    orbit.add_argument("--dy", type=int, default=60)
    orbit.add_argument("--steps", type=int, default=18)
    orbit.set_defaults(handler=lambda a: call("ui.orbit", {"dx": a.dx, "dy": a.dy, "steps": a.steps}))

    click = sub.add_parser("ui-click", help="simula clique dentro da janela Blender")
    click.add_argument("x", type=int)
    click.add_argument("y", type=int)
    click.add_argument("--button", choices=["left", "middle", "right"], default="left")
    click.add_argument("--shift", action="store_true")
    click.add_argument("--ctrl", action="store_true")
    click.add_argument("--alt", action="store_true")
    click.set_defaults(handler=lambda a: call("ui.click", {
        "x": a.x,
        "y": a.y,
        "button": a.button,
        "shift": a.shift,
        "ctrl": a.ctrl,
        "alt": a.alt,
    }))

    drag = sub.add_parser("ui-drag", help="simula arrasto dentro da janela Blender")
    drag.add_argument("x1", type=int)
    drag.add_argument("y1", type=int)
    drag.add_argument("x2", type=int)
    drag.add_argument("y2", type=int)
    drag.add_argument("--button", choices=["left", "middle", "right"], default="left")
    drag.add_argument("--steps", type=int, default=18)
    drag.add_argument("--shift", action="store_true")
    drag.add_argument("--ctrl", action="store_true")
    drag.add_argument("--alt", action="store_true")
    drag.set_defaults(handler=lambda a: call("ui.drag", {
        "x1": a.x1,
        "y1": a.y1,
        "x2": a.x2,
        "y2": a.y2,
        "button": a.button,
        "steps": a.steps,
        "shift": a.shift,
        "ctrl": a.ctrl,
        "alt": a.alt,
    }))

    wheel = sub.add_parser("ui-wheel", help="simula scroll dentro do Blender")
    wheel.add_argument("steps", type=int, help="positivo sobe/aproxima; negativo desce/afasta")
    wheel.add_argument("--x", type=int)
    wheel.add_argument("--y", type=int)
    wheel.set_defaults(handler=lambda a: call("ui.wheel", {"steps": a.steps, "x": a.x, "y": a.y}))

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        result = args.handler(args)
        print(_json_text(result))
        return 0
    except Exception as exc:
        print(_json_text({"ok": False, "error": str(exc)}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
