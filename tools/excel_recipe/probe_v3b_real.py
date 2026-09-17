from __future__ import annotations

import json
import tempfile
from pathlib import Path

from .engine import execute_recipe
from .package import PackageEditor
from .structural_v3b import V3BStructuralPlanner
from .util import sha256_file
from .workbook import WorkbookContext

ROOT = Path(__file__).resolve().parents[2]
WORKBOOK_REL = "anexos/financeiro/carro chefe.xlsm"
WORKBOOK = ROOT / WORKBOOK_REL
TARGET_SHEET = "Fluxo de Caixa"
BLOCKED_SHEET = "ingredientes"
EXPECTED_DRAWING = "xl/drawings/drawing2.xml"
EXPECTED_CHARTS = {"xl/charts/chart1.xml", "xl/charts/chart2.xml"}
EXPECTED_PLAN_SHA256 = "c65bdd1b5b9d51486d715956cabefe067072c0c7088605eeecdaadae97214e13"
EXPECTED_OPERATION = {
    "op": "sheet.insert_rows",
    "sheet": TARGET_SHEET,
    "at": 1,
    "count": 1,
}


def _candidate_operations() -> list[dict]:
    candidates: list[dict] = []
    for at in range(1, 61):
        candidates.append({"op": "sheet.insert_rows", "sheet": TARGET_SHEET, "at": at, "count": 1})
    for at in range(1, 31):
        candidates.append({"op": "sheet.insert_columns", "sheet": TARGET_SHEET, "at": at, "count": 1})
    return candidates


def _plan_operation(operation: dict) -> dict:
    return {
        "op": "structural.plan",
        "action": operation["op"],
        **{key: value for key, value in operation.items() if key != "op"},
    }


def _assert_operation(operation: dict) -> dict:
    return {
        "op": "structural.assert_clean",
        "action": operation["op"],
        **{key: value for key, value in operation.items() if key != "op"},
    }


def _select_clean_plan(planner: V3BStructuralPlanner) -> tuple[dict, dict]:
    diagnostics: list[dict] = []
    for operation in _candidate_operations():
        report = planner.plan(_plan_operation(operation))
        rewritable_kinds = {
            item["kind"]
            for item in report["occurrences"]
            if item["disposition"] == "rewritable"
        }
        if report["blocker_count"] == 0 and {"drawing_anchor", "chart_formula"}.issubset(rewritable_kinds):
            return operation, report
        if len(diagnostics) < 8:
            diagnostics.append({
                "operation": operation,
                "blocker_count": report["blocker_count"],
                "blocker_kinds": sorted({item["kind"] for item in report["blockers"]}),
                "rewritable_kinds": sorted(rewritable_kinds),
            })
    raise SystemExit(
        "Nenhuma transformação real limpa exercitou anchor e chart ao mesmo tempo. "
        + json.dumps(diagnostics, ensure_ascii=False, sort_keys=True)
    )


def _run_dry_recipe(package: PackageEditor, operation: dict) -> dict:
    recipe = {
        "schema_version": 1,
        "id": "probe-v3b-fluxo-caixa",
        "workbook": {
            "path": WORKBOOK_REL,
            "expected_sha256": package.source_sha256,
            "expected_vba_sha256": package.vba_sha256,
            "snapshot": {"enabled": False},
        },
        "receipt_path": "tools/excel_recipe/.probe-v3b-real.receipt.json",
        "operations": [_assert_operation(operation), operation],
    }
    probe_parent = ROOT / "tools/excel_recipe"
    with tempfile.TemporaryDirectory(prefix=".probe-v3b-real-", dir=probe_parent) as temp_dir:
        recipe_path = Path(temp_dir) / "recipe.json"
        recipe_path.write_text(json.dumps(recipe, ensure_ascii=False), encoding="utf-8")
        return execute_recipe(recipe_path, dry_run=True, refresh_snapshot=False, repo_root=ROOT)


def main() -> int:
    source_before = sha256_file(WORKBOOK)
    package = PackageEditor(WORKBOOK)
    workbook = WorkbookContext(package)
    planner = V3BStructuralPlanner(workbook, ROOT)

    operation, selected_plan = _select_clean_plan(planner)
    if operation != EXPECTED_OPERATION:
        raise SystemExit(f"Operação canônica V3B divergiu: {operation} != {EXPECTED_OPERATION}")
    if selected_plan["plan_sha256"] != EXPECTED_PLAN_SHA256:
        raise SystemExit(
            f"plan_sha256 V3B divergente: {selected_plan['plan_sha256']} != {EXPECTED_PLAN_SHA256}"
        )

    receipt = _run_dry_recipe(package, operation)
    recipe_plan = receipt["operations"][0]["structural_plan"]
    applied = receipt["operations"][1]["structural"]
    if recipe_plan["plan_sha256"] != EXPECTED_PLAN_SHA256:
        raise SystemExit("Plano consumido pela receita V3B divergiu do plano canônico.")
    if applied["plan_sha256"] != EXPECTED_PLAN_SHA256:
        raise SystemExit("Mutação V3B não consumiu exatamente o plano canônico aprovado.")

    changed = set(receipt["changed_parts"])
    if EXPECTED_DRAWING not in changed:
        raise SystemExit(f"Probe V3B não regravou o drawing real esperado: {receipt['changed_parts']}")
    changed_charts = EXPECTED_CHARTS.intersection(changed)
    if changed_charts != EXPECTED_CHARTS:
        raise SystemExit(
            "Probe V3B não regravou os dois charts reais canônicos: "
            f"{sorted(changed_charts)} != {sorted(EXPECTED_CHARTS)}"
        )

    blocked_report = planner.plan({
        "op": "structural.plan",
        "action": "sheet.insert_rows",
        "sheet": BLOCKED_SHEET,
        "at": 1,
        "count": 1,
    })
    blocked_kinds = {item["kind"] for item in blocked_report["blockers"]}
    if not {"vml_drawing", "active_object"}.issubset(blocked_kinds):
        raise SystemExit(f"Probe bloqueado V3B perdeu proteções reais: {blocked_report['blockers']}")

    source_after = sha256_file(WORKBOOK)
    if source_before != source_after:
        raise SystemExit("Probe V3B dry-run alterou o workbook real versionado.")

    print(json.dumps({
        "operation": operation,
        "plan_sha256": EXPECTED_PLAN_SHA256,
        "changed_parts": receipt["changed_parts"],
        "changed_charts": sorted(changed_charts),
        "blocked_kinds": sorted(blocked_kinds),
        "workbook_preserved": source_before == source_after,
    }, ensure_ascii=False, sort_keys=True, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
