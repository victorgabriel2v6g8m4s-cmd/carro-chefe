from __future__ import annotations

import hashlib
import os
import re
import time
from pathlib import Path
from typing import Any

from . import history, protocol

RUNTIME_PROFILE = "v05-runtime-compat-20261005.3"
DEFAULT_COMPAT_PATH_LIMIT = 240
_MIN_FILENAME_BUDGET = 24
_SAFE_FILENAME_RE = re.compile(r"[^A-Za-z0-9._-]+")


def windows_path_units(value: str | Path) -> int:
    """Return Windows UTF-16 code units used by a path string."""
    return len(str(value).encode("utf-16-le")) // 2


def _compat_path_limit() -> int:
    raw = os.environ.get("CC_BLENDER_MAX_PATH", str(DEFAULT_COMPAT_PATH_LIMIT))
    try:
        value = int(raw)
    except ValueError as exc:
        raise protocol.SecurityError("CC_BLENDER_MAX_PATH deve ser inteiro") from exc
    return max(120, min(32767, value))


def _clean_filename_unbounded(value: str, fallback: str) -> str:
    raw = str(value or "").strip()
    clean = _SAFE_FILENAME_RE.sub("-", raw).strip("._-")
    if clean:
        return clean
    fallback_clean = _SAFE_FILENAME_RE.sub("-", str(fallback or "item")).strip("._-")
    return fallback_clean or "item"


def filename_for_parent(
    parent: Path,
    filename: str,
    fallback: str = "item",
    *,
    max_filename_length: int = 240,
    max_path_length: int | None = None,
) -> str:
    """Sanitize a filename while budgeting the complete Windows path.

    Any shortened name receives a deterministic hash suffix before the
    extension. This preserves uniqueness and the extension while keeping
    legacy Windows APIs below the configured compatibility limit.
    """
    parent = parent.expanduser().resolve()
    raw = str(filename or "").strip()
    clean = _clean_filename_unbounded(raw, fallback)
    limit = int(max_path_length) if max_path_length is not None else _compat_path_limit()
    limit = max(120, min(32767, limit))
    available = limit - windows_path_units(parent) - 1
    if available < _MIN_FILENAME_BUDGET:
        raise protocol.SecurityError(
            "caminho-base do runtime longo demais para artefatos compativeis com Windows; "
            "configure CC_BLENDER_RUNTIME para um caminho mais curto"
        )

    allowed = min(max(16, int(max_filename_length)), 240, available)
    if len(clean) <= allowed and windows_path_units(parent / clean) <= limit:
        return clean

    suffix = Path(clean).suffix
    if suffix and not re.fullmatch(r"\.[A-Za-z0-9]{1,16}", suffix):
        suffix = ""
    stem = clean[:-len(suffix)] if suffix else clean
    digest = hashlib.sha256((raw or clean).encode("utf-8")).hexdigest()[:10]
    token = f"-{digest}"
    stem_budget = allowed - len(token) - len(suffix)
    if stem_budget < 1:
        raise protocol.SecurityError(
            "orcamento de caminho insuficiente para preservar nome unico e extensao"
        )
    stem = stem[:stem_budget].rstrip("._-") or "item"
    result = f"{stem}{token}{suffix}"
    if windows_path_units(parent / result) > limit:
        raise protocol.SecurityError("nao foi possivel reduzir artefato ao limite de caminho")
    return result


def safe_runtime_path(category: str, filename: str) -> Path:
    if not category or "/" in category or "\\" in category or category in {".", ".."}:
        raise protocol.SecurityError("categoria de runtime invalida")
    base = (protocol.runtime_root() / category).resolve()
    base.mkdir(parents=True, exist_ok=True)
    clean = filename_for_parent(base, filename)
    candidate = (base / clean).resolve()
    try:
        candidate.relative_to(base)
    except ValueError as exc:
        raise protocol.SecurityError("caminho fora do runtime permitido") from exc
    return candidate


