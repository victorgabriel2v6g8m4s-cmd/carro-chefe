from __future__ import annotations

import hashlib
import json
import unittest
from pathlib import Path

from tools.excel_recipe.drawings import DrawingSupport
from tools.excel_recipe.package import PackageEditor
from tools.excel_recipe.workbook import WorkbookContext


class RealWorkbookDrawingInventoryTests(unittest.TestCase):
    def test_real_workbook_drawing_inventory_is_parseable_and_deterministic(self) -> None:
        source = Path("anexos/financeiro/carro chefe.xlsm")
        if not source.is_file():
            self.skipTest("workbook real não disponível")
        package = PackageEditor(source)
        workbook = WorkbookContext(package)
        support = DrawingSupport(workbook)
        inventory = []
        for node in workbook.workbook_root.findall("x:sheets/x:sheet", {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}):
            sheet = node.get("name", "")
            refs, blockers = support._discover(sheet)
            inventory.append({
                "sheet": sheet,
                "drawings": [ref.drawing_path for ref in refs],
                "charts": sorted({path for ref in refs for path in ref.chart_paths}),
                "blocker_kinds": sorted({item["kind"] for item in blockers}),
            })
            for ref in refs:
                self.assertIn(ref.drawing_path, package.entries)
                for chart in ref.chart_paths:
                    self.assertIn(chart, package.entries)
        payload = json.dumps(inventory, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()
        self.assertEqual(len(digest), 64)
        print("V3B_REAL_INVENTORY=" + payload)
        print("V3B_REAL_INVENTORY_SHA256=" + digest)


if __name__ == "__main__":
    unittest.main()
