from __future__ import annotations

import argparse
import json
import socket
import sys
import time
from pathlib import Path
from typing import Any

from .recipes import load_recipe, plan_recipe, validate_recipe

from .protocol import (
    DEFAULT_TIMEOUT_SECONDS,
    PROTOCOL_VERSION,
    encode_message,
    sanitize_label,
    session_path,
)


def load_session(path: Path | None = None) -> dict[str, Any]:
    target = path or session_path()
    data = json.loads(target.read_text(encoding="utf-8"))
    for key in ("host", "port", "token"):
        if key not in data:
            raise RuntimeError(f"sessão inválida: campo ausente {key}")
    return data


def call(action: str, params: dict[str, Any] | None = None, timeout: float = DEFAULT_TIMEOUT_SECONDS) -> dict[str, Any]:
    session = load_session()
    request = {
        "version": PROTOCOL_VERSION,
        "id": f"cli-{time.time_ns()}",
        "action": action,
        "params": params or {},
        "token": session["token"],
    }
    with socket.create_connection((session["host"], int(session["port"])), timeout=timeout) as sock:
        sock.settimeout(timeout)
        sock.sendall(encode_message(request))
        chunks: list[bytes] = []
        total = 0
        while True:
            chunk = sock.recv(65536)
            if not chunk:
                break
            chunks.append(chunk)
            total += len(chunk)
            if total > 1_000_000:
                raise RuntimeError("resposta excedeu limite")
            if b"\n" in chunk:
                break
    raw = b"".join(chunks).split(b"\n", 1)[0]
    response = json.loads(raw.decode("utf-8"))
    if not response.get("ok"):
        raise RuntimeError(response.get("error", "erro desconhecido do Blender bridge"))
    return response


def _json_text(value: Any) -> str:
    # ASCII-safe JSON survives Windows PowerShell 5.1 native-process decoding.
    # Non-ASCII filesystem paths are represented as JSON \\uXXXX escapes and
    # ConvertFrom-Json reconstructs the original Unicode string correctly.
    return json.dumps(value, ensure_ascii=True, indent=2)


def _json_list(value: str) -> list[Any]:
    parsed = json.loads(value)
    if not isinstance(parsed, list):
        raise argparse.ArgumentTypeError("valor precisa ser uma lista JSON")
    return parsed


def _json_params(value: str) -> dict[str, Any]:
    parsed = json.loads(value)
    if not isinstance(parsed, dict):
        raise argparse.ArgumentTypeError("--json precisa ser um objeto JSON")
    return parsed


def capture_set(
    label: str,
    views: list[str],
    *,
    wait_seconds: float = 0.25,
    shading: str | None = None,
) -> dict[str, Any]:
    clean_label = sanitize_label(label, "capture-set")
    if not views:
        raise ValueError("capture-set exige pelo menos uma vista")
    wait_seconds = max(0.05, min(2.0, float(wait_seconds)))

    if shading:
        call("viewport.set_shading", {"type": shading})

    captures: list[dict[str, Any]] = []
    for preset in views:
        normalized = preset.upper()
        call("viewport.set_view", {"preset": normalized, "frame_all": True})
        time.sleep(wait_seconds)
        capture = call("viewport.capture", {
            "filename": f"{clean_label}-{normalized.lower().replace('_', '-')}.png"
        })
        captures.append({
            "preset": normalized,
            "capture": capture["result"],
        })

    return {
        "ok": True,
        "label": clean_label,
        "views": [item["preset"] for item in captures],
        "captures": captures,
    }


def _parse_bool_choice(value: str) -> bool | None:
    normalized = value.strip().lower()
    if normalized in {"any", "all", "*"}:
        return None
    if normalized in {"true", "success", "ok", "1", "yes"}:
        return True
    if normalized in {"false", "failure", "fail", "0", "no"}:
        return False
    raise argparse.ArgumentTypeError("use any, success ou failure")


def _parse_recipe_overrides(values: list[str] | None) -> dict[str, Any]:
    overrides: dict[str, Any] = {}
    for item in values or []:
        if "=" not in item:
            raise argparse.ArgumentTypeError("--set deve usar NOME=VALOR")
        name, raw = item.split("=", 1)
        name = name.strip()
        if not name:
            raise argparse.ArgumentTypeError("--set exige nome de parametro")
        try:
            value = json.loads(raw)
        except json.JSONDecodeError:
            value = raw
        overrides[name] = value
    return overrides


