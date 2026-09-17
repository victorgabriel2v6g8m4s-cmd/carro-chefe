from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from tools.excel_recipe.constants import NS
from tools.excel_recipe.engine import execute_recipe
from tools.excel_recipe.package import PackageEditor
from tools.excel_recipe.tests.v3b_helpers import make_v3b_xlsm


class DrawingChartV3BTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.workbook = self.root / "book.xlsm"

    def tearDown(self) -> None:
        self.temp.cleanup()

    def write_recipe(self, operations: list[dict], recipe_id: str) -> Path:
        package = PackageEditor(self.workbook)
        payload = {
            "schema_version": 1,
            "id": recipe_id,
            "workbook": {"path": "book.xlsm", "expected_sha256": package.source_sha256},
            "receipt_path": f"receipts/{recipe_id}.json",
            "operations": operations,
        }
        path = self.root / f"{recipe_id}.json"
        path.write_text(json.dumps(payload), encoding="utf-8")
        return path

    @staticmethod
    def pair(action: str, **fields) -> list[dict]:
        return [
            {"op": "structural.assert_clean", "action": action, **fields},
            {"op": action, **fields},
        ]

    def plan(self, **fields) -> dict:
        recipe = self.write_recipe([{"op": "structural.plan", **fields}], "plan")
        receipt = execute_recipe(recipe, dry_run=True, refresh_snapshot=False, repo_root=self.root)
        return receipt["operations"][0]["structural_plan"]

    def test_insert_rows_rewrites_two_cell_anchor_and_chart_formulas(self) -> None:
        make_v3b_xlsm(self.workbook)
        receipt = execute_recipe(
            self.write_recipe(self.pair("sheet.insert_rows", sheet="Dados", at=2, count=1), "shift-chart"),
            refresh_snapshot=False,
            repo_root=self.root,
        )
        package = PackageEditor(self.workbook)
        drawing = package.get_xml("xl/drawings/drawing1.xml")
        anchor = drawing.find("xdr:twoCellAnchor", NS)
        self.assertIsNotNone(anchor)
        self.assertEqual("3", anchor.find("xdr:from/xdr:row", NS).text)
        self.assertEqual("10", anchor.find("xdr:to/xdr:row", NS).text)

        chart = package.get_xml("xl/charts/chart1.xml")
        formulas = [node.text for node in chart.findall(".//c:f", NS)]
        self.assertEqual(
            ["Dados!$C$4", "Dados!$C$5:$C$7", "Dados!$D$5:$D$7"],
            formulas,
        )
        detail = receipt["operations"][-1]["structural"]
        self.assertEqual(1, detail["rewritten_drawing_anchors"])
        self.assertEqual(3, detail["rewritten_chart_references"])
        self.assertIn("xl/drawings/drawing1.xml", receipt["changed_parts"])
        self.assertIn("xl/charts/chart1.xml", receipt["changed_parts"])

    def test_one_cell_anchor_is_shifted_without_resizing(self) -> None:
        make_v3b_xlsm(self.workbook, anchor="oneCellAnchor")
        execute_recipe(
            self.write_recipe(self.pair("sheet.insert_rows", sheet="Dados", at=2, count=2), "one-cell"),
            refresh_snapshot=False,
            repo_root=self.root,
        )
        drawing = PackageEditor(self.workbook).get_xml("xl/drawings/drawing1.xml")
        anchor = drawing.find("xdr:oneCellAnchor", NS)
        self.assertEqual("4", anchor.find("xdr:from/xdr:row", NS).text)
        self.assertEqual("100", anchor.find("xdr:ext", NS).get("cy"))

    def test_insert_inside_chart_series_blocks_cache_cardinality_change(self) -> None:
        make_v3b_xlsm(self.workbook)
        report = self.plan(action="sheet.insert_rows", sheet="Dados", at=5, count=1)
        self.assertGreater(report["blocker_count"], 0)
        self.assertTrue(
            any(
                item["kind"] == "chart_formula" and "cardinalidade" in item.get("reason", "")
                for item in report["blockers"]
            )
        )

    def test_absolute_anchor_remains_fail_closed(self) -> None:
        make_v3b_xlsm(self.workbook, anchor="absoluteAnchor")
        report = self.plan(action="sheet.insert_rows", sheet="Dados", at=2, count=1)
        self.assertTrue(any(item["kind"] == "drawing_anchor" for item in report["blockers"]))

    def test_unknown_chart_type_remains_fail_closed(self) -> None:
        make_v3b_xlsm(self.workbook, chart_type="sunburstChart")
        report = self.plan(action="sheet.insert_rows", sheet="Dados", at=2, count=1)
        self.assertTrue(
            any(
                item["kind"] == "chart_formula" and "tipo de gráfico" in item.get("reason", "")
                for item in report["blockers"]
            )
        )

    def test_pivot_chart_remains_blocked_until_v3c(self) -> None:
        make_v3b_xlsm(self.workbook, pivot_chart=True)
        report = self.plan(action="sheet.insert_rows", sheet="Dados", at=2, count=1)
        self.assertTrue(
            any(item["kind"] == "chart_formula" and "V3C" in item.get("reason", "") for item in report["blockers"])
        )

    def test_external_data_chart_remains_blocked(self) -> None:
        make_v3b_xlsm(self.workbook, external_data=True)
        report = self.plan(action="sheet.insert_rows", sheet="Dados", at=2, count=1)
        self.assertTrue(
            any(
                item["kind"] == "chart_formula" and "externalData" in item.get("reason", "")
                for item in report["blockers"]
            )
        )


if __name__ == "__main__":
    unittest.main()
