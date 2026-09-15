from __future__ import annotations

import decimal
import posixpath
from dataclasses import dataclass
from xml.etree import ElementTree as ET

from .constants import MAIN_NS, NS, PKG_REL_NS, REL_NS
from .errors import RecipeError
from .package import PackageEditor
from .util import canonical_path, column_to_index, make_cell_ref, parse_cell_ref, qname


@dataclass(frozen=True)
class SheetRef:
    name: str
    path: str


class WorkbookContext:
    def __init__(self, package: PackageEditor) -> None:
        self.package = package
        self.workbook_path = "xl/workbook.xml"
        self.workbook_root = package.get_xml(self.workbook_path)
        self.workbook_rels_path = "xl/_rels/workbook.xml.rels"
        self.workbook_rels = package.get_xml(self.workbook_rels_path)
        self.shared_strings = self._load_shared_strings()
        self._sheet_cache: dict[str, SheetRef] = {}
        self._roots: dict[str, ET.Element] = {}
        self.allowed_parts: set[str] = set()

    def _load_shared_strings(self) -> list[str]:
        path = "xl/sharedStrings.xml"
        if path not in self.package.entries:
            return []
        root = self.package.get_xml(path)
        values: list[str] = []
        for item in root.findall("x:si", NS):
            values.append("".join(node.text or "" for node in item.iter(qname(MAIN_NS, "t"))))
        return values

    def resolve_sheet(self, sheet_name: str) -> SheetRef:
        if sheet_name in self._sheet_cache:
            return self._sheet_cache[sheet_name]
        sheets = self.workbook_root.find("x:sheets", NS)
        if sheets is None:
            raise RecipeError("Workbook sem lista de abas.")
        match = None
        for sheet in sheets.findall("x:sheet", NS):
            if sheet.get("name") == sheet_name:
                match = sheet
                break
        if match is None:
            raise RecipeError(f"Aba não encontrada: {sheet_name}")
        rel_id = match.get(qname(REL_NS, "id"))
        if not rel_id:
            raise RecipeError(f"Aba sem relacionamento: {sheet_name}")
        target = self._relationship_target(self.workbook_rels, rel_id)
        path = canonical_path(posixpath.normpath(posixpath.join("xl", target)))
        result = SheetRef(sheet_name, path)
        self._sheet_cache[sheet_name] = result
        return result

    def _relationship_target(self, rels_root: ET.Element, rel_id: str) -> str:
        for rel in rels_root.findall(qname(PKG_REL_NS, "Relationship")):
            if rel.get("Id") == rel_id:
                target = rel.get("Target")
                if target:
                    return target
        raise RecipeError(f"Relacionamento OOXML não encontrado: {rel_id}")

    def sheet_root(self, sheet_name: str) -> ET.Element:
        ref = self.resolve_sheet(sheet_name)
        if ref.path not in self._roots:
            self._roots[ref.path] = self.package.get_xml(ref.path)
        return self._roots[ref.path]

    def save_sheet(self, sheet_name: str) -> None:
        ref = self.resolve_sheet(sheet_name)
        root = self.sheet_root(sheet_name)
        self.package.set_xml(ref.path, root)
        self.allowed_parts.add(ref.path)

    def mark_recalculate_on_open(self) -> None:
        calc = self.workbook_root.find("x:calcPr", NS)
        if calc is None:
            calc = ET.SubElement(self.workbook_root, qname(MAIN_NS, "calcPr"))
        calc.set("calcMode", "auto")
        calc.set("fullCalcOnLoad", "1")
        calc.set("forceFullCalc", "1")
        self.package.set_xml(self.workbook_path, self.workbook_root)
        self.allowed_parts.add(self.workbook_path)

    def get_cell(self, sheet_name: str, cell_ref: str, create: bool = False) -> ET.Element | None:
        row_num, col_num = parse_cell_ref(cell_ref)
        root = self.sheet_root(sheet_name)
        sheet_data = root.find("x:sheetData", NS)
        if sheet_data is None:
            if not create:
                return None
            sheet_data = ET.SubElement(root, qname(MAIN_NS, "sheetData"))
        row = self._row(sheet_data, row_num, create)
        if row is None:
            return None
        for cell in row.findall("x:c", NS):
            ref = cell.get("r")
            if ref and parse_cell_ref(ref)[1] == col_num:
                return cell
        if not create:
            return None
        cell = ET.Element(qname(MAIN_NS, "c"), {"r": make_cell_ref(row_num, col_num)})
        cells = list(row.findall("x:c", NS))
        insert_at = len(cells)
        for index, existing in enumerate(cells):
            ref = existing.get("r")
            if ref and parse_cell_ref(ref)[1] > col_num:
                insert_at = index
                break
        row.insert(insert_at, cell)
        return cell

    def _row(self, sheet_data: ET.Element, row_num: int, create: bool) -> ET.Element | None:
        rows = list(sheet_data.findall("x:row", NS))
        for row in rows:
            if int(row.get("r", "0")) == row_num:
                return row
        if not create:
            return None
        row = ET.Element(qname(MAIN_NS, "row"), {"r": str(row_num)})
        insert_at = len(rows)
        for index, existing in enumerate(rows):
            if int(existing.get("r", "0")) > row_num:
                insert_at = index
                break
        sheet_data.insert(insert_at, row)
        return row

    def read_cell(self, sheet_name: str, cell_ref: str):
        cell = self.get_cell(sheet_name, cell_ref, create=False)
        if cell is None:
            return None
        formula = cell.find("x:f", NS)
        if formula is not None:
            return "=" + (formula.text or "")
        cell_type = cell.get("t")
        if cell_type == "inlineStr":
            inline = cell.find("x:is", NS)
            return "" if inline is None else "".join(node.text or "" for node in inline.iter(qname(MAIN_NS, "t")))
        value = cell.find("x:v", NS)
        text = value.text if value is not None else None
        if text is None:
            return None
        if cell_type == "s":
            index = int(text)
            if index >= len(self.shared_strings):
                raise RecipeError(f"Índice sharedStrings inválido em {sheet_name}!{cell_ref}")
            return self.shared_strings[index]
        if cell_type in {"str", "e"}:
            return text
        if cell_type == "b":
            return text == "1"
        try:
            number = decimal.Decimal(text)
            return int(number) if number == number.to_integral() else number
        except decimal.InvalidOperation:
            return text

    def write_value(self, sheet_name: str, cell_ref: str, value, *, save: bool = True) -> None:
        cell = self.get_cell(sheet_name, cell_ref, create=True)
        assert cell is not None
        self._clear_payload(cell)
        typed = self._coerce_value(value)
        if typed is None:
            cell.attrib.pop("t", None)
        elif isinstance(typed, bool):
            cell.set("t", "b")
            ET.SubElement(cell, qname(MAIN_NS, "v")).text = "1" if typed else "0"
        elif isinstance(typed, (int, decimal.Decimal)):
            cell.attrib.pop("t", None)
            ET.SubElement(cell, qname(MAIN_NS, "v")).text = str(typed)
        else:
            cell.set("t", "inlineStr")
            inline = ET.SubElement(cell, qname(MAIN_NS, "is"))
            ET.SubElement(inline, qname(MAIN_NS, "t")).text = str(typed)
        if save:
            self.save_sheet(sheet_name)

    def write_formula(self, sheet_name: str, cell_ref: str, formula: str, *, save: bool = True) -> None:
        from .util import normalize_formula

        cell = self.get_cell(sheet_name, cell_ref, create=True)
        assert cell is not None
        self._clear_payload(cell)
        cell.attrib.pop("t", None)
        ET.SubElement(cell, qname(MAIN_NS, "f")).text = normalize_formula(formula)
        if save:
            self.save_sheet(sheet_name)
        self.mark_recalculate_on_open()

    def clear_cell(self, sheet_name: str, cell_ref: str, *, save: bool = True) -> None:
        cell = self.get_cell(sheet_name, cell_ref, create=False)
        if cell is not None:
            self._clear_payload(cell)
            cell.attrib.pop("t", None)
            if save:
                self.save_sheet(sheet_name)

    def _clear_payload(self, cell: ET.Element) -> None:
        for child in list(cell):
            if child.tag in {qname(MAIN_NS, "f"), qname(MAIN_NS, "v"), qname(MAIN_NS, "is")}:
                cell.remove(child)

    def _coerce_value(self, value):
        if not isinstance(value, dict):
            if isinstance(value, float):
                return decimal.Decimal(str(value))
            return value
        kind = value.get("type")
        raw = value.get("value")
        if kind == "blank":
            return None
        if kind == "string":
            return "" if raw is None else str(raw)
        if kind == "decimal":
            try:
                return decimal.Decimal(str(raw))
            except decimal.InvalidOperation as exc:
                raise RecipeError(f"Decimal inválido: {raw}") from exc
        if kind == "integer":
            try:
                return int(raw)
            except (TypeError, ValueError) as exc:
                raise RecipeError(f"Inteiro inválido: {raw}") from exc
        if kind == "boolean":
            if not isinstance(raw, bool):
                raise RecipeError(f"Booleano inválido: {raw}")
            return raw
        raise RecipeError(f"Tipo de valor não suportado: {kind}")

    @staticmethod
    def sheet_rels_path(sheet_path: str) -> str:
        directory, filename = posixpath.split(sheet_path)
        return posixpath.join(directory, "_rels", filename + ".rels")
