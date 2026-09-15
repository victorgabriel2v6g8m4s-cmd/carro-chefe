from __future__ import annotations

from dataclasses import dataclass

from .errors import RecipeError
from .util import make_cell_ref, make_range_ref, parse_cell_ref, parse_range_ref

MAX_ROW = 1_048_576
MAX_COLUMN = 16_384


@dataclass(frozen=True)
class RangeChange:
    ref: str | None
    relation: str


@dataclass(frozen=True)
class AxisTransform:
    sheet: str
    axis: str
    mode: str
    at: int
    count: int

    def __post_init__(self) -> None:
        if self.axis not in {"row", "column"}:
            raise RecipeError(f"Eixo estrutural inválido: {self.axis}")
        if self.mode not in {"insert", "delete"}:
            raise RecipeError(f"Modo estrutural inválido: {self.mode}")
        limit = MAX_ROW if self.axis == "row" else MAX_COLUMN
        if self.at < 1 or self.at > limit:
            raise RecipeError(f"Posição estrutural fora do limite: {self.at}")
        if self.count < 1:
            raise RecipeError("count deve ser >= 1.")
        if self.mode == "delete" and self.at + self.count - 1 > limit:
            raise RecipeError("Exclusão estrutural ultrapassa o limite do Excel.")

    @property
    def end(self) -> int:
        return self.at + self.count - 1

    def transform_index(self, value: int) -> int | None:
        limit = MAX_ROW if self.axis == "row" else MAX_COLUMN
        if value < 1 or value > limit:
            raise RecipeError(f"Índice fora do limite do Excel: {value}")
        if self.mode == "insert":
            result = value + self.count if value >= self.at else value
            if result > limit:
                raise RecipeError("Transformação ultrapassa o limite do Excel.")
            return result
        if self.at <= value <= self.end:
            return None
        return value - self.count if value > self.end else value

    def transform_cell(self, row: int, column: int) -> tuple[int, int] | None:
        if self.axis == "row":
            new_row = self.transform_index(row)
            return None if new_row is None else (new_row, column)
        new_column = self.transform_index(column)
        return None if new_column is None else (row, new_column)

    def transform_cell_ref(self, cell_ref: str) -> str | None:
        row, column = parse_cell_ref(cell_ref)
        result = self.transform_cell(row, column)
        return None if result is None else make_cell_ref(*result)

    def transform_range(self, range_ref: str) -> RangeChange:
        start_row, start_col, end_row, end_col = parse_range_ref(range_ref)
        if self.axis == "row":
            change = self._transform_span(start_row, end_row)
            if change.ref is None:
                return change
            new_start, new_end = (int(value) for value in change.ref.split(":"))
            return RangeChange(make_range_ref(new_start, start_col, new_end, end_col), change.relation)
        change = self._transform_span(start_col, end_col)
        if change.ref is None:
            return change
        new_start, new_end = (int(value) for value in change.ref.split(":"))
        return RangeChange(make_range_ref(start_row, new_start, end_row, new_end), change.relation)

    def _transform_span(self, start: int, end: int) -> RangeChange:
        if self.mode == "insert":
            if end < self.at:
                return RangeChange(f"{start}:{end}", "unaffected")
            if start >= self.at:
                return RangeChange(f"{start + self.count}:{end + self.count}", "shifted")
            return RangeChange(f"{start}:{end + self.count}", "expanded")

        deleted_start, deleted_end = self.at, self.end
        if end < deleted_start:
            return RangeChange(f"{start}:{end}", "unaffected")
        if start > deleted_end:
            return RangeChange(f"{start - self.count}:{end - self.count}", "shifted")
        if deleted_start <= start and end <= deleted_end:
            return RangeChange(None, "removed")
        if start < deleted_start and end > deleted_end:
            return RangeChange(f"{start}:{end - self.count}", "contracted")
        if deleted_start <= start <= deleted_end < end:
            return RangeChange(f"{deleted_start}:{end - self.count}", "partial")
        if start < deleted_start <= end <= deleted_end:
            return RangeChange(f"{start}:{deleted_start - 1}", "partial")
        raise RecipeError("Transformação de range não classificada.")

    def as_dict(self) -> dict:
        return {
            "kind": "axis",
            "sheet": self.sheet,
            "axis": self.axis,
            "mode": self.mode,
            "at": self.at,
            "count": self.count,
        }


