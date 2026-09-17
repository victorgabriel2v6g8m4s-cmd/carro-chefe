from __future__ import annotations

import tempfile
import unittest
import zipfile
from pathlib import Path

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
CS = "http://schemas.microsoft.com/office/drawing/2012/chartStyle"

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

    def test_chart_on_other_sheet_is_still_a_global_dependency(self) -> None:
        package, _, planner, engine = self._context()
        chart = package.get_xml("xl/charts/chart1.xml")
        formulas = list(chart.iter(qname(C, "f")))
        formulas[0].text = "Resumo!$A$1"
        formulas[1].text = "Resumo!$A$1:$A$2"
        formulas[2].text = "Resumo!$A$1:$A$2"
        package.set_xml("xl/charts/chart1.xml", chart)

        operation = {"op": "sheet.insert_rows", "sheet": "Resumo", "at": 1, "count": 1}
        report = planner.plan({"op": "structural.assert_clean", **{k: v for k, v in operation.items() if k != "op"}, "action": operation["op"]})
        self.assertEqual(report["blocker_count"], 0)
        self.assertIn("xl/charts/chart1.xml", report["parts_impacted"])
        self.assertNotIn("xl/drawings/drawing1.xml", report["parts_impacted"])

        planner.assert_clean(report)
        engine.apply(operation, report)
        rewritten = package.get_xml("xl/charts/chart1.xml")
        self.assertEqual(
            [node.text for node in rewritten.iter(qname(C, "f"))],
            ["Resumo!$A$2", "Resumo!$A$2:$A$3", "Resumo!$A$2:$A$3"],
        )

    def test_chart_style_parts_are_not_treated_as_data_charts(self) -> None:
        with zipfile.ZipFile(self.path, "r") as archive:
            files = {info.filename: archive.read(info) for info in archive.infolist()}
        files["xl/charts/style1.xml"] = f'<cs:chartStyle xmlns:cs="{CS}" id="102"/>'.encode()
        files["xl/charts/colors1.xml"] = f'<cs:colorStyle xmlns:cs="{CS}" meth="cycle" id="10"/>'.encode()
        with zipfile.ZipFile(self.path, "w", zipfile.ZIP_DEFLATED) as archive:
            for name, data in files.items():
                archive.writestr(name, data)

        _, _, planner, _ = self._context()
        report = planner.plan({"op": "structural.plan", "action": "sheet.insert_rows", "sheet": "Dados", "at": 4, "count": 1})
        self.assertEqual(report["blocker_count"], 0)
        self.assertFalse(any(item["kind"] == "chart_type" for item in report["occurrences"]))

    def test_two_cell_anchor_non_two_cell_edit_mode_is_blocked(self) -> None:
        package, _, planner, _ = self._context()
        drawing = package.get_xml("xl/drawings/drawing1.xml")
        list(drawing)[0].set("editAs", "oneCell")
        package.set_xml("xl/drawings/drawing1.xml", drawing)
        report = planner.plan({"op": "structural.plan", "action": "sheet.insert_rows", "sheet": "Dados", "at": 4, "count": 1})
        self.assertTrue(any(item["kind"] == "drawing_anchor_mode" for item in report["blockers"]))


if __name__ == "__main__":
    unittest.main()
