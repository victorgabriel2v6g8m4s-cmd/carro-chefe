from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from tools.excel_recipe.constants import NS
from tools.excel_recipe.engine import execute_recipe
from tools.excel_recipe.package import PackageEditor
from tools.excel_recipe.tests.v3_helpers import make_v3_xlsm


class RangeMoveTargetTests(unittest.TestCase):
    def test_blank_existing_target_cell_is_overwritten_without_duplicate_ref(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            workbook = root / "book.xlsm"
            make_v3_xlsm(workbook)
            package = PackageEditor(workbook)
            recipe = {
                "schema_version": 1,
                "id": "move-blank-target",
                "workbook": {"path": "book.xlsm", "expected_sha256": package.source_sha256},
                "receipt_path": "receipts/move-blank-target.json",
                "operations": [
                    {"op": "cell.set", "sheet": "Dados", "cell": "H5", "value": None},
                    {"op": "structural.assert_clean", "action": "range.move", "sheet": "Dados", "source": "F5:G6", "destination": "H5"},
                    {"op": "range.move", "sheet": "Dados", "source": "F5:G6", "destination": "H5"}
                ]
            }
            recipe_path = root / "recipe.json"
            recipe_path.write_text(json.dumps(recipe), encoding="utf-8")
            execute_recipe(recipe_path, refresh_snapshot=False, repo_root=root)

            after = PackageEditor(workbook)
            sheet = after.get_xml("xl/worksheets/sheet1.xml")
            h5 = [cell for cell in sheet.findall(".//x:c", NS) if cell.get("r") == "H5"]
            self.assertEqual(1, len(h5))


if __name__ == "__main__":
    unittest.main()
