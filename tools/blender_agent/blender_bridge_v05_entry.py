from __future__ import annotations

import sys
from pathlib import Path


# Blender's embedded Python does not guarantee that the process working
# directory is present in sys.path when a script is launched through --python.
# Bootstrap the repository root from this file before importing the package.
_REPO_ROOT = Path(__file__).resolve().parents[2]
_REPO_ROOT_TEXT = str(_REPO_ROOT)
if _REPO_ROOT_TEXT not in sys.path:
    sys.path.insert(0, _REPO_ROOT_TEXT)


# Production entrypoint for V0.5. Importing the core currently starts the
# legacy server as a side effect, so this entrypoint must patch both module
# globals and the already-created TCPServer instance before accepting the
# V0.5 runtime contract as ready.
from tools.blender_agent import blender_bridge as core
from tools.blender_agent import blender_bridge_v05 as v05
from tools.blender_agent import runtime_compat


_RUNTIME_PROFILE = "v05-runtime-compat-20261005.2"
_CORE_RECORD_TASK_HISTORY = core._record_task_history


def _record_task_history_once(
    task,
    *,
    ok: bool,
    result=None,
    error: str | None = None,
) -> None:
    action = str(task.request.get("action") or "")
    # V0.5 actions already write richer events with session/iteration/proposal
    # metadata in blender_bridge_v05.py. Avoid duplicating every event through
    # the generic bridge logger and inflating segmented history.
    if action.startswith("iteration."):
        return
    _CORE_RECORD_TASK_HISTORY(task, ok=ok, result=result, error=error)


class HandlerV05(core.socketserver.StreamRequestHandler):
    def handle(self) -> None:
        try:
            raw = self.rfile.readline(core.MAX_JSON_BYTES + 1)
            if len(raw) > core.MAX_JSON_BYTES:
                raise ValueError("request excede limite")
            request = core.decode_message(raw.rstrip(b"\r\n"))
            if not core.hmac.compare_digest(request.get("token") or "", core._TOKEN):
                raise PermissionError("token de sessao invalido")

            action = str(request.get("action") or "")
            if action == "recipe.status":
                response = {
                    "id": request["id"],
                    "ok": True,
                    "result": core._recipe_status_snapshot(),
                }
            elif action == "iteration.status":
                # Status is in-memory only and can be observed without waiting
                # behind a viewport capture/checkpoint on Blender's main thread.
                response = {
                    "id": request["id"],
                    "ok": True,
                    "result": v05._iteration_status(),
                }
            else:
                task = core.Task(request=request)
                core._TASKS.put(task)
                if action == "recipe.run":
                    wait_timeout = 120
                elif action.startswith("iteration."):
                    wait_timeout = 90
                else:
                    wait_timeout = 30
                if not task.done.wait(timeout=wait_timeout):
                    raise TimeoutError("Blender nao processou a action no prazo")
                response = task.response or {"ok": False, "error": "resposta vazia"}

            if action == "health" and response.get("ok") and isinstance(response.get("result"), dict):
                response["result"]["runtime_profile"] = _RUNTIME_PROFILE
        except Exception as exc:
            response = {"ok": False, "error": f"{type(exc).__name__}: {exc}"}

        self.wfile.write(core.encode_message(response))


# Apply all runtime patches only after the V0.5 handler exists. The core module
# starts its server while being imported, therefore changing core.Handler alone
# is insufficient: update the live server's RequestHandlerClass as well.
core._record_task_history = _record_task_history_once
core.Handler = HandlerV05
runtime_compat.install(core, v05)
if core._SERVER is not None:
    core._SERVER.RequestHandlerClass = HandlerV05


if __name__ == "__main__":
    core.start_bridge()
