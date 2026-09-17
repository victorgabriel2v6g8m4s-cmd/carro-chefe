from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .engine import execute_recipe
from .errors import RecipeError


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Aplica receitas JSON transacionais a workbooks Excel OOXML .xlsm."
    )
    sub = parser.add_subparsers(dest="command", required=True)
    apply_cmd = sub.add_parser(
        "apply",
        help="Aplica a receita ao workbook indicado e atualiza o snapshot configurado, se houver.",
    )
    apply_cmd.add_argument("recipe", type=Path)
    apply_cmd.add_argument("--dry-run", action="store_true", help="Valida e simula sem alterar arquivos.")
    apply_cmd.add_argument(
        "--no-snapshot",
        action="store_true",
        help="Não executa o snapshot configurado na receita. Uso principal: testes/diagnóstico.",
    )
    validate_cmd = sub.add_parser("validate", help="Valida precondições e operações sem alterar arquivos.")
    validate_cmd.add_argument("recipe", type=Path)
    plan_cmd = sub.add_parser("plan", help="Executa dry-run e imprime o plano/impacto determinístico.")
    plan_cmd.add_argument("recipe", type=Path)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        if args.command in {"validate", "plan"}:
            receipt = execute_recipe(args.recipe, dry_run=True, refresh_snapshot=False)
        else:
            receipt = execute_recipe(args.recipe, dry_run=args.dry_run, refresh_snapshot=not args.no_snapshot)
        print(json.dumps(receipt, ensure_ascii=False, indent=2, sort_keys=True))
        return 0
    except RecipeError as exc:
        print(f"erro: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
