from __future__ import annotations

import math
import os
from pathlib import Path
from typing import Any

from . import iteration, protocol, recipes

IMAGE_ACTIONS = {"reference.image.add", "material.image_texture"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff", ".exr", ".hdr"}
REFERENCE_DEPTHS = {"DEFAULT", "FRONT", "BACK"}
REFERENCE_SIDES = {"DOUBLE_SIDED", "FRONT", "BACK"}
TEXTURE_EXTENSIONS = {"REPEAT", "EXTEND", "CLIP", "MIRROR"}


def _within(candidate: Path, root: Path) -> bool:
    try:
        candidate.relative_to(root)
        return True
    except ValueError:
        return False


def asset_roots() -> list[Path]:
    roots = [protocol.repo_root().resolve(), protocol.runtime_root().resolve()]
    override = os.environ.get("CC_BLENDER_ASSET_ROOT")
    if override:
        roots.append(Path(override).expanduser().resolve())
    result: list[Path] = []
    for root in roots:
        if root not in result:
            result.append(root)
    return result


def resolve_asset_path(value: str | Path) -> Path:
    raw = str(value or "").strip()
    if not raw:
        raise protocol.SecurityError("image path obrigatorio")
    candidate = Path(raw).expanduser()
    if not candidate.is_absolute():
        candidate = protocol.repo_root() / candidate
    try:
        candidate = candidate.resolve(strict=True)
    except FileNotFoundError as exc:
        raise FileNotFoundError(f"imagem nao encontrada: {raw}") from exc
    if not candidate.is_file():
        raise ValueError(f"asset nao e arquivo: {candidate}")
    if candidate.suffix.lower() not in IMAGE_EXTENSIONS:
        raise ValueError(
            "formato de imagem nao permitido: "
            f"{candidate.suffix or '<sem extensao>'}; permitidos={sorted(IMAGE_EXTENSIONS)}"
        )
    roots = asset_roots()
    if not any(_within(candidate, root) for root in roots):
        raise protocol.SecurityError(
            "imagem fora das raizes permitidas; use caminho dentro do repositorio/runtime "
            "ou configure CC_BLENDER_ASSET_ROOT explicitamente"
        )
    return candidate


def _vec3(core: Any, value: Any, name: str) -> tuple[float, float, float]:
    return tuple(float(v) for v in core._vec3(value, name))


def _load_image(
    core: Any,
    path: Path,
    *,
    colorspace: str | None = None,
    pack: bool = False,
):
    image = core.bpy.data.images.load(str(path), check_existing=True)
    if colorspace:
        try:
            image.colorspace_settings.name = str(colorspace)
        except Exception as exc:
            raise ValueError(f"colorspace invalido: {colorspace}") from exc
    if pack and image.packed_file is None:
        image.pack()
    return image


def add_reference_image(core: Any, params: dict[str, Any]) -> dict[str, Any]:
    if core.bpy.context.mode != "OBJECT":
        raise RuntimeError(
            f"reference.image.add exige Object Mode; modo atual={core.bpy.context.mode}"
        )
    source = resolve_asset_path(str(params.get("path") or ""))
    image = _load_image(
        core,
        source,
        colorspace=str(params["colorspace"]) if params.get("colorspace") else None,
        pack=bool(params.get("pack", False)),
    )
    location = _vec3(core, params.get("location", [0, 0, 0]), "location")
    rotation = _vec3(core, params.get("rotation_deg", [90, 0, 0]), "rotation_deg")
    scale = _vec3(core, params.get("scale", [1, 1, 1]), "scale")
    display_size = max(0.0001, min(1000.0, float(params.get("display_size", 5.0))))
    opacity = max(0.0, min(1.0, float(params.get("opacity", 0.55))))
    depth = str(params.get("depth", "BACK")).upper()
    side = str(params.get("side", "DOUBLE_SIDED")).upper()
    if depth not in REFERENCE_DEPTHS:
        raise ValueError(f"depth invalido: {depth}")
    if side not in REFERENCE_SIDES:
        raise ValueError(f"side invalido: {side}")

    core.bpy.ops.object.empty_add(type="IMAGE", location=location)
    obj = core.bpy.context.object
    if obj is None:
        raise RuntimeError("Blender nao criou o image empty")
    obj.name = str(params.get("name") or f"REF_{source.stem}")[:63]
    obj.data = image
    obj.empty_display_type = "IMAGE"
    obj.empty_display_size = display_size
    obj.empty_image_depth = depth
    obj.empty_image_side = side
    obj.color[3] = opacity
    obj.rotation_euler = tuple(math.radians(v) for v in rotation)
    obj.scale = scale
    obj.hide_render = True
    core.bpy.context.view_layer.update()
    return {
        "object": obj.name,
        "type": obj.type,
        "image": image.name,
        "path": str(source),
        "size": [int(image.size[0]), int(image.size[1])],
        "location": [float(v) for v in obj.location],
        "rotation_deg": [float(v) for v in rotation],
        "scale": [float(v) for v in obj.scale],
        "display_size": float(obj.empty_display_size),
        "opacity": float(obj.color[3]),
        "depth": obj.empty_image_depth,
        "side": obj.empty_image_side,
        "packed": bool(image.packed_file),
        "render_visible": not bool(obj.hide_render),
    }


def _ensure_principled_material(core: Any, obj: Any, material_name: str):
    material = core.bpy.data.materials.get(material_name)
    if material is None:
        material = core.bpy.data.materials.new(material_name)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    principled = nodes.get("Principled BSDF")
    if principled is None or getattr(principled, "type", "") != "BSDF_PRINCIPLED":
        principled = next((node for node in nodes if node.type == "BSDF_PRINCIPLED"), None)
    if principled is None:
        principled = nodes.new(type="ShaderNodeBsdfPrincipled")
        output = nodes.get("Material Output") or nodes.new(type="ShaderNodeOutputMaterial")
        links.new(principled.outputs["BSDF"], output.inputs["Surface"])
    if obj.data is None or not hasattr(obj.data, "materials"):
        raise ValueError(f"objeto nao suporta materiais: {obj.name} ({obj.type})")
    if obj.data.materials:
        obj.data.materials[0] = material
    else:
        obj.data.materials.append(material)
    return material, principled


def assign_image_texture(core: Any, params: dict[str, Any]) -> dict[str, Any]:
    obj = core._selected_object(str(params["name"]))
    source = resolve_asset_path(str(params.get("path") or ""))
    material_name = str(params.get("material_name") or f"{obj.name}_ImageMaterial")[:63]
    node_name = str(params.get("node_name") or "CC_BaseColorImage")[:63]
    extension = str(params.get("extension", "REPEAT")).upper()
    if extension not in TEXTURE_EXTENSIONS:
        raise ValueError(f"extension invalido: {extension}")
    colorspace = str(params.get("colorspace") or "sRGB")
    image = _load_image(
        core,
        source,
        colorspace=colorspace,
        pack=bool(params.get("pack", False)),
    )
    material, principled = _ensure_principled_material(core, obj, material_name)
    nodes = material.node_tree.nodes
    links = material.node_tree.links

    texture = nodes.get(node_name)
    if texture is not None and getattr(texture, "type", "") != "TEX_IMAGE":
        raise ValueError(
            f"node_name ja existe com tipo incompatível: {node_name} ({texture.type})"
        )
    if texture is None:
        texture = nodes.new(type="ShaderNodeTexImage")
        texture.name = node_name
        texture.label = node_name
    texture.image = image
    texture.extension = extension

    base_color = principled.inputs.get("Base Color")
    if base_color is None:
        raise RuntimeError("Principled BSDF sem input Base Color")
    for link in list(base_color.links):
        links.remove(link)
    links.new(texture.outputs["Color"], base_color)

    connected = {"Color": "Base Color"}
    if bool(params.get("use_alpha", False)):
        alpha_input = principled.inputs.get("Alpha")
        if alpha_input is None:
            raise RuntimeError("Principled BSDF sem input Alpha")
        for link in list(alpha_input.links):
            links.remove(link)
        links.new(texture.outputs["Alpha"], alpha_input)
        connected["Alpha"] = "Alpha"

    uv_layers = []
    if obj.type == "MESH" and getattr(obj.data, "uv_layers", None) is not None:
        uv_layers = [layer.name for layer in obj.data.uv_layers]
    core.bpy.context.view_layer.update()
    return {
        "object": obj.name,
        "material": material.name,
        "node": texture.name,
        "image": image.name,
        "path": str(source),
        "size": [int(image.size[0]), int(image.size[1])],
        "colorspace": image.colorspace_settings.name,
        "extension": texture.extension,
        "connected": connected,
        "uv_layers": uv_layers,
        "has_uv": bool(uv_layers),
        "packed": bool(image.packed_file),
        "warning": None if uv_layers or obj.type != "MESH" else "mesh sem UV map; textura pode nao mapear como esperado",
    }


def install(core: Any, v05: Any) -> None:
    protocol.ALLOWED_ACTIONS.update(IMAGE_ACTIONS)
    recipes.RECIPE_SAFE_ACTIONS.update(IMAGE_ACTIONS)
    iteration.ITERATION_SAFE_ACTIONS.add("material.image_texture")

    previous_dispatch = core._dispatch

    def _dispatch_with_assets(action: str, params: dict[str, Any]):
        if action == "reference.image.add":
            return add_reference_image(core, params)
        if action == "material.image_texture":
            return assign_image_texture(core, params)
        return previous_dispatch(action, params)

    core._dispatch = _dispatch_with_assets
