from __future__ import annotations

import hashlib
import json
import tempfile
from pathlib import Path

from .constants import NS
from .engine import REPO_ROOT, execute_recipe
from .package import PackageEditor
from .structural_v3b import StructuralPlannerV3B
from .workbook import WorkbookContext

WORKBOOK = Path("anexos/financeiro/carro chefe.xlsm")
EXPECTED_SOURCE_SHA256 = "62ceecb5d1349c4b27c37a901bae00aa1ac63884f5d5fe7f3990ad6f33073b70"
EXPECTED_VBA_SHA256 = "b8fa98985cdd1abd7d2d05b1cb7efabf79a8b83399136039dd040a4d6604b0cf"
EXPECTED_CLEAN_PLAN_SHA256 = ""
EXPECTED_BLOCKED_PLAN_SHA256 = ""

_VISUAL_KINDS = {"drawing_anchor", "chart_formula"}
# Poucos deslocamentos canônicos bastam: a busca só roda nas sheets que
# realmente possuem DrawingML, evitando centenas de planos caros no CI.
_ROW_POSITIONS = (1, 2, 3, 5, 10)
_COLUMN_POSITIONS = (1, 2, 3, 5, 10)


def main() -> int:
    source = (REPO_ROOT / WORKBOOK).resolve()
    before = _sha256(source)
    if before != EXPECTED_SOURCE_SHA256:
        raise SystemExit(f"SHA do workbook real mudou: {before}")

    package = PackageEditor(source)
    if package.vba_sha256 != EXPECTED_VBA_SHA256:
        raise SystemExit(f"SHA do VBA mudou: {package.vba_sha256}")
    workbook = WorkbookContext(package)
    planner = StructuralPlannerV3B(workbook, REPO_ROOT)

    clean_operation, clean_plan = _find_clean_visual_plan(workbook, planner)
    if EXPECTED_CLEAN_PLAN_SHA256 and clean_plan["plan_sha256"] != EXPECTED_CLEAN_PLAN_SHA256:
        raise SystemExit(
            f"plan_sha256 V3B limpo divergente: esperado {EXPECTED_CLEAN_PLAN_SHA256}, atual {clean_plan['plan_sha256']}"
        )

    blocked_operation = {
        "op": "structural.plan",
        "action": "sheet.insert_rows",
        "sheet": "configurações",
        "at": 12,
        "count": 1,
    }
    blocked_plan = planner.plan(blocked_operation)
    if blocked_plan["blocker_count"] < 1 or not any(
        item["kind"] == "sheet_object" and "vmlDrawing" in item["expression"]
        for item in blocked_plan["blockers"]
    ):
        raise SystemExit("Probe bloqueado V3B não detectou VML em configurações.")
    if EXPECTED_BLOCKED_PLAN_SHA256 and blocked_plan["plan_sha256"] != EXPECTED_BLOCKED_PLAN_SHA256:
        raise SystemExit(
            f"plan_sha256 V3B bloqueado divergente: esperado {EXPECTED_BLOCKED_PLAN_SHA256}, atual {blocked_plan['plan_sha256']}"
        )

    changed_parts, structural = _execute_clean_dry_run(clean_operation)
    if not any(path.startswith(("xl/drawings/", "xl/charts/")) for path in changed_parts):
        raise SystemExit("Probe limpo V3B não percorreu escrita de drawing/chart real.")
    if structural.get("rewritten_drawing_anchors", 0) + structural.get("rewritten_chart_references", 0) < 1:
        raise SystemExit("Probe limpo V3B não regravou dependência visual.")
    if _sha256(source) != before:
        raise SystemExit("Workbook real foi alterado pelo dry-run V3B.")

    print(
        json.dumps(
            {
                "clean_action": clean_operation["action"],
                "clean_sheet": clean_operation["sheet"],
                "clean_at": clean_operation["at"],
                "clean_plan_sha256": clean_plan["plan_sha256"],
                "clean_visual_occurrences": [
                    {
                        "kind": item["kind"],
                        "part": item["part"],
                        "location": item["location"],
                    }
                    for item in clean_plan["occurrences"]
                    if item["kind"] in _VISUAL_KINDS and item["disposition"] == "rewritable"
                ],
                "clean_changed_parts": changed_parts,
                "blocked_plan_sha256": blocked_plan["plan_sha256"],
                "blocked_count": blocked_plan["blocker_count"],
                "workbook_preserved": True,
            },
            ensure_ascii=False,
            indent=2,
            sort_keys=True,
        )
    )
    return 0


def _find_clean_visual_plan(workbook: WorkbookContext, planner: StructuralPlannerV3B) -> tuple[dict, dict]:
    all_sheets = sorted(
        (node.get("name", "") for node in workbook.workbook_root.findall("x:sheets/x:sheet", NS)),
        key=str.casefold,
    )
    drawing_sheets = [sheet for sheet in all_sheets if planner.visuals._drawings_for_sheet(sheet)]
    if not drawing_sheets:
        raise SystemExit("Workbook real não possui sheets com DrawingML para probe V3B.")

    candidates: list[dict] = []
    for sheet in drawing_sheets:
        for at in _ROW_POSITIONS:
            candidates.append({"op": "structural.plan", "action": "sheet.insert_rows", "sheet": sheet, "at": at, "count": 1})
        for at in _COLUMN_POSITIONS:
            candidates.append({"op": "structural.plan", "action": "sheet.insert_columns", "sheet": sheet, "at": at, "count": 1})

    for operation in candidates:
        try:
            plan = planner.plan(operation)
        except Exception:
            continue
        visual = [
            item
            for item in plan["occurrences"]
            if item["kind"] in _VISUAL_KINDS and item["disposition"] == "rewritable"
        ]
        if plan["blocker_count"] == 0 and visual:
            return operation, plan
    raise SystemExit("Nenhum cenário V3B limpo com DrawingML/chart real foi encontrado.")


def _execute_clean_dry_run(plan_operation: dict) -> tuple[list[str], dict]:
    action = plan_operation["action"]
    fields = {key: value for key, value in plan_operation.items() if key not in {"op", "action"}}
    recipe = {
        "schema_version": 1,
        "id": "probe-v3b-real-clean",
        "workbook": {
            "path": WORKBOOK.as_posix(),
            "expected_sha256": EXPECTED_SOURCE_SHA256,
            "expected_vba_sha256": EXPECTED_VBA_SHA256,
        },
        "receipt_path": ".runtime/probe-v3b-real.receipt.json",
        "operations": [
            {"op": "structural.assert_clean", "action": action, **fields},
            {"op": action, **fields},
        ],
    }
    runtime = REPO_ROOT / ".runtime"
    runtime.mkdir(exist_ok=True)
    with tempfile.NamedTemporaryFile("w", suffix=".json", prefix="probe-v3b-", dir=runtime, delete=False, encoding="utf-8") as handle:
        json.dump(recipe, handle, ensure_ascii=False)
        recipe_path = Path(handle.name)
    try:
        receipt = execute_recipe(recipe_path, dry_run=True, refresh_snapshot=False, repo_root=REPO_ROOT)
    finally:
        recipe_path.unlink(missing_ok=True)
    return receipt["changed_parts"], receipt["operations"][-1]["structural"]


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


if __name__ == "__main__":
    raise SystemExit(main())
