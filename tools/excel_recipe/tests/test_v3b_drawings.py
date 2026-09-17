from __future__ import annotations

import tempfile
import unittest
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

from tools.excel_recipe.constants import PKG_REL_NS
from tools.excel_recipe.package import PackageEditor
from tools.excel_recipe.structural_v3b import V3BStructuralEngine, V3BStructuralPlanner
from tools.excel_recipe.tests.v3_helpers import make_v3_xlsm
from tools.excel_recipe.util import qname
from tools.excel_recipe.workbook import WorkbookContext

XDR = "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"
A = "http://schemas.openxmlformats.org/drawingml/2006/main"
C = "http://schemas.openxmlformats.org/drawingml/2006/chart"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

DRAWING = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="{XDR}" xmlns:a="{A}" xmlns:c="{C}" xmlns:r="{R}">
  <xdr:twoCellAnchor editAs="twoCell">
    <xdr:from><xdr:col>1</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>3</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>3</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>5</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame><xdr:nvGraphicFramePr/><xdr:xfrm/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame>
    <xdr:clientData/>
  </xdr:twoCellAnchor>
</xdr:wsDr>'''

DRAWING_RELS = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="{PKG_REL_NS}">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/>
</Relationships>'''

CHART = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="{C}"><c:chart><c:plotArea><c:barChart><c:ser>
<c:tx><c:strRef><c:f>Dados!$C$4</c:f></c:strRef></c:tx>
<c:cat><c:strRef><c:f>Dados!$B$4:$B$6</c:f></c:strRef></c:cat>
<c:val><c:numRef><c:f>Dados!$D$4:$D$6</c:f></c:numRef></c:val>
</c:ser></c:barChart></c:plotArea></c:chart></c:chartSpace>'''


def make_chart_fixture(path: Path) -> None:
    make_v3_xlsm(path, with_drawing=True)
    with zipfile.ZipFile(path, "r") as archive:
        files = {info.filename: archive.read(info) for info in archive.infolist()}
    files["xl/drawings/drawing1.xml"] = DRAWING.encode()
    files["xl/drawings/_rels/drawing1.xml.rels"] = DRAWING_RELS.encode()
    files["xl/charts/chart1.xml"] = CHART.encode()
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, data in files.items():
            archive.writestr(name, data)


class DrawingV3BTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.path = self.root / "fixture.xlsm"
        make_chart_fixture(self.path)

    def tearDown(self) -> None:
        self.temp.cleanup()

    def _context(self):
        package = PackageEditor(self.path)
        workbook = WorkbookContext(package)
        planner = V3BStructuralPlanner(workbook, self.root)
        engine = V3BStructuralEngine(workbook, planner)
        return package, workbook, planner, engine

    def test_plan_promotes_drawing_anchor_and_chart_formulas(self) -> None:
        _, _, planner, _ = self._context()
        operation = {"op": "structural.plan", "action": "sheet.insert_rows", "sheet": "Dados", "at": 4, "count": 1}
        report = planner.plan(operation)
        self.assertEqual(report["blocker_count"], 0)
        kinds = {item["kind"] for item in report["occurrences"]}
        self.assertIn("drawing_anchor", kinds)
        self.assertIn("chart_formula", kinds)
        self.assertIn("xl/drawings/drawing1.xml", report["parts_impacted"])
        self.assertIn("xl/charts/chart1.xml", report["parts_impacted"])

    def test_apply_rewrites_anchor_and_chart_without_touching_relationships(self) -> None:
        package, _, planner, engine = self._context()
        operation = {"op": "sheet.insert_rows", "sheet": "Dados", "at": 4, "count": 1}
        plan_operation = {"op": "structural.assert_clean", "action": "sheet.insert_rows", "sheet": "Dados", "at": 4, "count": 1}
        report = planner.plan(plan_operation)
        planner.assert_clean(report)
        engine.apply(operation, report)
        package.assert_firewall(engine.workbook.allowed_parts)

        drawing = package.get_xml("xl/drawings/drawing1.xml")
        anchor = list(drawing)[0]
        start = anchor.find(qname(XDR, "from"))
        end = anchor.find(qname(XDR, "to"))
        self.assertEqual(start.find(qname(XDR, "row")).text, "4")
        self.assertEqual(end.find(qname(XDR, "row")).text, "6")

        chart = package.get_xml("xl/charts/chart1.xml")
        formulas = [node.text for node in chart.iter(qname(C, "f"))]
        self.assertEqual(formulas, ["Dados!$C$5", "Dados!$B$5:$B$7", "Dados!$D$5:$D$7"])
        self.assertNotIn("xl/drawings/_rels/drawing1.xml.rels", package.changed_parts())

    def test_deleting_anchor_marker_is_fail_closed(self) -> None:
        _, _, planner, _ = self._context()
        operation = {"op": "structural.plan", "action": "sheet.delete_rows", "sheet": "Dados", "at": 4, "count": 1}
        report = planner.plan(operation)
        self.assertGreater(report["blocker_count"], 0)
        self.assertTrue(any(item["kind"] == "drawing_anchor" for item in report["blockers"]))

    def test_chart_relationship_is_resolved_from_drawing_rels(self) -> None:
        package, _, planner, _ = self._context()
        operation = {"op": "structural.plan", "action": "sheet.insert_columns", "sheet": "Dados", "at": 2, "count": 1}
        report = planner.plan(operation)
        self.assertEqual(report["blocker_count"], 0)
        rels = package.get_xml("xl/drawings/_rels/drawing1.xml.rels")
        rel = rels.find(qname(PKG_REL_NS, "Relationship"))
        self.assertTrue(rel.get("Type", "").endswith("/chart"))
        self.assertIn("xl/charts/chart1.xml", report["parts_impacted"])


if __name__ == "__main__":
    unittest.main()
