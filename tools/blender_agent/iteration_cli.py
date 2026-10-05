from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from .client import _json_text, call
from .iteration import validate_iteration_config, validate_proposal


def _load_json_object(path: str) -> dict[str, Any]:
    target = Path(path).expanduser().resolve()
    raw = target.read_bytes()
    if len(raw) > 512_000:
        raise ValueError(f"arquivo JSON excede limite: {target}")
    value = json.loads(raw.decode("utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"arquivo precisa conter objeto JSON: {target}")
    return value


def _view_scores(values: list[str] | None) -> dict[str, float]:
    result: dict[str, float] = {}
    for item in values or []:
        if "=" not in item:
            raise ValueError("--view-score deve usar NOME=0.0..1.0")
        name, raw = item.split("=", 1)
        score = float(raw)
        if not 0.0 <= score <= 1.0:
            raise ValueError("--view-score deve ficar em 0..1")
        result[name.strip()] = score
    return result


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="CLI V0.5 do Blender Agent iterativo")
    sub = parser.add_subparsers(dest="command", required=True)

    validate = sub.add_parser("validate", help="valida config iterativa sem Blender")
    validate.add_argument("config")
    validate.set_defaults(handler=lambda a: {
        "ok": True,
        "result": validate_iteration_config(_load_json_object(a.config)),
    })

    start = sub.add_parser("start", help="inicia sessao iterativa")
    start.add_argument("config")
    start.add_argument("--source-recipe-id")
    start.add_argument("--source-recipe-version")
    start.add_argument("--source-receipt")
    start.set_defaults(handler=lambda a: call("iteration.start", {
        "config": _load_json_object(a.config),
        "source_recipe": {
            "id": a.source_recipe_id,
            "version": a.source_recipe_version,
            "receipt": a.source_receipt,
        } if any((a.source_recipe_id, a.source_recipe_version, a.source_receipt)) else None,
    }))

    status = sub.add_parser("status", help="mostra estado/budget da sessao")
    status.set_defaults(handler=lambda _a: call("iteration.status"))

    context = sub.add_parser("context", help="contexto estruturado para planner")
    context.set_defaults(handler=lambda _a: call("iteration.context"))

    observe = sub.add_parser("observe", help="captura vistas isoladas e metricas")
    observe.set_defaults(handler=lambda _a: call("iteration.observe", {}, timeout=60.0))

    propose = sub.add_parser("propose", help="submete proposal JSON allowlisted")
    propose.add_argument("proposal")
    propose.set_defaults(handler=lambda a: call("iteration.propose", {
        "proposal": _load_json_object(a.proposal),
    }))

    apply_cmd = sub.add_parser("apply", help="aplica proposal pendente com snapshot/checkpoint")
    apply_cmd.add_argument("--approve", action="store_true")
    apply_cmd.set_defaults(handler=lambda a: call("iteration.apply", {
        "approved": a.approve,
    }, timeout=60.0))

    evaluate = sub.add_parser("evaluate", help="avalia visualmente e decide keep/rollback/continue/finish")
    evaluate.add_argument("decision", choices=["keep", "continue", "rollback", "finish"])
    evaluate.add_argument("--visual-score", type=float)
    evaluate.add_argument("--visual-reviewed", action="store_true")
    evaluate.add_argument("--notes", default="")
    evaluate.add_argument("--view-score", action="append", default=[])
    evaluate.set_defaults(handler=lambda a: call("iteration.evaluate", {
        "decision": a.decision,
        "visual_score": a.visual_score,
        "visual_reviewed": a.visual_reviewed or a.visual_score is not None,
        "visual_notes": a.notes,
        "view_scores": _view_scores(a.view_score),
    }))

    rollback = sub.add_parser("rollback", help="reverte ultima iteracao ao snapshot")
    rollback.add_argument("--reason", default="manual rollback")
    rollback.set_defaults(handler=lambda a: call("iteration.rollback", {"reason": a.reason}))

    finish = sub.add_parser("finish", help="grava receipt e encerra sessao")
    finish.add_argument("--force", action="store_true")
    finish.set_defaults(handler=lambda a: call("iteration.finish", {"force": a.force}))

    proposal_validate = sub.add_parser("validate-proposal", help="valida proposal localmente")
    proposal_validate.add_argument("proposal")
    proposal_validate.add_argument("--target", action="append", required=True, dest="targets")
    proposal_validate.set_defaults(handler=lambda a: {
        "ok": True,
        "result": validate_proposal(_load_json_object(a.proposal), targets=a.targets),
    })

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        result = args.handler(args)
        print(_json_text(result))
        return 0
    except Exception as exc:
        print(_json_text({"ok": False, "error": f"{type(exc).__name__}: {exc}"}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
