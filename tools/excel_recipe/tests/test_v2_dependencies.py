from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from tools.excel_recipe.engine import execute_recipe
from tools.excel_recipe.errors import RecipeError
from tools.excel_recipe.package import PackageEditor
from tools.excel_recipe.tables import TableManager
from tools.excel_recipe.tests.helpers import make_xlsm, write_vba_snapshot
from tools.excel_recipe.workbook import WorkbookContext


class ExcelRecipeV2Tests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.workbook = self.root / "book.xlsm"
        make_xlsm(self.workbook)
        write_vba_snapshot(self.root)

    def tearDown(self) -> None:
        self.temp.cleanup()

    def recipe(self, operations: list[dict], recipe_id: str = "v2-test") -> Path:
        package = PackageEditor(self.workbook)
        payload = {
            "schema_version": 1,
            "id": recipe_id,
            "workbook": {
                "path": "book.xlsm",
                "expected_sha256": package.source_sha256,
                "expected_vba_sha256": package.vba_sha256,
            },
            "receipt_path": f"receipts/{recipe_id}.json",
            "operations": operations,
        }
        path = self.root / f"{recipe_id}.json"
        path.write_text(json.dumps(payload), encoding="utf-8")
        return path

    def test_dependency_scan_is_deterministic_and_finds_known_contexts(self) -> None:
        path = self.recipe([{"op": "dependency.scan", "table": "Itens"}], "scan-table")
        first = execute_recipe(path, dry_run=True, refresh_snapshot=False, repo_root=self.root)
        second = execute_recipe(path, dry_run=True, refresh_snapshot=False, repo_root=self.root)
        report1 = first["operations"][0]["dependency_report"]
        report2 = second["operations"][0]["dependency_report"]
        self.assertEqual(report1["plan_sha256"], report2["plan_sha256"])
        self.assertEqual(report1["occurrences"], report2["occurrences"])
        self.assertEqual(0, report1["blocker_count"])
        kinds = {item["kind"] for item in report1["occurrences"]}
        self.assertIn("defined_name", kinds)
        self.assertIn("cell_formula", kinds)
        self.assertIn("table_definition", kinds)

    def test_table_rename_requires_clean_plan(self) -> None:
        path = self.recipe([{"op": "table.rename", "table": "Itens", "new_name": "ItensNovo"}], "missing-plan")
        with self.assertRaisesRegex(RecipeError, "dependency.assert_clean"):
            execute_recipe(path, dry_run=True, refresh_snapshot=False, repo_root=self.root)

    def test_table_rename_rewrites_known_references(self) -> None:
        path = self.recipe([
            {"op": "dependency.assert_clean", "table": "Itens"},
            {"op": "table.rename", "table": "Itens", "new_name": "ItensNovo"},
        ], "rename-table")
        before = PackageEditor(self.workbook)
        receipt = execute_recipe(path, refresh_snapshot=False, repo_root=self.root)
        after = PackageEditor(self.workbook)
        context = WorkbookContext(after)
        renamed = TableManager(context).find("ItensNovo")
        self.assertEqual("ItensNovo", renamed.root.get("displayName"))
        self.assertEqual("=SUM(ItensNovo[Total])", context.read_cell("Dados", "E1"))
        defined = context.workbook_root.find("x:definedNames/x:definedName", {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"})
        self.assertIsNotNone(defined)
        self.assertIn("ItensNovo", defined.text or "")
        self.assertEqual(before.vba_sha256, after.vba_sha256)
        self.assertIn("xl/tables/table1.xml", receipt["changed_parts"])

    def test_column_rename_rewrites_local_and_qualified_references(self) -> None:
        path = self.recipe([
            {"op": "dependency.assert_clean", "table": "Itens", "column": "Item"},
            {"op": "table.rename_column", "table": "Itens", "column": "Item", "new_name": "Produto"},
        ], "rename-column")
        execute_recipe(path, refresh_snapshot=False, repo_root=self.root)
        context = WorkbookContext(PackageEditor(self.workbook))
        table = TableManager(context).find("Itens")
        self.assertIn("Produto", table.columns)
        self.assertNotIn("Item", table.columns)
        self.assertEqual("Produto", context.read_cell("Dados", "C3"))
        self.assertEqual("=LEN([@Produto])", context.read_cell("Dados", "D4"))
        defined = list(context.workbook_root.findall("x:definedNames/x:definedName", {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}))
        self.assertTrue(any("Itens[Produto]" in (node.text or "") for node in defined))

    def test_vba_occurrence_blocks_refactor(self) -> None:
        write_vba_snapshot(self.root, module_text='Sub Teste()\n MsgBox "Itens"\nEnd Sub\n')
        path = self.recipe([{"op": "dependency.assert_clean", "table": "Itens"}], "vba-blocker")
        with self.assertRaisesRegex(RecipeError, "VBA|dependência"):
            execute_recipe(path, dry_run=True, refresh_snapshot=False, repo_root=self.root)

    def test_protected_chart_occurrence_blocks_refactor(self) -> None:
        make_xlsm(self.workbook, extra_files={"xl/charts/chart1.xml": b"<chart><f>Itens[Total]</f></chart>"})
        write_vba_snapshot(self.root)
        path = self.recipe([{"op": "dependency.assert_clean", "table": "Itens"}], "chart-blocker")
        with self.assertRaisesRegex(RecipeError, "dependência"):
            execute_recipe(path, dry_run=True, refresh_snapshot=False, repo_root=self.root)

    def test_plan_is_invalidated_by_intervening_mutation(self) -> None:
        path = self.recipe([
            {"op": "dependency.assert_clean", "table": "Itens"},
            {"op": "cell.set", "sheet": "Dados", "cell": "A2", "value": "mudou"},
            {"op": "table.rename", "table": "Itens", "new_name": "ItensNovo"},
        ], "stale-plan")
        with self.assertRaisesRegex(RecipeError, "obsoleto"):
            execute_recipe(path, dry_run=True, refresh_snapshot=False, repo_root=self.root)


if __name__ == "__main__":
    unittest.main()
