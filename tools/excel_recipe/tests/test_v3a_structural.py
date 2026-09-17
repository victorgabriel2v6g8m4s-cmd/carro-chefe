from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from tools.excel_recipe.engine import execute_recipe
from tools.excel_recipe.errors import RecipeError
from tools.excel_recipe.package import PackageEditor
from tools.excel_recipe.tables import TableManager
from tools.excel_recipe.workbook import WorkbookContext
from tools.excel_recipe.tests.v3_helpers import make_v3_xlsm


class StructuralV3ATests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.workbook = self.root / "book.xlsm"
        make_v3_xlsm(self.workbook)

    def tearDown(self) -> None:
        self.temp.cleanup()

    def write_recipe(self, operations: list[dict], recipe_id: str) -> Path:
        package = PackageEditor(self.workbook)
        raw = {
            "schema_version": 1,
            "id": recipe_id,
            "workbook": {"path": "book.xlsm", "expected_sha256": package.source_sha256},
            "receipt_path": f"receipts/{recipe_id}.json",
            "operations": operations,
        }
        path = self.root / f"{recipe_id}.json"
        path.write_text(json.dumps(raw), encoding="utf-8")
        return path

    @staticmethod
    def pair(action: str, **fields) -> list[dict]:
        return [
            {"op": "structural.assert_clean", "action": action, **fields},
            {"op": action, **fields},
        ]

    def context(self) -> WorkbookContext:
        return WorkbookContext(PackageEditor(self.workbook))

    def test_insert_rows_moves_cells_references_and_table(self) -> None:
        receipt = execute_recipe(self.write_recipe(self.pair("sheet.insert_rows", sheet="Dados", at=4, count=1), "insert-rows"), refresh_snapshot=False, repo_root=self.root)
        ctx = self.context()
        table = TableManager(ctx).find("Itens")
        self.assertEqual("B3:D7", table.ref)
        self.assertEqual("ING-1", ctx.read_cell("Dados", "B5"))
        self.assertEqual("=Dados!B5", ctx.read_cell("Resumo", "A1"))
        self.assertEqual("=SUM(Dados!D5:D7)", ctx.read_cell("Resumo", "A3"))
        self.assertTrue(receipt["operations"][-1]["structural"]["moved_or_removed_cells"] > 0)

    def test_delete_rows_contracts_supported_ranges(self) -> None:
        execute_recipe(self.write_recipe(self.pair("sheet.delete_rows", sheet="Dados", at=5, count=1), "delete-rows"), refresh_snapshot=False, repo_root=self.root)
        ctx = self.context()
        self.assertEqual("B3:D5", TableManager(ctx).find("Itens").ref)
        self.assertEqual("ING-2", ctx.read_cell("Dados", "B5"))
        self.assertEqual("=Dados!B5", ctx.read_cell("Resumo", "A2"))
        self.assertEqual("=SUM(Dados!D4:D5)", ctx.read_cell("Resumo", "A3"))

    def test_insert_and_delete_sheet_columns_outside_table(self) -> None:
        execute_recipe(self.write_recipe(self.pair("sheet.insert_columns", sheet="Dados", at=1, count=1), "insert-cols"), refresh_snapshot=False, repo_root=self.root)
        ctx = self.context()
        self.assertEqual("C3:E6", TableManager(ctx).find("Itens").ref)
        self.assertEqual("ING-1", ctx.read_cell("Dados", "C4"))
        self.assertEqual("=Dados!C4", ctx.read_cell("Resumo", "A1"))

        recipe = self.write_recipe(self.pair("sheet.delete_columns", sheet="Dados", at=1, count=1), "delete-cols")
        execute_recipe(recipe, refresh_snapshot=False, repo_root=self.root)
        ctx = self.context()
        self.assertEqual("B3:D6", TableManager(ctx).find("Itens").ref)
        self.assertEqual("ING-1", ctx.read_cell("Dados", "B4"))

    def test_table_insert_column_in_middle(self) -> None:
        fields = {"table": "Itens", "position": 2, "name": "Qtd", "default": 1}
        execute_recipe(self.write_recipe(self.pair("table.insert_column", **fields), "table-insert-col"), refresh_snapshot=False, repo_root=self.root)
        ctx = self.context()
        table = TableManager(ctx).find("Itens")
        self.assertEqual(["ID", "Qtd", "Item", "Total"], table.columns)
        self.assertEqual("B3:E6", table.ref)
        self.assertEqual(1, ctx.read_cell("Dados", "C4"))
        self.assertEqual("Pão", ctx.read_cell("Dados", "D4"))
        self.assertEqual("=SUM(Dados!E4:E6)", ctx.read_cell("Resumo", "A3"))

    def test_table_delete_column_when_dependencies_are_clean(self) -> None:
        insert_fields = {"table": "Itens", "position": 2, "name": "Qtd", "default": 1}
        execute_recipe(self.write_recipe(self.pair("table.insert_column", **insert_fields), "prepare-delete-col"), refresh_snapshot=False, repo_root=self.root)
        delete_fields = {"table": "Itens", "column": "Qtd"}
        execute_recipe(self.write_recipe(self.pair("table.delete_column", **delete_fields), "table-delete-col"), refresh_snapshot=False, repo_root=self.root)
        ctx = self.context()
        table = TableManager(ctx).find("Itens")
        self.assertEqual(["ID", "Item", "Total"], table.columns)
        self.assertEqual("B3:D6", table.ref)
        self.assertEqual("Pão", ctx.read_cell("Dados", "C4"))
        self.assertEqual("=SUM(Dados!D4:D6)", ctx.read_cell("Resumo", "A3"))

    def test_table_delete_column_blocks_structured_dependency(self) -> None:
        recipe = self.write_recipe([
            {"op": "structural.assert_clean", "action": "table.delete_column", "table": "Itens", "column": "Item"},
            {"op": "table.delete_column", "table": "Itens", "column": "Item"},
        ], "blocked-delete-col")
        with self.assertRaises(RecipeError):
            execute_recipe(recipe, refresh_snapshot=False, repo_root=self.root)

    def test_compact_rows_removes_logical_blank_and_rewrites_references(self) -> None:
        execute_recipe(self.write_recipe(self.pair("table.compact_rows", table="Itens"), "compact"), refresh_snapshot=False, repo_root=self.root)
        ctx = self.context()
        self.assertEqual("B3:D5", TableManager(ctx).find("Itens").ref)
        self.assertEqual("ING-2", ctx.read_cell("Dados", "B5"))
        self.assertEqual("=Dados!B5", ctx.read_cell("Resumo", "A2"))

    def test_range_move_moves_values_and_external_reference(self) -> None:
        operations = [
            {"op": "formula.set", "sheet": "Resumo", "cell": "A1", "formula": "=Dados!F5"},
            *self.pair("range.move", sheet="Dados", source="F5:G6", destination="H5"),
        ]
        execute_recipe(self.write_recipe(operations, "move-range"), refresh_snapshot=False, repo_root=self.root)
        ctx = self.context()
        self.assertIsNone(ctx.read_cell("Dados", "F5"))
        self.assertEqual("M1", ctx.read_cell("Dados", "H5"))
        self.assertEqual(10, ctx.read_cell("Dados", "I5"))
        self.assertEqual("=Dados!H5", ctx.read_cell("Resumo", "A1"))

    def test_empty_drawing_is_not_blocker_after_v3b(self) -> None:
        make_v3_xlsm(self.workbook, with_drawing=True)
        recipe = self.write_recipe([
            {"op": "structural.plan", "action": "sheet.insert_rows", "sheet": "Dados", "at": 4, "count": 1}
        ], "drawing-plan")
        receipt = execute_recipe(recipe, dry_run=True, refresh_snapshot=False, repo_root=self.root)
        report = receipt["operations"][0]["structural_plan"]
        self.assertEqual(0, report["blocker_count"])

    def test_structural_plan_becomes_stale_after_mutation(self) -> None:
        operations = [
            {"op": "structural.assert_clean", "action": "sheet.insert_rows", "sheet": "Dados", "at": 7, "count": 1},
            {"op": "cell.set", "sheet": "Resumo", "cell": "B1", "value": "mudou"},
            {"op": "sheet.insert_rows", "sheet": "Dados", "at": 7, "count": 1},
        ]
        with self.assertRaises(RecipeError):
            execute_recipe(self.write_recipe(operations, "stale-plan"), refresh_snapshot=False, repo_root=self.root)


if __name__ == "__main__":
    unittest.main()
