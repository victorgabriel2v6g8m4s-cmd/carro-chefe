from __future__ import annotations

import hashlib
import json

from .drawingml import CONTROL_REL, DRAWING_REL, OLE_REL, VML_REL, DrawingChartManager
from .structural import StructuralEngine
from .structural_plan import StructuralPlanner
from .workbook import WorkbookContext


class StructuralPlannerV3B(StructuralPlanner):
    """Extensão V3B do planner V3A sem duplicar o motor estrutural base."""

    def __init__(self, workbook: WorkbookContext, repo_root) -> None:
        super().__init__(workbook, repo_root)
        self.visuals = DrawingChartManager(workbook)

    def plan(self, operation: dict) -> dict:
        report = super().plan(operation)
        action, transform, _ = self._build(operation)
        occurrences = [
            item
            for item in report["occurrences"]
            if not self._is_v3a_visual_blocker(item)
        ]
        visual_occurrences = self.visuals.scan(transform)
        for item in visual_occurrences:
            # VML, ActiveX/OLE e controles já são blockers V3A estáveis. Não os
            # duplique na V3B para preservar plan_sha256 histórico e contrato.
            if item.get("kind") == "sheet_object" and item.get("expression") in {VML_REL, OLE_REL, CONTROL_REL}:
                continue
            if item.get("kind") == "drawing_part" and item.get("disposition") == "blocker":
                item = {**item, "kind": "sheet_object"}
            occurrences.append(item)
        occurrences = self._dedupe(occurrences)
        blockers = [item for item in occurrences if item["disposition"] == "blocker"]
        report.update(
            {
                "action": action,
                "occurrences": occurrences,
                "rewritable_count": sum(item["disposition"] == "rewritable" for item in occurrences),
                "informational_count": sum(item["disposition"] == "informational" for item in occurrences),
                "blocker_count": len(blockers),
                "blockers": blockers,
                "parts_impacted": sorted(
                    {item["part"] for item in occurrences if item["disposition"] == "rewritable"}
                ),
            }
        )
        payload = dict(report)
        payload.pop("plan_sha256", None)
        report["plan_sha256"] = hashlib.sha256(
            json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
        ).hexdigest()
        return report

    @staticmethod
    def _is_v3a_visual_blocker(item: dict) -> bool:
        if item.get("kind") == "sheet_object" and item.get("expression") == DRAWING_REL:
            return True
        return item.get("kind") == "protected_ooxml" and str(item.get("part", "")).startswith("xl/charts/")


class StructuralEngineV3B(StructuralEngine):
    """Aplica a transformação V3A e depois regrava partes visuais autorizadas."""

    def __init__(self, workbook: WorkbookContext, planner: StructuralPlannerV3B) -> None:
        super().__init__(workbook, planner)
        self.visuals = DrawingChartManager(workbook)

    def apply(self, operation: dict, plan: dict) -> dict:
        # A transformação precisa ser capturada sobre o mesmo estado que originou
        # o plano. Operações de Table mudam a própria definição usada por _build.
        _, transform, _ = self.planner._build(operation)
        result = super().apply(operation, plan)
        visual = self.visuals.apply(transform)
        structural = result["structural"]
        structural["rewritten_drawing_anchors"] = visual["drawing_anchors"]
        structural["rewritten_chart_references"] = visual["chart_references"]
        structural["rewritten_references"] += visual["drawing_anchors"] + visual["chart_references"]
        return result
