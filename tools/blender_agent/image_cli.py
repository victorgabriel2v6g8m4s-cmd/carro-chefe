from __future__ import annotations

import argparse
import json
import sys

from .client import call


def _print(response: dict) -> None:
    print(json.dumps(response, ensure_ascii=True, indent=2))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Blender Agent image/reference actions")
    sub = parser.add_subparsers(dest="command", required=True)

    ref = sub.add_parser("reference-add", help="adiciona imagem de referencia como Image Empty")
    ref.add_argument("path")
    ref.add_argument("--name")
    ref.add_argument("--location", nargs=3, type=float, default=[0.0, 0.0, 0.0])
    ref.add_argument("--rotation-deg", nargs=3, type=float, default=[90.0, 0.0, 0.0])
    ref.add_argument("--scale", nargs=3, type=float, default=[1.0, 1.0, 1.0])
    ref.add_argument("--display-size", type=float, default=5.0)
    ref.add_argument("--opacity", type=float, default=0.55)
    ref.add_argument("--depth", choices=["DEFAULT", "FRONT", "BACK"], default="BACK")
    ref.add_argument("--side", choices=["DOUBLE_SIDED", "FRONT", "BACK"], default="DOUBLE_SIDED")
    ref.add_argument("--colorspace")
    ref.add_argument("--pack", action="store_true")

    tex = sub.add_parser("material-texture", help="liga uma imagem ao Base Color do Principled BSDF")
    tex.add_argument("name", help="objeto alvo")
    tex.add_argument("path")
    tex.add_argument("--material-name")
    tex.add_argument("--node-name", default="CC_BaseColorImage")
    tex.add_argument("--colorspace", default="sRGB")
    tex.add_argument("--extension", choices=["REPEAT", "EXTEND", "CLIP", "MIRROR"], default="REPEAT")
    tex.add_argument("--use-alpha", action="store_true")
    tex.add_argument("--pack", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        if args.command == "reference-add":
            response = call("reference.image.add", {
                "path": args.path,
                "name": args.name,
                "location": args.location,
                "rotation_deg": args.rotation_deg,
                "scale": args.scale,
                "display_size": args.display_size,
                "opacity": args.opacity,
                "depth": args.depth,
                "side": args.side,
                "colorspace": args.colorspace,
                "pack": args.pack,
            })
        else:
            response = call("material.image_texture", {
                "name": args.name,
                "path": args.path,
                "material_name": args.material_name,
                "node_name": args.node_name,
                "colorspace": args.colorspace,
                "extension": args.extension,
                "use_alpha": args.use_alpha,
                "pack": args.pack,
            })
        _print(response)
        return 0
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=True, indent=2), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
