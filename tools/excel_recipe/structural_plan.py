from __future__ import annotations

import hashlib
import json
import posixpath
import re
from pathlib import Path
from xml.etree import ElementTree as ET

from .a1_refs import ref_intersects, rewrite_formula_a1, rewrite_simple_ref, rewrite_sqref
from .constants import NS, PKG_REL_NS, REL_NS
from .coordinates import AxisTransform, CompactRowsTransform, RangeMoveTransform, TableColumnTransform
from .errors import RecipeError
from .formula_refs import contains_symbol, rewrite_column_reference
from .tables import TableManager, TableRef
from .util import canonical_path, make_cell_ref, parse_cell_ref, parse_range_ref, qname
from .workbook import WorkbookContext

Transform = AxisTransform | RangeMoveTransform | TableColumnTransform | CompactRowsTransform
_A1_LITERAL = re.compile(r'"(\$?[A-Z]{1,3}\$?[1-9][0-9]*(?::\$?[A-Z]{1,3}\$?[1-9][0-9]*)?)"', re.IGNORECASE)


class StructuralPlanner:
    def __init__(self, workbook: WorkbookContext, repo_root: Path) -> None:
        self.workbook = workbook
        self.package = workbook.package
        self.repo_root = repo_root.resolve()
        self.tables = TableManager(workbook)

    def plan(self, operation: dict) -> dict:
        action, transform, meta = self._build(operation)
        occurrences: list[dict] = []
        self._preflight(action, transform, meta, occurrences)
        self._scan_workbook(transform, occurrences)
        self._scan_sheets(transform, occurrences)
        self._scan_tables(action, transform, meta, occurrences)
        self._scan_target_ranges(transform, occurrences)
        self._scan_vba(transform, occurrences)
        self._scan_protected_parts(transform, occurrences)
        occurrences = self._dedupe(occurrences)
        blockers = [item for item in occurrences if item["disposition"] == "blocker"]
        state_sha = self.package_state_sha()
        report = {
            "mode": "structural",
            "action": action,
            "transform": transform.as_dict(),
            "target": meta,
            "source_sha256": self.package.source_sha256,
            "package_state_sha256": state_sha,
            "vba_sha256": self.package.vba_sha256,
            "occurrences": occurrences,
            "rewritable_count": sum(item["disposition"] == "rewritable" for item in occurrences),
            "informational_count": sum(item["disposition"] == "informational" for item in occurrences),
            "blocker_count": len(blockers),
            "blockers": blockers,
            "parts_impacted": sorted({item["part"] for item in occurrences if item["disposition"] == "rewritable"}),
        }
        report["plan_sha256"] = hashlib.sha256(
            json.dumps(report, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
        ).hexdigest()
        return report

    def assert_clean(self, report: dict) -> None:
        blockers = report.get("blockers") or []
        if blockers:
            preview = "; ".join(f"{item['kind']}@{item['location']}" for item in blockers[:6])
            suffix = f" (+{len(blockers) - 6})" if len(blockers) > 6 else ""
            raise RecipeError(f"Transformação estrutural bloqueada por {len(blockers)} dependência(s): {preview}{suffix}")

    def _build(self, operation: dict) -> tuple[str, Transform, dict]:
        action = operation.get("action") if operation.get("op") in {"structural.plan", "structural.assert_clean"} else operation.get("op")
        if not isinstance(action, str):
            raise RecipeError("Operação estrutural exige action.")
        if action in {"sheet.insert_rows", "sheet.delete_rows", "sheet.insert_columns", "sheet.delete_columns"}:
            sheet = self._text(operation, "sheet")
            self.workbook.resolve_sheet(sheet)
            axis = "row" if action.endswith("rows") else "column"
            mode = "insert" if ".insert_" in action else "delete"
            at = self._positive_int(operation, "at")
            count = self._positive_int(operation, "count", default=1)
            return action, AxisTransform(sheet, axis, mode, at, count), {"sheet": sheet, "at": at, "count": count}
        if action == "range.move":
            sheet = self._text(operation, "sheet")
            self.workbook.resolve_sheet(sheet)
            source = self._text(operation, "source")
            destination = self._text(operation, "destination")
            transform = RangeMoveTransform(sheet, source, destination)
            return action, transform, {"sheet": sheet, "source": source, "destination": destination}
        if action in {"table.insert_column", "table.delete_column", "table.compact_rows"}:
            table = self.tables.find(self._text(operation, "table"))
            start_row, start_col, end_row, end_col = parse_range_ref(table.ref)
            if action == "table.insert_column":
                position = self._positive_int(operation, "position")
                if position > len(table.columns) + 1:
                    raise RecipeError("position excede o final da tabela.")
                name = self._text(operation, "name")
                if name in table.columns:
                    raise RecipeError(f"Coluna já existe em {table.name}: {name}")
                column = start_col + position - 1
                transform = TableColumnTransform(table.sheet, table.ref, column, "insert")
                return action, transform, {"table": table.name, "position": position, "name": name, "sheet": table.sheet}
            if action == "table.delete_column":
                column_name = self._text(operation, "column")
                if column_name not in table.columns:
                    raise RecipeError(f"Coluna não existe em {table.name}: {column_name}")
                position = table.columns.index(column_name)
                transform = TableColumnTransform(table.sheet, table.ref, start_col + position, "delete")
                return action, transform, {"table": table.name, "column": column_name, "position": position + 1, "sheet": table.sheet}
            if table.totals_rows:
                raise RecipeError("table.compact_rows ainda não suporta linha de totais.")
            calculated = self._calculated_columns(table)
            removed = []
            for row in self.tables.data_row_numbers(table):
                values = self.tables.row_dict(table, row)
                if all(values.get(name) in (None, "") for name in table.columns if name not in calculated):
                    removed.append(row)
            transform = CompactRowsTransform(table.sheet, table.ref, tuple(removed))
            return action, transform, {"table": table.name, "sheet": table.sheet, "removed_rows": removed}
        raise RecipeError(f"Ação estrutural V3A não suportada: {action}")

    def _preflight(self, action: str, transform: Transform, meta: dict, out: list[dict]) -> None:
        root = self.workbook.sheet_root(transform.sheet)
        if isinstance(transform, AxisTransform) and transform.mode == "insert":
            for cell in root.findall(".//x:c", NS):
                ref = cell.get("r")
                if not ref:
                    continue
                try:
                    transform.transform_cell_ref(ref)
                except RecipeError as exc:
                    out.append(self._occ("excel_limit", self.workbook.resolve_sheet(transform.sheet).path, ref, str(exc), "blocker"))
        if isinstance(transform, RangeMoveTransform):
            for row, col in self._iter_range(transform.destination_range):
                value = self.workbook.read_cell(transform.sheet, make_cell_ref(row, col))
                if value not in (None, ""):
                    out.append(self._occ("move_destination", self.workbook.resolve_sheet(transform.sheet).path, make_cell_ref(row, col), str(value)[:120], "blocker", "destino não está vazio"))
            for row, col in self._iter_range(transform.source):
                cell = self.workbook.get_cell(transform.sheet, make_cell_ref(row, col), create=False)
                if cell is not None and cell.find("x:f", NS) is not None:
                    out.append(self._occ("move_formula_cell", self.workbook.resolve_sheet(transform.sheet).path, make_cell_ref(row, col), "formula", "blocker", "range.move de célula com fórmula não é suportado na V3A"))
        if action == "table.insert_column":
            table = self.tables.find(meta["table"])
            _, _, _, end_col = parse_range_ref(table.ref)
            for row in range(parse_range_ref(table.ref)[0], parse_range_ref(table.ref)[2] + 1):
                value = self.workbook.read_cell(table.sheet, make_cell_ref(row, end_col + 1))
                if value not in (None, ""):
                    out.append(self._occ("table_insert_destination", table.sheet_path, make_cell_ref(row, end_col + 1), str(value)[:120], "blocker", "célula à direita da tabela não está vazia"))
        if action == "table.delete_column":
            table = self.tables.find(meta["table"])
            column = meta["column"]
            for occurrence in self._structured_column_dependencies(table, column):
                out.append(occurrence)

    def _scan_workbook(self, transform: Transform, out: list[dict]) -> None:
        for node in self.workbook.workbook_root.findall("x:definedNames/x:definedName", NS):
            if node.text:
                self._scan_formula(node.text, "defined_name", self.workbook.workbook_path, node.get("name", "?"), "", transform, out)

    def _scan_sheets(self, transform: Transform, out: list[dict]) -> None:
        for sheet_node in self.workbook.workbook_root.findall("x:sheets/x:sheet", NS):
            sheet_name = sheet_node.get("name", "")
            sheet_ref = self.workbook.resolve_sheet(sheet_name)
            root = self.workbook.sheet_root(sheet_name)
            for cell in root.findall(".//x:c", NS):
                location = cell.get("r", "?")
                if sheet_name.casefold() == transform.sheet.casefold() and location != "?":
                    try:
                        if transform.transform_cell_ref(location) is None:
                            continue
                    except RecipeError as exc:
                        out.append(self._occ("cell_coordinate", sheet_ref.path, location, str(exc), "blocker"))
                        continue
                formula = cell.find("x:f", NS)
                if formula is not None and formula.text:
                    self._scan_formula(formula.text, "cell_formula", sheet_ref.path, location, sheet_name, transform, out)
                if formula is not None and formula.get("ref") and sheet_name.casefold() == transform.sheet.casefold():
                    self._scan_range_attr(formula.get("ref", ""), "formula_ref", sheet_ref.path, location, transform, out)
            for validation in root.findall(".//x:dataValidation", NS):
                if sheet_name.casefold() == transform.sheet.casefold() and validation.get("sqref"):
                    self._scan_sqref(validation.get("sqref", ""), "data_validation_sqref", sheet_ref.path, validation.get("sqref", "?"), transform, out)
                for tag in ("formula1", "formula2"):
                    node = validation.find(f"x:{tag}", NS)
                    if node is not None and node.text:
                        self._scan_formula(node.text, "data_validation_formula", sheet_ref.path, validation.get("sqref", "?"), sheet_name, transform, out)
            for conditional in root.findall(".//x:conditionalFormatting", NS):
                if sheet_name.casefold() == transform.sheet.casefold() and conditional.get("sqref"):
                    self._scan_sqref(conditional.get("sqref", ""), "conditional_format_sqref", sheet_ref.path, conditional.get("sqref", "?"), transform, out)
                for formula in conditional.findall(".//x:formula", NS):
                    if formula.text:
                        self._scan_formula(formula.text, "conditional_format_formula", sheet_ref.path, conditional.get("sqref", "?"), sheet_name, transform, out)

    def _scan_tables(self, action: str, transform: Transform, meta: dict, out: list[dict]) -> None:
        for table in self._tables():
            for column in table.root.findall("x:tableColumns/x:tableColumn", NS):
                for tag in ("calculatedColumnFormula", "totalsRowFormula"):
                    formula = column.find(f"x:{tag}", NS)
                    if formula is not None and formula.text:
                        self._scan_formula(formula.text, "table_formula", table.table_path, f"{table.name}.{column.get('name', '?')}.{tag}", table.sheet, transform, out)
            if table.sheet.casefold() != transform.sheet.casefold():
                continue
            if action.startswith("table.") and table.name == meta.get("table"):
                out.append(self._occ("table_ref", table.table_path, "ref", table.ref, "rewritable"))
                continue
            try:
                change = transform.transform_range(table.ref)
            except RecipeError as exc:
                out.append(self._occ("table_ref", table.table_path, "ref", table.ref, "blocker", str(exc)))
                continue
            if change.relation in {"partial", "removed"}:
                out.append(self._occ("table_ref", table.table_path, "ref", table.ref, "blocker", f"Table seria {change.relation}"))
            elif change.ref != table.ref:
                if isinstance(transform, AxisTransform) and transform.axis == "column" and self._axis_intersects_table_columns(transform, table):
                    out.append(self._occ("table_columns", table.table_path, "tableColumns", table.ref, "blocker", "use table.insert_column/table.delete_column para alterar colunas dentro de Table"))
                else:
                    out.append(self._occ("table_ref", table.table_path, "ref", table.ref, "rewritable"))

    def _scan_target_ranges(self, transform: Transform, out: list[dict]) -> None:
        sheet_ref = self.workbook.resolve_sheet(transform.sheet)
        root = self.workbook.sheet_root(transform.sheet)
        dimension = root.find("x:dimension", NS)
        if dimension is not None and dimension.get("ref"):
            self._scan_range_attr(dimension.get("ref", ""), "dimension", sheet_ref.path, "dimension", transform, out, allow_removed=True)
        auto_filter = root.find("x:autoFilter", NS)
        if auto_filter is not None and auto_filter.get("ref"):
            self._scan_range_attr(auto_filter.get("ref", ""), "sheet_auto_filter", sheet_ref.path, "autoFilter", transform, out)
        for merge in root.findall("x:mergeCells/x:mergeCell", NS):
            if merge.get("ref"):
                self._scan_range_attr(merge.get("ref", ""), "merge_cell", sheet_ref.path, merge.get("ref", "?"), transform, out)
        for hyperlink in root.findall("x:hyperlinks/x:hyperlink", NS):
            if hyperlink.get("ref"):
                self._scan_range_attr(hyperlink.get("ref", ""), "hyperlink_ref", sheet_ref.path, hyperlink.get("ref", "?"), transform, out)
            location = hyperlink.get("location")
            if location:
                self._scan_formula(location, "hyperlink_location", sheet_ref.path, hyperlink.get("ref", "?"), transform.sheet, transform, out)
        pane = root.find("x:sheetViews/x:sheetView/x:pane", NS)
        if pane is not None and pane.get("topLeftCell"):
            old = pane.get("topLeftCell", "")
            try:
                new = transform.transform_cell_ref(old)
            except RecipeError as exc:
                out.append(self._occ("freeze_pane", sheet_ref.path, "topLeftCell", old, "blocker", str(exc)))
            else:
                if new is None:
                    out.append(self._occ("freeze_pane", sheet_ref.path, "topLeftCell", old, "blocker", "célula do pane seria removida"))
                elif new != old:
                    out.append(self._occ("freeze_pane", sheet_ref.path, "topLeftCell", old, "rewritable"))
        self._scan_sheet_relationships(transform, out)

    def _scan_formula(self, expression: str, kind: str, part: str, location: str, context_sheet: str, transform: Transform, out: list[dict]) -> None:
        rewritten, changed, blockers = rewrite_formula_a1(expression, context_sheet, transform)
        if changed:
            out.append(self._occ(kind, part, location, expression, "rewritable"))
        for reason in blockers:
            out.append(self._occ(kind, part, location, expression, "blocker", reason))

    def _scan_range_attr(self, value: str, kind: str, part: str, location: str, transform: Transform, out: list[dict], allow_removed: bool = False) -> None:
        try:
            new_ref, relation = rewrite_simple_ref(value, transform)
        except RecipeError as exc:
            out.append(self._occ(kind, part, location, value, "blocker", str(exc)))
            return
        if new_ref is None:
            disposition = "rewritable" if allow_removed else "blocker"
            out.append(self._occ(kind, part, location, value, disposition, "range removido" if not allow_removed else None))
        elif new_ref != value.replace("$", ""):
            out.append(self._occ(kind, part, location, value, "rewritable"))

    def _scan_sqref(self, value: str, kind: str, part: str, location: str, transform: Transform, out: list[dict]) -> None:
        try:
            rewritten, changed = rewrite_sqref(value, transform)
        except RecipeError as exc:
            out.append(self._occ(kind, part, location, value, "blocker", str(exc)))
            return
        if changed:
            out.append(self._occ(kind, part, location, value, "rewritable"))

    def _scan_sheet_relationships(self, transform: Transform, out: list[dict]) -> None:
        sheet_path = self.workbook.resolve_sheet(transform.sheet).path
        rels_path = self.workbook.sheet_rels_path(sheet_path)
        if rels_path not in self.package.entries:
            return
        root = self.package.get_xml(rels_path)
        for rel in root.findall(qname(PKG_REL_NS, "Relationship")):
            rel_type = rel.get("Type", "")
            if any(token in rel_type for token in ("/drawing", "/vmlDrawing", "/oleObject", "/control")):
                out.append(self._occ("sheet_object", rels_path, rel.get("Id", "?"), rel_type, "blocker", "objeto ancorado exige suporte V3B/ActiveX"))

    def _scan_vba(self, transform: Transform, out: list[dict]) -> None:
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
        snapshot_root = index_path.parent.parent
        for module in index.get("modules", []):
            rel = module.get("path")
            if not isinstance(rel, str):
                continue
            path = (snapshot_root / rel).resolve()
            try:
                path.relative_to(snapshot_root.resolve())
                lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
            except (OSError, ValueError):
                out.append(self._occ("vba_snapshot", rel, "read", "indisponível", "blocker", "módulo VBA não pôde ser verificado"))
                continue
            for number, line in enumerate(lines, 1):
                if transform.sheet.casefold() in line.casefold() and re.search(r"\b(Range|Cells|Rows|Columns)\b", line, re.IGNORECASE):
                    out.append(self._occ("vba_static", rel, f"line:{number}", line.strip()[:240], "blocker", "VBA referencia a aba/estrutura alvo"))
                    continue
                for match in _A1_LITERAL.finditer(line):
                    ref = match.group(1).replace("$", "")
                    try:
                        if ":" in ref:
                            change = transform.transform_range(ref)
                            affected = change.ref != ref or change.relation in {"partial", "removed"}
                        else:
                            new = transform.transform_cell_ref(ref)
                            affected = new is None or new != ref
                    except RecipeError:
                        affected = True
                    if affected:
                        out.append(self._occ("vba_static", rel, f"line:{number}", line.strip()[:240], "blocker", "VBA contém referência A1 afetada"))
                        break

    def _scan_protected_parts(self, transform: Transform, out: list[dict]) -> None:
        prefixes = ("xl/charts/", "xl/pivotTables/", "xl/pivotCache/", "xl/externalLinks/", "xl/queryTables/")
        for path, data in sorted(self.package.entries.items()):
            if not (path.startswith(prefixes) or path == "xl/connections.xml"):
                continue
            try:
                root = ET.fromstring(data)
            except ET.ParseError:
                continue
            for node in root.iter():
                if not node.text:
                    continue
                rewritten, changed, blockers = rewrite_formula_a1(node.text, "", transform)
                if changed or blockers:
                    out.append(self._occ("protected_ooxml", path, node.tag.rsplit("}", 1)[-1], node.text[:240], "blocker", "gráfico/pivô/link/conexão afetado e imutável na V3A"))
                    break

    def _structured_column_dependencies(self, table: TableRef, column: str) -> list[dict]:
        result: list[dict] = []
        for sheet_node in self.workbook.workbook_root.findall("x:sheets/x:sheet", NS):
            sheet_name = sheet_node.get("name", "")
            sheet_ref = self.workbook.resolve_sheet(sheet_name)
            root = self.workbook.sheet_root(sheet_name)
            for cell in root.findall(".//x:c", NS):
                formula = cell.find("x:f", NS)
                if formula is None or not formula.text:
                    continue
                local = sheet_ref.path == table.sheet_path and self._inside(table.ref, cell.get("r", ""))
                _, changed, ambiguous = rewrite_column_reference(formula.text, table.name, column, "__DELETED__", local_context=local)
                if changed or ambiguous:
                    result.append(self._occ("structured_column_reference", sheet_ref.path, cell.get("r", "?"), formula.text, "blocker", "coluna é referenciada e não pode ser excluída com segurança"))
        return result

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
                table_path = canonical_path(posixpath.normpath(posixpath.join(posixpath.dirname(sheet_ref.path), target)))
                table_root = self.package.get_xml(table_path)
                name = table_root.get("name") or table_root.get("displayName") or table_path
                result.append(TableRef(name, sheet_name, sheet_ref.path, rels_path, rel_id, table_path, table_root))
        return result

    @staticmethod
    def _inside(ref: str, cell_ref: str) -> bool:
        try:
            row, col = parse_cell_ref(cell_ref)
            srow, scol, erow, ecol = parse_range_ref(ref)
        except RecipeError:
            return False
        return srow <= row <= erow and scol <= col <= ecol

    @staticmethod
    def _axis_intersects_table_columns(transform: AxisTransform, table: TableRef) -> bool:
        if transform.axis != "column":
            return False
        _, start_col, _, end_col = parse_range_ref(table.ref)
        if transform.mode == "insert":
            return start_col < transform.at <= end_col
        return not (transform.end < start_col or transform.at > end_col)

    @staticmethod
    def _calculated_columns(table: TableRef) -> set[str]:
        result: set[str] = set()
        for column in table.root.findall("x:tableColumns/x:tableColumn", NS):
            if column.find("x:calculatedColumnFormula", NS) is not None and column.get("name"):
                result.add(column.get("name", ""))
        return result

    @staticmethod
    def _iter_range(ref: str):
        srow, scol, erow, ecol = parse_range_ref(ref)
        for row in range(srow, erow + 1):
            for col in range(scol, ecol + 1):
                yield row, col

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

    def package_state_sha(self) -> str:
        payload = "\n".join(f"{path}:{digest}" for path, digest in sorted(self.package.hash_map().items()))
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    @staticmethod
    def _text(data: dict, field: str) -> str:
        value = data.get(field)
        if not isinstance(value, str) or not value:
            raise RecipeError(f"Campo {field!r} deve ser texto não vazio.")
        return value

    @staticmethod
    def _positive_int(data: dict, field: str, default: int | None = None) -> int:
        value = data.get(field, default)
        if isinstance(value, bool):
            raise RecipeError(f"Campo {field!r} deve ser inteiro positivo.")
        try:
            result = int(value)
        except (TypeError, ValueError) as exc:
            raise RecipeError(f"Campo {field!r} deve ser inteiro positivo.") from exc
        if result < 1:
            raise RecipeError(f"Campo {field!r} deve ser inteiro positivo.")
        return result
