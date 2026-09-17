from __future__ import annotations

import posixpath
from xml.etree import ElementTree as ET

from .a1_refs import rewrite_formula_a1
from .constants import PKG_REL_NS
from .coordinates import AxisTransform, CompactRowsTransform, RangeMoveTransform, TableColumnTransform
from .errors import RecipeError
from .util import canonical_path, make_cell_ref, parse_cell_ref, parse_range_ref, qname
from .workbook import WorkbookContext

Transform = AxisTransform | RangeMoveTransform | TableColumnTransform | CompactRowsTransform

XDR_NS = "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"
CHART_NS = "http://schemas.openxmlformats.org/drawingml/2006/chart"
DRAWING_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing"
CHART_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart"


class DrawingChartManager:
    """Scanner/rewriter conservador para DrawingML e referências ChartML."""

    def __init__(self, workbook: WorkbookContext) -> None:
        self.workbook = workbook
        self.package = workbook.package

    def scan(self, transform: Transform) -> list[dict]:
        out: list[dict] = []
        for sheet_name, drawing_path in self._drawing_bindings():
            root = self.package.get_xml(drawing_path)
            if sheet_name.casefold() == transform.sheet.casefold():
                self._scan_anchors(root, drawing_path, transform, out)
            for chart_path in self._chart_paths(drawing_path):
                self._scan_chart(chart_path, sheet_name, transform, out)
        return out

    def rewrite(self, transform: Transform) -> int:
        changed = 0
        seen_charts: set[str] = set()
        for sheet_name, drawing_path in self._drawing_bindings():
            root = self.package.get_xml(drawing_path)
            drawing_changed = 0
            if sheet_name.casefold() == transform.sheet.casefold():
                drawing_changed = self._rewrite_anchors(root, drawing_path, transform)
                if drawing_changed:
                    self.package.set_xml(drawing_path, root)
                    self.workbook.allowed_parts.add(drawing_path)
                    changed += drawing_changed
            for chart_path in self._chart_paths(drawing_path):
                if chart_path in seen_charts:
                    continue
                seen_charts.add(chart_path)
                chart_root = self.package.get_xml(chart_path)
                chart_changed = self._rewrite_chart(chart_root, chart_path, sheet_name, transform)
                if chart_changed:
                    self.package.set_xml(chart_path, chart_root)
                    self.workbook.allowed_parts.add(chart_path)
                    changed += chart_changed
        return changed

    def _scan_anchors(self, root: ET.Element, drawing_path: str, transform: Transform, out: list[dict]) -> None:
        supported = {
            qname(XDR_NS, "oneCellAnchor"),
            qname(XDR_NS, "twoCellAnchor"),
            qname(XDR_NS, "absoluteAnchor"),
        }
        for index, anchor in enumerate(list(root), 1):
            if anchor.tag not in supported:
                out.append(self._occ("drawing_anchor", drawing_path, f"anchor:{index}", self._local(anchor.tag), "blocker", "tipo de anchor DrawingML não suportado"))
                continue
            if anchor.tag == qname(XDR_NS, "absoluteAnchor"):
                continue
            status, old_ref, new_ref, reason = self._anchor_change(anchor, transform)
            if status == "blocker":
                out.append(self._occ("drawing_anchor", drawing_path, f"anchor:{index}", old_ref, "blocker", reason))
            elif status == "changed":
                out.append(self._occ("drawing_anchor", drawing_path, f"anchor:{index}", old_ref, "rewritable", f"novo anchor {new_ref}"))

    def _rewrite_anchors(self, root: ET.Element, drawing_path: str, transform: Transform) -> int:
        changed = 0
        supported = {
            qname(XDR_NS, "oneCellAnchor"),
            qname(XDR_NS, "twoCellAnchor"),
            qname(XDR_NS, "absoluteAnchor"),
        }
        for index, anchor in enumerate(list(root), 1):
            if anchor.tag not in supported:
                raise RecipeError(f"Drawing {drawing_path} contém anchor não suportado em {index}.")
            if anchor.tag == qname(XDR_NS, "absoluteAnchor"):
                continue
            status, old_ref, new_ref, reason = self._anchor_change(anchor, transform)
            if status == "blocker":
                raise RecipeError(f"Drawing {drawing_path} tornou-se inseguro: {reason or old_ref}")
            if status != "changed" or new_ref is None:
                continue
            if anchor.tag == qname(XDR_NS, "oneCellAnchor"):
                self._set_marker(anchor.find(qname(XDR_NS, "from")), new_ref)
                changed += 1
            else:
                start, end = new_ref.split(":", 1)
                self._set_marker(anchor.find(qname(XDR_NS, "from")), start)
                self._set_marker(anchor.find(qname(XDR_NS, "to")), end)
                changed += 2
        return changed

    def _anchor_change(self, anchor: ET.Element, transform: Transform) -> tuple[str, str, str | None, str | None]:
        start_marker = anchor.find(qname(XDR_NS, "from"))
        if start_marker is None:
            return "blocker", "?", None, "anchor sem marcador from"
        start = self._marker_ref(start_marker)
        if anchor.tag == qname(XDR_NS, "oneCellAnchor"):
            try:
                new = transform.transform_cell_ref(start)
            except RecipeError as exc:
                return "blocker", start, None, str(exc)
            if new is None:
                return "blocker", start, None, "célula de anchor seria removida"
            return ("changed", start, new, None) if new != start else ("same", start, start, None)

        end_marker = anchor.find(qname(XDR_NS, "to"))
        if end_marker is None:
            return "blocker", start, None, "twoCellAnchor sem marcador to"
        end = self._marker_ref(end_marker)
        old = f"{start}:{end}"
        try:
            result = transform.transform_range(old)
        except RecipeError as exc:
            return "blocker", old, None, str(exc)
        if result.ref is None or result.relation in {"partial", "removed"}:
            return "blocker", old, result.ref, f"anchor seria {result.relation}"
        return ("changed", old, result.ref, None) if result.ref != old else ("same", old, old, None)

    def _scan_chart(self, chart_path: str, owner_sheet: str, transform: Transform, out: list[dict]) -> None:
        root = self.package.get_xml(chart_path)
        touched = owner_sheet.casefold() == transform.sheet.casefold()
        formula_changed = False
        for index, node in enumerate(root.iter(qname(CHART_NS, "f")), 1):
            expression = (node.text or "").strip()
            if not expression:
                continue
            _, changed, blockers = rewrite_formula_a1(expression, owner_sheet, transform)
            if changed:
                formula_changed = True
                out.append(self._occ("chart_formula", chart_path, f"f:{index}", expression, "rewritable"))
            for reason in blockers:
                out.append(self._occ("chart_formula", chart_path, f"f:{index}", expression, "blocker", reason))
        if touched or formula_changed:
            for tag, reason in (
                ("pivotSource", "PivotChart depende de V3C"),
                ("externalData", "gráfico com dados externos não é regravável na V3B"),
                ("userShapes", "gráfico possui userShapes não modelado na V3B"),
            ):
                if root.find(f".//{{{CHART_NS}}}{tag}") is not None:
                    out.append(self._occ("chart_feature", chart_path, tag, tag, "blocker", reason))

    def _rewrite_chart(self, root: ET.Element, chart_path: str, owner_sheet: str, transform: Transform) -> int:
        changed_count = 0
        touched = owner_sheet.casefold() == transform.sheet.casefold()
        rewrites: list[tuple[ET.Element, str]] = []
        for node in root.iter(qname(CHART_NS, "f")):
            expression = (node.text or "").strip()
            if not expression:
                continue
            rewritten, changed, blockers = rewrite_formula_a1(expression, owner_sheet, transform)
            if blockers:
                raise RecipeError(f"ChartML {chart_path} contém referência insegura: {'; '.join(blockers)}")
            if changed:
                rewrites.append((node, rewritten))
        if touched or rewrites:
            for tag, reason in (
                ("pivotSource", "PivotChart depende de V3C"),
                ("externalData", "gráfico com dados externos não é regravável na V3B"),
                ("userShapes", "gráfico possui userShapes não modelado na V3B"),
            ):
                if root.find(f".//{{{CHART_NS}}}{tag}") is not None:
                    raise RecipeError(f"ChartML {chart_path} bloqueado: {reason}")
        for node, rewritten in rewrites:
            node.text = rewritten
            changed_count += 1
        return changed_count

    def _drawing_bindings(self):
        for sheet_node in self.workbook.workbook_root.findall("x:sheets/x:sheet", {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}):
            sheet_name = sheet_node.get("name", "")
            sheet_ref = self.workbook.resolve_sheet(sheet_name)
            rels_path = self.workbook.sheet_rels_path(sheet_ref.path)
            if rels_path not in self.package.entries:
                continue
            rels = self.package.get_xml(rels_path)
            for rel in rels.findall(qname(PKG_REL_NS, "Relationship")):
                if rel.get("Type") != DRAWING_REL or not rel.get("Target"):
                    continue
                yield sheet_name, self._resolve_target(sheet_ref.path, rel.get("Target", ""))

    def _chart_paths(self, drawing_path: str) -> list[str]:
        rels_path = self._rels_path(drawing_path)
        if rels_path not in self.package.entries:
            return []
        rels = self.package.get_xml(rels_path)
        paths: list[str] = []
        for rel in rels.findall(qname(PKG_REL_NS, "Relationship")):
            if rel.get("Type") == CHART_REL and rel.get("Target"):
                paths.append(self._resolve_target(drawing_path, rel.get("Target", "")))
        return paths

    @staticmethod
    def _marker_ref(marker: ET.Element) -> str:
        col = marker.find(qname(XDR_NS, "col"))
        row = marker.find(qname(XDR_NS, "row"))
        if col is None or row is None or col.text is None or row.text is None:
            raise RecipeError("Marker DrawingML sem row/col.")
        try:
            return make_cell_ref(int(row.text) + 1, int(col.text) + 1)
        except ValueError as exc:
            raise RecipeError("Marker DrawingML com row/col inválido.") from exc

    @staticmethod
    def _set_marker(marker: ET.Element | None, cell_ref: str) -> None:
        if marker is None:
            raise RecipeError("Marker DrawingML ausente durante reescrita.")
        row_index, col_index = parse_cell_ref(cell_ref)
        col = marker.find(qname(XDR_NS, "col"))
        row = marker.find(qname(XDR_NS, "row"))
        if col is None or row is None:
            raise RecipeError("Marker DrawingML sem row/col durante reescrita.")
        col.text = str(col_index - 1)
        row.text = str(row_index - 1)

    @staticmethod
    def _resolve_target(source_part: str, target: str) -> str:
        return canonical_path(posixpath.normpath(posixpath.join(posixpath.dirname(source_part), target)))

    @staticmethod
    def _rels_path(part: str) -> str:
        directory = posixpath.dirname(part)
        name = posixpath.basename(part)
        return canonical_path(posixpath.join(directory, "_rels", name + ".rels"))

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
