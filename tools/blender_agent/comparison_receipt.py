from __future__ import annotations

import hashlib
import json
from importlib import metadata
from pathlib import Path
from typing import Any

from . import protocol


RECEIPT_SCHEMA_VERSION = 1
FEATURE_VERSION = "mesh-reference-compare-v1"


def sha256_file(path: str | Path) -> str:
    target = Path(path)
    digest = hashlib.sha256()
    with target.open("rb") as handle:
        while True:
            chunk = handle.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def dependency_versions() -> dict[str, str | None]:
    versions: dict[str, str | None] = {}
    for distribution, key in (("Pillow", "pillow"), ("opencv-python", "opencv")):
        try:
            versions[key] = metadata.version(distribution)
        except metadata.PackageNotFoundError:
            versions[key] = None
    return versions


def write_json_atomic(path: str | Path, payload: dict[str, Any]) -> Path:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    temp = target.with_name(target.name + ".tmp")
    try:
        temp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        json.loads(temp.read_text(encoding="utf-8"))
        temp.replace(target)
    except Exception:
        temp.unlink(missing_ok=True)
        raise
    return target


def receipt_path_for(output: str | Path) -> Path:
    target = Path(output)
    return target.with_suffix(".receipt.json")


def public_path(path: str | Path, *, runtime_root: Path | None = None) -> str:
    target = Path(path).resolve()
    roots: list[tuple[str, Path]] = []
    if runtime_root is not None:
        roots.append(("runtime", runtime_root.resolve()))
    roots.append(("repo", protocol.repo_root().resolve()))
    for prefix, root in roots:
        try:
            relative = str(target.relative_to(root)).replace("\\", "/")
            return relative if prefix == "repo" else f".runtime/blender-agent/{relative}"
        except ValueError:
            continue
    # External opt-in assets should not leak the user's absolute filesystem path.
    return target.name
