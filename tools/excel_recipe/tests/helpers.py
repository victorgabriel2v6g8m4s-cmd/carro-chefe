from __future__ import annotations

import hashlib
import json
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
  <definedNames>
    <definedName name="ItensTotal">SUM(Itens[Total])</definedName>
    <definedName name="ItensItemCount">COUNTA(Itens[Item])</definedName>
  </definedNames>
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
    <row r="1"><c r="A1" t="inlineStr"><is><t>Controle</t></is></c><c r="D1"><f>B3*2</f><v>20</v></c><c r="E1"><f>SUM(Itens[Total])</f><v>3</v></c></row>
    <row r="3"><c r="B3" t="inlineStr" s="1"><is><t>ID</t></is></c><c r="C3" t="inlineStr" s="1"><is><t>Item</t></is></c><c r="D3" t="inlineStr" s="1"><is><t>Total</t></is></c></row>
    <row r="4"><c r="B4" t="inlineStr" s="2"><is><t>ING-1</t></is></c><c r="C4" t="inlineStr" s="2"><is><t>Pão</t></is></c><c r="D4" s="3"><f>LEN([@Item])</f><v>3</v></c></row>
    <row r="5"><c r="B5" s="2"/><c r="C5" s="2"/><c r="D5" s="3"><f>LEN([@Item])</f><v>0</v></c></row>
  </sheetData>
  <conditionalFormatting sqref="C4:C5"><cfRule type="expression" priority="1"><formula>LEN(Itens[Item])&gt;0</formula></cfRule></conditionalFormatting>
  <dataValidations count="1"><dataValidation type="custom" sqref="C4:C5"><formula1>COUNTA(Itens[ID])&gt;0</formula1></dataValidation></dataValidations>
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

VBA_BYTES = b"FAKE-VBA-STAYS-IDENTICAL"


def make_xlsm(path: Path, *, extra_files: dict[str, bytes] | None = None) -> None:
    files = {
        "[Content_Types].xml": CONTENT_TYPES.encode(),
        "_rels/.rels": ROOT_RELS.encode(),
        "xl/workbook.xml": WORKBOOK.encode(),
        "xl/_rels/workbook.xml.rels": WORKBOOK_RELS.encode(),
        "xl/worksheets/sheet1.xml": SHEET.encode(),
        "xl/worksheets/_rels/sheet1.xml.rels": SHEET_RELS.encode(),
        "xl/tables/table1.xml": TABLE.encode(),
        "xl/vbaProject.bin": VBA_BYTES,
        "xl/activeX/activeX1.bin": b"FAKE-ACTIVEX-STAYS-IDENTICAL",
    }
    files.update(extra_files or {})
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, data in files.items():
            archive.writestr(name, data)


def write_vba_snapshot(repo_root: Path, *, module_text: str = "Option Explicit\n") -> None:
    snapshot = repo_root / "anexos/financeiro/snapshot"
    module = snapshot / "vba/modules/Test.bas"
    module.parent.mkdir(parents=True, exist_ok=True)
    module.write_text(module_text, encoding="utf-8")
    index = {
        "execution": "never",
        "present": True,
        "vba_project_sha256": hashlib.sha256(VBA_BYTES).hexdigest(),
        "modules": [{"name": "Test", "path": "vba/modules/Test.bas"}],
    }
    (snapshot / "vba/index.json").write_text(json.dumps(index, ensure_ascii=False), encoding="utf-8")
