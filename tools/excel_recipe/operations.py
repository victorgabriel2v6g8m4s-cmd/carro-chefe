from __future__ import annotations

from pathlib import Path

from .dependencies import DependencyScanner
from .errors import RecipeError
from .formulas import FormulaEditor
from .refactor import RefactorEngine
from .structural import StructuralEngine
from .structural_plan import StructuralPlanner
from .table_structure import TableStructureEditor
from .tables import TableManager
from .util import parse_range_ref
from .workbook import WorkbookContext

STRUCTURAL_RENAMES = {"table.rename", "table.rename_column"}
V3_MUTATIONS = {
    "sheet.insert_rows", "sheet.delete_rows", "sheet.insert_columns", "sheet.delete_columns",
    "range.move", "table.insert_column", "table.delete_column", "table.compact_rows",
}


class OperationRunner:
    def __init__(self, workbook: WorkbookContext, repo_root: Path | None = None) -> None:
        self.workbook = workbook
        self.tables = TableManager(workbook)
        self.structure = TableStructureEditor(workbook, self.tables)
        self.formulas = FormulaEditor(workbook)
        root = repo_root or Path.cwd()
        self.dependencies = DependencyScanner(workbook, root)
        self.refactor = RefactorEngine(workbook)
        self.structural_planner = StructuralPlanner(workbook, root)
        self.structural = StructuralEngine(workbook, self.structural_planner)
        self._clean_plans: dict[tuple[str, str | None], dict] = {}
        self._structural_clean_plan: dict | None = None
        self.applied: list[dict] = []

    def run_all(self, operations: list[dict]) -> None:
        renames = sum(operation.get("op") in STRUCTURAL_RENAMES for operation in operations)
        physical = sum(operation.get("op") in V3_MUTATIONS for operation in operations)
        if renames > 1:
            raise RecipeError("V2 permite apenas um refactor estrutural por receita.")
        if physical > 1:
            raise RecipeError("V3A permite apenas uma transformação física por receita.")
        if renames and physical:
            raise RecipeError("Rename V2 e transformação física V3A não podem ser compostos na mesma receita.")
        for index, operation in enumerate(operations):
            try:
                detail = self.run(operation)
                self.applied.append({"index": index, "op": operation["op"], **(detail or {})})
            except RecipeError as exc:
                raise RecipeError(f"Operação {index} ({operation['op']}) falhou: {exc}") from exc

    def run(self, operation: dict) -> dict | None:
        op = operation["op"]
        if op == "cell.set":
            self.workbook.write_value(self._text(operation, "sheet"), self._text(operation, "cell"), operation.get("value"))
        elif op == "cell.clear":
            self.workbook.clear_cell(self._text(operation, "sheet"), self._text(operation, "cell"))
        elif op == "formula.set":
            self.workbook.write_formula(self._text(operation, "sheet"), self._text(operation, "cell"), self._text(operation, "formula"))
        elif op == "formula.copy":
            self.formulas.copy(
                self._text(operation, "sheet"), self._text(operation, "from"), self._text(operation, "to"),
                translate_relative_refs=bool(operation.get("translate_relative_refs", False)),
            )
        elif op == "dependency.scan":
            return {"dependency_report": self._dependency_report(operation, require_clean=False)}
        elif op == "dependency.assert_clean":
            report = self._dependency_report(operation, require_clean=True)
            self._clean_plans[(report["table"], report["column"])] = report
            return {"dependency_report": report}
        elif op == "structural.plan":
            return {"structural_plan": self.structural_planner.plan(operation)}
        elif op == "structural.assert_clean":
            report = self.structural_planner.plan(operation)
            self.structural_planner.assert_clean(report)
            self._structural_clean_plan = report
            return {"structural_plan": report}
        elif op in V3_MUTATIONS:
            if self._structural_clean_plan is None:
                raise RecipeError(f"{op} exige structural.assert_clean anterior na mesma receita.")
            return self.structural.apply(operation, self._structural_clean_plan)
        elif op == "table.rename":
            old = self._text(operation, "table")
            return self.refactor.rename_table(old, self._text(operation, "new_name"), self._require_plan(old, None))
        elif op == "table.rename_column":
            table = self._text(operation, "table")
            column = self._text(operation, "column")
            return self.refactor.rename_column(table, column, self._text(operation, "new_name"), self._require_plan(table, column))
        elif op == "table.append_rows":
            rows = self._rows(operation)
            written = self.tables.append(self.tables.find(self._text(operation, "table")), rows)
            return {"rows": written}
        elif op == "table.upsert_rows":
            return self._upsert(operation)
        elif op == "table.update_rows":
            return self._update(operation)
        elif op == "table.delete_rows":
            return self._delete(operation)
        elif op == "table.create":
            self.structure.create(
                self._text(operation, "sheet"), self._text(operation, "table"), self._text(operation, "ref"),
                self._string_list(operation, "columns"), str(operation.get("style", "TableStyleMedium2")),
            )
        elif op == "table.resize":
            self._resize(operation)
        elif op == "table.drop":
            self.structure.drop(self._text(operation, "table"), clear_data=bool(operation.get("clear_data", False)))
        elif op == "table.add_column":
            self.tables.add_column(
                self.tables.find(self._text(operation, "table")), self._text(operation, "name"),
                operation.get("default"), operation.get("formula"),
            )
        elif op == "table.set_formula_column":
            self.tables.set_formula_column(
                self.tables.find(self._text(operation, "table")), self._text(operation, "column"), self._text(operation, "formula")
            )
        elif op == "assert.cell":
            self._assert_cell(operation)
        elif op == "assert.table":
            self._assert_table(operation)
        elif op == "assert.row":
            self._assert_row(operation)
        elif op == "workbook.recalculate_on_open":
            self.workbook.mark_recalculate_on_open()
        else:
            raise RecipeError(f"Operação não implementada: {op}")
        return None

    def _dependency_report(self, operation: dict, *, require_clean: bool) -> dict:
        table = self._text(operation, "table")
        column = operation.get("column")
        if column is not None and (not isinstance(column, str) or not column):
            raise RecipeError("Campo 'column' deve ser texto não vazio quando informado.")
        report = self.dependencies.scan(table, column)
        if require_clean:
            self.dependencies.assert_clean(report)
        return report

    def _require_plan(self, table: str, column: str | None) -> dict:
        plan = self._clean_plans.get((table, column))
        if plan is None:
            target = f"{table}.{column}" if column else table
            raise RecipeError(f"Refactor {target} exige dependency.assert_clean anterior na mesma receita.")
        return plan

    def _upsert(self, operation: dict) -> dict:
        table = self.tables.find(self._text(operation, "table"))
        keys = self._string_list(operation, "key")
        rows = self._rows(operation)
        updated = 0
        inserted = 0
        for row in rows:
            missing = [key for key in keys if key not in row]
            if missing:
                raise RecipeError(f"upsert sem chave(s): {', '.join(missing)}")
            where = {key: row[key] for key in keys}
            matches = self.tables.find_matching_rows(table, where)
            if len(matches) > 1:
                raise RecipeError(f"Chave não é única em {table.name}: {where}")
            if matches:
                self.tables.write_row(table, matches[0], row)
                updated += 1
            else:
                self.tables.append(table, [row])
                inserted += 1
        return {"updated": updated, "inserted": inserted}

    def _update(self, operation: dict) -> dict:
        table = self.tables.find(self._text(operation, "table"))
        where = self._dict(operation, "where")
        values = self._dict(operation, "values")
        matches = self.tables.find_matching_rows(table, where)
        self._assert_match_count(matches, bool(operation.get("allow_multiple", False)))
        for row_number in matches:
            self.tables.write_row(table, row_number, values)
        return {"updated": len(matches)}

    def _delete(self, operation: dict) -> dict:
        table = self.tables.find(self._text(operation, "table"))
        matches = self.tables.find_matching_rows(table, self._dict(operation, "where"))
        self._assert_match_count(matches, bool(operation.get("allow_multiple", False)))
        self.tables.clear_rows(table, matches)
        return {"cleared_records": len(matches), "mode": "clear_record"}

    def _resize(self, operation: dict) -> None:
        table = self.tables.find(self._text(operation, "table"))
        if "end_row" in operation:
            end_row = int(operation["end_row"])
        else:
            ref = self._text(operation, "ref")
            old = parse_range_ref(table.ref)
            new = parse_range_ref(ref)
            if old[:2] != new[:2] or old[3] != new[3]:
                raise RecipeError("V1 permite resize apenas no final das linhas, sem mover cabeçalho/colunas.")
            end_row = new[2]
        self.tables.resize_rows(table, end_row)

    def _assert_cell(self, operation: dict) -> None:
        actual = self.workbook.read_cell(self._text(operation, "sheet"), self._text(operation, "cell"))
        expected = operation.get("equals")
        if not self._equivalent(actual, expected):
            raise RecipeError(f"assert.cell: esperado {expected!r}, encontrado {actual!r}")

    def _assert_table(self, operation: dict) -> None:
        table = self.tables.find(self._text(operation, "table"))
        if "expected_ref" in operation and table.ref != operation["expected_ref"]:
            raise RecipeError(f"assert.table ref: esperado {operation['expected_ref']}, encontrado {table.ref}")
        if "expected_columns" in operation:
            expected = self._string_list(operation, "expected_columns")
            if table.columns != expected:
                raise RecipeError(f"assert.table colunas divergentes em {table.name}")

    def _assert_row(self, operation: dict) -> None:
        table = self.tables.find(self._text(operation, "table"))
        matches = self.tables.find_matching_rows(table, self._dict(operation, "where"))
        if len(matches) != 1:
            raise RecipeError(f"assert.row esperava 1 linha; encontrou {len(matches)}")
        expected = self._dict(operation, "equals")
        row = self.tables.row_dict(table, matches[0])
        for key, value in expected.items():
            if not self._equivalent(row.get(key), value):
                raise RecipeError(f"assert.row {key}: esperado {value!r}, encontrado {row.get(key)!r}")

    @staticmethod
    def _assert_match_count(matches: list[int], allow_multiple: bool) -> None:
        if not matches:
            raise RecipeError("Nenhuma linha corresponde ao filtro.")
        if len(matches) > 1 and not allow_multiple:
            raise RecipeError(f"Filtro corresponde a {len(matches)} linhas; use allow_multiple somente se intencional.")

    @staticmethod
    def _equivalent(actual, expected) -> bool:
        if isinstance(expected, dict) and "value" in expected:
            expected = expected["value"]
        return str(actual) == str(expected) if actual is not None and expected is not None else actual == expected

    @staticmethod
    def _text(data: dict, field: str) -> str:
        value = data.get(field)
        if not isinstance(value, str) or not value:
            raise RecipeError(f"Campo {field!r} deve ser texto não vazio.")
        return value

    @staticmethod
    def _dict(data: dict, field: str) -> dict:
        value = data.get(field)
        if not isinstance(value, dict) or not value:
            raise RecipeError(f"Campo {field!r} deve ser objeto não vazio.")
        return value

    @staticmethod
    def _rows(data: dict) -> list[dict]:
        rows = data.get("rows")
        if not isinstance(rows, list) or not rows or not all(isinstance(row, dict) and row for row in rows):
            raise RecipeError("rows deve ser lista não vazia de objetos não vazios.")
        return rows

    @staticmethod
    def _string_list(data: dict, field: str) -> list[str]:
        value = data.get(field)
        if isinstance(value, str):
            value = [value]
        if not isinstance(value, list) or not value or not all(isinstance(item, str) and item for item in value):
            raise RecipeError(f"Campo {field!r} deve ser string ou lista não vazia de strings.")
        return value
