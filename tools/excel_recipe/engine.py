from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from .constants import DEFAULT_SNAPSHOT_SCRIPT, TOOL_VERSION
from .errors import RecipeError
from .operations import OperationRunner
from .package import PackageEditor
from .recipe import Recipe, load_recipe
from .workbook import WorkbookContext

REPO_ROOT = Path(__file__).resolve().parents[2]


def resolve_repo_path(raw: str | Path, repo_root: Path = REPO_ROOT) -> Path:
    candidate = Path(raw)
    resolved = candidate.resolve() if candidate.is_absolute() else (repo_root / candidate).resolve()
    try:
        resolved.relative_to(repo_root.resolve())
    except ValueError as exc:
        raise RecipeError(f"Caminho fora do repositório não permitido: {resolved}") from exc
    return resolved


def execute_recipe(
    recipe_path: Path,
    *,
    dry_run: bool = False,
    refresh_snapshot: bool = True,
    repo_root: Path = REPO_ROOT,
) -> dict:
    recipe_path = resolve_repo_path(recipe_path, repo_root)
    recipe = load_recipe(recipe_path)
    source = resolve_repo_path(recipe.workbook_path, repo_root)
    receipt_path = resolve_repo_path(recipe.receipt_path, repo_root)
    if receipt_path.exists() and not dry_run:
        raise RecipeError(f"Receipt já existe; receita não será reaplicada: {receipt_path}")

    package = PackageEditor(source)
    _check_preconditions(recipe, package)
    workbook = WorkbookContext(package)
    runner = OperationRunner(workbook)
    runner.run_all(recipe.operations)
    package.assert_firewall(workbook.allowed_parts)
    changed_parts = package.changed_parts()

    with tempfile.TemporaryDirectory(prefix=".excel-recipe-", dir=source.parent) as temp_dir:
        candidate = Path(temp_dir) / source.name
        if changed_parts:
            package.write(candidate)
        else:
            shutil.copy2(source, candidate)
        candidate_package = PackageEditor(candidate)
        _check_vba_preserved(package, candidate_package)
        receipt = _build_receipt(recipe, package, candidate_package, changed_parts, runner.applied)
        if dry_run:
            return receipt
        _install(source, candidate, receipt_path, receipt, refresh_snapshot, repo_root)
        return receipt


def _check_preconditions(recipe: Recipe, package: PackageEditor) -> None:
    if package.source_sha256.lower() != recipe.expected_sha256:
        raise RecipeError(
            "SHA-256 da planilha divergiu da base esperada. "
            f"Esperado {recipe.expected_sha256}, atual {package.source_sha256}."
        )
    if recipe.expected_vba_sha256 is not None:
        actual = package.vba_sha256
        if actual is None or actual.lower() != recipe.expected_vba_sha256:
            raise RecipeError(
                "SHA-256 do projeto VBA divergiu da base esperada. "
                f"Esperado {recipe.expected_vba_sha256}, atual {actual}."
            )


def _check_vba_preserved(before: PackageEditor, after: PackageEditor) -> None:
    if before.vba_sha256 != after.vba_sha256:
        raise RecipeError("Projeto VBA mudou durante a receita; execução abortada.")


def _build_receipt(recipe: Recipe, before: PackageEditor, after: PackageEditor, changed_parts: list[str], applied: list[dict]) -> dict:
    return {
        "schema_version": 1,
        "tool_version": TOOL_VERSION,
        "recipe_id": recipe.recipe_id,
        "workbook": recipe.workbook_path,
        "source_sha256_before": before.source_sha256,
        "source_sha256_after": after.source_sha256,
        "vba_sha256_before": before.vba_sha256,
        "vba_sha256_after": after.vba_sha256,
        "changed_parts": changed_parts,
        "operations": applied,
        "generated_at": None,
        "generated_at_note": "Timestamp omitido para determinismo; use o histórico Git.",
    }


def _install(source: Path, candidate: Path, receipt_path: Path, receipt: dict, refresh_snapshot: bool, repo_root: Path) -> None:
    backup = source.with_name(f".{source.name}.recipe-backup-{os.getpid()}")
    receipt_tmp = receipt_path.with_name(f".{receipt_path.name}.tmp-{os.getpid()}")
    if backup.exists() or receipt_tmp.exists():
        raise RecipeError("Arquivo temporário de execução já existe; limpe-o antes de continuar.")
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    receipt_tmp.write_text(json.dumps(receipt, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    try:
        os.replace(source, backup)
        shutil.copy2(candidate, source)
        if refresh_snapshot:
            _refresh_snapshot(repo_root)
        os.replace(receipt_tmp, receipt_path)
        backup.unlink(missing_ok=True)
    except Exception:
        receipt_tmp.unlink(missing_ok=True)
        if backup.exists():
            source.unlink(missing_ok=True)
            os.replace(backup, source)
        raise


def _refresh_snapshot(repo_root: Path) -> None:
    script = resolve_repo_path(DEFAULT_SNAPSHOT_SCRIPT, repo_root)
    try:
        subprocess.run([sys.executable, str(script)], cwd=repo_root, check=True)
    except subprocess.CalledProcessError as exc:
        raise RecipeError(f"Snapshot falhou após aplicar receita; workbook foi restaurado. Exit code {exc.returncode}.") from exc
