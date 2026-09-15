from __future__ import annotations

import hashlib
import re
from pathlib import Path
from typing import Iterable
from xml.etree import ElementTree as ET

from .constants import MAIN_NS, REL_NS
from .errors import RecipeError

CELL_RE = re.compile(r"^\$?([A-Z]{1,3})\$?([1-9][0-9]*)$")
RANGE_RE = re.compile(r"^(\$?[A-Z]{1,3}\$?[1-9][0-9]*):(\$?[A-Z]{1,3}\$?[1-9][0-9]*)$")

ET.register_namespace("", MAIN_NS)
ET.register_namespace("r", REL_NS)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def qname(namespace: str, local: str) -> str:
    return f"{{{namespace}}}{local}"


def column_to_index(column: str) -> int:
    result = 0
    for char in column.upper():
        if not ("A" <= char <= "Z"):
            raise RecipeError(f"Coluna A1 inválida: {column}")
        result = result * 26 + (ord(char) - 64)
    if result > 16384:
        raise RecipeError(f"Coluna fora do limite do Excel (XFD): {column}")
    return result


def index_to_column(index: int) -> str:
    if index < 1:
        raise RecipeError(f"Índice de coluna inválido: {index}")
    chars: list[str] = []
    current = index
    while current:
        current, remainder = divmod(current - 1, 26)
        chars.append(chr(65 + remainder))
    return "".join(reversed(chars))


def parse_cell_ref(cell_ref: str) -> tuple[int, int]:
    match = CELL_RE.fullmatch(cell_ref.upper())
    if not match:
        raise RecipeError(f"Referência de célula inválida: {cell_ref}")
    return int(match.group(2)), column_to_index(match.group(1))


def make_cell_ref(row: int, column: int) -> str:
    if row < 1:
        raise RecipeError(f"Linha inválida: {row}")
    return f"{index_to_column(column)}{row}"


def parse_range_ref(range_ref: str) -> tuple[int, int, int, int]:
    match = RANGE_RE.fullmatch(range_ref.upper())
    if not match:
        raise RecipeError(f"Intervalo A1 inválido: {range_ref}")
    start_row, start_col = parse_cell_ref(match.group(1))
    end_row, end_col = parse_cell_ref(match.group(2))
    if end_row < start_row or end_col < start_col:
        raise RecipeError(f"Intervalo invertido: {range_ref}")
    return start_row, start_col, end_row, end_col


def make_range_ref(start_row: int, start_col: int, end_row: int, end_col: int) -> str:
    return f"{make_cell_ref(start_row, start_col)}:{make_cell_ref(end_row, end_col)}"


def iter_range(range_ref: str) -> Iterable[tuple[int, int]]:
    start_row, start_col, end_row, end_col = parse_range_ref(range_ref)
    for row in range(start_row, end_row + 1):
        for column in range(start_col, end_col + 1):
            yield row, column


def normalize_formula(formula: str) -> str:
    if not isinstance(formula, str) or not formula.strip():
        raise RecipeError("Fórmula deve ser texto não vazio.")
    return formula[1:] if formula.startswith("=") else formula


def canonical_path(path: str) -> str:
    return path.replace("\\", "/").lstrip("/")
