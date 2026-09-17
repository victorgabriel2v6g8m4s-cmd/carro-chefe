from __future__ import annotations

import posixpath
import re
from collections import defaultdict
from dataclasses import dataclass
from xml.etree import ElementTree as ET

from .a1_refs import rewrite_formula_a1
from .constants import CHART_NS, DRAWING_NS, NS, PKG_REL_NS, REL_NS
from .coordinates import AxisTransform, CompactRowsTransform, RangeMoveTransform, TableColumnTransform
from .errors import RecipeError
from .util import canonical_path, make_cell_ref, make_range_ref, parse_cell_ref, parse_range_ref, qname
from .workbook import WorkbookContext

Transform = AxisTransform | RangeMoveTransform | TableColumnTransform | CompactRowsTransform

DRAWING_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing"
VML_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/vmlDrawing"
OLE_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/oleObject"
CONTROL_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/control"
CHART_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart"

_SUPPORTED_ANCHORS = {"oneCellAnchor", "twoCellAnchor"}
_SUPPORTED_OBJECTS = {"sp", "grpSp", "graphicFrame", "cxnSp", "pic"}
_SUPPORTED_CHART_TYPES = {
    "area3DChart",
    "areaChart",
    "bar3DChart",
    "barChart",
    "bubbleChart",
    "doughnutChart",
    "line3DChart",
    "lineChart",
    "ofPieChart",
    "pie3DChart",
    "pieChart",
    "radarChart",
    "scatterChart",
    "stockChart",
    "surface3DChart",
    "surfaceChart",
}
_CHART_A1 = re.compile(
    r"(?<![\w.\]\[])"
    r"(?P<prefix>(?:(?P<sheet>'(?:[^']|'')+'|[\w.]+)!)?)"
    r"(?P<start>\$?[A-Z]{1,3}\$?[1-9][0-9]*)"
    r"(?::(?P<end>\$?[A-Z]{1,3}\$?[1-9][0-9]*))?"
    r"(?![\w.\[])",
    re.IGNORECASE | re.UNICODE,
)


@dataclass(frozen=True)
class DrawingPart:
    sheet: str
    sheet_path: str
    sheet_rels_path: str
    path: str