@dataclass(frozen=True)
class RangeMoveTransform:
    sheet: str
    source: str
    destination: str

    def __post_init__(self) -> None:
        srow, scol, erow, ecol = parse_range_ref(self.source)
        drow, dcol = parse_cell_ref(self.destination)
        out_end_row = drow + (erow - srow)
        out_end_col = dcol + (ecol - scol)
        if out_end_row > MAX_ROW or out_end_col > MAX_COLUMN:
            raise RecipeError("Destino de range.move ultrapassa o limite do Excel.")
        if not (out_end_row < srow or drow > erow or out_end_col < scol or dcol > ecol):
            raise RecipeError("range.move não permite origem e destino sobrepostos na V3A.")

    @property
    def destination_range(self) -> str:
        srow, scol, erow, ecol = parse_range_ref(self.source)
        drow, dcol = parse_cell_ref(self.destination)
        return make_range_ref(drow, dcol, drow + erow - srow, dcol + ecol - scol)

    def transform_cell(self, row: int, column: int) -> tuple[int, int]:
        srow, scol, erow, ecol = parse_range_ref(self.source)
        if srow <= row <= erow and scol <= column <= ecol:
            drow, dcol = parse_cell_ref(self.destination)
            return drow + row - srow, dcol + column - scol
        return row, column

    def transform_cell_ref(self, cell_ref: str) -> str:
        row, column = parse_cell_ref(cell_ref)
        return make_cell_ref(*self.transform_cell(row, column))

    def transform_range(self, range_ref: str) -> RangeChange:
        start_row, start_col, end_row, end_col = parse_range_ref(range_ref)
        srow, scol, erow, ecol = parse_range_ref(self.source)
        inside = srow <= start_row and end_row <= erow and scol <= start_col and end_col <= ecol
        intersects = not (end_row < srow or start_row > erow or end_col < scol or start_col > ecol)
        if inside:
            drow, dcol = parse_cell_ref(self.destination)
            return RangeChange(
                make_range_ref(
                    drow + start_row - srow,
                    dcol + start_col - scol,
                    drow + end_row - srow,
                    dcol + end_col - scol,
                ),
                "moved",
            )
        if intersects:
            return RangeChange(range_ref, "partial")
        return RangeChange(range_ref, "unaffected")

    def as_dict(self) -> dict:
        return {
            "kind": "move",
            "sheet": self.sheet,
            "source": self.source,
            "destination": self.destination,
            "destination_range": self.destination_range,
        }


