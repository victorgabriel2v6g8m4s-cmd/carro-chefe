from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from .constants import DEFAULT_WORKBOOK
from .errors import RecipeError

REPO_ROOT = Path(__file__).resolve().parents[2]


def git(*args: str, capture: bool = True) -> str:
    result = subprocess.run(
        ["git", *args], cwd=REPO_ROOT, text=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None,
    )
    if result.returncode:
        detail = (result.stderr or result.stdout or "erro Git").strip()
        raise RecipeError(detail)
    return (result.stdout or "").strip()


def resolve_workbook_arg(raw: str) -> str:
    candidate = (REPO_ROOT / raw).resolve() if not Path(raw).is_absolute() else Path(raw).resolve()
    try:
        relative = candidate.relative_to(REPO_ROOT.resolve())
    except ValueError as exc:
        raise RecipeError(f"Workbook fora do repositório não permitido: {candidate}") from exc
    if candidate.suffix.lower() != ".xlsm":
        raise RecipeError("--workbook deve apontar para arquivo .xlsm.")
    return relative.as_posix()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Sincroniza main por fast-forward sem sobrescrever alterações locais do workbook selecionado."
    )
    parser.add_argument(
        "--workbook",
        default=DEFAULT_WORKBOOK,
        help="Workbook .xlsm relativo ao repositório a proteger contra overwrite local.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    try:
        args = build_parser().parse_args(argv)
        workbook = resolve_workbook_arg(args.workbook)
        branch = git("branch", "--show-current")
        if branch != "main":
            raise RecipeError(f"Sincronização segura exige branch main; atual: {branch or '(detached)'}")
        workbook_status = git("status", "--porcelain", "--", workbook)
        if workbook_status:
            raise RecipeError(
                f"O workbook {workbook} possui alteração local. Nada foi sobrescrito; "
                "revise/commite seu trabalho antes de sincronizar."
            )
        git("fetch", "origin", "main", capture=False)
        git("merge", "--ff-only", "origin/main", capture=False)
        print(
            "Main sincronizada por fast-forward; nenhum reset, stash ou cópia do workbook foi criado. "
            f"Workbook protegido: {workbook}"
        )
        return 0
    except RecipeError as exc:
        print(f"erro: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
