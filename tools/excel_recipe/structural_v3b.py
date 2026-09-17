from __future__ import annotations

from .drawing_charts import DrawingChartManager
from .structural import StructuralEngine
from .structural_plan import StructuralPlanner


class StructuralPlannerV3B(StructuralPlanner):
    def __init__(self, workbook, repo_root) -> None:
        super().__init__(workbook, repo_root)
        self.drawing_charts = DrawingChartManager(workbook)

    def _scan_target_ranges(self, transform, out: list[dict]) -> None:
        super()._scan_target_ranges(transform, out)
        out.extend(self.drawing_charts.scan(transform))

    def _scan_sheet_relationships(self, transform, out: list[dict]) -> None:
        sheet_path = self.workbook.resolve_sheet(transform.sheet).path
        rels_path = self.workbook.sheet_rels_path(sheet_path)
        if rels_path not in self.package.entries:
            return
        root = self.package.get_xml(rels_path)
        from .constants import PKG_REL_NS
        from .util import qname

        for rel in root.findall(qname(PKG_REL_NS, "Relationship")):
            rel_type = rel.get("Type", "")
            if any(token in rel_type for token in ("/vmlDrawing", "/oleObject", "/control")):
                out.append(self._occ(
                    "sheet_object",
                    rels_path,
                    rel.get("Id", "?"),
                    rel_type,
                    "blocker",
                    "VML/ActiveX/OLE permanece fora do escopo da V3B",
                ))

    def _scan_protected_parts(self, transform, out: list[dict]) -> None:
        before = len(out)
        super()._scan_protected_parts(transform, out)
        retained = []
        for index, item in enumerate(out):
            if index < before:
                retained.append(item)
                continue
            if item.get("kind") == "protected_ooxml" and str(item.get("part", "")).startswith("xl/charts/"):
                continue
            retained.append(item)
        out[:] = retained


class StructuralEngineV3B(StructuralEngine):
    def __init__(self, workbook, planner: StructuralPlannerV3B) -> None:
        super().__init__(workbook, planner)
        self.drawing_charts = DrawingChartManager(workbook)

    def _rewrite_references(self, action, transform, meta, operation) -> int:
        return super()._rewrite_references(action, transform, meta, operation) + self.drawing_charts.rewrite(transform)
