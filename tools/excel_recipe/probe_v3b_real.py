from __future__ import annotations

import json
from pathlib import Path

from .engine import execute_recipe
from .util import sha256_file

ROOT = Path(__file__).resolve().parents[2]
WORKBOOK = ROOT / "anexos/financeiro/carro chefe.xlsm"
CLEAN_RECIPE = ROOT / "tools/excel_recipe/examples/probe-v3b-clean-fluxo-caixa.json"
BLOCKED_RECIPE = ROOT / "tools/excel_recipe/examples/probe-v3b-blocked-ingredientes.json"

EXPECTED_CLEAN_PLAN = "e1cb7cba1f4b5930362d01e48caa5dc664788d0389419ca9ddd542dc797f1ecc"
EXPECTED_BLOCKED_PLAN = "e2ea23e0563503ae6c8f8c1df67581917703103850bd1465c3f52db25a1c68a0"
EXPECTED_V3B_PARTS = {
    "xl/charts/chart1.xml",
    "xl/charts/chart2.xml",
    "xl/drawings/drawing2.xml",
    "xl/tables/table21.xml",
    "xl/worksheets/sheet16.xml",
    "xl/workbook.xml",
}


def main() -> int:
    source_before = sha256_file(WORKBOOK)

    clean = execute_recipe(CLEAN_RECIPE, dry_run=True, refresh_snapshot=False, repo_root=ROOT)
    clean_plan = clean["operations"][0]["structural_plan"]
    clean_apply = clean["operations"][1]["structural"]
    if clean_plan["blocker_count"] != 0:
        raise SystemExit(f"Probe limpo V3B ganhou blockers: {clean_plan['blockers']}")
    if clean_plan["plan_sha256"] != EXPECTED_CLEAN_PLAN:
        raise SystemExit(f"plan_sha256 limpo V3B divergente: {clean_plan['plan_sha256']} != {EXPECTED_CLEAN_PLAN}")
    if clean_apply["plan_sha256"] != EXPECTED_CLEAN_PLAN:
        raise SystemExit("Mutação V3B não consumiu exatamente o plano aprovado.")
    if not EXPECTED_V3B_PARTS.issubset(set(clean["changed_parts"])):
        raise SystemExit(f"Candidato V3B não alterou as partes esperadas: {clean['changed_parts']}")

    blocked = execute_recipe(BLOCKED_RECIPE, dry_run=True, refresh_snapshot=False, repo_root=ROOT)
    blocked_plan = blocked["operations"][0]["structural_plan"]
    if blocked_plan["plan_sha256"] != EXPECTED_BLOCKED_PLAN:
        raise SystemExit(f"plan_sha256 bloqueado V3B divergente: {blocked_plan['plan_sha256']} != {EXPECTED_BLOCKED_PLAN}")
    alternate = [item for item in blocked_plan["blockers"] if item.get("kind") == "drawing_anchor" and item.get("expression") == "AlternateContent"]
    if not alternate:
        raise SystemExit(f"Probe bloqueado V3B perdeu blocker AlternateContent: {blocked_plan['blockers']}")

    source_after = sha256_file(WORKBOOK)
    if source_before != source_after:
        raise SystemExit("Probe dry-run V3B alterou o workbook real versionado.")

    print(json.dumps({
        "clean_plan_sha256": EXPECTED_CLEAN_PLAN,
        "blocked_plan_sha256": EXPECTED_BLOCKED_PLAN,
        "clean_changed_parts": clean["changed_parts"],
        "blocked_alternate_content": len(alternate),
        "workbook_preserved": source_before == source_after,
    }, ensure_ascii=False, sort_keys=True, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
