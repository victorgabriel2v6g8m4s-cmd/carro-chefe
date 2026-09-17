from __future__ import annotations

import posixpath
from dataclasses import dataclass
from xml.etree import ElementTree as ET

from .a1_refs import rewrite_formula_a1
from .constants import PKG_REL_NS
from .errors import RecipeError
from .util import canonical_path, make_cell_ref, parse_cell_ref, qname
from .workbook import WorkbookContext

XDR_NS = "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"
C_NS = "http://schemas.openxmlformats.org/drawingml/2006/chart"
REL_CHART = "/relationships/chart"
SUPPORTED_ANCHORS = {"oneCellAnchor", "twoCellAnchor", "absoluteAnchor"}
SUPPORTED_OBJECTS = {"graphicFrame", "pic", "sp", "cxnSp", "grpSp"}


@dataclass(frozen=True)
class DrawingRef:
    drawing_path: str
    rels_path: str | None
    chart_paths: tuple[str, ...]


class DrawingSupport:
    """V3B: inventaria e regrava anchors DrawingML e fórmulas de charts clássicos."""

    def __init__(self, workbook: WorkbookContext) -> None:
        self.workbook = workbook
        self.package = workbook.package

    def scan(self, transform) -> list[dict]:
        refs, blockers = self._discover(transform.sheet)
        out = list(blockers)
        for ref in refs:
            root = self.package.get_xml(ref.drawing_path)
            out.extend(self._scan_anchors(root, ref.drawing_path, transform))
            for chart_path in ref.chart_paths:
                out.extend(self._scan_chart(chart_path, transform))
        return out

    def rewrite(self, transform) -> int:
        refs, blockers = self._discover(transform.sheet)
        if blockers:
            raise RecipeError("Drawing V3B tornou-se inseguro após plano limpo.")
        changed = 0
        for ref in refs:
            root = self.package.get_xml(ref.drawing_path)
            drawing_changed = self._rewrite_anchors(root, transform)
            if drawing_changed:
                self.package.set_xml(ref.drawing_path, root)
                self.workbook.allowed_parts.add(ref.drawing_path)
                changed += drawing_changed
            for chart_path in ref.chart_paths:
                chart_root = self.package.get_xml(chart_path)
                chart_changed = self._rewrite_chart(chart_root, chart_path, transform)
                if chart_changed:
                    self.package.set_xml(chart_path, chart_root)
                    self.workbook.allowed_parts.add(chart_path)
                    changed += chart_changed
        return changed

    def _discover(self, sheet: str) -> tuple[list[DrawingRef], list[dict]]:
        sheet_path = self.workbook.resolve_sheet(sheet).path
        rels_path = self.workbook.sheet_rels_path(sheet_path)
        if rels_path not in self.package.entries:
            return [], []
        rels = self.package.get_xml(rels_path)
        refs: list[DrawingRef] = []
        blockers: list[dict] = []
        for rel in rels.findall(qname(PKG_REL_NS, "Relationship")):
            rel_type = rel.get("Type", "")
            target = rel.get("Target", "")
            if rel_type.endswith("/vmlDrawing"):
                blockers.append(self._occ("vml_drawing", rels_path, rel.get("Id", "?"), target, "VML permanece blocker até existir modelo específico"))
                continue
            if any(rel_type.endswith(suffix) for suffix in ("/oleObject", "/control")):
                blockers.append(self._occ("active_object", rels_path, rel.get("Id", "?"), rel_type, "ActiveX/OLE permanece imutável"))
                continue
            if not rel_type.endswith("/drawing"):
                continue
            drawing_path = self._target_path(sheet_path, target)
            if drawing_path not in self.package.entries:
                blockers.append(self._occ("drawing_missing", rels_path, rel.get("Id", "?"), drawing_path, "Drawing relacionado não existe no pacote"))
                continue
            drawing_rels = self._rels_path(drawing_path)
            chart_paths: list[str] = []
            if drawing_rels in self.package.entries:
                droot = self.package.get_xml(drawing_rels)
                for drel in droot.findall(qname(PKG_REL_NS, "Relationship")):
                    dtype = drel.get("Type", "")
                    dtarget = drel.get("Target", "")
                    if dtype.endswith(REL_CHART):
                        chart_path = self._target_path(drawing_path, dtarget)
                        if chart_path not in self.package.entries:
                            blockers.append(self._occ("chart_missing", drawing_rels, drel.get("Id", "?"), chart_path, "Chart relacionado não existe no pacote"))
                        else:
                            chart_paths.append(chart_path)
                    elif any(token in dtype for token in ("/chartEx", "/diagram", "/oleObject", "/control")):
                        blockers.append(self._occ("drawing_relationship", drawing_rels, drel.get("Id", "?"), dtype, "Relacionamento DrawingML ainda não suportado na V3B"))
            refs.append(DrawingRef(drawing_path, drawing_rels if drawing_rels in self.package.entries else None, tuple(sorted(set(chart_paths)))))
        return refs, blockers

    def _scan_anchors(self, root: ET.Element, part: str, transform) -> list[dict]:
        out: list[dict] = []
        for anchor in list(root):
            kind = self._local(anchor.tag)
            if kind not in SUPPORTED_ANCHORS:
                out.append(self._occ("drawing_anchor", part, kind, kind, "Anchor DrawingML não suportado"))
                continue
            if kind == "absoluteAnchor":
                continue
            objects = [self._local(child.tag) for child in list(anchor) if self._local(child.tag) not in {"from", "to", "ext", "clientData"}]
            unsupported = [name for name in objects if name not in SUPPORTED_OBJECTS]
            if unsupported:
                out.append(self._occ("drawing_object", part, kind, ",".join(unsupported), "Objeto DrawingML não suportado"))
                continue
            for marker_name in ("from", "to"):
                marker = anchor.find(qname(XDR_NS, marker_name))
                if marker is None:
                    continue
                old = self._marker_ref(marker)
                try:
                    new = transform.transform_cell_ref(old)
                except RecipeError as exc:
                    out.append(self._occ("drawing_anchor", part, f"{kind}.{marker_name}", old, str(exc)))
                    continue
                if new is None:
                    out.append(self._occ("drawing_anchor", part, f"{kind}.{marker_name}", old, "Anchor cairia em linha/coluna removida"))
                elif new != old:
                    out.append(self._rewritable("drawing_anchor", part, f"{kind}.{marker_name}", old))
        return out

    def _scan_chart(self, chart_path: str, transform) -> list[dict]:
        root = self.package.get_xml(chart_path)
        out: list[dict] = []
        if not root.tag.startswith("{" + C_NS + "}"):
            return [self._occ("chart_type", chart_path, self._local(root.tag), self._local(root.tag), "Somente ChartML clássico é suportado")]
        for node in root.iter(qname(C_NS, "f")):
            if not node.text:
                continue
            _, changed, blockers = rewrite_formula_a1(node.text, "", transform)
            if changed:
                out.append(self._rewritable("chart_formula", chart_path, "c:f", node.text))
            for reason in blockers:
                out.append(self._occ("chart_formula", chart_path, "c:f", node.text, reason))
        return out

    def _rewrite_anchors(self, root: ET.Element, transform) -> int:
        changed = 0
        for anchor in list(root):
            kind = self._local(anchor.tag)
            if kind == "absoluteAnchor":
                continue
            if kind not in SUPPORTED_ANCHORS:
                raise RecipeError(f"Anchor DrawingML não suportado após plano limpo: {kind}")
            for marker_name in ("from", "to"):
                marker = anchor.find(qname(XDR_NS, marker_name))
                if marker is None:
                    continue
                old = self._marker_ref(marker)
                new = transform.transform_cell_ref(old)
                if new is None:
                    raise RecipeError("Anchor DrawingML seria removido após plano limpo.")
                if new != old:
                    row, col = parse_cell_ref(new)
                    marker.find(qname(XDR_NS, "row")).text = str(row - 1)
                    marker.find(qname(XDR_NS, "col")).text = str(col - 1)
                    changed += 1
        return changed

    def _rewrite_chart(self, root: ET.Element, chart_path: str, transform) -> int:
        if not root.tag.startswith("{" + C_NS + "}"):
            raise RecipeError(f"Chart não clássico não suportado: {chart_path}")
        changed = 0
        for node in root.iter(qname(C_NS, "f")):
            if not node.text:
                continue
            text, did_change, blockers = rewrite_formula_a1(node.text, "", transform)
            if blockers:
                raise RecipeError("Chart ficou inseguro após plano limpo: " + "; ".join(blockers))
            if did_change:
                node.text = text
                changed += 1
        return changed

    @staticmethod
    def _marker_ref(marker: ET.Element) -> str:
        col = marker.find(qname(XDR_NS, "col"))
        row = marker.find(qname(XDR_NS, "row"))
        if col is None or row is None or col.text is None or row.text is None:
            raise RecipeError("Anchor DrawingML sem row/col íntegros.")
        return make_cell_ref(int(row.text) + 1, int(col.text) + 1)

    @staticmethod
    def _target_path(owner_path: str, target: str) -> str:
        return canonical_path(posixpath.normpath(posixpath.join(posixpath.dirname(owner_path), target)))

    @staticmethod
    def _rels_path(part: str) -> str:
        return canonical_path(posixpath.join(posixpath.dirname(part), "_rels", posixpath.basename(part) + ".rels"))

    @staticmethod
    def _local(tag: str) -> str:
        return tag.rsplit("}", 1)[-1]

    @staticmethod
    def _rewritable(kind: str, part: str, location: str, expression: str) -> dict:
        return {"kind": kind, "part": part, "location": location, "expression": expression[:240], "disposition": "rewritable", "reason": None}

    @staticmethod
    def _occ(kind: str, part: str, location: str, expression: str, reason: str) -> dict:
        return {"kind": kind, "part": part, "location": location, "expression": expression[:240], "disposition": "blocker", "reason": reason}
