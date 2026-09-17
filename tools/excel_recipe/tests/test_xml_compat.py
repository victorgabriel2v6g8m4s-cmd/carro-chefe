from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from tools.excel_recipe.engine import execute_recipe
from tools.excel_recipe.errors import RecipeError
from tools.excel_recipe.package import PackageEditor
from tools.excel_recipe.tests.helpers import SHEET, make_xlsm
from tools.excel_recipe.xml_compat import assert_excel_xml_compatible

MCE_NS = "http://schemas.openxmlformats.org/markup-compatibility/2006"
X14AC_NS = "http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac"


def sheet_with_ignorable_extension() -> bytes:
    marker = '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    replacement = (
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
        f'xmlns:mc="{MCE_NS}" xmlns:x14ac="{X14AC_NS}" mc:Ignorable="x14ac">'
    )
    return SHEET.replace(marker, replacement).encode("utf-8")


class ExcelXmlCompatibilityTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / "tools/excel_recipe").mkdir(parents=True)
        self.workbook = self.root / "book.xlsm"
        make_xlsm(
            self.workbook,
            extra_files={"xl/worksheets/sheet1.xml": sheet_with_ignorable_extension()},
        )

    def tearDown(self) -> None:
        self.temp.cleanup()

    def _recipe(self) -> Path:
        package = PackageEditor(self.workbook)
        recipe = {
            "schema_version": 1,
            "id": "mce-regression",
            "workbook": {
                "path": "book.xlsm",
                "expected_sha256": package.source_sha256,
                "expected_vba_sha256": package.vba_sha256,
            },
            "receipt_path": "receipts/mce-regression.json",
            "operations": [
                {"op": "cell.set", "sheet": "Dados", "cell": "C5", "value": "Queijo"},
            ],
        }
        path = self.root / "mce-regression.json"
        path.write_text(json.dumps(recipe), encoding="utf-8")
        return path

    def test_recipe_preserves_prefix_referenced_only_by_mc_ignorable(self) -> None:
        execute_recipe(self._recipe(), refresh_snapshot=False, repo_root=self.root)
        package = PackageEditor(self.workbook)
        data = package.get("xl/worksheets/sheet1.xml")
        self.assertIn(b'mc:Ignorable="x14ac"', data)
        self.assertIn(f'xmlns:x14ac="{X14AC_NS}"'.encode("utf-8"), data)
        package.assert_excel_compatible({"xl/worksheets/sheet1.xml"})

    def test_validator_rejects_orphan_mce_prefix_even_when_xml_is_well_formed(self) -> None:
        broken = sheet_with_ignorable_extension().replace(
            f' xmlns:x14ac="{X14AC_NS}"'.encode("utf-8"),
            b"",
        )
        with self.assertRaisesRegex(RecipeError, "não declarado"):
            assert_excel_xml_compatible(broken, "xl/worksheets/sheet1.xml")

    def test_validator_rejects_duplicate_cell_reference(self) -> None:
        broken = SHEET.replace(
            '<c r="C5" s="2"/>',
            '<c r="C5" s="2"/><c r="C5" s="2"/>',
        ).encode("utf-8")
        with self.assertRaisesRegex(RecipeError, "duplicada"):
            assert_excel_xml_compatible(broken, "xl/worksheets/sheet1.xml")


if __name__ == "__main__":
    unittest.main()
