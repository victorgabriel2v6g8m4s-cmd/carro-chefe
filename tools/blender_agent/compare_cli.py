from __future__ import annotations

import argparse
import json
import sys
from typing import Any

from .comparison import compose
from .comparison_alignment import parse_anchor


def _bool(value: str | bool) -> bool:
    if isinstance(value, bool):
        return value
    normalized = str(value).strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    raise argparse.ArgumentTypeError("use true/false")


def _rgb(value: str) -> tuple[int, int, int]:
    parts = [part.strip() for part in str(value).split(",")]
    if len(parts) != 3:
        raise argparse.ArgumentTypeError("cor deve usar R,G,B")
    try:
        result = tuple(int(part) for part in parts)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("cor deve conter inteiros R,G,B") from exc
    if any(channel < 0 or channel > 255 for channel in result):
        raise argparse.ArgumentTypeError("cada canal RGB deve estar em 0..255")
    return result  # type: ignore[return-value]


def _anchor(value: str) -> tuple[float, float, float, float]:
    try:
        return parse_anchor(value)
    except Exception as exc:
        raise argparse.ArgumentTypeError(str(exc)) from exc


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Compoe imagem de referencia + projecao de mesh do Blender Agent"
    )
    sub = parser.add_subparsers(dest="command", required=True)
    command = sub.add_parser("compose", help="gera PNG comparativo e receipt reproduzivel")

    command.add_argument("--reference", required=True)
    command.add_argument("--source", choices=["recipe", "scene"])
    command.add_argument("--recipe")
    command.add_argument("--object", required=True)
    command.add_argument("--output")
    command.add_argument("--view", choices=["FRONT", "RIGHT", "TOP", "CAMERA"], default="FRONT")
    command.add_argument("--resolution", nargs=2, type=int, metavar=("WIDTH", "HEIGHT"))

    command.add_argument("--fill", nargs="?", const=True, default=True, type=_bool)
    command.add_argument("--no-fill", action="store_false", dest="fill")
    command.add_argument("--opacity", type=float, default=50.0)
    command.add_argument("--fill-color", type=_rgb, default=(0, 190, 255))
    command.add_argument("--lines", nargs="?", const=True, default=True, type=_bool)
    command.add_argument("--no-lines", action="store_false", dest="lines")
    command.add_argument("--line-mode", choices=["all", "visible", "silhouette"], default="all")
    command.add_argument("--line-color", type=_rgb, default=(255, 210, 0))
    command.add_argument("--line-opacity", type=float, default=90.0)
    command.add_argument("--line-width", type=int, default=1)
    command.add_argument("--border", nargs="?", const=True, default=True, type=_bool)
    command.add_argument("--no-border", action="store_false", dest="border")
    command.add_argument("--border-color", type=_rgb, default=(255, 60, 60))
    command.add_argument("--border-width", type=int, default=3)
    command.add_argument("--background", choices=["original", "transparent", "solid"], default="original")
    command.add_argument("--background-color", type=_rgb, default=(255, 255, 255))
    command.add_argument("--show-axes", nargs="?", const=True, default=False, type=_bool)
    command.add_argument("--no-show-axes", action="store_false", dest="show_axes")

    command.add_argument("--align", choices=["auto", "manual", "anchors", "none"], default="auto")
    command.add_argument("--scale", type=float, default=1.0)
    command.add_argument("--offset-x", type=float, default=0.0)
    command.add_argument("--offset-y", type=float, default=0.0)
    command.add_argument("--rotate", type=float, default=0.0)
    command.add_argument("--anchor", action="append", type=_anchor, dest="anchors", default=[])
    command.add_argument("--reference-mask")
    command.add_argument("--align-report")
    command.add_argument("--strict-alignment", action="store_true")

    command.add_argument("--dry-run", action="store_true")
    command.add_argument("--json", action="store_true", dest="json_output")
    command.add_argument("--no-history", action="store_true")
    command.add_argument("--force", action="store_true")
    return parser


def _options(args: argparse.Namespace) -> dict[str, Any]:
    data = vars(args).copy()
    data.pop("command", None)
    json_output = bool(data.pop("json_output", False))
    data["json_output"] = json_output
    return data


def _human(result: dict[str, Any]) -> str:
    if result.get("dry_run"):
        alignment = result.get("alignment") or {}
        return "\n".join([
            "Mesh reference compare dry-run OK.",
            f"Source:     {(result.get('source') or {}).get('type')}",
            f"Object:     {result.get('object')}",
            f"View:       {result.get('view')}",
            f"Resolution: {result.get('resolution')}",
            f"Alignment:  {alignment.get('method')} score={alignment.get('confidence')}",
        ])
    output = result.get("output") or {}
    alignment = result.get("alignment") or {}
    return "\n".join([
        "Blender Agent mesh-reference comparison OK.",
        f"Output:     {output.get('path')}",
        f"Receipt:    {result.get('receipt')}",
        f"View:       {result.get('view')}",
        f"Alignment:  {alignment.get('method')} score={alignment.get('confidence')}",
        f"Stage:      {result.get('stage_id')}",
    ])


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    options = _options(args)
    json_output = bool(options.pop("json_output", False))
    try:
        result = compose(options)
        if json_output:
            print(json.dumps(result, ensure_ascii=True, indent=2))
        else:
            print(_human(result))
        return 0
    except Exception as exc:
        payload = {
            "ok": False,
            "error": f"{type(exc).__name__}: {exc}",
        }
        if json_output:
            print(json.dumps(payload, ensure_ascii=True, indent=2), file=sys.stderr)
        else:
            print(payload["error"], file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
