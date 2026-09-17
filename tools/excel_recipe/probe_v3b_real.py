from __future__ import annotations

import json
from pathlib import Path

from .drawing_charts import DrawingChartManager
from .package import PackageEditor
from .structural_v3b import StructuralPlannerV3B
from .util import sha256_file
from .workbook import WorkbookContext

ROOT = Path(__file__).resolve().parents[2]
WORKBOOK = ROOT / "anexos/financeiro/carro chefe.xlsm"


def main() -> int:
    source_before = sha256_file(WORKBOOK)
    package = PackageEditor(WORKBOOK)
    workbook = WorkbookContext(package)
    manager = DrawingChartManager(workbook)

    bindings = list(manager._drawing_bindings())
    inventory = []
    for sheet, drawing in bindings:
        inventory.append({"sheet": sheet, "drawing": drawing, "charts": manager._chart_paths(drawing)})
    if not inventory:
        raise SystemExit("Workbook real não possui DrawingML; V3B não pode ser promovida sem probe real.")

    candidates = []
    for item in inventory:
        sheet = item["sheet"]
        planner = StructuralPlannerV3B(WorkbookContext(PackageEditor(WORKBOOK)), ROOT)
        for at in (2, 4, 5, 12, 20):
            operation = {"op": "structural.plan", "action": "sheet.insert_rows", "sheet": sheet, "at": at, "count": 1}
            report = planner.plan(operation)
            v3b_occurrences = [o for o in report["occurrences"] if o["kind"] in {"drawing_anchor", "chart_formula", "chart_feature"}]
            if v3b_occurrences:
                candidates.append({
                    "sheet": sheet,
                    "at": at,
                    "plan_sha256": report["plan_sha256"],
                    "blocker_count": report["blocker_count"],
                    "parts_impacted": report["parts_impacted"],
                    "v3b_occurrences": v3b_occurrences,
                })

    if not candidates:
        raise SystemExit("Nenhum cenário real produziu ocorrência V3B em anchors/ChartML.")

    clean = next((c for c in candidates if c["blocker_count"] == 0), None)
    blocked = next((c for c in candidates if c["blocker_count"] > 0), None)
    source_after = sha256_file(WORKBOOK)
    if source_before != source_after:
        raise SystemExit("Probe V3B alterou o workbook real durante planejamento.")

    print(json.dumps({
        "inventory": inventory,
        "clean_candidate": clean,
        "blocked_candidate": blocked,
        "candidate_count": len(candidates),
        "workbook_preserved": source_before == source_after,
    }, ensure_ascii=False, sort_keys=True, indent=2))
    if clean is None:
        raise SystemExit("Nenhum cenário real V3B limpo foi encontrado; revisar blockers antes de promover.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