def attachment_output_path(filename: str, *, stage_id: str | None = None) -> Path:
    metadata = history.get_stage_metadata(stage_id) if stage_id else history.ensure_stage()
    folder = history._stage_dir(str(metadata["stage_id"])) / "attachments"
    folder.mkdir(parents=True, exist_ok=True)
    clean = filename_for_parent(folder, filename, "attachment")
    candidate = folder / clean
    if not candidate.exists():
        return candidate

    for index in range(2, 10000):
        logical = f"{candidate.stem}-{index}{candidate.suffix}"
        alt_name = filename_for_parent(folder, logical, "attachment")
        alternative = folder / alt_name
        if not alternative.exists():
            return alternative
    raise RuntimeError("nao foi possivel gerar nome unico para anexo")


def _make_sculpt_prepare_runner(core):
    def _advance_sculpt_prepare_job() -> float:
        job = core._SCULPT_PREPARE_JOB
        if job is None:
            return 0.05

        window = core.bpy.context.window
        if window is None:
            error = "RuntimeError: janela Blender desapareceu durante sculpt.prepare"
            job.task.response = {"id": job.task.request["id"], "ok": False, "error": error}
            core._record_task_history(job.task, ok=False, error=error)
            job.task.done.set()
            core._SCULPT_PREPARE_JOB = None
            return 0.05

        try:
            if job.phase == "switch":
                target = core.bpy.data.workspaces.get(job.requested_workspace_name)
                if target is None:
                    raise RuntimeError(f"workspace Sculpt desapareceu: {job.requested_workspace_name}")
                window.workspace = target
                core._redraw_window()
                job.phase = "settle"
                job.settle_remaining = core._WORKSPACE_CAPTURE_SETTLE_TICKS
                job.last_screen_name = window.screen.name
                return 0.05

            if job.phase == "settle":
                if window.workspace.name != job.requested_workspace_name:
                    target = core.bpy.data.workspaces.get(job.requested_workspace_name)
                    if target is None:
                        raise RuntimeError(f"workspace Sculpt desapareceu: {job.requested_workspace_name}")
                    window.workspace = target
                    core._redraw_window()
                    job.settle_remaining = core._WORKSPACE_CAPTURE_SETTLE_TICKS
                    job.last_screen_name = window.screen.name
                    return 0.05

                current_screen = window.screen.name
                if current_screen != job.last_screen_name:
                    job.last_screen_name = current_screen
                    job.settle_remaining = core._WORKSPACE_CAPTURE_SETTLE_TICKS
                    core._redraw_window()
                    return 0.05
                if job.settle_remaining > 0:
                    job.settle_remaining -= 1
                    core._redraw_window()
                    return 0.05
                job.phase = "prepare"
                return 0.05

            if job.phase == "prepare":
                result = core._sculpt_prepare_active(
                    job.params,
                    original_workspace_name=job.original_workspace_name,
                )
                job.task.response = {"id": job.task.request["id"], "ok": True, "result": result}
                core._record_task_history(job.task, ok=True, result=result)
                job.task.done.set()
                core._SCULPT_PREPARE_JOB = None
                return 0.05

            if job.phase == "restore_error":
                if window.workspace.name != job.original_workspace_name:
                    original = core.bpy.data.workspaces.get(job.original_workspace_name)
                    if original is not None:
                        window.workspace = original
                        core._redraw_window()
                        job.settle_remaining = core._WORKSPACE_CAPTURE_SETTLE_TICKS
                        job.last_screen_name = window.screen.name
                        return 0.05

                current_screen = window.screen.name
                if current_screen != job.last_screen_name:
                    job.last_screen_name = current_screen
                    job.settle_remaining = core._WORKSPACE_CAPTURE_SETTLE_TICKS
                    core._redraw_window()
                    return 0.05
                if job.settle_remaining > 0:
                    job.settle_remaining -= 1
                    core._redraw_window()
                    return 0.05

                error = job.error or "RuntimeError: sculpt.prepare falhou"
                job.task.response = {"id": job.task.request["id"], "ok": False, "error": error}
                core._record_task_history(job.task, ok=False, error=error)
                job.task.done.set()
                core._SCULPT_PREPARE_JOB = None
                return 0.05

            raise RuntimeError(f"fase de sculpt.prepare invalida: {job.phase}")
        except Exception as exc:
            job.error = f"{type(exc).__name__}: {exc}"
            core._sculpt_prepare_cleanup(job)
            job.phase = "restore_error"
            job.settle_remaining = core._WORKSPACE_CAPTURE_SETTLE_TICKS
            job.last_screen_name = window.screen.name
            return 0.05

    return _advance_sculpt_prepare_job


