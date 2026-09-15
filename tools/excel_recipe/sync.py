from __future__ import annotations

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


def main() -> int:
    try:
        branch = git("branch", "--show-current")
        if branch != "main":
            raise RecipeError(f"Sincronização segura exige branch main; atual: {branch or '(detached)'}")
        workbook_status = git("status", "--porcelain", "--", DEFAULT_WORKBOOK)
        if workbook_status:
            raise RecipeError("A planilha possui alteração local. Nada foi sobrescrito; revise/commite seu trabalho antes de sincronizar.")
        git("fetch", "origin", "main", capture=False)
        git("merge", "--ff-only", "origin/main", capture=False)
        print("Main sincronizada por fast-forward; nenhum reset, stash ou cópia da planilha foi criado.")
        return 0
    except RecipeError as exc:
        print(f"erro: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
