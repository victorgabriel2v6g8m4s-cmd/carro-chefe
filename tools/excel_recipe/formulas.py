from __future__ import annotations

import re

from .errors import RecipeError
from .util import column_to_index, index_to_column, iter_range, make_cell_ref, parse_cell_ref
from .workbook import WorkbookContext

A1_TOKEN = re.compile(r"(?<![A-Za-z0-9_])(?P<col_abs>\$?)(?P<col>[A-Z]{1,3})(?P<row_abs>\$?)(?P<row>[1-9][0-9]*)(?![A-Za-z0-9_(])")


class FormulaEditor:
    def __init__(self, workbook: WorkbookContext) -> None:
        self.workbook = workbook

    def copy(self, sheet: str, source: str, target: str, *, translate_relative_refs: bool = True) -> None:
        formula = self.workbook.read_cell(sheet, source)
        if not isinstance(formula, str) or not formula.startswith("="):
            raise RecipeError(f"Célula fonte não contém fórmula: {sheet}!{source}")
        source_row, source_col = parse_cell_ref(source)
        destinations = list(iter_range(target)) if ":" in target else [parse_cell_ref(target)]
        for row, column in destinations:
            current = formula
            if translate_relative_refs:
                current = self.translate(formula, row - source_row, column - source_col)
            self.workbook.write_formula(sheet, make_cell_ref(row, column), current, save=False)
        self.workbook.save_sheet(sheet)

    def translate(self, formula: str, row_delta: int, col_delta: int) -> str:
        pieces = self._split_quoted(formula)
        for index in range(0, len(pieces), 2):
            pieces[index] = A1_TOKEN.sub(lambda match: self._shift(match, row_delta, col_delta), pieces[index])
        return "".join(pieces)

    @staticmethod
    def _split_quoted(formula: str) -> list[str]:
        result: list[str] = []
        current: list[str] = []
        quoted = False
        index = 0
        while index < len(formula):
            char = formula[index]
            if char == '"':
                current.append(char)
                if quoted and index + 1 < len(formula) and formula[index + 1] == '"':
                    current.append('"')
                    index += 2
                    continue
                result.append("".join(current))
                current = []
                quoted = not quoted
            else:
                current.append(char)
            index += 1
        result.append("".join(current))
        return result

    @staticmethod
    def _shift(match: re.Match[str], row_delta: int, col_delta: int) -> str:
        col_abs = match.group("col_abs") == "$"
        row_abs = match.group("row_abs") == "$"
        column = column_to_index(match.group("col"))
        row = int(match.group("row"))
        if not col_abs:
            column += col_delta
        if not row_abs:
            row += row_delta
        if row < 1 or column < 1:
            raise RecipeError("Cópia de fórmula produziria referência A1 inválida.")
        return f"{'$' if col_abs else ''}{index_to_column(column)}{'$' if row_abs else ''}{row}"
