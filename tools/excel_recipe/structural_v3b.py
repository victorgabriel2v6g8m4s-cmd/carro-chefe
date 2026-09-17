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

        occurrences = [
            item for item in report["occurrences"]
            if not self._replaced_sheet_object_blocker(item)
            and not (
                item.get("kind") == "protected_ooxml"
                and str(item.get("part", "")).startswith("xl/charts/")
            )
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

    @staticmethod
    def _replaced_sheet_object_blocker(item: dict) -> bool:
        if item.get("kind") != "sheet_object":
            return False
        expression = str(item.get("expression", ""))
        # Estes relationships possuem scanner específico na V3B. Remover o
        # blocker legado evita diagnósticos duplicados sem relaxar a proteção:
        # DrawingSupport volta a emitir rewritable ou blocker específico.
        return any(
            token in expression
            for token in ("/drawing", "/vmlDrawing", "/oleObject", "/control")
        )


class V3BStructuralEngine(StructuralEngine):
    """Regrava referências V3A e, em seguida, anchors/charts aprovados pelo plano V3B."""

    def _rewrite_references(self, action, transform, meta, operation) -> int:
        changed = super()._rewrite_references(action, transform, meta, operation)
        changed += DrawingSupport(self.workbook).rewrite(transform)
        return changed
