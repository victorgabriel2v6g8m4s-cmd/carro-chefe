from __future__ import annotations

import posixpath
import re
from xml.etree import ElementTree as ET

from .constants import CONTENT_TYPES_NS, MAIN_NS, NS, PKG_REL_NS, REL_NS
from .errors import RecipeError
from .tables import TABLE_CONTENT_TYPE, TABLE_REL_TYPE, TableManager
from .util import canonical_path, make_cell_ref, parse_range_ref, qname
from .workbook import WorkbookContext


class TableStructureEditor:
    def __init__(self, workbook: WorkbookContext, tables: TableManager) -> None:
        self.workbook = workbook
        self.tables = tables
        self.package = workbook.package

    def create(self, sheet: str, name: str, ref: str, columns: list[str], style: str = "TableStyleMedium2") -> None:
        if (not name or len(name) > 255 or name[0].isdigit() or re.search(r"[\s\[\]:]", name)):
            raise RecipeError(f"Nome de tabela inválido para V1: {name}")
        if len(set(columns)) != len(columns) or any(not item for item in columns):
            raise RecipeError("Colunas da nova tabela devem ser únicas e não vazias.")
        start_row, start_col, end_row, end_col = parse_range_ref(ref)
        if end_col - start_col + 1 != len(columns):
            raise RecipeError("Quantidade de colunas não corresponde à largura do intervalo.")
        if end_row <= start_row:
            raise RecipeError("Tabela precisa conter cabeçalho e pelo menos uma linha de dados.")
        if self._table_name_exists(name):
            raise RecipeError(f"Tabela já existe: {name}")
        self._assert_no_overlap(sheet, ref)

        sheet_ref = self.workbook.resolve_sheet(sheet)
        sheet_root = self.workbook.sheet_root(sheet)
        rels_path = self.workbook.sheet_rels_path(sheet_ref.path)
        rels_root = self._load_or_create_rels(rels_path)
        rel_id = self._next_rel_id(rels_root)
        table_path, table_id = self._next_table_identity()

        for offset, column_name in enumerate(columns):
            self.workbook.write_value(sheet, make_cell_ref(start_row, start_col + offset), column_name, save=False)

        table_root = ET.Element(
            qname(MAIN_NS, "table"),
            {"id": str(table_id), "name": name, "displayName": name, "ref": ref, "totalsRowShown": "0"},
        )
        ET.SubElement(table_root, qname(MAIN_NS, "autoFilter"), {"ref": ref})
        columns_node = ET.SubElement(table_root, qname(MAIN_NS, "tableColumns"), {"count": str(len(columns))})
        for index, column_name in enumerate(columns, start=1):
            ET.SubElement(columns_node, qname(MAIN_NS, "tableColumn"), {"id": str(index), "name": column_name})
        ET.SubElement(
            table_root,
            qname(MAIN_NS, "tableStyleInfo"),
            {"name": style, "showFirstColumn": "0", "showLastColumn": "0", "showRowStripes": "1", "showColumnStripes": "0"},
        )

        ET.SubElement(
            rels_root,
            qname(PKG_REL_NS, "Relationship"),
            {"Id": rel_id, "Type": TABLE_REL_TYPE, "Target": f"../tables/{table_path.rsplit('/', 1)[-1]}"},
        )
        table_parts = sheet_root.find("x:tableParts", NS)
        if table_parts is None:
            table_parts = ET.SubElement(sheet_root, qname(MAIN_NS, "tableParts"), {"count": "0"})
        ET.SubElement(table_parts, qname(MAIN_NS, "tablePart"), {qname(REL_NS, "id"): rel_id})
        table_parts.set("count", str(len(table_parts.findall("x:tablePart", NS))))

        self.package.set_xml(table_path, table_root)
        self.package.set_xml(rels_path, rels_root)
        self._add_content_type(table_path)
        self.workbook.save_sheet(sheet)
        self.workbook.allowed_parts.update({table_path, rels_path, "[Content_Types].xml"})

    def drop(self, name: str, *, clear_data: bool = False) -> None:
        table = self.tables.find(name)
        if clear_data:
            start_row, start_col, end_row, end_col = parse_range_ref(table.ref)
            for row in range(start_row, end_row + 1):
                for column in range(start_col, end_col + 1):
                    self.workbook.clear_cell(table.sheet, make_cell_ref(row, column), save=False)

        sheet_root = self.workbook.sheet_root(table.sheet)
        table_parts = sheet_root.find("x:tableParts", NS)
        if table_parts is None:
            raise RecipeError(f"Tabela {name} sem tableParts na worksheet.")
        for node in list(table_parts.findall("x:tablePart", NS)):
            if node.get(qname(REL_NS, "id")) == table.rel_id:
                table_parts.remove(node)
        remaining = table_parts.findall("x:tablePart", NS)
        if remaining:
            table_parts.set("count", str(len(remaining)))
        else:
            sheet_root.remove(table_parts)

        rels_root = self.package.get_xml(table.rels_path)
        for rel in list(rels_root.findall(qname(PKG_REL_NS, "Relationship"))):
            if rel.get("Id") == table.rel_id:
                rels_root.remove(rel)
        self.package.set_xml(table.rels_path, rels_root)
        self._remove_content_type(table.table_path)
        self.package.delete(table.table_path)
        self.workbook.save_sheet(table.sheet)
        self.workbook.allowed_parts.update({table.table_path, table.rels_path, "[Content_Types].xml"})

    def _table_name_exists(self, name: str) -> bool:
        for path, data in self.package.entries.items():
            if not path.startswith("xl/tables/") or not path.endswith(".xml"):
                continue
            root = self.package.get_xml(path)
            if (root.get("name") or root.get("displayName")) == name:
                return True
        return False

    def _assert_no_overlap(self, sheet: str, ref: str) -> None:
        a1, b1, a2, b2 = parse_range_ref(ref)
        sheet_root = self.workbook.sheet_root(sheet)
        table_parts = sheet_root.find("x:tableParts", NS)
        if table_parts is None:
            return
        rels_path = self.workbook.sheet_rels_path(self.workbook.resolve_sheet(sheet).path)
        rels_root = self.package.get_xml(rels_path)
        for part in table_parts.findall("x:tablePart", NS):
            rel_id = part.get(qname(REL_NS, "id"))
            if not rel_id:
                continue
            target = self.tables._rel_target(rels_root, rel_id)
            sheet_path = self.workbook.resolve_sheet(sheet).path
            table_path = canonical_path(posixpath.normpath(posixpath.join(posixpath.dirname(sheet_path), target)))
            table_root = self.package.get_xml(table_path)
            existing = table_root.get("ref")
            if not existing:
                continue
            c1, d1, c2, d2 = parse_range_ref(existing)
            if not (a2 < c1 or c2 < a1 or b2 < d1 or d2 < b1):
                raise RecipeError(f"Nova tabela {ref} sobrepõe tabela existente {existing}.")

    def _load_or_create_rels(self, path: str) -> ET.Element:
        if path in self.package.entries:
            return self.package.get_xml(path)
        return ET.Element(qname(PKG_REL_NS, "Relationships"))

    def _next_rel_id(self, root: ET.Element) -> str:
        used = {rel.get("Id") for rel in root.findall(qname(PKG_REL_NS, "Relationship"))}
        index = 1
        while f"rId{index}" in used:
            index += 1
        return f"rId{index}"

    def _next_table_identity(self) -> tuple[str, int]:
        file_numbers: list[int] = []
        ids: list[int] = []
        for path in self.package.entries:
            match = re.fullmatch(r"xl/tables/table(\d+)\.xml", path)
            if not match:
                continue
            file_numbers.append(int(match.group(1)))
            root = self.package.get_xml(path)
            try:
                ids.append(int(root.get("id", "0")))
            except ValueError:
                pass
        number = max(file_numbers, default=0) + 1
        return f"xl/tables/table{number}.xml", max(ids, default=0) + 1

    def _add_content_type(self, table_path: str) -> None:
        root = self.package.get_xml("[Content_Types].xml")
        part_name = "/" + table_path
        for override in root.findall(qname(CONTENT_TYPES_NS, "Override")):
            if override.get("PartName") == part_name:
                return
        ET.SubElement(root, qname(CONTENT_TYPES_NS, "Override"), {"PartName": part_name, "ContentType": TABLE_CONTENT_TYPE})
        self.package.set_xml("[Content_Types].xml", root)

    def _remove_content_type(self, table_path: str) -> None:
        root = self.package.get_xml("[Content_Types].xml")
        part_name = "/" + table_path
        for override in list(root.findall(qname(CONTENT_TYPES_NS, "Override"))):
            if override.get("PartName") == part_name:
                root.remove(override)
        self.package.set_xml("[Content_Types].xml", root)
