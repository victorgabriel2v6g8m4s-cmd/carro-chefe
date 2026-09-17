from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from tools.excel_recipe.constants import DEFAULT_SNAPSHOT_OUTPUT, DEFAULT_WORKBOOK
from tools.excel_recipe.engine import execute_recipe
from tools.excel_recipe.errors import RecipeError
from tools.excel_recipe.package import PackageEditor
from tools.excel_recipe.recipe import load_recipe
from tools.excel_recipe.tests.helpers import make_xlsm
from tools.excel_recipe.workbook import WorkbookContext


class GenericExcelRecipeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.workbook = self.root / "clientes" / "alpha" / "financeiro.xlsm"
        self.workbook.parent.mkdir(parents=True)
        make_xlsm(self.workbook)

    def tearDown(self) -> None:
        self.temp.cleanup()

    def write_recipe(
        self,
        recipe_id: str,
        operations: list[dict],
        *,
        snapshot: dict | None = None,
        workbook_path: str = "clientes/alpha/financeiro.xlsm",
        expected_sha256: str | None = None,
    ) -> Path:
        package = PackageEditor(self.workbook)
        workbook: dict = {
            "path": workbook_path,
            "expected_sha256": expected_sha256 or package.source_sha256,
            "expected_vba_sha256": package.vba_sha256,
        }
        if snapshot is not None:
            workbook["snapshot"] = snapshot
        raw = {
            "schema_version": 1,
            "id": recipe_id,
            "workbook": workbook,
            "operations": operations,
        }
        path = self.root / f"{recipe_id}.json"
        path.write_text(json.dumps(raw), encoding="utf-8")
        return path

    def install_fake_snapshot_exporter(self, *, exit_code: int = 0) -> None:
        script = self.root / "tools" / "excel_snapshot" / "export.py"
        script.parent.mkdir(parents=True, exist_ok=True)
        script.write_text(
            "from __future__ import annotations\n"
            "import argparse\n"
            "from pathlib import Path\n"
            "parser = argparse.ArgumentParser()\n"
            "parser.add_argument('--source', required=True)\n"
            "parser.add_argument('--output', required=True)\n"
            "args = parser.parse_args()\n"
            f"raise_code = {exit_code}\n"
            "if raise_code:\n"
            "    raise SystemExit(raise_code)\n"
            "output = Path(args.output)\n"
            "output.mkdir(parents=True, exist_ok=True)\n"
            "(output / 'snapshot-probe.txt').write_text(args.source, encoding='utf-8')\n",
            encoding="utf-8",
        )

    def test_generic_workbook_uses_local_receipt_and_no_implicit_snapshot(self) -> None:
        recipe_path = self.write_recipe(
            "generic-set",
            [{"op": "cell.set", "sheet": "Dados", "cell": "C4", "value": "Genérico"}],
        )
        recipe = load_recipe(recipe_path)
        self.assertIsNone(recipe.snapshot_output_path)
        self.assertEqual(
            "clientes/alpha/recipes/receipts/generic-set.receipt.json",
            recipe.receipt_path,
        )

        execute_recipe(recipe_path, refresh_snapshot=True, repo_root=self.root)
        context = WorkbookContext(PackageEditor(self.workbook))
        self.assertEqual("Genérico", context.read_cell("Dados", "C4"))
        self.assertTrue((self.root / recipe.receipt_path).is_file())

    def test_default_carro_chefe_workbook_keeps_legacy_artifact_defaults(self) -> None:
        raw = {
            "schema_version": 1,
            "id": "legacy-defaults",
            "workbook": {
                "path": DEFAULT_WORKBOOK,
                "expected_sha256": "0" * 64,
            },
            "operations": [],
        }
        path = self.root / "legacy-defaults.json"
        path.write_text(json.dumps(raw), encoding="utf-8")
        recipe = load_recipe(path)
        self.assertEqual(DEFAULT_SNAPSHOT_OUTPUT, recipe.snapshot_output_path)
        self.assertEqual(
            "anexos/financeiro/recipes/receipts/legacy-defaults.receipt.json",
            recipe.receipt_path,
        )

    def test_generic_snapshot_requires_explicit_output(self) -> None:
        recipe_path = self.write_recipe("generic-snapshot-invalid", [], snapshot={"enabled": True})
        with self.assertRaises(RecipeError):
            load_recipe(recipe_path)

    def test_generic_snapshot_runs_with_declared_output(self) -> None:
        self.install_fake_snapshot_exporter()
        recipe_path = self.write_recipe(
            "generic-snapshot",
            [{"op": "cell.set", "sheet": "Dados", "cell": "C4", "value": "Com snapshot"}],
            snapshot={"enabled": True, "output": "clientes/alpha/snapshot"},
        )
        receipt = execute_recipe(recipe_path, refresh_snapshot=True, repo_root=self.root)
        probe = self.root / "clientes" / "alpha" / "snapshot" / "snapshot-probe.txt"
        self.assertEqual("clientes/alpha/financeiro.xlsm", probe.read_text(encoding="utf-8"))
        self.assertEqual("clientes/alpha/snapshot", receipt["snapshot_output"])

    def test_snapshot_failure_restores_generic_workbook(self) -> None:
        self.install_fake_snapshot_exporter(exit_code=7)
        before = self.workbook.read_bytes()
        recipe_path = self.write_recipe(
            "generic-snapshot-fails",
            [{"op": "cell.set", "sheet": "Dados", "cell": "C4", "value": "Não persistir"}],
            snapshot={"enabled": True, "output": "clientes/alpha/snapshot"},
        )
        with self.assertRaises(RecipeError):
            execute_recipe(recipe_path, refresh_snapshot=True, repo_root=self.root)
        self.assertEqual(before, self.workbook.read_bytes())
        self.assertFalse(
            (self.root / "clientes" / "alpha" / "recipes" / "receipts" / "generic-snapshot-fails.receipt.json").exists()
        )

    def test_snapshot_can_be_explicitly_disabled_for_default_workbook(self) -> None:
        raw = {
            "schema_version": 1,
            "id": "legacy-no-snapshot",
            "workbook": {
                "path": DEFAULT_WORKBOOK,
                "expected_sha256": "0" * 64,
                "snapshot": {"enabled": False},
            },
            "operations": [],
        }
        path = self.root / "legacy-no-snapshot.json"
        path.write_text(json.dumps(raw), encoding="utf-8")
        self.assertIsNone(load_recipe(path).snapshot_output_path)


if __name__ == "__main__":
    unittest.main()
