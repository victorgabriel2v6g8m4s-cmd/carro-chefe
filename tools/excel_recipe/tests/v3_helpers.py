from __future__ import annotations

import zipfile
from pathlib import Path

CONTENT_TYPES = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.ms-excel.sheet.macroEnabled.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/tables/table1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>
</Types>'''

ROOT_RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>'''

WORKBOOK = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Dados" sheetId="1" r:id="rId1"/>
    <sheet name="Resumo" sheetId="2" r:id="rId2"/>
  </sheets>
  <definedNames><definedName name="AreaDados">Dados!$B$3:$D$6</definedName></definedNames>
  <calcPr fullCalcOnLoad="1"/>
</workbook>'''

WORKBOOK_RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
</Relationships>'''

SHEET1 = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:J10"/>
  <sheetViews><sheetView workbookViewId="0"><pane xSplit="1" ySplit="1" topLeftCell="B2" state="frozen"/></sheetView></sheetViews>
  <sheetData>
    <row r="1"><c r="A1" t="inlineStr"><is><t>Controle</t></is></c></row>
    <row r="2"><c r="F2" t="inlineStr"><is><t>Mesclado</t></is></c></row>
    <row r="3"><c r="B3" t="inlineStr"><is><t>ID</t></is></c><c r="C3" t="inlineStr"><is><t>Item</t></is></c><c r="D3" t="inlineStr"><is><t>Total</t></is></c></row>
    <row r="4"><c r="B4" t="inlineStr"><is><t>ING-1</t></is></c><c r="C4" t="inlineStr"><is><t>Pão</t></is></c><c r="D4"><f>LEN([@Item])</f><v>3</v></c><c r="E4" t="inlineStr"><is><t>Link</t></is></c></row>
    <row r="5"><c r="D5"><f>LEN([@Item])</f><v>0</v></c><c r="F5" t="inlineStr"><is><t>M1</t></is></c><c r="G5"><v>10</v></c></row>
    <row r="6"><c r="B6" t="inlineStr"><is><t>ING-2</t></is></c><c r="C6" t="inlineStr"><is><t>Queijo</t></is></c><c r="D6"><f>LEN([@Item])</f><v>6</v></c><c r="F6" t="inlineStr"><is><t>M2</t></is></c><c r="G6"><v>20</v></c></row>
  </sheetData>
  <mergeCells count="1"><mergeCell ref="F2:G2"/></mergeCells>
  <conditionalFormatting sqref="D4:D6"><cfRule type="expression" priority="1"><formula>B4&lt;&gt;""</formula></cfRule></conditionalFormatting>
  <dataValidations count="1"><dataValidation type="custom" sqref="C4:C6"><formula1>Dados!B4&lt;&gt;""</formula1></dataValidation></dataValidations>
  <hyperlinks><hyperlink ref="E4" location="Dados!B4" display="interno"/></hyperlinks>
  <tableParts count="1"><tablePart r:id="rId1"/></tableParts>
</worksheet>'''

SHEET1_RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table1.xml"/>
</Relationships>'''

SHEET2 = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:A3"/>
  <sheetData>
    <row r="1"><c r="A1"><f>Dados!B4</f><v>0</v></c></row>
    <row r="2"><c r="A2"><f>Dados!B6</f><v>0</v></c></row>
    <row r="3"><c r="A3"><f>SUM(Dados!D4:D6)</f><v>0</v></c></row>
  </sheetData>
</worksheet>'''

TABLE = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="1" name="Itens" displayName="Itens" ref="B3:D6" totalsRowShown="0">
  <autoFilter ref="B3:D6"/>
  <tableColumns count="3">
    <tableColumn id="1" name="ID"/>
    <tableColumn id="2" name="Item"/>
    <tableColumn id="3" name="Total"><calculatedColumnFormula>LEN([@Item])</calculatedColumnFormula></tableColumn>
  </tableColumns>
  <tableStyleInfo name="TableStyleMedium2" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/>
</table>'''


def make_v3_xlsm(path: Path, *, with_drawing: bool = False) -> None:
    sheet_rels = SHEET1_RELS
    if with_drawing:
        sheet_rels = sheet_rels.replace(
            "</Relationships>",
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>',
        )
    files = {
        "[Content_Types].xml": CONTENT_TYPES.encode(),
        "_rels/.rels": ROOT_RELS.encode(),
        "xl/workbook.xml": WORKBOOK.encode(),
        "xl/_rels/workbook.xml.rels": WORKBOOK_RELS.encode(),
        "xl/worksheets/sheet1.xml": SHEET1.encode(),
        "xl/worksheets/_rels/sheet1.xml.rels": sheet_rels.encode(),
        "xl/worksheets/sheet2.xml": SHEET2.encode(),
        "xl/tables/table1.xml": TABLE.encode(),
    }
    if with_drawing:
        files["xl/drawings/drawing1.xml"] = b'<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"/>'
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, data in files.items():
            archive.writestr(name, data)
