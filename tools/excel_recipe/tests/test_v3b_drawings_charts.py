from __future__ import annotations

import json
import tempfile
import unittest
import zipfile
from pathlib import Path

from tools.excel_recipe.engine import execute_recipe
from tools.excel_recipe.errors import RecipeError
from tools.excel_recipe.package import PackageEditor


CONTENT_TYPES = '''<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
</Types>'''
ROOT_RELS = '''<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>'''
WORKBOOK = '''<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Dados" sheetId="1" r:id="rId1"/></sheets><calcPr fullCalcOnLoad="1"/>
</workbook>'''
WORKBOOK_RELS = '''<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>'''
SHEET = '''<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:B6"/><sheetData>
    <row r="1"><c r="A1"><v>1</v></c></row><row r="2"><c r="B2" t="inlineStr"><is><t>Título</t></is></c></row>
    <row r="3"><c r="A3"><v>10</v></c></row><row r="4"><c r="A4"><v>20</v></c></row>
    <row r="5"><c r="A5"><v>30</v></c></row><row r="6"><c r="A6"><v>40</v></c></row>
  </sheetData><drawing r:id="rId1"/>
</worksheet>'''
SHEET_RELS = '''<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>
</Relationships>'''
DRAWING = '''<?xml version="1.0" encoding="UTF-8"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <xdr:twoCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>2</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>4</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>8</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame><xdr:nvGraphicFramePr/><xdr:xfrm/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>
</xdr:wsDr>'''
DRAWING_RELS = '''<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/>
</Relationships>'''
CHART = '''<?xml version="1.0" encoding="UTF-8"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart><c:title><c:tx><c:strRef><c:f>Dados!$B$2</c:f></c:strRef></c:tx></c:title><c:plotArea><c:lineChart><c:ser><c:idx val="0"/><c:order val="0"/><c:val><c:numRef><c:f>Dados!$A$3:$A$6</c:f></c:numRef></c:val></c:ser></c:lineChart></c:plotArea></c:chart></c:chartSpace>'''


def make_book(path: Path, *, vml: bool = False, pivot_chart: bool = False, bad_anchor: bool = False) -> None:
    sheet_rels = SHEET_RELS
    files = {
        "[Content_Types].xml": CONTENT_TYPES.encode(), "_rels/.rels": ROOT_RELS.encode(),
        "xl/workbook.xml": WORKBOOK.encode(), "xl/_rels/workbook.xml.rels": WORKBOOK_RELS.encode(),
        "xl/worksheets/sheet1.xml": SHEET.encode(), "xl/worksheets/_rels/sheet1.xml.rels": sheet_rels.encode(),
        "xl/drawings/drawing1.xml": DRAWING.encode(), "xl/drawings/_rels/drawing1.xml.rels": DRAWING_RELS.encode(),
        "xl/charts/chart1.xml": CHART.encode(),
    }
    if vml:
        files["xl/worksheets/_rels/sheet1.xml.rels"] = SHEET_RELS.replace("</Relationships>", '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/vmlDrawing" Target="../drawings/vmlDrawing1.vml"/></Relationships>').encode()
        files["xl/drawings/vmlDrawing1.vml"] = b"<xml/>"
    if pivot_chart:
        files["xl/charts/chart1.xml"] = CHART.replace("<c:chart>", '<c:pivotSource><c:name>Pivot!A1</c:name><c:fmtId val="0"/></c:pivotSource><c:chart>').encode()
    if bad_anchor:
        files["xl/drawings/drawing1.xml"] = DRAWING.replace("<xdr:twoCellAnchor>", "<xdr:unsupportedAnchor>", 1).replace("</xdr:twoCellAnchor>", "</xdr:unsupportedAnchor>", 1).encode()
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, data in files.items():
            archive.writestr(name, data)


class DrawingChartV3BTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.workbook = self.root / "book.xlsm"
        make_book(self.workbook)

    def tearDown(self) -> None:
        self.temp.cleanup()

    def recipe(self, operations: list[dict], recipe_id: str) -> Path:
        package = PackageEditor(self.workbook)
        payload = {"schema_version": 1, "id": recipe_id, "workbook": {"path": "book.xlsm", "expected_sha256": package.source_sha256}, "receipt_path": f"receipts/{recipe_id}.json", "operations": operations}
        path = self.root / f"{recipe_id}.json"
        path.write_text(json.dumps(payload), encoding="utf-8")
        return path

    @staticmethod
    def pair(action: str, **fields) -> list[dict]:
        return [{"op": "structural.assert_clean", "action": action, **fields}, {"op": action, **fields}]

    def test_insert_rows_rewrites_anchor_and_chart_formula(self) -> None:
        receipt = execute_recipe(self.recipe(self.pair("sheet.insert_rows", sheet="Dados", at=4, count=1), "chart-shift"), refresh_snapshot=False, repo_root=self.root)
        package = PackageEditor(self.workbook)
        drawing = package.get("xl/drawings/drawing1.xml").decode()
        chart = package.get("xl/charts/chart1.xml").decode()
        self.assertIn("<ns0:row>9</ns0:row>", drawing)
        self.assertIn("Dados!$A$3:$A$7", chart)
        self.assertIn("xl/drawings/drawing1.xml", receipt["changed_parts"])
        self.assertIn("xl/charts/chart1.xml", receipt["changed_parts"])

    def test_vml_remains_blocker(self) -> None:
        make_book(self.workbook, vml=True)
        with self.assertRaises(RecipeError):
            execute_recipe(self.recipe(self.pair("sheet.insert_rows", sheet="Dados", at=4, count=1), "vml-block"), dry_run=True, refresh_snapshot=False, repo_root=self.root)

    def test_pivot_chart_remains_blocker_until_v3c(self) -> None:
        make_book(self.workbook, pivot_chart=True)
        with self.assertRaises(RecipeError):
            execute_recipe(self.recipe(self.pair("sheet.insert_rows", sheet="Dados", at=4, count=1), "pivot-block"), dry_run=True, refresh_snapshot=False, repo_root=self.root)

    def test_unknown_anchor_is_fail_closed(self) -> None:
        make_book(self.workbook, bad_anchor=True)
        with self.assertRaises(RecipeError):
            execute_recipe(self.recipe(self.pair("sheet.insert_rows", sheet="Dados", at=4, count=1), "anchor-block"), dry_run=True, refresh_snapshot=False, repo_root=self.root)


if __name__ == "__main__":
    unittest.main()
