from __future__ import annotations

import hashlib
import json
import os
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from .protocol import runtime_root, sanitize_label

_HISTORY_LOCK = threading.RLock()
_REDACT_KEYS = {
    "token",
    "password",
    "passwd",
    "secret",
    "authorization",
    "api_key",
    "apikey",
    "cookie",
    "set-cookie",
}


def _env_int(name: str, default: int, minimum: int, maximum: int) -> int:
    try:
        value = int(os.environ.get(name, str(default)))
    except ValueError:
        value = default
    return max(minimum, min(maximum, value))


SEGMENT_MAX_BYTES = _env_int("CC_BLENDER_HISTORY_SEGMENT_BYTES", 524_288, 65_536, 16_777_216)
SEGMENT_MAX_EVENTS = _env_int("CC_BLENDER_HISTORY_SEGMENT_EVENTS", 250, 25, 5_000)
MAX_SEGMENTS_PER_STAGE = _env_int("CC_BLENDER_HISTORY_MAX_SEGMENTS", 40, 2, 500)
MAX_ATTACHMENTS_PER_STAGE = _env_int("CC_BLENDER_HISTORY_MAX_ATTACHMENTS", 120, 10, 5_000)
MAX_ATTACHMENT_BYTES_PER_STAGE = _env_int(
    "CC_BLENDER_HISTORY_MAX_ATTACHMENT_BYTES",
    268_435_456,
    10_485_760,
    10_737_418_240,
)
MAX_SEARCH_EVENTS = _env_int("CC_BLENDER_HISTORY_MAX_SEARCH_EVENTS", 20_000, 100, 500_000)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def history_root() -> Path:
    root = runtime_root() / "history"
    root.mkdir(parents=True, exist_ok=True)
    return root.resolve()


def _active_path() -> Path:
    return history_root() / "active-stage.json"


def _stage_dir(stage_id: str) -> Path:
    clean = sanitize_label(stage_id, "stage")
    target = (history_root() / clean).resolve()
    target.relative_to(history_root())
    return target


def _metadata_path(stage_id: str) -> Path:
    return _stage_dir(stage_id) / "metadata.json"