def _recipe_validate_file(path: str) -> dict[str, Any]:
    result = validate_recipe(load_recipe(path))
    return {"ok": True, "result": result}


def _recipe_plan_file(path: str, variant: str | None, sets: list[str] | None) -> dict[str, Any]:
    result = plan_recipe(
        load_recipe(path),
        variant=variant,
        overrides=_parse_recipe_overrides(sets),
    )
    return {"ok": True, "result": result}


def _recipe_run_file(
    path: str,
    *,
    variant: str | None,
    sets: list[str] | None,
    dry_run: bool,
    create_stage: bool,
    restore_stage: bool,
) -> dict[str, Any]:
    return call("recipe.run", {
        "recipe": load_recipe(path),
        "variant": variant,
        "overrides": _parse_recipe_overrides(sets),
        "dry_run": dry_run,
        "create_stage": create_stage,
        "restore_stage": restore_stage,
    }, timeout=120.0)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Cliente local do Blender Agent do Carro Chefe")
    sub = parser.add_subparsers(dest="command", required=True)

    status = sub.add_parser("status", help="testa conexão com o bridge")
    status.set_defaults(handler=lambda _a: call("health"))

    invoke = sub.add_parser("call", help="executa qualquer action allowlisted")
    invoke.add_argument("action")
    invoke.add_argument("--json", default="{}", type=_json_params, dest="params")
    invoke.set_defaults(handler=lambda a: call(a.action, a.params))

    add_primitive = sub.add_parser("object-add-primitive", help="cria primitiva sem JSON inline")
    add_primitive.add_argument("kind", choices=["cube", "cylinder", "uv_sphere", "ico_sphere", "torus"])
    add_primitive.add_argument("--name")
    add_primitive.add_argument("--location", nargs=3, type=float, metavar=("X", "Y", "Z"), default=[0.0, 0.0, 0.0])
    add_primitive.add_argument("--scale", nargs=3, type=float, metavar=("X", "Y", "Z"))
    add_primitive.set_defaults(handler=lambda a: call("object.add_primitive", {
        "kind": a.kind,
        "name": a.name,
        "location": a.location,
        "scale": a.scale,
    }))

    delete_object = sub.add_parser("object-delete", help="remove objeto por nome sem JSON inline")
    delete_object.add_argument("name")
    delete_object.set_defaults(handler=lambda a: call("object.delete", {"name": a.name}))

    viewport = sub.add_parser("viewport-describe", help="descreve estado e bounds da VIEW_3D")
    viewport.set_defaults(handler=lambda _a: call("viewport.describe"))

    set_view = sub.add_parser("viewport-view", help="define uma vista previsível da VIEW_3D")
    set_view.add_argument(
        "preset",
        choices=["LEFT", "RIGHT", "BOTTOM", "TOP", "FRONT", "BACK", "CAMERA", "THREE_QUARTER"],
    )
    set_view.add_argument("--no-frame-all", action="store_true")
    set_view.set_defaults(handler=lambda a: call("viewport.set_view", {
        "preset": a.preset,
        "frame_all": not a.no_frame_all,
    }))

    frame = sub.add_parser("viewport-frame", help="enquadra todos os objetos na VIEW_3D")
    frame.set_defaults(handler=lambda _a: call("viewport.frame_all"))

    shading = sub.add_parser("viewport-shading", help="define shading da VIEW_3D")
    shading.add_argument("type", choices=["WIREFRAME", "SOLID", "MATERIAL", "RENDERED"])
    shading.set_defaults(handler=lambda a: call("viewport.set_shading", {"type": a.type}))

    capture = sub.add_parser("viewport-capture", help="salva PNG somente da região 3D")
    capture.add_argument("--name", default="viewport.png")
    capture.set_defaults(handler=lambda a: call("viewport.capture", {"filename": a.name}))

    capture_many = sub.add_parser("viewport-capture-set", help="captura conjunto de vistas previsíveis")
    capture_many.add_argument("--label", default="viewport-set")
    capture_many.add_argument(
        "--views",
        nargs="+",
        choices=["LEFT", "RIGHT", "BOTTOM", "TOP", "FRONT", "BACK", "CAMERA", "THREE_QUARTER"],
        default=["FRONT", "RIGHT", "TOP", "THREE_QUARTER"],
    )
    capture_many.add_argument("--shading", choices=["WIREFRAME", "SOLID", "MATERIAL", "RENDERED"], default="SOLID")
    capture_many.add_argument("--wait", type=float, default=0.25)
    capture_many.set_defaults(handler=lambda a: capture_set(
        a.label,
        a.views,
        wait_seconds=a.wait,
        shading=a.shading,
    ))

    workspaces = sub.add_parser("workspace-list", help="lista abas/workspaces do Blender")
    workspaces.set_defaults(handler=lambda _a: call("workspace.list"))

    workspace_describe = sub.add_parser("workspace-describe", help="consulta conteudo de uma ou varias abas/workspaces")
    workspace_describe.add_argument("--name", action="append", dest="names")
    workspace_describe.add_argument("--all", action="store_true")
    workspace_describe.set_defaults(handler=lambda a: call("workspace.describe", {
        "names": a.names,
        "all": a.all,
    }))

    workspace_capture = sub.add_parser("workspace-capture-set", help="captura varias abas/workspaces em uma operacao")
    workspace_capture.add_argument("--label", default="workspace-capture-set")
    workspace_capture.add_argument("--workspace", action="append", dest="workspaces")
    workspace_capture.add_argument("--target", choices=["VIEW_3D", "WINDOW", "AREA"], default="VIEW_3D")
    workspace_capture.add_argument("--area-type")
    workspace_capture.add_argument("--shading", choices=["WIREFRAME", "SOLID", "MATERIAL", "RENDERED"])
    workspace_capture.add_argument("--plan-json", help="plano JSON customizado com lista 'captures'")
    workspace_capture.set_defaults(handler=lambda a: call("workspace.capture_set", (
        {
            **json.loads(a.plan_json),
            "label": a.label,
        }
        if a.plan_json
        else {
            "label": a.label,
            "workspaces": a.workspaces,
            "target": a.target,
            "area_type": a.area_type,
            "shading": a.shading,
        }
    )))

    history_start = sub.add_parser("history-start", help="inicia nova etapa de producao com referencia a anterior")
    history_start.add_argument("label")
    history_start.add_argument("--id", dest="stage_id")
    history_start.add_argument("--previous", dest="previous_stage_id")
    history_start.add_argument("--tag", action="append", dest="tags", default=[])
    history_start.add_argument("--no-activate", action="store_true")
    history_start.set_defaults(handler=lambda a: call("history.stage.create", {
        "label": a.label,
        "stage_id": a.stage_id,
        "previous_stage_id": a.previous_stage_id,
        "activate": not a.no_activate,
        "tags": a.tags,
    }))

    history_list = sub.add_parser("history-list", help="lista etapas de producao registradas")
    history_list.add_argument("--limit", type=int, default=100)
    history_list.set_defaults(handler=lambda a: call("history.stage.list", {"limit": a.limit}))

    history_use = sub.add_parser("history-use", help="ativa uma etapa existente")
    history_use.add_argument("stage_id")
    history_use.set_defaults(handler=lambda a: call("history.stage.activate", {"stage_id": a.stage_id}))

    history_show = sub.add_parser("history-show", help="mostra contexto resumido de uma etapa")
    history_show.add_argument("stage_id", nargs="?")
    history_show.add_argument("--recent", type=int, default=20)
    history_show.set_defaults(handler=lambda a: call("history.stage.describe", {
        "stage_id": a.stage_id,
        "recent": a.recent,
    }))

    history_search = sub.add_parser("history-search", help="pesquisa comandos e anexos por palavras-chave/filtros")
    history_search.add_argument("query", nargs="?")
    history_search.add_argument("--stage", dest="stage_id")
    history_search.add_argument("--action")
    history_search.add_argument("--since")
    history_search.add_argument("--until")
    history_search.add_argument("--success", type=_parse_bool_choice, default=None)
    history_search.add_argument("--attachment", type=_parse_bool_choice, default=None, dest="has_attachment")
    history_search.add_argument("--tag", action="append", dest="tags", default=[])
    history_search.add_argument("--limit", type=int, default=50)
    history_search.set_defaults(handler=lambda a: call("history.search", {
        "query": a.query,
        "stage_id": a.stage_id,
        "action": a.action,
        "since": a.since,
        "until": a.until,
        "success": a.success,
        "has_attachment": a.has_attachment,
        "tags": a.tags,
        "limit": a.limit,
    }))

    history_note = sub.add_parser("history-note", help="adiciona nota textual a etapa ativa")
    history_note.add_argument("text")
    history_note.add_argument("--stage", dest="stage_id")
    history_note.add_argument("--tag", action="append", dest="tags", default=[])
    history_note.set_defaults(handler=lambda a: call("history.note", {
        "text": a.text,
        "stage_id": a.stage_id,
        "tags": a.tags,
    }))

    recipe_validate = sub.add_parser("recipe-validate", help="valida recipe JSON localmente")
    recipe_validate.add_argument("path")
    recipe_validate.set_defaults(handler=lambda a: _recipe_validate_file(a.path))

    recipe_plan_cmd = sub.add_parser("recipe-plan", help="resolve variant/overrides sem alterar Blender")
    recipe_plan_cmd.add_argument("path")
    recipe_plan_cmd.add_argument("--variant")
    recipe_plan_cmd.add_argument("--set", action="append", dest="sets", default=[])
    recipe_plan_cmd.set_defaults(handler=lambda a: _recipe_plan_file(a.path, a.variant, a.sets))

    recipe_run = sub.add_parser("recipe-run", help="executa recipe versionada no Blender")
    recipe_run.add_argument("path")
    recipe_run.add_argument("--variant")
    recipe_run.add_argument("--set", action="append", dest="sets", default=[])
    recipe_run.add_argument("--dry-run", action="store_true")
    recipe_run.add_argument("--no-stage", action="store_true")
    recipe_run.add_argument("--restore-stage", action="store_true")
    recipe_run.set_defaults(handler=lambda a: _recipe_run_file(
        a.path,
        variant=a.variant,
        sets=a.sets,
        dry_run=a.dry_run,
        create_stage=not a.no_stage,
        restore_stage=a.restore_stage,
    ))

    recipe_status = sub.add_parser("recipe-status", help="mostra estado da ultima recipe/run atual")
    recipe_status.set_defaults(handler=lambda _a: call("recipe.status"))

    sculpt_status = sub.add_parser("sculpt-status", help="mostra estado atual do Sculpt")
    sculpt_status.set_defaults(handler=lambda _a: call("sculpt.status"))

    sculpt_prepare = sub.add_parser("sculpt-prepare", help="seleciona mesh, entra em Sculpt e configura brush")
    sculpt_prepare.add_argument("--name")
    sculpt_prepare.add_argument("--workspace", default="Sculpting")
    sculpt_prepare.add_argument("--no-frame-selected", action="store_true")
    sculpt_prepare.add_argument(
        "--brush",
        choices=["DRAW", "SMOOTH", "GRAB", "INFLATE", "CLAY_STRIPS", "CREASE", "SNAKE_HOOK"],
        default="DRAW",
    )
    sculpt_prepare.add_argument("--radius", type=int, default=60)
    sculpt_prepare.add_argument("--strength", type=float, default=0.25)
    sculpt_prepare.set_defaults(handler=lambda a: call("sculpt.prepare", {
        "name": a.name,
        "workspace": a.workspace,
        "frame_selected": not a.no_frame_selected,
        "brush": a.brush,
        "radius": a.radius,
        "strength": a.strength,
    }))

    sculpt_stroke = sub.add_parser("sculpt-stroke", help="aplica stroke Sculpt semantico com checkpoint")
    sculpt_points = sculpt_stroke.add_mutually_exclusive_group(required=True)
    sculpt_points.add_argument(
        "--points-json",
        type=_json_list,
        dest="points_json",
        help='lista JSON, ex.: [[0.45,0.5],[0.55,0.5]]',
    )
    sculpt_points.add_argument(
        "--point",
        nargs=2,
        type=float,
        action="append",
        dest="points",
        metavar=("X", "Y"),
        help="ponto X Y repetivel; evita JSON inline no Windows PowerShell 5.1",
    )
    sculpt_stroke.add_argument(
        "--brush",
        choices=["DRAW", "SMOOTH", "GRAB", "INFLATE", "CLAY_STRIPS", "CREASE", "SNAKE_HOOK"],
    )
    sculpt_stroke.add_argument("--radius", type=int, default=60)
    sculpt_stroke.add_argument("--strength", type=float, default=0.25)
    sculpt_stroke.add_argument("--pressure", type=float, default=1.0)
    sculpt_stroke.add_argument("--mode", choices=["NORMAL", "INVERT", "SMOOTH", "ERASE", "MASK"], default="NORMAL")
    sculpt_stroke.add_argument("--coordinate-space", choices=["NORMALIZED", "REGION"], default="NORMALIZED")
    sculpt_stroke.add_argument("--label", default="stroke")
    sculpt_stroke.add_argument("--no-checkpoint", action="store_true")
    sculpt_stroke.add_argument("--no-capture-before", action="store_true")
    sculpt_stroke.add_argument("--before-name")
    sculpt_stroke.set_defaults(handler=lambda a: call("sculpt.stroke", {
        "points": a.points_json if a.points_json is not None else a.points,
        "brush": a.brush,
        "radius": a.radius,
        "strength": a.strength,
        "pressure": a.pressure,
        "mode": a.mode,
        "coordinate_space": a.coordinate_space,
        "label": a.label,
        "checkpoint": not a.no_checkpoint,
        "capture_before": not a.no_capture_before,
        "before_name": a.before_name,
    }))

    sculpt_finish = sub.add_parser("sculpt-finish", help="sai de Sculpt e restaura workspace anterior")
    sculpt_finish.add_argument("--keep-workspace", action="store_true")
    sculpt_finish.set_defaults(handler=lambda a: call("sculpt.finish", {
        "restore_workspace": not a.keep_workspace,
    }))

    window = sub.add_parser("ui-window", help="retorna tamanho da janela Blender")
    window.set_defaults(handler=lambda _a: call("ui.window"))

    dismiss = sub.add_parser("ui-dismiss", help="fecha splash/modal inicial com ESC")
    dismiss.set_defaults(handler=lambda _a: call("ui.dismiss_modal"))

    view3d = sub.add_parser("ui-view3d", help="retorna bounds da maior VIEW_3D")
    view3d.set_defaults(handler=lambda _a: call("ui.view3d"))

    orbit = sub.add_parser("ui-orbit", help="orbita a maior VIEW_3D com middle mouse")
    orbit.add_argument("--dx", type=int, default=120)
    orbit.add_argument("--dy", type=int, default=60)
    orbit.add_argument("--steps", type=int, default=18)
    orbit.set_defaults(handler=lambda a: call("ui.orbit", {"dx": a.dx, "dy": a.dy, "steps": a.steps}))

    click = sub.add_parser("ui-click", help="simula clique dentro da janela Blender")
    click.add_argument("x", type=int)
    click.add_argument("y", type=int)
    click.add_argument("--button", choices=["left", "middle", "right"], default="left")
    click.add_argument("--shift", action="store_true")
    click.add_argument("--ctrl", action="store_true")
    click.add_argument("--alt", action="store_true")
    click.set_defaults(handler=lambda a: call("ui.click", {
        "x": a.x,
        "y": a.y,
        "button": a.button,
        "shift": a.shift,
        "ctrl": a.ctrl,
        "alt": a.alt,
    }))

    drag = sub.add_parser("ui-drag", help="simula arrasto dentro da janela Blender")
    drag.add_argument("x1", type=int)
    drag.add_argument("y1", type=int)
    drag.add_argument("x2", type=int)
    drag.add_argument("y2", type=int)
    drag.add_argument("--button", choices=["left", "middle", "right"], default="left")
    drag.add_argument("--steps", type=int, default=18)
    drag.add_argument("--shift", action="store_true")
    drag.add_argument("--ctrl", action="store_true")
    drag.add_argument("--alt", action="store_true")
    drag.set_defaults(handler=lambda a: call("ui.drag", {
        "x1": a.x1,
        "y1": a.y1,
        "x2": a.x2,
        "y2": a.y2,
        "button": a.button,
        "steps": a.steps,
        "shift": a.shift,
        "ctrl": a.ctrl,
        "alt": a.alt,
    }))

    wheel = sub.add_parser("ui-wheel", help="simula scroll dentro do Blender")
    wheel.add_argument("steps", type=int, help="positivo sobe/aproxima; negativo desce/afasta")
    wheel.add_argument("--x", type=int)
    wheel.add_argument("--y", type=int)
    wheel.set_defaults(handler=lambda a: call("ui.wheel", {"steps": a.steps, "x": a.x, "y": a.y}))

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        result = args.handler(args)
        print(_json_text(result))
        return 0
    except Exception as exc:
        print(_json_text({"ok": False, "error": str(exc)}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
