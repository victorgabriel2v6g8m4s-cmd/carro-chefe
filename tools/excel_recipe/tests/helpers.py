from __future__ import annotations

import zipfile
from pathlib import Path

CONTENT_TYPES = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="bin" ContentType="application/vnd.ms-office.vbaProject"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.ms-excel.sheet.macroEnabled.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/tables/table1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>
</Types>'''

ROOT_RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>'''

WORKBOOK = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Dados" sheetId="1" r:id="rId1"/></sheets>
  <calcPr fullCalcOnLoad="1"/>
</workbook>'''

WORKBOOK_RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.microsoft.com/office/2006/relationships/vbaProject" Target="vbaProject.bin"/>
</Relationships>'''

SHEET = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetData>
    <row r="1"><c r="A1" t="inlineStr"><is><t>Controle</t></is></c><c r="D1"><f>B3*2</f><v>20</v></c></row>
    <row r="3"><c r="B3" t="inlineStr" s="1"><is><t>ID</t></is></c><c r="C3" t="inlineStr" s="1"><is><t>Item</t></is></c><c r="D3" t="inlineStr" s="1"><is><t>Total</t></is></c></row>
    <row r="4"><c r="B4" t="inlineStr" s="2"><is><t>ING-1</t></is></c><c r="C4" t="inlineStr" s="2"><is><t>Pão</t></is></c><c r="D4" s="3"><f>LEN([@Item])</f><v>3</v></c></row>
    <row r="5"><c r="B5" s="2"/><c r="C5" s="2"/><c r="D5" s="3"><f>LEN([@Item])</f><v>0</v></c></row>
  </sheetData>
  <tableParts count="1"><tablePart r:id="rId1"/></tableParts>
</worksheet>'''

SHEET_RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table1.xml"/>
</Relationships>'''

TABLE = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="1" name="Itens" displayName="Itens" ref="B3:D5" totalsRowShown="0">
  <autoFilter ref="B3:D5"/>
  <tableColumns count="3">
    <tableColumn id="1" name="ID"/>
    <tableColumn id="2" name="Item"/>
    <tableColumn id="3" name="Total"><calculatedColumnFormula>LEN([@Item])</calculatedColumnFormula></tableColumn>
  </tableColumns>
  <tableStyleInfo name="TableStyleMedium2" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/>
</table>'''


def make_xlsm(path: Path) -> None:
    files = {
        "[Content_Types].xml": CONTENT_TYPES.encode(),
        "_rels/.rels": ROOT_RELS.encode(),
        "xl/workbook.xml": WORKBOOK.encode(),
        "xl/_rels/workbook.xml.rels": WORKBOOK_RELS.encode(),
        "xl/worksheets/sheet1.xml": SHEET.encode(),
        "xl/worksheets/_rels/sheet1.xml.rels": SHEET_RELS.encode(),
        "xl/tables/table1.xml": TABLE.encode(),
        "xl/vbaProject.bin": b"FAKE-VBA-STAYS-IDENTICAL",
        "xl/activeX/activeX1.bin": b"FAKE-ACTIVEX-STAYS-IDENTICAL",
    }
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, data in files.items():
            archive.writestr(name, data)