def _make_sculpt_checkpoint(core):
    def _sculpt_checkpoint(label: str) -> Path:
        stage = core.get_active_stage_id() or "stage"
        filename = f"{stage}-{label}-{time.time_ns()}.blend"
        output = safe_runtime_path("checkpoints", filename)
        core.bpy.ops.wm.save_as_mainfile(filepath=str(output), copy=True)
        return output

    return _sculpt_checkpoint


def _schedule_quit(core: Any, params: dict[str, Any]) -> dict[str, Any]:
    """Schedule a modal-safe Blender shutdown after returning the response.

    Agent-started sessions can make the native unsaved-changes prompt awkward
    to interact with. This action never relies on that popup. The default mode
    writes a recovery checkpoint first, then disables the prompt only for the
    current process and quits a fraction of a second after the RPC response.
    """
    mode = str(params.get("mode", "checkpoint")).strip().lower()
    if mode not in {"checkpoint", "save", "discard"}:
        raise ValueError("app.quit mode deve ser checkpoint, save ou discard")

    checkpoint = None
    saved_file = None
    if mode == "checkpoint":
        stage = core.get_active_stage_id() or "stage"
        label = str(params.get("label") or "shutdown-recovery")
        filename = f"{stage}-{label}-{time.time_ns()}.blend"
        output = safe_runtime_path("checkpoints", filename)
        core.bpy.ops.wm.save_as_mainfile(filepath=str(output), copy=True)
        checkpoint = str(output)
    elif mode == "save":
        current = str(core.bpy.data.filepath or "").strip()
        if not current:
            raise RuntimeError(
                "arquivo atual ainda nao possui caminho; use mode=checkpoint ou salve manualmente antes"
            )
        result = core.bpy.ops.wm.save_mainfile(
            filepath=current,
            check_existing=False,
            show_save_modified_images_dialog=False,
        )
        if not result or "FINISHED" not in result:
            raise RuntimeError(f"nao foi possivel salvar o .blend atual: {sorted(result or [])}")
        saved_file = current

    def _quit_timer():
        try:
            core.bpy.context.preferences.view.use_save_prompt = False
        except Exception:
            pass
        try:
            core.bpy.ops.wm.quit_blender()
        except Exception as exc:
            print(f"[Carro Chefe Blender Agent] app.quit falhou: {type(exc).__name__}: {exc}")
        return None

    core.bpy.app.timers.register(_quit_timer, first_interval=0.35)
    return {
        "scheduled": True,
        "mode": mode,
        "checkpoint": checkpoint,
        "saved_file": saved_file,
        "delay_seconds": 0.35,
    }


def _install_lifecycle_dispatch(core: Any) -> None:
    previous_dispatch = core._dispatch

    def _dispatch_with_lifecycle(action: str, params: dict[str, Any]):
        if action == "app.quit":
            return _schedule_quit(core, params)
        return previous_dispatch(action, params)

    protocol.ALLOWED_ACTIONS.add("app.quit")
    core._dispatch = _dispatch_with_lifecycle


def install(core: Any, v05: Any) -> None:
    """Install compatibility guards into the canonical V0.5 runtime."""
    protocol.safe_runtime_path = safe_runtime_path
    history.attachment_output_path = attachment_output_path

    # Core functions resolve these names from their module globals at runtime.
    core.safe_runtime_path = safe_runtime_path
    core.attachment_output_path = attachment_output_path
    core._advance_sculpt_prepare_job = _make_sculpt_prepare_runner(core)
    core._sculpt_checkpoint = _make_sculpt_checkpoint(core)

    # V0.5 imported attachment_output_path by value, so update that module too.
    v05.attachment_output_path = attachment_output_path
    _install_lifecycle_dispatch(core)
