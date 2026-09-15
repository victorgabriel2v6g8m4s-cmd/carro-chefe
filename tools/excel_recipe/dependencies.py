from __future__ import annotations

import hashlib
import json
from pathlib import Path
from xml.etree import ElementTree as ET

from .constants import NS
from .errors import RecipeError
from .formula_refs import contains_symbol, rewrite_column_reference, rewrite_table_reference
from .tables import TableManager, TableRef
from .util import make_cell_ref, parse_cell_ref, parse_range_ref
from .workbook import WorkbookContext


class DependencyScanner:
    def __init__(self, workbook: WorkbookContext, repo_root: Path) -> None:
        self.workbook = workbook
        self.package = workbook.package
        self.repo_root = repo_root.resolve()
        self.tables = TableManager(workbook)

    def scan(self, table_name: str, column_name: str | None = None) -> dict:
        target = self.tables.find(table_name)
        if column_name is not None and column_name not in target.columns:
            raise RecipeError(f"Coluna {column_name!r} não existe em {table_name}.")
        occurrences: list[dict] = []
        self._scan_definition(target, column_name, occurrences)
        self._scan_workbook(target, column_name, occurrences)
        self._scan_sheets(target, column_name, occurrences)
        self._scan_tables(target, column_name, occurrences)
        self._scan_vba(target, column_name, occurrences)
        self._scan_protected_parts(target, column_name, occurrences)
        occurrences = self._dedupe(occurrences)
        blockers = [item for item in occurrences if item["disposition"] == "blocker"]
        state_sha = self._package_state_sha()
        report = {
            "mode": "column" if column_name is not None else "table",
            "table": table_name,
            "column": column_name,
            "source_sha256": self.package.source_sha256,
            "package_state_sha256": state_sha,
            "vba_sha256": self.package.vba_sha256,
            "occurrences": occurrences,
            "rewritable_count": sum(item["disposition"] == "rewritable" for item in occurrences),
            "blocker_count": len(blockers),
            "blockers": blockers,
        }
        report["plan_sha256"] = hashlib.sha256(
            json.dumps(report, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
        ).hexdigest()
        return report

    def assert_clean(self, report: dict) -> None:
        blockers = report.get("blockers") or []
        if blockers:
            preview = "; ".join(f"{item['kind']}@{item['location']}" for item in blockers[:5])
            suffix = f" (+{len(blockers) - 5})" if len(blockers) > 5 else ""
            raise RecipeError(f"Refactor bloqueado por {len(blockers)} dependência(s): {preview}{suffix}")

    def _scan_definition(self, target: TableRef, column: str | None, out: list[dict]) -> None:
        if column is None:
            out.append(self._occ("table_definition", target.table_path, "name/displayName", target.name, "rewritable"))
            return
        start_row, start_col, _, _ = parse_range_ref(target.ref)
        offset = target.columns.index(column)
        out.append(self._occ("table_column", target.table_path, f"column:{column}", column, "rewritable"))
        out.append(self._occ("table_header", target.sheet_path, make_cell_ref(start_row, start_col + offset), column, "rewritable"))

    def _scan_workbook(self, target: TableRef, column: str | None, out: list[dict]) -> None:
        for node in self.workbook.workbook_root.findall("x:definedNames/x:definedName", NS):
            if node.text:
                self._scan_expression(node.text, "defined_name", self.workbook.workbook_path, node.get("name", "?"), False, target, column, out)

    def _scan_sheets(self, target: TableRef, column: str | None, out: list[dict]) -> None:
        for sheet_node in self.workbook.workbook_root.findall("x:sheets/x:sheet", NS):
            sheet_name = sheet_node.get("name", "")
            sheet_ref = self.workbook.resolve_sheet(sheet_name)
            root = self.workbook.sheet_root(sheet_name)
            for cell in root.findall(".//x:c", NS):
                formula = cell.find("x:f", NS)
                if formula is None or not formula.text:
                    continue
                location = cell.get("r", "?")
                local = column is not None and sheet_ref.path == target.sheet_path and self._inside(target, location)
                self._scan_expression(formula.text, "cell_formula", sheet_ref.path, location, local, target, column, out)
            for validation in root.findall(".//x:dataValidation", NS):
                for tag in ("formula1", "formula2"):
                    node = validation.find(f"x:{tag}", NS)
                    if node is not None and node.text:
                        self._scan_expression(node.text, "data_validation", sheet_ref.path, validation.get("sqref", "?"), False, target, column, out)
            for conditional in root.findall(".//x:conditionalFormatting", NS):
                for formula in conditional.findall(".//x:formula", NS):
                    if formula.text:
                        self._scan_expression(formula.text, "conditional_format", sheet_ref.path, conditional.get("sqref", "?"), False, target, column, out)

    def _scan_tables(self, target: TableRef, column: str | None, out: list[dict]) -> None:
        for path in sorted(name for name in self.package.entries if name.startswith("xl/tables/") and name.endswith(".xml")):
            root = self.package.get_xml(path)
            table_name = root.get("name") or root.get("displayName") or path
            local = column is not None and path == target.table_path
            columns = root.find("x:tableColumns", NS)
            if columns is None:
                continue
            for table_column in columns.findall("x:tableColumn", NS):
                column_label = table_column.get("name", "?")
                for tag in ("calculatedColumnFormula", "totalsRowFormula"):
                    formula = table_column.find(f"x:{tag}", NS)
                    if formula is not None and formula.text:
                        self._scan_expression(formula.text, "table_formula", path, f"{table_name}.{column_label}.{tag}", local, target, column, out)

    def _scan_expression(self, expression: str, kind: str, part: str, location: str, local: bool, target: TableRef, column: str | None, out: list[dict]) -> None:
        if column is None:
            _, changed = rewrite_table_reference(expression, target.name, "__RENAMED_TABLE__")
            if changed:
                out.append(self._occ(kind, part, location, expression, "rewritable"))
            return
        _, changed, ambiguous = rewrite_column_reference(
            expression, target.name, column, "__RENAMED_COLUMN__", local_context=local
        )
        if changed:
            out.append(self._occ(kind, part, location, expression, "rewritable"))
        if ambiguous:
            out.append(self._occ(kind, part, location, expression, "blocker", "referência de coluna não qualificada fora da tabela-alvo"))

    def _scan_vba(self, target: TableRef, column: str | None, out: list[dict]) -> None:
        if self.package.vba_sha256 is None:
            return
        index_path = self.repo_root / "anexos/financeiro/snapshot/vba/index.json"
        try:
            index = json.loads(index_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            out.append(self._occ("vba_snapshot", "snapshot/vba/index.json", "index", "indisponível", "blocker", "snapshot VBA ausente ou inválido"))
            return
        if str(index.get("vba_project_sha256", "")).lower() != self.package.vba_sha256.lower():
            out.append(self._occ("vba_snapshot", "snapshot/vba/index.json", "sha256", str(index.get("vba_project_sha256")), "blocker", "snapshot VBA não corresponde ao workbook"))
            return
        symbol = column or target.name
        snapshot_root = index_path.parent.parent
        for module in index.get("modules", []):
            rel = module.get("path")
            if not isinstance(rel, str):
                continue
            module_path = (snapshot_root / rel).resolve()
            try:
                module_path.relative_to(snapshot_root.resolve())
                lines = module_path.read_text(encoding="utf-8", errors="replace").splitlines()
            except (OSError, ValueError):
                out.append(self._occ("vba_snapshot", rel, "read", "indisponível", "blocker", "módulo VBA não pôde ser verificado"))
                continue
            for number, line in enumerate(lines, 1):
                if contains_symbol(line, symbol):
                    out.append(self._occ("vba_static", rel, f"line:{number}", line.strip()[:240], "blocker", "VBA é imutável na V2"))

    def _scan_protected_parts(self, target: TableRef, column: str | None, out: list[dict]) -> None:
        symbol = column or target.name
        prefixes = ("xl/charts/", "xl/pivotTables/", "xl/pivotCache/", "xl/externalLinks/", "xl/queryTables/")
        for path, data in sorted(self.package.entries.items()):
            if path.startswith(prefixes) or path == "xl/connections.xml":
                text = data.decode("utf-8", errors="ignore")
                if contains_symbol(text, symbol):
                    out.append(self._occ("protected_ooxml", path, "content", symbol, "blocker", "parte ainda não regravável na V2"))
            elif path.startswith("xl/activeX/"):
                raw = symbol.encode("utf-8")
                wide = symbol.encode("utf-16le")
                if raw in data or wide in data:
                    out.append(self._occ("activex_binary", path, "content", symbol, "blocker", "ActiveX é imutável na V2"))

    @staticmethod
    def _inside(table: TableRef, cell_ref: str) -> bool:
        try:
            row, col = parse_cell_ref(cell_ref)
        except RecipeError:
            return False
        start_row, start_col, end_row, end_col = parse_range_ref(table.ref)
        return start_row <= row <= end_row and start_col <= col <= end_col

    @staticmethod
    def _occ(kind: str, part: str, location: str, expression: str, disposition: str, reason: str | None = None) -> dict:
        item = {"kind": kind, "part": part, "location": location, "expression": expression, "disposition": disposition}
        if reason:
            item["reason"] = reason
        return item

    @staticmethod
    def _dedupe(items: list[dict]) -> list[dict]:
        unique = {json.dumps(item, ensure_ascii=False, sort_keys=True): item for item in items}
        return sorted(unique.values(), key=lambda item: (item["part"], item["location"], item["kind"], item["disposition"], item["expression"]))

    def _package_state_sha(self) -> str:
        payload = "\n".join(f"{path}:{digest}" for path, digest in sorted(self.package.hash_map().items()))
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()
