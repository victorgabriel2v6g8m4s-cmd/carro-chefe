from __future__ import annotations

from typing import Any

from .comparison_geometry import deduplicate_edges


class ComparisonRenderError(RuntimeError):
    pass


def require_pillow():
    try:
        from PIL import Image, ImageChops, ImageDraw, ImageFilter
    except ImportError as exc:
        raise ComparisonRenderError(
            "Pillow nao esta instalado no ambiente de comparacao. "
            "Execute 'blenagent install-compare' e tente novamente."
        ) from exc
    return Image, ImageChops, ImageDraw, ImageFilter


def _rgba(color: tuple[int, int, int], opacity_percent: float) -> tuple[int, int, int, int]:
    alpha = int(round(max(0.0, min(100.0, float(opacity_percent))) * 2.55))
    return int(color[0]), int(color[1]), int(color[2]), alpha


def _colorize_mask(mask, color: tuple[int, int, int], opacity_percent: float):
    Image, _ImageChops, _ImageDraw, _ImageFilter = require_pillow()
    alpha_scale = max(0.0, min(100.0, float(opacity_percent))) / 100.0
    if alpha_scale < 1.0:
        alpha = mask.point(lambda value: int(round(value * alpha_scale)))
    else:
        alpha = mask
    layer = Image.new("RGBA", mask.size, (int(color[0]), int(color[1]), int(color[2]), 0))
    layer.putalpha(alpha)
    return layer


def build_silhouette_mask(
    size: tuple[int, int],
    points: list[tuple[float, float]],
    faces: list[list[int]],
):
    Image, _ImageChops, ImageDraw, _ImageFilter = require_pillow()
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    for face_index, face in enumerate(faces):
        try:
            polygon = [points[index] for index in face]
        except IndexError as exc:
            raise ComparisonRenderError(f"face[{face_index}] referencia ponto projetado inexistente") from exc
        if len(polygon) >= 3:
            draw.polygon(polygon, fill=255)
    return mask


def _outline_mask(mask, width: int):
    _Image, ImageChops, _ImageDraw, ImageFilter = require_pillow()
    clean_width = max(1, min(32, int(width)))
    kernel = clean_width * 2 + 1
    expanded = mask.filter(ImageFilter.MaxFilter(kernel))
    return ImageChops.subtract(expanded, mask)


def _full_outline_mask(mask, width: int):
    _Image, ImageChops, _ImageDraw, ImageFilter = require_pillow()
    clean_width = max(1, min(32, int(width)))
    kernel = clean_width * 2 + 1
    expanded = mask.filter(ImageFilter.MaxFilter(kernel))
    contracted = mask.filter(ImageFilter.MinFilter(kernel))
    return ImageChops.subtract(expanded, contracted)


def render_comparison(
    *,
    reference,
    points: list[tuple[float, float]],
    faces: list[list[int]],
    width: int,
    height: int,
    fill: bool = True,
    opacity: float = 50.0,
    fill_color: tuple[int, int, int] = (0, 190, 255),
    lines: bool = True,
    line_mode: str = "all",
    line_color: tuple[int, int, int] = (255, 210, 0),
    line_opacity: float = 90.0,
    line_width: int = 1,
    border: bool = True,
    border_color: tuple[int, int, int] = (255, 60, 60),
    border_width: int = 3,
    background: str = "original",
    background_color: tuple[int, int, int] = (255, 255, 255),
    show_axes: bool = False,
):
    Image, _ImageChops, ImageDraw, _ImageFilter = require_pillow()
    mode = str(line_mode).lower()
    if mode not in {"all", "silhouette", "visible"}:
        raise ComparisonRenderError(f"line-mode invalido: {line_mode}")
    if mode == "visible":
        raise ComparisonRenderError(
            "line-mode=visible ainda nao possui oclusao confiavel; use all ou silhouette"
        )
    clean_line_width = int(line_width)
    clean_border_width = int(border_width)
    if clean_line_width < 1 or clean_line_width > 32:
        raise ComparisonRenderError("line-width deve estar entre 1 e 32 pixels")
    if clean_border_width < 1 or clean_border_width > 64:
        raise ComparisonRenderError("border-width deve estar entre 1 e 64 pixels")

    target_size = (int(width), int(height))
    if background == "original":
        base = reference.convert("RGBA")
        if base.size != target_size:
            base = base.resize(target_size, Image.Resampling.LANCZOS)
    elif background == "transparent":
        base = Image.new("RGBA", target_size, (0, 0, 0, 0))
    elif background == "solid":
        base = Image.new("RGBA", target_size, (*background_color, 255))
    else:
        raise ComparisonRenderError(f"background invalido: {background}")

    mask = build_silhouette_mask(target_size, points, faces)

    if fill:
        base = Image.alpha_composite(base, _colorize_mask(mask, fill_color, opacity))

    if lines:
        if mode == "all":
            edge_layer = Image.new("RGBA", target_size, (0, 0, 0, 0))
            edge_draw = ImageDraw.Draw(edge_layer)
            edge_color = _rgba(line_color, line_opacity)
            for first, second in deduplicate_edges(faces):
                try:
                    edge_draw.line(
                        [points[first], points[second]],
                        fill=edge_color,
                        width=clean_line_width,
                    )
                except IndexError as exc:
                    raise ComparisonRenderError(
                        f"aresta referencia ponto inexistente: {(first, second)}"
                    ) from exc
            base = Image.alpha_composite(base, edge_layer)
        else:
            base = Image.alpha_composite(
                base,
                _colorize_mask(
                    _full_outline_mask(mask, clean_line_width),
                    line_color,
                    line_opacity,
                ),
            )

    if border:
        border_mask = _outline_mask(mask, clean_border_width)
        base = Image.alpha_composite(base, _colorize_mask(border_mask, border_color, 100.0))

    if show_axes:
        diagnostics = Image.new("RGBA", target_size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(diagnostics)
        center_x, center_y = width / 2.0, height / 2.0
        draw.line([(0, center_y), (width, center_y)], fill=(255, 255, 255, 160), width=1)
        draw.line([(center_x, 0), (center_x, height)], fill=(255, 255, 255, 160), width=1)
        base = Image.alpha_composite(base, diagnostics)

    return base, mask


def save_png_atomic(image, output_path) -> dict[str, Any]:
    Image, _ImageChops, _ImageDraw, _ImageFilter = require_pillow()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temp = output_path.with_name(output_path.name + ".tmp")
    try:
        image.save(temp, format="PNG", optimize=False)
        with Image.open(temp) as verify:
            verify.load()
            if verify.format != "PNG":
                raise ComparisonRenderError("artefato temporario nao e PNG valido")
            width, height = verify.size
        temp.replace(output_path)
    except Exception:
        temp.unlink(missing_ok=True)
        raise
    stat = output_path.stat()
    return {
        "path": str(output_path),
        "width": int(width),
        "height": int(height),
        "bytes": int(stat.st_size),
    }
