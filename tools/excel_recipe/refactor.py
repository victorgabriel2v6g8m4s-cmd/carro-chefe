from __future__ import annotations

import hashlib
import re
from xml.etree import ElementTree as ET

from .constants import NS
from .errors import RecipeError
from .formula_refs import rewrite_column_reference, rewrite_table_reference
from .tables import TableManager, TableRef
from .util import parse_cell_ref, parse_range_ref, qname
from .constants import MAIN_NS
from .workbook import WorkbookContext


class RefactorEngine:
    def __init__(self, workbook: WorkbookContext) -> None:
        self.workbook = workbook
        self.package = workbook.package
        self.tables = TableManager(workbook)

    def rename_table(self, old: str, new: str, plan: dict) -> dict:
        target = self.tables.find(old)
        self._validate_plan(plan, old, None)
        self._validate_table_name(new)
        self._ensure_unique_table_name(old, new)
        rewritten = self._rewrite_all(target, table_old=old, table_new=new)
        target.root.set("name", new)
        target.root.set("displayName", new)
        self.package.set_xml(target.table_path, target.root)
        self.workbook.allowed_parts.add(target.table_path)
        self.workbook.mark_recalculate_on_open()
        return {
            "from": old,
            "to": new,
            "plan_sha256": plan["plan_sha256"],
            "rewritten_expressions": rewritten,
            "table_part": target.table_path,
        }

    def rename_column(self, table_name: str, old: str, new: str, plan: dict) -> dict:
        target = self.tables.find(table_name)
        self._validate_plan(plan, table_name, old)
        self._validate_column_name(target, old, new)
        rewritten = self._rewrite_all(target, column_old=old, column_new=new)
        columns = target.root.find("x:tableColumns", NS)
        if columns is None:
            raise RecipeError(f"Tabela {table_name} sem tableColumns.")
        nodes = columns.findall("x:tableColumn", NS)
        offset = target.columns.index(old)
        nodes[offset].set("name", new)
        start_row, start_col, _, _ = parse_range_ref(target.ref)
        self.workbook.write_value(target.sheet, self._cell(start_row, start_col + offset), new, save=False)
        self.workbook.save_sheet(target.sheet)
        self.package.set_xml(target.table_path, target.root)
        self.workbook.allowed_parts.add(target.table_path)
        self.workbook.mark_recalculate_on_open()
        return {
            "table": table_name,
            "from": old,
            "to": new,
            "plan_sha256": plan["plan_sha256"],
            "rewritten_expressions": rewritten,
            "table_part": target.table_path,
        }

    def _rewrite_all(
        self,
        target: TableRef,
        *,
        table_old: str | None = None,
        table_new: str | None = None,
        column_old: str | None = None,
        column_new: str | None = None,
    ) -> int:
        count = 0
        workbook_changed = False
        for node in self.workbook.workbook_root.findall("x:definedNames/x:definedName", NS):
            if node.text:
                rewritten, changed = self._rewrite(
                    node.text, target, False, table_old, table_new, column_old, column_new
                )
                if changed:
                    node.text = rewritten
                    count += 1
                    workbook_changed = True
        if workbook_changed:
            self.package.set_xml(self.workbook.workbook_path, self.workbook.workbook_root)
            self.workbook.allowed_parts.add(self.workbook.workbook_path)

        for sheet_node in self.workbook.workbook_root.findall("x:sheets/x:sheet", NS):
            sheet_name = sheet_node.get("name", "")
            sheet_ref = self.workbook.resolve_sheet(sheet_name)
            root = self.workbook.sheet_root(sheet_name)
            changed_sheet = False
            for cell in root.findall(".//x:c", NS):
                formula = cell.find("x:f", NS)
                if formula is None or not formula.text:
                    continue
                local = column_old is not None and sheet_ref.path == target.sheet_path and self._inside(target, cell.get("r", ""))
                rewritten, changed = self._rewrite(
                    formula.text, target, local, table_old, table_new, column_old, column_new
                )
                if changed:
                    formula.text = rewritten
                    for cached in list(cell.findall("x:v", NS)):
                        cell.remove(cached)
                    count += 1
                    changed_sheet = True
            for validation in root.findall(".//x:dataValidation", NS):
                for tag in ("formula1", "formula2"):
                    node = validation.find(f"x:{tag}", NS)
                    if node is not None and node.text:
                        rewritten, changed = self._rewrite(node.text, target, False, table_old, table_new, column_old, column_new)
                        if changed:
                            node.text = rewritten
                            count += 1
                            changed_sheet = True
            for conditional in root.findall(".//x:conditionalFormatting", NS):
                for formula in conditional.findall(".//x:formula", NS):
                    if formula.text:
                        rewritten, changed = self._rewrite(formula.text, target, False, table_old, table_new, column_old, column_new)
                        if changed:
                            formula.text = rewritten
                            count += 1
                            changed_sheet = True
            if changed_sheet:
                self.workbook.save_sheet(sheet_name)

        for path in sorted(name for name in self.package.entries if name.startswith("xl/tables/") and name.endswith(".xml")):
            root = target.root if path == target.table_path else self.package.get_xml(path)
            changed_table = False
            local = column_old is not None and path == target.table_path
            for node in root.iter():
                if self._local_name(node.tag) not in {"calculatedColumnFormula", "totalsRowFormula"} or not node.text:
                    continue
                rewritten, changed = self._rewrite(node.text, target, local, table_old, table_new, column_old, column_new)
                if changed:
                    node.text = rewritten
                    count += 1
                    changed_table = True
            if changed_table:
                self.package.set_xml(path, root)
                self.workbook.allowed_parts.add(path)
        return count

    @staticmethod
    def _rewrite(
        expression: str,
        target: TableRef,
        local: bool,
        table_old: str | None,
        table_new: str | None,
        column_old: str | None,
        column_new: str | None,
    ) -> tuple[str, bool]:
        if table_old is not None and table_new is not None:
            return rewrite_table_reference(expression, table_old, table_new)
        if column_old is None or column_new is None:
            return expression, False
        result, changed, ambiguous = rewrite_column_reference(
            expression, target.name, column_old, column_new, local_context=local
        )
        if ambiguous:
            raise RecipeError("Plano ficou obsoleto: surgiu referência de coluna ambígua antes da escrita.")
        return result, changed

    def _validate_plan(self, plan: dict, table: str, column: str | None) -> None:
        if plan.get("table") != table or plan.get("column") != column:
            raise RecipeError("Plano de dependências não corresponde ao refactor solicitado.")
        if plan.get("blocker_count") != 0:
            raise RecipeError("Plano de dependências contém blockers.")
        if plan.get("package_state_sha256") != self._package_state_sha():
            raise RecipeError("Plano de dependências ficou obsoleto após outra mutação da receita.")

    def _ensure_unique_table_name(self, old: str, new: str) -> None:
        for path in sorted(name for name in self.package.entries if name.startswith("xl/tables/") and name.endswith(".xml")):
            root = self.package.get_xml(path)
            current = root.get("name") or root.get("displayName") or ""
            if current.casefold() == new.casefold() and current.casefold() != old.casefold():
                raise RecipeError(f"Já existe tabela chamada {new!r}.")

    @staticmethod
    def _validate_table_name(name: str) -> None:
        if not name or len(name) > 255 or any(char.isspace() for char in name) or any(char in "[]:*?/" for char in name):
            raise RecipeError(f"Nome de tabela inválido para refactor: {name!r}")
        if re.fullmatch(r"[A-Za-z]{1,3}[1-9][0-9]*", name) or re.fullmatch(r"R[1-9][0-9]*C[1-9][0-9]*", name, re.IGNORECASE):
            raise RecipeError("Nome de tabela não pode parecer referência de célula.")

    @staticmethod
    def _validate_column_name(target: TableRef, old: str, new: str) -> None:
        if old not in target.columns:
            raise RecipeError(f"Coluna {old!r} não existe em {target.name}.")
        if not new or len(new) > 255 or any(ord(char) < 32 for char in new):
            raise RecipeError("Novo nome de coluna inválido.")
        if any(column.casefold() == new.casefold() and column.casefold() != old.casefold() for column in target.columns):
            raise RecipeError(f"Já existe coluna chamada {new!r} em {target.name}.")

    @staticmethod
    def _inside(table: TableRef, cell_ref: str) -> bool:
        try:
            row, col = parse_cell_ref(cell_ref)
        except RecipeError:
            return False
        start_row, start_col, end_row, end_col = parse_range_ref(table.ref)
        return start_row <= row <= end_row and start_col <= col <= end_col

    @staticmethod
    def _cell(row: int, column: int) -> str:
        from .util import make_cell_ref

        return make_cell_ref(row, column)

    @staticmethod
    def _local_name(tag: str) -> str:
        return tag.rsplit("}", 1)[-1]

    def _package_state_sha(self) -> str:
        payload = "\n".join(f"{path}:{digest}" for path, digest in sorted(self.package.hash_map().items()))
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()