def _atomic_json_write(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    temp.replace(path)


def _read_json(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise RuntimeError(f"JSON invalido em {path}")
    return data


def get_active_stage_id() -> str | None:
    path = _active_path()
    if not path.exists():
        return None
    try:
        data = _read_json(path)
    except Exception:
        return None
    stage_id = data.get("stage_id")
    if not isinstance(stage_id, str) or not stage_id:
        return None
    if not _metadata_path(stage_id).exists():
        return None
    return stage_id


def set_active_stage(stage_id: str) -> dict[str, Any]:
    with _HISTORY_LOCK:
        previous_id = get_active_stage_id()
        metadata = get_stage_metadata(stage_id)
        now = _now_iso()
        if previous_id and previous_id != metadata["stage_id"]:
            previous = get_stage_metadata(previous_id)
            if previous.get("status") == "active":
                previous["status"] = "completed"
                previous["updated_at"] = now
                _atomic_json_write(_metadata_path(previous_id), previous)
        metadata["status"] = "active"
        metadata["updated_at"] = now
        _atomic_json_write(_metadata_path(str(metadata["stage_id"])), metadata)
        _atomic_json_write(_active_path(), {"stage_id": metadata["stage_id"], "updated_at": now})
        return metadata


def _unique_stage_id(label: str) -> str:
    prefix = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    base = sanitize_label(label, "stage")
    candidate = f"{prefix}-{base}"[:100]
    index = 2
    while _stage_dir(candidate).exists():
        suffix = f"-{index}"
        candidate = f"{prefix}-{base}"[: 100 - len(suffix)] + suffix
        index += 1
    return candidate


def create_stage(
    label: str,
    *,
    stage_id: str | None = None,
    previous_stage_id: str | None = None,
    activate: bool = True,
    tags: Iterable[str] | None = None,
) -> dict[str, Any]:
    with _HISTORY_LOCK:
        previous = previous_stage_id if previous_stage_id is not None else get_active_stage_id()
        if previous:
            get_stage_metadata(previous)

        clean_id = sanitize_label(stage_id, "stage") if stage_id else _unique_stage_id(label)
        folder = _stage_dir(clean_id)
        if folder.exists():
            raise ValueError(f"stage ja existe: {clean_id}")

        (folder / "events").mkdir(parents=True, exist_ok=False)
        (folder / "attachments").mkdir(parents=True, exist_ok=False)
        now = _now_iso()
        metadata = {
            "version": 1,
            "stage_id": clean_id,
            "label": str(label).strip()[:200] or clean_id,
            "created_at": now,
            "updated_at": now,
            "status": "active" if activate else "open",
            "previous_stage_id": previous,
            "tags": sorted({sanitize_label(tag, "tag") for tag in (tags or []) if str(tag).strip()}),
            "history": {
                "current_segment": 1,
                "current_segment_events": 0,
                "total_events": 0,
                "pruned_segments": 0,
                "pruned_attachments": 0,
            },
        }
        _atomic_json_write(folder / "metadata.json", metadata)

        if activate:
            if previous and previous != clean_id:
                previous_meta = get_stage_metadata(previous)
                if previous_meta.get("status") == "active":
                    previous_meta["status"] = "completed"
                    previous_meta["updated_at"] = now
                    _atomic_json_write(_metadata_path(previous), previous_meta)
            _atomic_json_write(_active_path(), {"stage_id": clean_id, "updated_at": now})

        return metadata


def ensure_stage() -> dict[str, Any]:
    active = get_active_stage_id()
    if active:
        return get_stage_metadata(active)
    return create_stage("session-bootstrap", tags=["automatic", "bootstrap"])


def get_stage_metadata(stage_id: str | None = None) -> dict[str, Any]:
    resolved = stage_id or get_active_stage_id()
    if not resolved:
        raise ValueError("nenhum stage ativo")
    path = _metadata_path(resolved)
    if not path.exists():
        raise ValueError(f"stage nao encontrado: {resolved}")
    return _read_json(path)


def list_stages(limit: int = 100) -> list[dict[str, Any]]:
    active = get_active_stage_id()
    rows: list[dict[str, Any]] = []
    for path in history_root().glob("*/metadata.json"):
        try:
            metadata = _read_json(path)
        except Exception:
            continue
        rows.append({
            "stage_id": metadata.get("stage_id"),
            "label": metadata.get("label"),
            "created_at": metadata.get("created_at"),
            "updated_at": metadata.get("updated_at"),
            "status": metadata.get("status"),
            "previous_stage_id": metadata.get("previous_stage_id"),
            "tags": metadata.get("tags", []),
            "total_events": metadata.get("history", {}).get("total_events", 0),
            "active": metadata.get("stage_id") == active,
        })
    rows.sort(key=lambda item: str(item.get("created_at") or ""), reverse=True)
    return rows[: max(1, min(1_000, int(limit)))]


def _bounded(value: Any, depth: int = 0) -> Any:
    if depth > 6:
        return "<max-depth>"
    if isinstance(value, dict):
        result: dict[str, Any] = {}
        items = list(value.items())
        for key, item in items[:100]:
            key_text = str(key)
            if key_text.casefold() in _REDACT_KEYS:
                result[key_text] = "<redacted>"
            else:
                result[key_text] = _bounded(item, depth + 1)
        if len(items) > 100:
            result["__truncated_keys__"] = len(items) - 100
        return result
    if isinstance(value, (list, tuple)):
        items = list(value)
        head = [_bounded(item, depth + 1) for item in items[:100]]
        if len(items) > 100:
            head.append({"__truncated_items__": len(items) - 100})
        return head
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, str):
        return value if len(value) <= 4_000 else value[:4_000] + f"...<truncated:{len(value)-4000}>"
    if value is None or isinstance(value, (bool, int, float)):
        return value
    return str(value)[:4_000]


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while True:
            chunk = handle.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def _extract_attachments(value: Any) -> list[dict[str, Any]]:
    found: dict[str, dict[str, Any]] = {}

    def visit(item: Any) -> None:
        if isinstance(item, dict):
            for child in item.values():
                visit(child)
        elif isinstance(item, (list, tuple)):
            for child in item:
                visit(child)
        elif isinstance(item, str):
            try:
                path = Path(item)
                if not path.is_absolute() or not path.exists() or not path.is_file():
                    return
                resolved = path.resolve()
                resolved.relative_to(runtime_root())
            except (OSError, ValueError):
                return
            key = str(resolved)
            if key in found:
                return
            stat = resolved.stat()
            found[key] = {
                "path": key,
                "relative_path": str(resolved.relative_to(runtime_root())),
                "size": stat.st_size,
                "sha256": _sha256(resolved),
            }

    visit(value)
    return list(found.values())


def _segment_path(stage_id: str, segment_number: int) -> Path:
    return _stage_dir(stage_id) / "events" / f"events-{segment_number:04d}.jsonl"


def _prune_segments(metadata: dict[str, Any]) -> None:
    stage_id = str(metadata["stage_id"])
    event_dir = _stage_dir(stage_id) / "events"
    segments = sorted(event_dir.glob("events-*.jsonl"))
    while len(segments) > MAX_SEGMENTS_PER_STAGE:
        victim = segments.pop(0)
        victim.unlink(missing_ok=True)
        metadata["history"]["pruned_segments"] = int(metadata["history"].get("pruned_segments", 0)) + 1


def _prune_attachments(stage_id: str, metadata: dict[str, Any]) -> None:
    folder = _stage_dir(stage_id) / "attachments"
    files = sorted(
        [path for path in folder.iterdir() if path.is_file()],
        key=lambda path: path.stat().st_mtime,
    )
    total = sum(path.stat().st_size for path in files)
    while files and (len(files) > MAX_ATTACHMENTS_PER_STAGE or total > MAX_ATTACHMENT_BYTES_PER_STAGE):
        victim = files.pop(0)
        try:
            size = victim.stat().st_size
        except OSError:
            size = 0
        victim.unlink(missing_ok=True)
        total = max(0, total - size)
        metadata["history"]["pruned_attachments"] = int(metadata["history"].get("pruned_attachments", 0)) + 1


def attachment_output_path(filename: str, *, stage_id: str | None = None) -> Path:
    metadata = get_stage_metadata(stage_id) if stage_id else ensure_stage()
    clean = sanitize_filename(filename, "attachment")
    folder = _stage_dir(str(metadata["stage_id"])) / "attachments"
    folder.mkdir(parents=True, exist_ok=True)
    candidate = folder / clean
    if not candidate.exists():
        return candidate
    stem, suffix = candidate.stem, candidate.suffix
    index = 2
    while True:
        alt = folder / f"{stem}-{index}{suffix}"
        if not alt.exists():
            return alt
        index += 1


def record_event(
    *,
    action: str,
    params: dict[str, Any] | None = None,
    result: Any = None,
    ok: bool,
    error: str | None = None,
    request_id: str | None = None,
    tags: Iterable[str] | None = None,
    stage_id: str | None = None,
) -> dict[str, Any]:
    with _HISTORY_LOCK:
        metadata = get_stage_metadata(stage_id) if stage_id else ensure_stage()
        resolved_stage = str(metadata["stage_id"])
        history = metadata["history"]
        segment_number = int(history.get("current_segment", 1))
        segment_events = int(history.get("current_segment_events", 0))

        safe_params = _bounded(params or {})
        safe_result = _bounded(result)
        attachments = _extract_attachments(result)
        event = {
            "event_id": f"evt-{time.time_ns()}",
            "timestamp": _now_iso(),
            "stage_id": resolved_stage,
            "request_id": request_id,
            "action": str(action)[:200],
            "ok": bool(ok),
            "tags": sorted({sanitize_label(tag, "tag") for tag in (tags or []) if str(tag).strip()}),
            "params": safe_params,
            "result": safe_result if ok else None,
            "error": None if ok else _bounded(error or "unknown error"),
            "attachments": attachments,
        }
        raw = json.dumps(event, ensure_ascii=False, separators=(",", ":")) + "\n"
        segment = _segment_path(resolved_stage, segment_number)
        current_bytes = segment.stat().st_size if segment.exists() else 0
        if segment_events >= SEGMENT_MAX_EVENTS or current_bytes + len(raw.encode("utf-8")) > SEGMENT_MAX_BYTES:
            segment_number += 1
            segment_events = 0
            segment = _segment_path(resolved_stage, segment_number)

        segment.parent.mkdir(parents=True, exist_ok=True)
        with segment.open("a", encoding="utf-8", newline="\n") as handle:
            handle.write(raw)

        history["current_segment"] = segment_number
        history["current_segment_events"] = segment_events + 1
        history["total_events"] = int(history.get("total_events", 0)) + 1
        metadata["updated_at"] = event["timestamp"]
        _prune_segments(metadata)
        _prune_attachments(resolved_stage, metadata)
        _atomic_json_write(_metadata_path(resolved_stage), metadata)
        return event


def record_note(text: str, *, tags: Iterable[str] | None = None, stage_id: str | None = None) -> dict[str, Any]:
    return record_event(
        action="history.note",
        params={"text": str(text)[:20_000]},
        result={"recorded": True},
        ok=True,
        tags=tags,
        stage_id=stage_id,
    )


def _iter_events(stage_id: str) -> Iterable[dict[str, Any]]:
    folder = _stage_dir(stage_id) / "events"
    for path in sorted(folder.glob("events-*.jsonl"), reverse=True):
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except OSError:
            continue
        for line in reversed(lines):
            if not line.strip():
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(event, dict):
                yield event


def _next_stage_ids(stage_id: str) -> list[str]:
    next_ids = []
    for item in list_stages(limit=1_000):
        if item.get("previous_stage_id") == stage_id:
            next_ids.append(str(item["stage_id"]))
    return next_ids


def describe_stage(stage_id: str | None = None, *, recent: int = 20) -> dict[str, Any]:
    metadata = get_stage_metadata(stage_id)
    resolved = str(metadata["stage_id"])
    recent_events = []
    for event in _iter_events(resolved):
        recent_events.append(event)
        if len(recent_events) >= max(0, min(200, int(recent))):
            break
    attachments_dir = _stage_dir(resolved) / "attachments"
    attachments = sorted(
        [path for path in attachments_dir.iterdir() if path.is_file()],
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )
    attachment_files = [
        {
            "name": path.name,
            "path": str(path),
            "size": path.stat().st_size,
        }
        for path in attachments[:100]
    ]
    previous_id = metadata.get("previous_stage_id")
    previous = None
    if previous_id:
        try:
            previous_meta = get_stage_metadata(str(previous_id))
            previous = {
                "stage_id": previous_meta.get("stage_id"),
                "label": previous_meta.get("label"),
                "status": previous_meta.get("status"),
                "updated_at": previous_meta.get("updated_at"),
            }
        except Exception:
            previous = {"stage_id": previous_id, "missing": True}
    return {
        "metadata": metadata,
        "previous_stage": previous,
        "next_stage_ids": _next_stage_ids(resolved),
        "recent_events": recent_events,
        "attachments": {
            "count": len(attachments),
            "bytes": sum(path.stat().st_size for path in attachments),
            "files": attachment_files,
            "truncated": len(attachments) > len(attachment_files),
        },
        "retention": {
            "segment_max_bytes": SEGMENT_MAX_BYTES,
            "segment_max_events": SEGMENT_MAX_EVENTS,
            "max_segments_per_stage": MAX_SEGMENTS_PER_STAGE,
            "max_attachments_per_stage": MAX_ATTACHMENTS_PER_STAGE,
            "max_attachment_bytes_per_stage": MAX_ATTACHMENT_BYTES_PER_STAGE,
        },
    }


def search_events(
    *,
    query: str | None = None,
    stage_id: str | None = None,
    action: str | None = None,
    since: str | None = None,
    until: str | None = None,
    success: bool | None = None,
    has_attachment: bool | None = None,
    tags: Iterable[str] | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    wanted_tags = {sanitize_label(tag, "tag") for tag in (tags or []) if str(tag).strip()}
    stage_ids = [stage_id] if stage_id else [str(row["stage_id"]) for row in list_stages(limit=1_000)]
    needles = [part for part in query.casefold().split() if part] if query else []
    matches: list[dict[str, Any]] = []
    scanned = 0

    for current_stage in stage_ids:
        if not current_stage:
            continue
        try:
            iterator = _iter_events(current_stage)
        except Exception:
            continue
        for event in iterator:
            scanned += 1
            if scanned > MAX_SEARCH_EVENTS:
                return {
                    "matches": matches,
                    "scanned": scanned - 1,
                    "truncated": True,
                    "limit": limit,
                }
            if action and not str(event.get("action", "")).startswith(action):
                continue
            timestamp = str(event.get("timestamp") or "")
            if since and timestamp < since:
                continue
            if until and timestamp > until:
                continue
            if success is not None and bool(event.get("ok")) != success:
                continue
            attachments = event.get("attachments") or []
            if has_attachment is not None and bool(attachments) != has_attachment:
                continue
            event_tags = set(event.get("tags") or [])
            if wanted_tags and not wanted_tags.issubset(event_tags):
                continue
            if needles:
                haystack = json.dumps(event, ensure_ascii=False, sort_keys=True).casefold()
                if not all(needle in haystack for needle in needles):
                    continue
            matches.append(event)
            if len(matches) >= max(1, min(500, int(limit))):
                return {
                    "matches": matches,
                    "scanned": scanned,
                    "truncated": False,
                    "limit": limit,
                }

    return {
        "matches": matches,
        "scanned": scanned,
        "truncated": False,
        "limit": limit,
    }
