from __future__ import annotations

import json
from pathlib import Path
from typing import Any

LIBRARY_SCHEMA_VERSION = 1
_LIBRARY_PATH = Path(__file__).resolve().parent / "materials" / "carro-chefe-materials-v1.json"
_ALLOWED_PRESET_KEYS = {
    "label",
    "description",
    "base_color",
    "roughness",
    "metallic",
    "tags",
}


class MaterialLibraryError(ValueError):
    pass


def material_library_path() -> Path:
    return _LIBRARY_PATH


def validate_material_library(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise MaterialLibraryError("material library deve ser objeto")
    unknown = sorted(set(value) - {"schema_version", "id", "version", "materials"})
    if unknown:
        raise MaterialLibraryError(f"campos desconhecidos na material library: {', '.join(unknown)}")
    if value.get("schema_version") != LIBRARY_SCHEMA_VERSION:
        raise MaterialLibraryError(f"schema_version deve ser {LIBRARY_SCHEMA_VERSION}")

    library_id = str(value.get("id") or "").strip()
    version = str(value.get("version") or "").strip()
    if not library_id or len(library_id) > 100:
        raise MaterialLibraryError("material library id invalido")
    if not version or len(version) > 50:
        raise MaterialLibraryError("material library version invalida")

    raw_materials = value.get("materials")
    if not isinstance(raw_materials, dict) or not raw_materials:
        raise MaterialLibraryError("materials deve ser objeto nao vazio")
    if len(raw_materials) > 100:
        raise MaterialLibraryError("material library excede 100 presets")

    clean: dict[str, dict[str, Any]] = {}
    for preset_id, raw in raw_materials.items():
        if not isinstance(preset_id, str) or not preset_id or len(preset_id) > 100:
            raise MaterialLibraryError("preset id invalido")
        if not isinstance(raw, dict):
            raise MaterialLibraryError(f"preset {preset_id} deve ser objeto")
        unknown_preset = sorted(set(raw) - _ALLOWED_PRESET_KEYS)
        if unknown_preset:
            raise MaterialLibraryError(
                f"preset {preset_id} possui campos desconhecidos: {', '.join(unknown_preset)}"
            )
        color = raw.get("base_color")
        if not isinstance(color, list) or len(color) != 4:
            raise MaterialLibraryError(f"preset {preset_id}.base_color deve ser RGBA")
        color_values = [float(item) for item in color]
        if any(item < 0.0 or item > 1.0 for item in color_values):
            raise MaterialLibraryError(f"preset {preset_id}.base_color fora de 0..1")
        roughness = float(raw.get("roughness", 0.5))
        metallic = float(raw.get("metallic", 0.0))
        if not 0.0 <= roughness <= 1.0:
            raise MaterialLibraryError(f"preset {preset_id}.roughness fora de 0..1")
        if not 0.0 <= metallic <= 1.0:
            raise MaterialLibraryError(f"preset {preset_id}.metallic fora de 0..1")
        tags = raw.get("tags", [])
        if not isinstance(tags, list) or any(not isinstance(tag, str) for tag in tags):
            raise MaterialLibraryError(f"preset {preset_id}.tags invalido")
        clean[preset_id] = {
            "label": str(raw.get("label") or preset_id)[:200],
            "description": str(raw.get("description") or "")[:1000],
            "base_color": color_values,
            "roughness": roughness,
            "metallic": metallic,
            "tags": [str(tag)[:80] for tag in tags[:30]],
        }

    return {
        "schema_version": LIBRARY_SCHEMA_VERSION,
        "id": library_id,
        "version": version,
        "materials": clean,
    }


def load_material_library(path: Path | None = None) -> dict[str, Any]:
    target = (path or _LIBRARY_PATH).resolve()
    raw = target.read_bytes()
    if len(raw) > 256_000:
        raise MaterialLibraryError("material library excede limite")
    try:
        value = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise MaterialLibraryError(f"material library JSON invalida: {exc}") from exc
    return validate_material_library(value)


def material_preset(preset_id: str, *, overrides: dict[str, Any] | None = None) -> dict[str, Any]:
    library = load_material_library()
    preset = library["materials"].get(str(preset_id))
    if preset is None:
        raise MaterialLibraryError(f"material preset inexistente: {preset_id}")
    result = dict(preset)

    raw_overrides = overrides or {}
    if not isinstance(raw_overrides, dict):
        raise MaterialLibraryError("material overrides deve ser objeto")
    unknown = sorted(set(raw_overrides) - {"base_color", "roughness", "metallic"})
    if unknown:
        raise MaterialLibraryError(f"material overrides desconhecidos: {', '.join(unknown)}")

    if "base_color" in raw_overrides:
        color = raw_overrides["base_color"]
        if not isinstance(color, list) or len(color) != 4:
            raise MaterialLibraryError("override base_color deve ser RGBA")
        result["base_color"] = [float(item) for item in color]
        if any(item < 0.0 or item > 1.0 for item in result["base_color"]):
            raise MaterialLibraryError("override base_color fora de 0..1")
    for key in ("roughness", "metallic"):
        if key in raw_overrides:
            value = float(raw_overrides[key])
            if not 0.0 <= value <= 1.0:
                raise MaterialLibraryError(f"override {key} fora de 0..1")
            result[key] = value

    return {
        "library_id": library["id"],
        "library_version": library["version"],
        "preset_id": str(preset_id),
        **result,
    }
