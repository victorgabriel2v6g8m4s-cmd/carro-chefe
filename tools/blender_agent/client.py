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


def _json_params(value: str) -> dict[str, Any]:
    parsed = json.loads(value)
    if not isinstance(parsed, dict):
        raise argparse.ArgumentTypeError("--json precisa ser um objeto JSON")
    return parsed


def _gui_module():
    from . import windows_gui
    return windows_gui


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Cliente local do Blender Agent do Carro Chefe")
    sub = parser.add_subparsers(dest="command", required=True)

    status = sub.add_parser("status", help="testa conexão com o bridge")
    status.set_defaults(handler=lambda _a: call("health"))

    invoke = sub.add_parser("call", help="executa uma action semântica no Blender")
    invoke.add_argument("action")
    invoke.add_argument("--json", default="{}", type=_json_params, dest="params")
    invoke.set_defaults(handler=lambda a: call(a.action, a.params))

    click = sub.add_parser("gui-click", help="clica apenas quando blender.exe estiver em foreground")
    click.add_argument("x", type=int)
    click.add_argument("y", type=int)
    click.add_argument("--button", choices=["left", "middle", "right"], default="left")
    click.set_defaults(handler=lambda a: _gui_module().click(a.x, a.y, a.button))

    drag = sub.add_parser("gui-drag", help="arrasta dentro do Blender em foreground")
    drag.add_argument("x1", type=int)
    drag.add_argument("y1", type=int)
    drag.add_argument("x2", type=int)
    drag.add_argument("y2", type=int)
    drag.add_argument("--button", choices=["left", "middle", "right"], default="left")
    drag.add_argument("--duration", type=float, default=0.35)
    drag.add_argument("--modifier", action="append", choices=["shift", "ctrl", "alt"], default=[])
    drag.set_defaults(handler=lambda a: _gui_module().drag(
        a.x1, a.y1, a.x2, a.y2, button=a.button, duration=a.duration, modifiers=a.modifier
    ))

    wheel = sub.add_parser("gui-wheel", help="rola wheel apenas no Blender em foreground")
    wheel.add_argument("delta", type=int)
    wheel.set_defaults(handler=lambda a: _gui_module().wheel(a.delta))

    shot = sub.add_parser("gui-screenshot", help="captura somente a janela do Blender")
    shot.add_argument("--name", default="blender-window.png")
    shot.set_defaults(handler=lambda a: {"path": str(_gui_module().screenshot_blender_window(a.name))})

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        result = args.handler(args)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