@dataclass(frozen=True)
class TableColumnTransform:
    sheet: str
    table_ref: str
    column: int
    mode: str

    def __post_init__(self) -> None:
        start_row, start_col, end_row, end_col = parse_range_ref(self.table_ref)
        if self.mode not in {"insert", "delete"}:
            raise RecipeError(f"Modo de coluna de tabela inválido: {self.mode}")
        if self.column < start_col or self.column > end_col + (1 if self.mode == "insert" else 0):
            raise RecipeError("Posição de coluna fora da tabela.")
        if self.mode == "insert" and end_col >= MAX_COLUMN:
            raise RecipeError("Tabela já alcança a coluna XFD.")
        if self.mode == "delete" and start_col == end_col:
            raise RecipeError("Não é permitido excluir a única coluna de uma tabela.")
        if start_row > end_row:
            raise RecipeError("Range de tabela inválido.")

    def transform_cell(self, row: int, column: int) -> tuple[int, int] | None:
        start_row, start_col, end_row, end_col = parse_range_ref(self.table_ref)
        if not (start_row <= row <= end_row):
            return row, column
        if self.mode == "insert":
            if self.column <= column <= end_col:
                return row, column + 1
            return row, column
        if column == self.column:
            return None
        if self.column < column <= end_col:
            return row, column - 1
        return row, column

    def transform_cell_ref(self, cell_ref: str) -> str | None:
        row, column = parse_cell_ref(cell_ref)
        result = self.transform_cell(row, column)
        return None if result is None else make_cell_ref(*result)

    def transform_range(self, range_ref: str) -> RangeChange:
        start_row, start_col, end_row, end_col = parse_range_ref(range_ref)
        table_start_row, _, table_end_row, table_end_col = parse_range_ref(self.table_ref)
        if end_row < table_start_row or start_row > table_end_row:
            return RangeChange(range_ref, "unaffected")
        if start_row < table_start_row or end_row > table_end_row:
            if start_col <= table_end_col and end_col >= self.column:
                return RangeChange(range_ref, "partial")
            return RangeChange(range_ref, "unaffected")
        start_result = self.transform_cell(start_row, start_col)
        end_result = self.transform_cell(end_row, end_col)
        if start_result is None or end_result is None:
            return RangeChange(None, "removed")
        new_ref = make_range_ref(start_result[0], start_result[1], end_result[0], end_result[1])
        return RangeChange(new_ref, "shifted" if new_ref != range_ref else "unaffected")

    def as_dict(self) -> dict:
        return {
            "kind": "table_column",
            "sheet": self.sheet,
            "table_ref": self.table_ref,
            "column": self.column,
            "mode": self.mode,
        }


@dataclass(frozen=True)
class CompactRowsTransform:
    sheet: str
    table_ref: str
    removed_rows: tuple[int, ...]

    def __post_init__(self) -> None:
        start_row, _, end_row, _ = parse_range_ref(self.table_ref)
        if not self.removed_rows:
            raise RecipeError("table.compact_rows não encontrou linhas vazias para compactar.")
        if any(row <= start_row or row > end_row for row in self.removed_rows):
            raise RecipeError("Linha de compactação fora da área de dados da tabela.")
        if tuple(sorted(set(self.removed_rows))) != self.removed_rows:
            raise RecipeError("removed_rows deve ser ordenado e sem duplicatas.")

    def transform_cell(self, row: int, column: int) -> tuple[int, int] | None:
        start_row, start_col, end_row, end_col = parse_range_ref(self.table_ref)
        if not (start_col <= column <= end_col and start_row < row <= end_row):
            return row, column
        if row in self.removed_rows:
            return None
        shift = sum(removed < row for removed in self.removed_rows)
        return row - shift, column

    def transform_cell_ref(self, cell_ref: str) -> str | None:
        row, column = parse_cell_ref(cell_ref)
        result = self.transform_cell(row, column)
        return None if result is None else make_cell_ref(*result)

    def transform_range(self, range_ref: str) -> RangeChange:
        start_row, start_col, end_row, end_col = parse_range_ref(range_ref)
        table_start_row, table_start_col, table_end_row, table_end_col = parse_range_ref(self.table_ref)
        intersects = not (
            end_row < table_start_row + 1
            or start_row > table_end_row
            or end_col < table_start_col
            or start_col > table_end_col
        )
        if not intersects:
            return RangeChange(range_ref, "unaffected")
        inside = (
            table_start_row < start_row <= end_row <= table_end_row
            and table_start_col <= start_col <= end_col <= table_end_col
        )
        if not inside:
            return RangeChange(range_ref, "partial")
        start_result = self.transform_cell(start_row, start_col)
        end_result = self.transform_cell(end_row, end_col)
        if start_result is None or end_result is None:
            return RangeChange(range_ref, "partial")
        new_ref = make_range_ref(start_result[0], start_result[1], end_result[0], end_result[1])
        return RangeChange(new_ref, "shifted" if new_ref != range_ref else "unaffected")

    def as_dict(self) -> dict:
        return {
            "kind": "compact_rows",
            "sheet": self.sheet,
            "table_ref": self.table_ref,
            "removed_rows": list(self.removed_rows),
        }