class DrawingChartManager:
    """V3B: dependências DrawingML e fórmulas de gráficos clássicos.

    O manager só regrava anchors DrawingML conhecidos e referências A1 de chart
    que preservam a cardinalidade do cache. VML, ActiveX/OLE, PivotChart,
    externalData e variantes desconhecidas continuam fail-closed.
    """

    def __init__(self, workbook: WorkbookContext) -> None:
        self.workbook = workbook
        self.package = workbook.package

    def scan(self, transform: Transform) -> list[dict]:
        out: list[dict] = []
        self._scan_target_sheet_relationships(transform, out)
        self._scan_target_anchors(transform, out)
        self._scan_chart_references(transform, out)
        return out

    def apply(self, transform: Transform) -> dict[str, int]:
        anchors = self._rewrite_target_anchors(transform)
        charts = self._rewrite_chart_references(transform)
        return {"drawing_anchors": anchors, "chart_references": charts}

    def _scan_target_sheet_relationships(self, transform: Transform, out: list[dict]) -> None:
        sheet_path = self.workbook.resolve_sheet(transform.sheet).path
        rels_path = self.workbook.sheet_rels_path(sheet_path)
        if rels_path not in self.package.entries:
            return
        root = self.package.get_xml(rels_path)
        for rel in root.findall(qname(PKG_REL_NS, "Relationship")):
            rel_type = rel.get("Type", "")
            if rel_type == DRAWING_REL:
                if rel.get("TargetMode") == "External":
                    out.append(self._occ("drawing_relationship", rels_path, rel.get("Id", "?"), rel.get("Target", ""), "blocker", "drawing externo não é suportado"))
                continue
            if rel_type in {VML_REL, OLE_REL, CONTROL_REL}:
                out.append(self._occ("sheet_object", rels_path, rel.get("Id", "?"), rel_type, "blocker", "VML/ActiveX/OLE permanece imutável na V3B"))

    def _scan_target_anchors(self, transform: Transform, out: list[dict]) -> None:
        drawings = self._drawings_for_sheet(transform.sheet)
        for drawing in drawings:
            root = self.package.get_xml(drawing.path)
            anchors = list(root)
            if not anchors:
                out.append(self._occ("drawing_part", drawing.path, "wsDr", "sem anchors", "blocker", "drawing sem anchor DrawingML suportado"))
                continue
            for index, anchor in enumerate(anchors):
                anchor_name = self._local(anchor.tag)
                location = f"anchor:{index}"
                if anchor_name not in _SUPPORTED_ANCHORS:
                    out.append(self._occ("drawing_anchor", drawing.path, location, anchor_name, "blocker", "apenas oneCellAnchor/twoCellAnchor são suportados na V3B"))
                    continue
                unsupported = [
                    self._local(child.tag)
                    for child in list(anchor)
                    if self._local(child.tag) not in {"from", "to", "ext", "clientData"} | _SUPPORTED_OBJECTS
                ]
                objects = [child for child in list(anchor) if self._local(child.tag) in _SUPPORTED_OBJECTS]
                if unsupported or not objects:
                    reason = "objeto DrawingML não suportado" if unsupported else "anchor sem objeto DrawingML conhecido"
                    expression = ",".join(unsupported) if unsupported else anchor_name
                    out.append(self._occ("drawing_object", drawing.path, location, expression, "blocker", reason))
                    continue
                try:
                    old_ref, new_ref, relation = self._anchor_change(anchor, transform)
                except RecipeError as exc:
                    out.append(self._occ("drawing_anchor", drawing.path, location, anchor_name, "blocker", str(exc)))
                    continue
                if relation in {"partial", "removed"}:
                    out.append(self._occ("drawing_anchor", drawing.path, location, old_ref, "blocker", f"anchor seria {relation}"))
                elif new_ref != old_ref:
                    out.append(self._occ("drawing_anchor", drawing.path, location, old_ref, "rewritable"))

    def _scan_chart_references(self, transform: Transform, out: list[dict]) -> None:
        owners = self._chart_owners()
        for path in sorted(name for name in self.package.entries if name.startswith("xl/charts/") and name.endswith(".xml")):
            try:
                root = self.package.get_xml(path)
            except RecipeError as exc:
                out.append(self._occ("chart_part", path, "xml", "inválido", "blocker", str(exc)))
                continue
            context = self._chart_context(owners.get(path, set()))
            chart_types = self._chart_types(root)
            has_pivot = root.find(".//c:pivotSource", NS) is not None
            has_external = root.find(".//c:externalData", NS) is not None
            formula_nodes = set(root.findall(".//c:f", NS))
            for node in root.iter():
                text = node.text or ""
                if not text.strip():
                    continue
                rewritten, changed, blockers = rewrite_formula_a1(text, context, transform)
                is_formula = node in formula_nodes
                if blockers and is_formula:
                    for reason in blockers:
                        out.append(self._occ("chart_formula", path, self._local(node.tag), text[:240], "blocker", reason))
                    continue
                if not changed:
                    if isinstance(transform, TableColumnTransform) and is_formula and "[" in text:
                        out.append(self._occ("chart_formula", path, self._local(node.tag), text[:240], "blocker", "referência estruturada de gráfico não é suportada para alteração física de coluna"))
                    continue
                if not is_formula:
                    out.append(self._occ("chart_unknown_reference", path, self._local(node.tag), text[:240], "blocker", "referência afetada fora de c:f não possui rewriter V3B"))
                    continue
                reason = self._chart_block_reason(root, chart_types, text, rewritten, has_pivot, has_external)
                if reason:
                    out.append(self._occ("chart_formula", path, self._local(node.tag), text[:240], "blocker", reason))
                else:
                    out.append(self._occ("chart_formula", path, self._local(node.tag), text[:240], "rewritable"))

    def _rewrite_target_anchors(self, transform: Transform) -> int:
        changed = 0
        for drawing in self._drawings_for_sheet(transform.sheet):
            root = self.package.get_xml(drawing.path)
            root_changed = False
            for anchor in list(root):
                anchor_name = self._local(anchor.tag)
                if anchor_name not in _SUPPORTED_ANCHORS:
                    raise RecipeError(f"Drawing {drawing.path} contém anchor V3B não suportado: {anchor_name}")
                old_ref, new_ref, relation = self._anchor_change(anchor, transform)
                if relation in {"partial", "removed"}:
                    raise RecipeError(f"Drawing {drawing.path} tornou-se inseguro após plano limpo: {old_ref} ({relation})")
                if new_ref == old_ref:
                    continue
                if anchor_name == "oneCellAnchor":
                    self._set_marker(anchor.find("xdr:from", NS), new_ref)
                else:
                    start_ref, end_ref = new_ref.split(":")
                    self._set_marker(anchor.find("xdr:from", NS), start_ref)
                    self._set_marker(anchor.find("xdr:to", NS), end_ref)
                changed += 1
                root_changed = True
            if root_changed:
                self.package.set_xml(drawing.path, root)
                self.workbook.allowed_parts.add(drawing.path)
        return changed

    def _rewrite_chart_references(self, transform: Transform) -> int:
        owners = self._chart_owners()
        changed_total = 0
        for path in sorted(name for name in self.package.entries if name.startswith("xl/charts/") and name.endswith(".xml")):
            root = self.package.get_xml(path)
            context = self._chart_context(owners.get(path, set()))
            chart_types = self._chart_types(root)
            has_pivot = root.find(".//c:pivotSource", NS) is not None
            has_external = root.find(".//c:externalData", NS) is not None
            root_changed = False
            for node in root.findall(".//c:f", NS):
                text = node.text or ""
                rewritten, did_change, blockers = rewrite_formula_a1(text, context, transform)
                if blockers:
                    raise RecipeError("Fórmula de gráfico tornou-se insegura após plano limpo: " + "; ".join(blockers))
                if not did_change:
                    if isinstance(transform, TableColumnTransform) and "[" in text:
                        raise RecipeError("Referência estruturada de gráfico não é suportada para alteração física de coluna.")
                    continue
                reason = self._chart_block_reason(root, chart_types, text, rewritten, has_pivot, has_external)
                if reason:
                    raise RecipeError(f"Gráfico {path} tornou-se inseguro após plano limpo: {reason}")
                node.text = rewritten
                changed_total += 1
                root_changed = True
            if root_changed:
                self.package.set_xml(path, root)
                self.workbook.allowed_parts.add(path)
        return changed_total

    def _anchor_change(self, anchor: ET.Element, transform: Transform) -> tuple[str, str, str]:
        anchor_name = self._local(anchor.tag)
        start = self._marker_ref(anchor.find("xdr:from", NS))
        if anchor_name == "oneCellAnchor":
            new = transform.transform_cell_ref(start)
            if new is None:
                return start, start, "removed"
            return start, new, "shifted" if new != start else "unaffected"
        end = self._marker_ref(anchor.find("xdr:to", NS))
        srow, scol = parse_cell_ref(start)
        erow, ecol = parse_cell_ref(end)
        if erow < srow or ecol < scol:
            raise RecipeError("twoCellAnchor possui marcadores invertidos")
        old_range = make_range_ref(srow, scol, erow, ecol)
        change = transform.transform_range(old_range)
        if change.ref is None:
            return old_range, old_range, "removed"
        return old_range, change.ref, change.relation

    def _drawings_for_sheet(self, sheet_name: str) -> list[DrawingPart]:
        sheet = self.workbook.resolve_sheet(sheet_name)
        rels_path = self.workbook.sheet_rels_path(sheet.path)
        if rels_path not in self.package.entries:
            return []
        rels = self.package.get_xml(rels_path)
        result: list[DrawingPart] = []
        for rel in rels.findall(qname(PKG_REL_NS, "Relationship")):
            if rel.get("Type") != DRAWING_REL or rel.get("TargetMode") == "External":
                continue
            target = rel.get("Target")
            if not target:
                continue
            path = self._resolve_target(sheet.path, target)
            if path not in self.package.entries:
                continue
            result.append(DrawingPart(sheet_name, sheet.path, rels_path, path))
        return sorted(result, key=lambda item: item.path)

    def _chart_owners(self) -> dict[str, set[str]]:
        owners: dict[str, set[str]] = defaultdict(set)
        for sheet_node in self.workbook.workbook_root.findall("x:sheets/x:sheet", NS):
            sheet_name = sheet_node.get("name", "")
            for drawing in self._drawings_for_sheet(sheet_name):
                root = self.package.get_xml(drawing.path)
                rels_path = self._rels_path(drawing.path)
                if rels_path not in self.package.entries:
                    continue
                rels = self.package.get_xml(rels_path)
                targets = {
                    rel.get("Id"): (rel.get("Type"), rel.get("Target"), rel.get("TargetMode"))
                    for rel in rels.findall(qname(PKG_REL_NS, "Relationship"))
                }
                for chart in root.findall(".//c:chart", NS):
                    rel_id = chart.get(qname(REL_NS, "id"))
                    rel_type, target, target_mode = targets.get(rel_id, (None, None, None))
                    if rel_type != CHART_REL or not target or target_mode == "External":
                        continue
                    owners[self._resolve_target(drawing.path, target)].add(sheet_name)
        return owners

    @staticmethod
    def _chart_context(owners: set[str]) -> str:
        return next(iter(owners)) if len(owners) == 1 else ""

    @staticmethod
    def _chart_types(root: ET.Element) -> set[str]:
        result: set[str] = set()
        for node in root.iter():
            if node.tag.startswith("{" + CHART_NS + "}"):
                local = DrawingChartManager._local(node.tag)
                if local.endswith("Chart") and local != "chart":
                    result.add(local)
        return result

    def _chart_block_reason(
        self,
        root: ET.Element,
        chart_types: set[str],
        original: str,
        rewritten: str,
        has_pivot: bool,
        has_external: bool,
    ) -> str | None:
        if has_pivot:
            return "PivotChart permanece fora do escopo até V3C"
        if has_external:
            return "chart externalData não é suportado na V3B"
        unsupported = sorted(chart_types - _SUPPORTED_CHART_TYPES)
        if unsupported:
            return "tipo de gráfico não suportado: " + ", ".join(unsupported)
        if not chart_types:
            return "tipo de gráfico clássico não pôde ser identificado"
        if not self._preserves_reference_shape(original, rewritten):
            return "transformação alteraria a cardinalidade do cache do gráfico"
        if root.find(".//c:extLst", NS) is not None and self._contains_extension_reference(root, original):
            return "extensão de gráfico com referência afetada não possui rewriter V3B"
        return None

    @staticmethod
    def _contains_extension_reference(root: ET.Element, original: str) -> bool:
        ext = root.find(".//c:extLst", NS)
        if ext is None:
            return False
        needle = original.strip()
        return any((node.text or "").strip() == needle for node in ext.iter())

    @staticmethod
    def _preserves_reference_shape(original: str, rewritten: str) -> bool:
        before = DrawingChartManager._reference_shapes(original)
        after = DrawingChartManager._reference_shapes(rewritten)
        return before == after and bool(before)

    @staticmethod
    def _reference_shapes(expression: str) -> list[tuple[int, int]]:
        result: list[tuple[int, int]] = []
        for match in _CHART_A1.finditer(expression):
            start = match.group("start").replace("$", "")
            end = (match.group("end") or match.group("start")).replace("$", "")
            srow, scol = parse_cell_ref(start)
            erow, ecol = parse_cell_ref(end)
            result.append((erow - srow + 1, ecol - scol + 1))
        return result

    @staticmethod
    def _marker_ref(marker: ET.Element | None) -> str:
        if marker is None:
            raise RecipeError("anchor DrawingML sem marker")
        row = marker.find("xdr:row", NS)
        col = marker.find("xdr:col", NS)
        if row is None or col is None or row.text is None or col.text is None:
            raise RecipeError("anchor DrawingML sem row/col")
        try:
            row_index = int(row.text)
            col_index = int(col.text)
        except ValueError as exc:
            raise RecipeError("anchor DrawingML com row/col inválido") from exc
        if row_index < 0 or col_index < 0:
            raise RecipeError("anchor DrawingML com coordenada negativa")
        return make_cell_ref(row_index + 1, col_index + 1)

    @staticmethod
    def _set_marker(marker: ET.Element | None, cell_ref: str) -> None:
        if marker is None:
            raise RecipeError("anchor DrawingML sem marker")
        row_node = marker.find("xdr:row", NS)
        col_node = marker.find("xdr:col", NS)
        if row_node is None or col_node is None:
            raise RecipeError("anchor DrawingML sem row/col")
        row, col = parse_cell_ref(cell_ref)
        row_node.text = str(row - 1)
        col_node.text = str(col - 1)

    @staticmethod
    def _resolve_target(source_path: str, target: str) -> str:
        return canonical_path(posixpath.normpath(posixpath.join(posixpath.dirname(source_path), target)))

    @staticmethod
    def _rels_path(part_path: str) -> str:
        directory, filename = posixpath.split(part_path)
        return posixpath.join(directory, "_rels", filename + ".rels")

    @staticmethod
    def _local(tag: str) -> str:
        return tag.rsplit("}", 1)[-1]

    @staticmethod
    def _occ(kind: str, part: str, location: str, expression: str, disposition: str, reason: str | None = None) -> dict:
        item = {
            "kind": kind,
            "part": part,
            "location": location,
            "expression": expression,
            "disposition": disposition,
        }
        if reason:
            item["reason"] = reason
        return item
