from __future__ import annotations

import copy
import json
import posixpath
from xml.etree import ElementTree as ET

from .a1_refs import rewrite_formula_a1, rewrite_simple_ref, rewrite_sqref
from .constants import MAIN_NS, NS, PKG_REL_NS, REL_NS
from .coordinates import AxisTransform, CompactRowsTransform, RangeMoveTransform, TableColumnTransform
from .errors import RecipeError
from .structural_plan import StructuralPlanner
from .tables import TableManager, TableRef
from .util import canonical_path, make_cell_ref, make_range_ref, parse_cell_ref, parse_range_ref, qname
from .workbook import WorkbookContext

Transform = AxisTransform | RangeMoveTransform | TableColumnTransform | CompactRowsTransform


class StructuralEngine:
    def __init__(self, workbook: WorkbookContext, planner: StructuralPlanner) -> None:
        self.workbook = workbook
        self.package = workbook.package
        self.planner = planner
        self.tables = TableManager(workbook)

    def apply(self, operation: dict, plan: dict) -> dict:
        if self.planner.package_state_sha() != plan.get("package_state_sha256"):
            raise RecipeError("Plano estrutural ficou obsoleto após outra mutação no pacote.")
        action, transform, meta = self.planner._build(operation)
        if action != plan.get("action") or transform.as_dict() != plan.get("transform"):
            raise RecipeError("Operação estrutural não corresponde ao structural.assert_clean aprovado.")

        moved = self._mutate_cells(action, transform, meta, operation)
        rewritten = self._rewrite_references(action, transform, meta, operation)
        self.workbook.mark_recalculate_on_open()
        return {
            "structural": {
                "action": action,
                "transform": transform.as_dict(),
                "plan_sha256": plan.get("plan_sha256"),
                "moved_or_removed_cells": moved,
                "rewritten_references": rewritten,
                "blockers_verified": 0,
            }
        }

    def _mutate_cells(self, action: str, transform: Transform, meta: dict, operation: dict) -> int:
        if isinstance(transform, AxisTransform):
            return self._mutate_axis(transform)
        if isinstance(transform, RangeMoveTransform):
            return self._mutate_move(transform)
        if isinstance(transform, TableColumnTransform):
            changed = self._mutate_table_columns(transform)
            self._mutate_table_definition(action, meta, operation)
            return changed
        if isinstance(transform, CompactRowsTransform):
            changed = self._mutate_compact(transform)
            self._mutate_table_definition(action, meta, operation)
            return changed
        raise RecipeError("Transformação estrutural desconhecida.")

    def _mutate_axis(self, transform: AxisTransform) -> int:
        root = self.workbook.sheet_root(transform.sheet)
        sheet_data = root.find("x:sheetData", NS)
        if sheet_data is None:
            return 0
        changed = 0
        if transform.axis == "row":
            for row in list(sheet_data.findall("x:row", NS)):
                row_number = int(row.get("r", "0"))
                new_row = transform.transform_index(row_number)
                if new_row is None:
                    changed += len(row.findall("x:c", NS))
                    sheet_data.remove(row)
                    continue
                if new_row != row_number:
                    row.set("r", str(new_row))
                    row.attrib.pop("spans", None)
                for cell in row.findall("x:c", NS):
                    ref = cell.get("r")
                    if not ref:
                        continue
                    new_ref = transform.transform_cell_ref(ref)
                    if new_ref is None:
                        row.remove(cell)
                        changed += 1
                    elif new_ref != ref:
                        cell.set("r", new_ref)
                        changed += 1
        else:
            for row in sheet_data.findall("x:row", NS):
                for cell in list(row.findall("x:c", NS)):
                    ref = cell.get("r")
                    if not ref:
                        continue
                    new_ref = transform.transform_cell_ref(ref)
                    if new_ref is None:
                        row.remove(cell)
                        changed += 1
                    elif new_ref != ref:
                        cell.set("r", new_ref)
                        changed += 1
                self._sort_cells(row)
            self._rewrite_column_dimensions(root, transform)
        self.workbook.save_sheet(transform.sheet)
        return changed

    def _mutate_move(self, transform: RangeMoveTransform) -> int:
        root = self.workbook.sheet_root(transform.sheet)
        sheet_data = root.find("x:sheetData", NS)
        if sheet_data is None:
            return 0
        source_cells: list[tuple[int, int, ET.Element]] = []
        srow, scol, erow, ecol = parse_range_ref(transform.source)
        for row in list(sheet_data.findall("x:row", NS)):
            row_number = int(row.get("r", "0"))
            if not (srow <= row_number <= erow):
                continue
            for cell in list(row.findall("x:c", NS)):
                ref = cell.get("r")
                if not ref:
                    continue
                _, column = parse_cell_ref(ref)
                if scol <= column <= ecol:
                    source_cells.append((row_number, column, copy.deepcopy(cell)))
                    row.remove(cell)

        cleared_targets = 0
        drow, dcol, dend_row, dend_col = parse_range_ref(transform.destination_range)
        for row in list(sheet_data.findall("x:row", NS)):
            row_number = int(row.get("r", "0"))
            if not (drow <= row_number <= dend_row):
                continue
            for cell in list(row.findall("x:c", NS)):
                ref = cell.get("r")
                if not ref:
                    continue
                _, column = parse_cell_ref(ref)
                if dcol <= column <= dend_col:
                    row.remove(cell)
                    cleared_targets += 1

        for row_number, column, cell in source_cells:
            new_row, new_col = transform.transform_cell(row_number, column)
            cell.set("r", make_cell_ref(new_row, new_col))
            target_row = self._ensure_row(sheet_data, new_row)
            target_row.append(cell)
            self._sort_cells(target_row)
        self.workbook.save_sheet(transform.sheet)
        return len(source_cells) + cleared_targets

    def _mutate_table_columns(self, transform: TableColumnTransform) -> int:
        root = self.workbook.sheet_root(transform.sheet)
        sheet_data = root.find("x:sheetData", NS)
        if sheet_data is None:
            return 0
        start_row, _, end_row, end_col = parse_range_ref(transform.table_ref)
        changed = 0
        for row in sheet_data.findall("x:row", NS):
            row_number = int(row.get("r", "0"))
            if not (start_row <= row_number <= end_row):
                continue
            cells = list(row.findall("x:c", NS))
            if transform.mode == "insert":
                cells = list(reversed(cells))
            for cell in cells:
                ref = cell.get("r")
                if not ref:
                    continue
                _, col = parse_cell_ref(ref)
                if col > end_col or col < transform.column:
                    continue
                new_ref = transform.transform_cell_ref(ref)
                if new_ref is None:
                    row.remove(cell)
                    changed += 1
                elif new_ref != ref:
                    cell.set("r", new_ref)
                    changed += 1
            self._sort_cells(row)
        self.workbook.save_sheet(transform.sheet)
        return changed

    def _mutate_compact(self, transform: CompactRowsTransform) -> int:
        root = self.workbook.sheet_root(transform.sheet)
        sheet_data = root.find("x:sheetData", NS)
        if sheet_data is None:
            return 0
        start_row, start_col, end_row, end_col = parse_range_ref(transform.table_ref)
        changed = 0
        for row in list(sheet_data.findall("x:row", NS)):
            row_number = int(row.get("r", "0"))
            if not (start_row < row_number <= end_row):
                continue
            for cell in list(row.findall("x:c", NS)):
                ref = cell.get("r")
                if not ref:
                    continue
                _, col = parse_cell_ref(ref)
                if not (start_col <= col <= end_col):
                    continue
                new_ref = transform.transform_cell_ref(ref)
                if new_ref is None:
                    row.remove(cell)
                    changed += 1
                    continue
                new_row, _ = parse_cell_ref(new_ref)
                if new_row != row_number:
                    moved = copy.deepcopy(cell)
                    moved.set("r", new_ref)
                    row.remove(cell)
                    target_row = self._ensure_row(sheet_data, new_row)
                    target_row.append(moved)
                    self._sort_cells(target_row)
                    changed += 1
        self.workbook.save_sheet(transform.sheet)
        return changed

    def _mutate_table_definition(self, action: str, meta: dict, operation: dict) -> None:
        table = self.tables.find(meta["table"])
        start_row, start_col, end_row, end_col = parse_range_ref(table.ref)
        columns = table.root.find("x:tableColumns", NS)
        if columns is None:
            raise RecipeError(f"Tabela {table.name} sem tableColumns.")
        nodes = list(columns.findall("x:tableColumn", NS))
        if action == "table.insert_column":
            position = meta["position"] - 1
            ids = [int(node.get("id", "0")) for node in nodes]
            new_node = ET.Element(qname(MAIN_NS, "tableColumn"), {"id": str(max(ids, default=0) + 1), "name": meta["name"]})
            columns.insert(position, new_node)
            if operation.get("formula") is not None:
                formula = ET.SubElement(new_node, qname(MAIN_NS, "calculatedColumnFormula"))
                formula.text = str(operation["formula"]).lstrip("=")
            new_ref = make_range_ref(start_row, start_col, end_row, end_col + 1)
            table.root.set("ref", new_ref)
            auto_filter = table.root.find("x:autoFilter", NS)
            if auto_filter is not None:
                auto_filter.set("ref", new_ref)
            inserted_col = start_col + position
            self.workbook.write_value(table.sheet, make_cell_ref(start_row, inserted_col), meta["name"], save=False)
            for row in range(start_row + 1, end_row - table.totals_rows + 1):
                if operation.get("formula") is not None:
                    self.workbook.write_formula(table.sheet, make_cell_ref(row, inserted_col), str(operation["formula"]), save=False)
                elif "default" in operation:
                    self.workbook.write_value(table.sheet, make_cell_ref(row, inserted_col), operation.get("default"), save=False)
            self.workbook.save_sheet(table.sheet)
        elif action == "table.delete_column":
            position = meta["position"] - 1
            columns.remove(nodes[position])
            new_ref = make_range_ref(start_row, start_col, end_row, end_col - 1)
            table.root.set("ref", new_ref)
            auto_filter = table.root.find("x:autoFilter", NS)
            if auto_filter is not None:
                auto_filter.set("ref", new_ref)
        elif action == "table.compact_rows":
            removed = len(meta["removed_rows"])
            new_ref = make_range_ref(start_row, start_col, end_row - removed, end_col)
            table.root.set("ref", new_ref)
            auto_filter = table.root.find("x:autoFilter", NS)
            if auto_filter is not None:
                auto_filter.set("ref", new_ref)
        columns.set("count", str(len(columns.findall("x:tableColumn", NS))))
        self.package.set_xml(table.table_path, table.root)
        self.workbook.allowed_parts.add(table.table_path)

    def _rewrite_references(self, action: str, transform: Transform, meta: dict, operation: dict) -> int:
        rewritten = 0
        rewritten += self._rewrite_defined_names(transform)
        rewritten += self._rewrite_sheet_formulas_and_ranges(transform)
        rewritten += self._rewrite_tables(action, transform, meta)
        return rewritten

    def _rewrite_defined_names(self, transform: Transform) -> int:
        changed = 0
        for node in self.workbook.workbook_root.findall("x:definedNames/x:definedName", NS):
            if not node.text:
                continue
            text, did_change, blockers = rewrite_formula_a1(node.text, "", transform)
            if blockers:
                raise RecipeError("Plano limpo tornou-se inválido ao reescrever nome definido: " + "; ".join(blockers))
            if did_change:
                node.text = text
                changed += 1
        if changed:
            self.package.set_xml(self.workbook.workbook_path, self.workbook.workbook_root)
            self.workbook.allowed_parts.add(self.workbook.workbook_path)
        return changed

    def _rewrite_sheet_formulas_and_ranges(self, transform: Transform) -> int:
        changed = 0
        for sheet_node in self.workbook.workbook_root.findall("x:sheets/x:sheet", NS):
            sheet_name = sheet_node.get("name", "")
            sheet_ref = self.workbook.resolve_sheet(sheet_name)
            root = self.workbook.sheet_root(sheet_name)
            sheet_changed = False
            for formula in root.findall(".//x:f", NS):
                if formula.text:
                    text, did_change, blockers = rewrite_formula_a1(formula.text, sheet_name, transform)
                    if blockers:
                        raise RecipeError("Plano limpo tornou-se inválido ao reescrever fórmula: " + "; ".join(blockers))
                    if did_change:
                        formula.text = text
                        self._remove_formula_cache_parent(root, formula)
                        changed += 1
                        sheet_changed = True
                if sheet_name.casefold() == transform.sheet.casefold() and formula.get("ref"):
                    new_ref, _ = rewrite_simple_ref(formula.get("ref", ""), transform)
                    if new_ref is None:
                        raise RecipeError("Range de fórmula compartilhada foi removido após plano limpo.")
                    if new_ref != formula.get("ref"):
                        formula.set("ref", new_ref)
                        changed += 1
                        sheet_changed = True
            if sheet_name.casefold() == transform.sheet.casefold():
                sheet_changed = self._rewrite_target_sheet_ranges(root, transform) or sheet_changed
            for validation in root.findall(".//x:dataValidation", NS):
                for tag in ("formula1", "formula2"):
                    node = validation.find(f"x:{tag}", NS)
                    if node is not None and node.text:
                        text, did_change, blockers = rewrite_formula_a1(node.text, sheet_name, transform)
                        if blockers:
                            raise RecipeError("Validação tornou-se insegura após plano limpo.")
                        if did_change:
                            node.text = text
                            changed += 1
                            sheet_changed = True
            for formula in root.findall(".//x:conditionalFormatting//x:formula", NS):
                if formula.text:
                    text, did_change, blockers = rewrite_formula_a1(formula.text, sheet_name, transform)
                    if blockers:
                        raise RecipeError("Formatação condicional tornou-se insegura após plano limpo.")
                    if did_change:
                        formula.text = text
                        changed += 1
                        sheet_changed = True
            if sheet_changed:
                self.package.set_xml(sheet_ref.path, root)
                self.workbook.allowed_parts.add(sheet_ref.path)
        return changed

    def _rewrite_target_sheet_ranges(self, root: ET.Element, transform: Transform) -> bool:
        changed = False
        dimension = root.find("x:dimension", NS)
        if dimension is not None and dimension.get("ref"):
            try:
                new_ref, _ = rewrite_simple_ref(dimension.get("ref", ""), transform, allow_partial=True)
            except RecipeError:
                new_ref = None
            if new_ref is None:
                new_ref = "A1"
            if new_ref != dimension.get("ref"):
                dimension.set("ref", new_ref)
                changed = True
        auto_filter = root.find("x:autoFilter", NS)
        if auto_filter is not None and auto_filter.get("ref"):
            new_ref, _ = rewrite_simple_ref(auto_filter.get("ref", ""), transform)
            if new_ref is None:
                raise RecipeError("AutoFilter seria removido após plano limpo.")
            if new_ref != auto_filter.get("ref"):
                auto_filter.set("ref", new_ref)
                changed = True
        for node in root.findall(".//x:dataValidation", NS) + root.findall(".//x:conditionalFormatting", NS):
            if node.get("sqref"):
                new_value, did_change = rewrite_sqref(node.get("sqref", ""), transform)
                if did_change:
                    node.set("sqref", new_value)
                    changed = True
        for merge in root.findall("x:mergeCells/x:mergeCell", NS):
            if merge.get("ref"):
                new_ref, _ = rewrite_simple_ref(merge.get("ref", ""), transform)
                if new_ref is None:
                    raise RecipeError("Merge seria removido após plano limpo.")
                if new_ref != merge.get("ref"):
                    merge.set("ref", new_ref)
                    changed = True
        for hyperlink in root.findall("x:hyperlinks/x:hyperlink", NS):
            if hyperlink.get("ref"):
                new_ref, _ = rewrite_simple_ref(hyperlink.get("ref", ""), transform)
                if new_ref is None:
                    raise RecipeError("Hyperlink seria removido após plano limpo.")
                if new_ref != hyperlink.get("ref"):
                    hyperlink.set("ref", new_ref)
                    changed = True
            location = hyperlink.get("location")
            if location:
                new_location, did_change, blockers = rewrite_formula_a1(location, transform.sheet, transform)
                if blockers:
                    raise RecipeError("Hyperlink interno tornou-se inseguro após plano limpo.")
                if did_change:
                    hyperlink.set("location", new_location)
                    changed = True
        pane = root.find("x:sheetViews/x:sheetView/x:pane", NS)
        if pane is not None and pane.get("topLeftCell"):
            new_ref = transform.transform_cell_ref(pane.get("topLeftCell", ""))
            if new_ref is None:
                raise RecipeError("Freeze pane seria removido após plano limpo.")
            if new_ref != pane.get("topLeftCell"):
                pane.set("topLeftCell", new_ref)
                changed = True
            if isinstance(transform, AxisTransform):
                changed = self._rewrite_split(pane, transform) or changed
        return changed

    def _rewrite_tables(self, action: str, transform: Transform, meta: dict) -> int:
        changed = 0
        for table in self._tables():
            table_changed = False
            if table.sheet.casefold() == transform.sheet.casefold() and not (action.startswith("table.") and table.name == meta.get("table")):
                change = transform.transform_range(table.ref)
                if change.ref is None or change.relation == "partial":
                    raise RecipeError(f"Table {table.name} tornou-se insegura após plano limpo.")
                if change.ref != table.ref:
                    table.root.set("ref", change.ref)
                    auto = table.root.find("x:autoFilter", NS)
                    if auto is not None:
                        auto.set("ref", change.ref)
                    table_changed = True
                    changed += 1
            for formula in table.root.findall(".//x:calculatedColumnFormula", NS) + table.root.findall(".//x:totalsRowFormula", NS):
                if formula.text:
                    text, did_change, blockers = rewrite_formula_a1(formula.text, table.sheet, transform)
                    if blockers:
                        raise RecipeError(f"Fórmula da Table {table.name} tornou-se insegura.")
                    if did_change:
                        formula.text = text
                        table_changed = True
                        changed += 1
            if table_changed:
                self.package.set_xml(table.table_path, table.root)
                self.workbook.allowed_parts.add(table.table_path)
        return changed

    def _rewrite_column_dimensions(self, root: ET.Element, transform: AxisTransform) -> None:
        cols = root.find("x:cols", NS)
        if cols is None:
            return
        for node in list(cols.findall("x:col", NS)):
            minimum = int(node.get("min", "1"))
            maximum = int(node.get("max", str(minimum)))
            change = transform.transform_range(make_range_ref(1, minimum, 1, maximum))
            if change.ref is None:
                cols.remove(node)
                continue
            _, new_min, _, new_max = parse_range_ref(change.ref)
            node.set("min", str(new_min))
            node.set("max", str(new_max))

    @staticmethod
    def _rewrite_split(pane: ET.Element, transform: AxisTransform) -> bool:
        attr = "ySplit" if transform.axis == "row" else "xSplit"
        raw = pane.get(attr)
        if raw is None:
            return False
        try:
            split = int(float(raw))
        except ValueError:
            return False
        if transform.mode == "insert" and transform.at <= split:
            pane.set(attr, str(split + transform.count))
            return True
        if transform.mode == "delete" and transform.at <= split:
            removed_before = max(0, min(transform.end, split) - transform.at + 1)
            pane.set(attr, str(max(0, split - removed_before)))
            return removed_before > 0
        return False

    def _tables(self) -> list[TableRef]:
        result: list[TableRef] = []
        for sheet_node in self.workbook.workbook_root.findall("x:sheets/x:sheet", NS):
            sheet_name = sheet_node.get("name", "")
            sheet_ref = self.workbook.resolve_sheet(sheet_name)
            root = self.workbook.sheet_root(sheet_name)
            parts = root.find("x:tableParts", NS)
            if parts is None:
                continue
            rels_path = self.workbook.sheet_rels_path(sheet_ref.path)
            if rels_path not in self.package.entries:
                continue
            rels = self.package.get_xml(rels_path)
            targets = {node.get("Id"): node.get("Target") for node in rels.findall(qname(PKG_REL_NS, "Relationship"))}
            for part in parts.findall("x:tablePart", NS):
                rel_id = part.get(qname(REL_NS, "id"))
                target = targets.get(rel_id)
                if not rel_id or not target:
                    continue
                path = canonical_path(posixpath.normpath(posixpath.join(posixpath.dirname(sheet_ref.path), target)))
                table_root = self.package.get_xml(path)
                name = table_root.get("name") or table_root.get("displayName") or path
                result.append(TableRef(name, sheet_name, sheet_ref.path, rels_path, rel_id, path, table_root))
        return result

    @staticmethod
    def _remove_formula_cache_parent(root: ET.Element, formula: ET.Element) -> None:
        for cell in root.findall(".//x:c", NS):
            if formula in list(cell):
                value = cell.find("x:v", NS)
                if value is not None:
                    cell.remove(value)
                return

    @staticmethod
    def _sort_cells(row: ET.Element) -> None:
        cells = list(row.findall("x:c", NS))
        others = [child for child in list(row) if child.tag != qname(MAIN_NS, "c")]
        for child in list(row):
            row.remove(child)
        cells.sort(key=lambda cell: parse_cell_ref(cell.get("r", "A1"))[1])
        for cell in cells:
            row.append(cell)
        for child in others:
            row.append(child)

    @staticmethod
    def _ensure_row(sheet_data: ET.Element, row_number: int) -> ET.Element:
        rows = list(sheet_data.findall("x:row", NS))
        for row in rows:
            if int(row.get("r", "0")) == row_number:
                return row
        row = ET.Element(qname(MAIN_NS, "row"), {"r": str(row_number)})
        index = len(rows)
        for offset, existing in enumerate(rows):
            if int(existing.get("r", "0")) > row_number:
                index = offset
                break
        sheet_data.insert(index, row)
        return row
