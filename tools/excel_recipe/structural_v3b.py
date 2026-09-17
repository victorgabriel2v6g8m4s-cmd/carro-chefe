from __future__ import annotations

import hashlib
import json

from .drawings import DrawingSupport
from .structural import StructuralEngine
from .structural_plan import StructuralPlanner


class V3BStructuralPlanner(StructuralPlanner):
    """Amplia o plano V3A com dependências de DrawingML/ChartML."""

    def plan(self, operation: dict) -> dict:
        report = super().plan(operation)
        _, transform, _ = self._build(operation)

        # Remove apenas o blocker genérico de Drawing; VML/ActiveX/OLE continuam protegidos.
        occurrences = [
            item for item in report["occurrences"]
            if not (item.get("kind") == "sheet_object" and "/drawing" in str(item.get("value", "")) and "/vmlDrawing" not in str(item.get("value", "")))
        ]
        occurrences.extend(DrawingSupport(self.workbook).scan(transform))
        occurrences = self._dedupe(occurrences)
        blockers = [item for item in occurrences if item["disposition"] == "blocker"]
        report["occurrences"] = occurrences
        report["rewritable_count"] = sum(item["disposition"] == "rewritable" for item in occurrences)
        report["informational_count"] = sum(item["disposition"] == "informational" for item in occurrences)
        report["blocker_count"] = len(blockers)
        report["blockers"] = blockers
        report["parts_impacted"] = sorted({item["part"] for item in occurrences if item["disposition"] == "rewritable"})
        payload = {key: value for key, value in report.items() if key != "plan_sha256"}
        report["plan_sha256"] = hashlib.sha256(
            json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
        ).hexdigest()
        return report


class V3BStructuralEngine(StructuralEngine):
    """Regrava referências V3A e, em seguida, anchors/charts aprovados pelo plano V3B."""

    def _rewrite_references(self, action, transform, meta, operation) -> int:
        changed = super()._rewrite_references(action, transform, meta, operation)
        changed += DrawingSupport(self.workbook).rewrite(transform)
        return changed
