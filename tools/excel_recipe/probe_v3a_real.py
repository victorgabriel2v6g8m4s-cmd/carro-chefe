from __future__ import annotations

import json
from pathlib import Path

from .engine import execute_recipe
from .util import sha256_file

ROOT = Path(__file__).resolve().parents[2]
WORKBOOK = ROOT / "anexos/financeiro/carro chefe.xlsm"
CLEAN_RECIPE = ROOT / "tools/excel_recipe/examples/probe-v3a-clean-custos-fixos.json"
BLOCKED_RECIPE = ROOT / "tools/excel_recipe/examples/probe-v3a-blocked-configuracoes.json"

EXPECTED_CLEAN_PLAN = "6ff7e0adc6ceb252b3fd6157479c78789e9f8f31eabd9d3ae1a303f5d34fe999"
EXPECTED_BLOCKED_PLAN = "ad1a4768b02fdd12bd6ec56acb8a015be8f275c911f6d6278568639b40f71b3e"
EXPECTED_CLEAN_PARTS = {
    "xl/tables/table12.xml",
    "xl/workbook.xml",
    "xl/worksheets/sheet9.xml",
}


def main() -> int:
    source_before = sha256_file(WORKBOOK)

    clean = execute_recipe(CLEAN_RECIPE, dry_run=True, refresh_snapshot=False, repo_root=ROOT)
    clean_plan = clean["operations"][0]["structural_plan"]
    clean_apply = clean["operations"][1]["structural"]
    if clean_plan["blocker_count"] != 0:
        raise SystemExit(f"Probe limpo V3A ganhou blockers: {clean_plan['blockers']}")
    if clean_plan["plan_sha256"] != EXPECTED_CLEAN_PLAN:
        raise SystemExit(
            f"plan_sha256 limpo divergente: {clean_plan['plan_sha256']} != {EXPECTED_CLEAN_PLAN}"
        )
    if clean_apply["plan_sha256"] != EXPECTED_CLEAN_PLAN:
        raise SystemExit("Mutação V3A não consumiu exatamente o plano aprovado.")
    if not EXPECTED_CLEAN_PARTS.issubset(set(clean["changed_parts"])):
        raise SystemExit(f"Candidato V3A não alterou as partes esperadas: {clean['changed_parts']}")

    blocked = execute_recipe(BLOCKED_RECIPE, dry_run=True, refresh_snapshot=False, repo_root=ROOT)
    blocked_plan = blocked["operations"][0]["structural_plan"]
    if blocked_plan["plan_sha256"] != EXPECTED_BLOCKED_PLAN:
        raise SystemExit(
            f"plan_sha256 bloqueado divergente: {blocked_plan['plan_sha256']} != {EXPECTED_BLOCKED_PLAN}"
        )
    if blocked_plan["blocker_count"] != 1:
        raise SystemExit(f"Probe bloqueado esperava exatamente 1 blocker: {blocked_plan['blockers']}")
    blocker = blocked_plan["blockers"][0]
    if blocker.get("kind") != "vml_drawing" or "vmlDrawing" not in blocker.get("expression", ""):
        raise SystemExit(f"Blocker real inesperado: {blocker}")

    source_after = sha256_file(WORKBOOK)
    if source_before != source_after:
        raise SystemExit("Probe dry-run alterou o workbook real versionado.")

    print(json.dumps({
        "clean_plan_sha256": EXPECTED_CLEAN_PLAN,
        "blocked_plan_sha256": EXPECTED_BLOCKED_PLAN,
        "clean_changed_parts": clean["changed_parts"],
        "blocked_kind": blocker["kind"],
        "workbook_preserved": source_before == source_after,
    }, ensure_ascii=False, sort_keys=True, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
