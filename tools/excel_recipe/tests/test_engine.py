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
from tools.excel_recipe.tests.helpers import make_xlsm


class ExcelRecipeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / "tools/excel_recipe").mkdir(parents=True)
        self.workbook = self.root / "book.xlsm"
        make_xlsm(self.workbook)

    def tearDown(self) -> None:
        self.temp.cleanup()

    def write_recipe(self, operations: list[dict], *, source_sha: str | None = None, recipe_id: str = "test-recipe") -> Path:
        package = PackageEditor(self.workbook)
        recipe = {
            "schema_version": 1,
            "id": recipe_id,
            "workbook": {
                "path": "book.xlsm",
                "expected_sha256": source_sha or package.source_sha256,
                "expected_vba_sha256": package.vba_sha256,
            },
            "receipt_path": f"receipts/{recipe_id}.json",
            "operations": operations,
        }
        path = self.root / f"{recipe_id}.json"
        path.write_text(json.dumps(recipe), encoding="utf-8")
        return path

    def test_dry_run_does_not_modify_source(self) -> None:
        before = self.workbook.read_bytes()
        receipt = execute_recipe(self.write_recipe([{"op": "assert.table", "table": "Itens", "expected_ref": "B3:D5"}]), dry_run=True, refresh_snapshot=False, repo_root=self.root)
        self.assertEqual(before, self.workbook.read_bytes())
        self.assertEqual([], receipt["changed_parts"])

    def test_formula_set_and_copy_preserve_vba_and_activex(self) -> None:
        before = PackageEditor(self.workbook)
        recipe = self.write_recipe([
            {"op": "formula.set", "sheet": "Dados", "cell": "E4", "formula": "=B4*2"},
            {"op": "formula.copy", "sheet": "Dados", "from": "E4", "to": "E5:E6", "translate_relative_refs": True},
        ])
        receipt = execute_recipe(recipe, refresh_snapshot=False, repo_root=self.root)
        after = PackageEditor(self.workbook)
        self.assertEqual(before.vba_sha256, after.vba_sha256)
        self.assertEqual(before.get("xl/activeX/activeX1.bin"), after.get("xl/activeX/activeX1.bin"))
        context = WorkbookContext(after)
        self.assertEqual("=B5*2", context.read_cell("Dados", "E5"))
        self.assertIn("xl/worksheets/sheet1.xml", receipt["changed_parts"])

    def test_upsert_uses_blank_row_and_keeps_calculated_formula(self) -> None:
        recipe = self.write_recipe([{
            "op": "table.upsert_rows", "table": "Itens", "key": ["ID"],
            "rows": [{"ID": "ING-2", "Item": "Queijo"}],
        }])
        execute_recipe(recipe, refresh_snapshot=False, repo_root=self.root)
        context = WorkbookContext(PackageEditor(self.workbook))
        table = TableManager(context).find("Itens")
        self.assertEqual("ING-2", context.read_cell("Dados", "B5"))
        self.assertEqual("Queijo", context.read_cell("Dados", "C5"))
        self.assertEqual("=LEN([@Item])", context.read_cell("Dados", "D5"))
        self.assertEqual("B3:D5", table.ref)

    def test_update_and_delete_are_guarded_by_match_count(self) -> None:
        recipe = self.write_recipe([
            {"op": "table.update_rows", "table": "Itens", "where": {"ID": "ING-1"}, "values": {"Item": "Baguete"}},
            {"op": "table.delete_rows", "table": "Itens", "where": {"ID": "ING-1"}},
        ])
        execute_recipe(recipe, refresh_snapshot=False, repo_root=self.root)
        context = WorkbookContext(PackageEditor(self.workbook))
        self.assertIsNone(context.read_cell("Dados", "B4"))
        self.assertIsNone(context.read_cell("Dados", "C4"))

    def test_create_resize_add_column_and_drop_table(self) -> None:
        recipe = self.write_recipe([
            {"op": "table.create", "sheet": "Dados", "table": "NovaTabela", "ref": "F3:G5", "columns": ["Código", "Valor"]},
            {"op": "table.add_column", "table": "NovaTabela", "name": "Ativo", "default": True},
            {"op": "table.resize", "table": "NovaTabela", "end_row": 6},
            {"op": "table.drop", "table": "NovaTabela", "clear_data": False},
        ])
        receipt = execute_recipe(recipe, refresh_snapshot=False, repo_root=self.root)
        package = PackageEditor(self.workbook)
        self.assertNotIn("xl/tables/table2.xml", package.entries)
        context = WorkbookContext(package)
        self.assertEqual("Código", context.read_cell("Dados", "F3"))
        self.assertEqual("Ativo", context.read_cell("Dados", "H3"))
        self.assertIn("xl/worksheets/sheet1.xml", receipt["changed_parts"])
        with self.assertRaises(RecipeError):
            TableManager(context).find("NovaTabela")

    def test_wrong_source_hash_fails_without_modifying(self) -> None:
        before = self.workbook.read_bytes()
        recipe = self.write_recipe([], source_sha="0" * 64, recipe_id="wrong-hash")
        with self.assertRaises(RecipeError):
            execute_recipe(recipe, refresh_snapshot=False, repo_root=self.root)
        self.assertEqual(before, self.workbook.read_bytes())

    def test_firewall_rejects_protected_part_change(self) -> None:
        package = PackageEditor(self.workbook)
        package.set("xl/activeX/activeX1.bin", b"CHANGED")
        with self.assertRaises(RecipeError):
            package.assert_firewall({"xl/activeX/activeX1.bin"})


if __name__ == "__main__":
    unittest.main()
