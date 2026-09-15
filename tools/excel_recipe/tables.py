from __future__ import annotations

import posixpath
from dataclasses import dataclass
from xml.etree import ElementTree as ET

from .constants import CONTENT_TYPES_NS, MAIN_NS, NS, PKG_REL_NS, REL_NS
from .errors import RecipeError
from .util import canonical_path, make_cell_ref, make_range_ref, parse_range_ref, qname
from .workbook import WorkbookContext

TABLE_REL_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/table"
TABLE_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"


@dataclass
class TableRef:
    name: str
    sheet: str
    sheet_path: str
    rels_path: str
    rel_id: str
    table_path: str
    root: ET.Element

    @property
    def ref(self) -> str:
        value = self.root.get("ref")
        if not value:
            raise RecipeError(f"Tabela {self.name} sem ref.")
        return value

    @property
    def columns(self) -> list[str]:
        parent = self.root.find("x:tableColumns", NS)
        if parent is None:
            return []
        return [item.get("name", "") for item in parent.findall("x:tableColumn", NS)]

    @property
    def totals_rows(self) -> int:
        return int(self.root.get("totalsRowCount", "0") or "0")


class TableManager:
    def __init__(self, workbook: WorkbookContext) -> None:
        self.workbook = workbook
        self.package = workbook.package

    def find(self, table_name: str) -> TableRef:
        for sheet_node in self.workbook.workbook_root.findall("x:sheets/x:sheet", NS):
            sheet_name = sheet_node.get("name", "")
            sheet_ref = self.workbook.resolve_sheet(sheet_name)
            sheet_root = self.workbook.sheet_root(sheet_name)
            table_parts = sheet_root.find("x:tableParts", NS)
            if table_parts is None:
                continue
            rels_path = self.workbook.sheet_rels_path(sheet_ref.path)
            if rels_path not in self.package.entries:
                continue
            rels_root = self.package.get_xml(rels_path)
            for table_part in table_parts.findall("x:tablePart", NS):
                rel_id = table_part.get(qname(REL_NS, "id"))
                if not rel_id:
                    continue
                target = self._rel_target(rels_root, rel_id)
                table_path = canonical_path(posixpath.normpath(posixpath.join(posixpath.dirname(sheet_ref.path), target)))
                root = self.package.get_xml(table_path)
                name = root.get("name") or root.get("displayName") or ""
                if name == table_name:
                    return TableRef(name, sheet_name, sheet_ref.path, rels_path, rel_id, table_path, root)
        raise RecipeError(f"Tabela não encontrada: {table_name}")

    def row_dict(self, table: TableRef, row_number: int) -> dict[str, object]:
        start_row, start_col, end_row, end_col = parse_range_ref(table.ref)
        if row_number <= start_row or row_number > end_row - table.totals_rows:
            raise RecipeError(f"Linha {row_number} fora da tabela {table.name}.")
        return {
            column_name: self.workbook.read_cell(table.sheet, make_cell_ref(row_number, start_col + offset))
            for offset, column_name in enumerate(table.columns)
        }

    def data_row_numbers(self, table: TableRef) -> list[int]:
        start_row, _, end_row, _ = parse_range_ref(table.ref)
        return list(range(start_row + 1, end_row - table.totals_rows + 1))

    def find_matching_rows(self, table: TableRef, where: dict[str, object]) -> list[int]:
        self._validate_columns(table, where)
        matches: list[int] = []
        for row_number in self.data_row_numbers(table):
            row = self.row_dict(table, row_number)
            if all(self._same(row.get(key), value) for key, value in where.items()):
                matches.append(row_number)
        return matches

    def first_blank_row(self, table: TableRef) -> int | None:
        calculated = set(self._calculated_formulas(table))
        for row_number in self.data_row_numbers(table):
            row = self.row_dict(table, row_number)
            business_values = [value for name, value in row.items() if name not in calculated]
            if all(value in (None, "") for value in business_values):
                return row_number
        return None

    def write_row(self, table: TableRef, row_number: int, values: dict[str, object]) -> None:
        self._validate_columns(table, values)
        _, start_col, _, _ = parse_range_ref(table.ref)
        positions = {name: index for index, name in enumerate(table.columns)}
        self._copy_style_from_previous_row(table, row_number)
        formulas = self._calculated_formulas(table)
        for name, formula in formulas.items():
            if name not in values:
                self.workbook.write_formula(table.sheet, make_cell_ref(row_number, start_col + positions[name]), formula, save=False)
        for name, value in values.items():
            cell_ref = make_cell_ref(row_number, start_col + positions[name])
            self.workbook.write_value(table.sheet, cell_ref, value, save=False)
        self.workbook.save_sheet(table.sheet)

    def append(self, table: TableRef, rows: list[dict[str, object]]) -> list[int]:
        if table.totals_rows:
            raise RecipeError("append_rows ainda não suporta tabelas com linha de totais.")
        written: list[int] = []
        for values in rows:
            target = self.first_blank_row(table)
            if target is None:
                _, _, end_row, _ = parse_range_ref(table.ref)
                target = end_row + 1
                self.resize_rows(table, target)
            self.write_row(table, target, values)
            written.append(target)
        return written

    def resize_rows(self, table: TableRef, new_end_row: int) -> None:
        start_row, start_col, old_end_row, end_col = parse_range_ref(table.ref)
        if new_end_row < start_row + 1:
            raise RecipeError("Tabela precisa manter ao menos a linha de cabeçalho e uma linha de dados.")
        if new_end_row < old_end_row and table.totals_rows:
            raise RecipeError("Redução de tabela com totais não suportada na V1.")
        new_ref = make_range_ref(start_row, start_col, new_end_row, end_col)
        table.root.set("ref", new_ref)
        auto_filter = table.root.find("x:autoFilter", NS)
        if auto_filter is not None:
            auto_filter.set("ref", new_ref)
        self._save_table(table)

    def clear_rows(self, table: TableRef, row_numbers: list[int]) -> None:
        _, start_col, _, end_col = parse_range_ref(table.ref)
        for row_number in row_numbers:
            for column in range(start_col, end_col + 1):
                self.workbook.clear_cell(table.sheet, make_cell_ref(row_number, column), save=False)
        self.workbook.save_sheet(table.sheet)

    def set_formula_column(self, table: TableRef, column_name: str, formula: str) -> None:
        if column_name not in table.columns:
            raise RecipeError(f"Coluna {column_name!r} não existe em {table.name}.")
        _, start_col, _, _ = parse_range_ref(table.ref)
        offset = table.columns.index(column_name)
        columns_node = table.root.find("x:tableColumns", NS)
        assert columns_node is not None
        table_column = columns_node.findall("x:tableColumn", NS)[offset]
        calculated = table_column.find("x:calculatedColumnFormula", NS)
        if calculated is None:
            calculated = ET.SubElement(table_column, qname(MAIN_NS, "calculatedColumnFormula"))
        calculated.text = formula[1:] if formula.startswith("=") else formula
        for row_number in self.data_row_numbers(table):
            self.workbook.write_formula(table.sheet, make_cell_ref(row_number, start_col + offset), formula, save=False)
        self.workbook.save_sheet(table.sheet)
        self._save_table(table)

    def add_column(self, table: TableRef, name: str, default=None, formula: str | None = None) -> None:
        if name in table.columns:
            raise RecipeError(f"Coluna já existe em {table.name}: {name}")
        start_row, start_col, end_row, end_col = parse_range_ref(table.ref)
        new_col = end_col + 1
        for row in range(start_row, end_row + 1):
            current = self.workbook.read_cell(table.sheet, make_cell_ref(row, new_col))
            if current not in (None, ""):
                raise RecipeError(f"Não é seguro expandir {table.name}; {make_cell_ref(row, new_col)} não está vazia.")
        columns_node = table.root.find("x:tableColumns", NS)
        if columns_node is None:
            raise RecipeError(f"Tabela {table.name} sem tableColumns.")
        ids = [int(node.get("id", "0")) for node in columns_node.findall("x:tableColumn", NS)]
        new_column = ET.SubElement(columns_node, qname(MAIN_NS, "tableColumn"), {"id": str(max(ids, default=0) + 1), "name": name})
        columns_node.set("count", str(len(columns_node.findall("x:tableColumn", NS))))
        self.workbook.write_value(table.sheet, make_cell_ref(start_row, new_col), name, save=False)
        if formula is not None:
            calculated = ET.SubElement(new_column, qname(MAIN_NS, "calculatedColumnFormula"))
            calculated.text = formula[1:] if formula.startswith("=") else formula
            for row in range(start_row + 1, end_row - table.totals_rows + 1):
                self.workbook.write_formula(table.sheet, make_cell_ref(row, new_col), formula, save=False)
        elif default is not None:
            for row in range(start_row + 1, end_row - table.totals_rows + 1):
                self.workbook.write_value(table.sheet, make_cell_ref(row, new_col), default, save=False)
        new_ref = make_range_ref(start_row, start_col, end_row, new_col)
        table.root.set("ref", new_ref)
        auto_filter = table.root.find("x:autoFilter", NS)
        if auto_filter is not None:
            auto_filter.set("ref", new_ref)
        self.workbook.save_sheet(table.sheet)
        self._save_table(table)

    def _calculated_formulas(self, table: TableRef) -> dict[str, str]:
        parent = table.root.find("x:tableColumns", NS)
        if parent is None:
            return {}
        result: dict[str, str] = {}
        for column in parent.findall("x:tableColumn", NS):
            formula = column.find("x:calculatedColumnFormula", NS)
            name = column.get("name")
            if name and formula is not None and formula.text:
                result[name] = "=" + formula.text
        return result

    def _copy_style_from_previous_row(self, table: TableRef, row_number: int) -> None:
        start_row, start_col, _, end_col = parse_range_ref(table.ref)
        if row_number <= start_row + 1:
            return
        previous = row_number - 1
        for column in range(start_col, end_col + 1):
            source = self.workbook.get_cell(table.sheet, make_cell_ref(previous, column), create=False)
            target = self.workbook.get_cell(table.sheet, make_cell_ref(row_number, column), create=True)
            if source is not None and target is not None and source.get("s") is not None and target.get("s") is None:
                target.set("s", source.get("s"))

    def _save_table(self, table: TableRef) -> None:
        self.package.set_xml(table.table_path, table.root)
        self.workbook.allowed_parts.add(table.table_path)

    def _validate_columns(self, table: TableRef, values: dict[str, object]) -> None:
        unknown = sorted(set(values) - set(table.columns))
        if unknown:
            raise RecipeError(f"Colunas desconhecidas em {table.name}: {', '.join(unknown)}")

    @staticmethod
    def _same(actual, expected) -> bool:
        if isinstance(expected, dict) and "value" in expected:
            expected = expected["value"]
        return str(actual) == str(expected) if actual is not None and expected is not None else actual == expected

    @staticmethod
    def _rel_target(rels_root: ET.Element, rel_id: str) -> str:
        for rel in rels_root.findall(qname(PKG_REL_NS, "Relationship")):
            if rel.get("Id") == rel_id:
                target = rel.get("Target")
                if target:
                    return target
        raise RecipeError(f"Relacionamento de tabela não encontrado: {rel_id}")
