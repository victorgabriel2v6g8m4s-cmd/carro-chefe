from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path

from .constants import (
    DEFAULT_SNAPSHOT_OUTPUT,
    DEFAULT_WORKBOOK,
    MAX_OPERATIONS,
    MAX_ROWS_PER_OPERATION,
)
from .errors import RecipeError

SUPPORTED_OPERATIONS = {
    "cell.set", "cell.clear", "formula.set", "formula.copy",
    "dependency.scan", "dependency.assert_clean",
    "structural.plan", "structural.assert_clean",
    "sheet.insert_rows", "sheet.delete_rows", "sheet.insert_columns", "sheet.delete_columns",
    "range.move", "table.insert_column", "table.delete_column", "table.compact_rows",
    "table.rename", "table.rename_column",
    "table.append_rows", "table.upsert_rows", "table.update_rows", "table.delete_rows",
    "table.create", "table.resize", "table.drop", "table.add_column", "table.set_formula_column",
    "assert.cell", "assert.table", "assert.row", "workbook.recalculate_on_open",
}


@dataclass(frozen=True)
class Recipe:
    schema_version: int
    recipe_id: str
    workbook_path: str
    expected_sha256: str
    expected_vba_sha256: str | None
    operations: list[dict]
    receipt_path: str
    snapshot_output_path: str | None


def load_recipe(path: Path) -> Recipe:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RecipeError(f"Receita JSON inválida: {path}: {exc}") from exc
    if not isinstance(raw, dict):
        raise RecipeError("Raiz da receita deve ser um objeto JSON.")
    if raw.get("schema_version") != 1:
        raise RecipeError("schema_version suportado: 1")
    recipe_id = raw.get("id")
    if not isinstance(recipe_id, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{2,100}", recipe_id):
        raise RecipeError("id da receita inválido.")
    workbook = raw.get("workbook") or {}
    if not isinstance(workbook, dict):
        raise RecipeError("workbook deve ser objeto.")
    workbook_path = workbook.get("path", DEFAULT_WORKBOOK)
    if not isinstance(workbook_path, str) or not workbook_path.lower().endswith(".xlsm"):
        raise RecipeError("workbook.path deve apontar para .xlsm.")
    workbook_path = _portable_path(workbook_path)
    expected_sha = workbook.get("expected_sha256")
    expected_vba = workbook.get("expected_vba_sha256")
    _validate_sha(expected_sha, "expected_sha256", required=True)
    _validate_sha(expected_vba, "expected_vba_sha256", required=False)
    operations = raw.get("operations")
    if not isinstance(operations, list):
        raise RecipeError("operations deve ser uma lista.")
    if len(operations) > MAX_OPERATIONS:
        raise RecipeError(f"Receita excede {MAX_OPERATIONS} operações.")
    for index, operation in enumerate(operations):
        _validate_operation(operation, index)

    receipt_path = raw.get("receipt_path") or _default_receipt_path(workbook_path, recipe_id)
    if not isinstance(receipt_path, str) or not receipt_path.endswith(".json"):
        raise RecipeError("receipt_path deve apontar para .json.")
    receipt_path = _portable_path(receipt_path)
    snapshot_output = _parse_snapshot_output(workbook, workbook_path)

    return Recipe(
        1,
        recipe_id,
        workbook_path,
        expected_sha.lower(),
        expected_vba.lower() if expected_vba else None,
        operations,
        receipt_path,
        snapshot_output,
    )


def _portable_path(value: str) -> str:
    return value.replace("\\", "/")


def _default_receipt_path(workbook_path: str, recipe_id: str) -> str:
    parent = Path(workbook_path).parent.as_posix()
    prefix = "" if parent == "." else f"{parent}/"
    return f"{prefix}recipes/receipts/{recipe_id}.receipt.json"


def _parse_snapshot_output(workbook: dict, workbook_path: str) -> str | None:
    snapshot = workbook.get("snapshot")
    is_default_workbook = workbook_path == DEFAULT_WORKBOOK
    if snapshot is None:
        return DEFAULT_SNAPSHOT_OUTPUT if is_default_workbook else None
    if not isinstance(snapshot, dict):
        raise RecipeError("workbook.snapshot deve ser objeto quando informado.")

    enabled = snapshot.get("enabled", True)
    if not isinstance(enabled, bool):
        raise RecipeError("workbook.snapshot.enabled deve ser booleano.")
    output = snapshot.get("output")
    if not enabled:
        if output is not None:
            raise RecipeError("workbook.snapshot.output não deve ser informado quando enabled=false.")
        return None
    if output is None:
        if is_default_workbook:
            return DEFAULT_SNAPSHOT_OUTPUT
        raise RecipeError("workbook.snapshot.output é obrigatório para workbook genérico com snapshot habilitado.")
    if not isinstance(output, str) or not output.strip():
        raise RecipeError("workbook.snapshot.output deve ser caminho não vazio.")
    return _portable_path(output)


def _validate_sha(value, field: str, *, required: bool) -> None:
    if value is None and not required:
        return
    if not isinstance(value, str) or not re.fullmatch(r"[0-9a-fA-F]{64}", value):
        raise RecipeError(f"{field} deve ser SHA-256 hexadecimal de 64 caracteres.")


def _validate_operation(operation, index: int) -> None:
    if not isinstance(operation, dict):
        raise RecipeError(f"Operação {index} deve ser objeto.")
    op = operation.get("op")
    if op not in SUPPORTED_OPERATIONS:
        raise RecipeError(f"Operação {index} não suportada: {op}")
    for field in ("rows",):
        value = operation.get(field)
        if isinstance(value, list) and len(value) > MAX_ROWS_PER_OPERATION:
            raise RecipeError(f"Operação {index} excede {MAX_ROWS_PER_OPERATION} linhas.")
