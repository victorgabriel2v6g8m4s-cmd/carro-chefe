from __future__ import annotations

import re
from collections.abc import Callable

from .coordinates import AxisTransform, RangeMoveTransform
from .errors import RecipeError
from .util import make_cell_ref, parse_cell_ref, parse_range_ref

Transform = AxisTransform | RangeMoveTransform

_A1 = re.compile(
    r"(?<![\w.\]])"
    r"(?P<prefix>(?:(?P<sheet>'(?:[^']|'')+'|[\w.]+)!)?)"
    r"(?P<start>\$?[A-Z]{1,3}\$?[1-9][0-9]*)"
    r"(?::(?P<end>\$?[A-Z]{1,3}\$?[1-9][0-9]*))?"
    r"(?![\w.\[])",
    re.IGNORECASE | re.UNICODE,
)
_UNSAFE_DYNAMIC = re.compile(r"\b(INDIRECT|ADDRESS)\s*\(", re.IGNORECASE)
_EXTERNAL = re.compile(r"\[[^\]]+\][^!]*!", re.IGNORECASE)


def rewrite_formula_a1(
    expression: str,
    context_sheet: str,
    transform: Transform,
) -> tuple[str, bool, list[str]]:
    blockers: list[str] = []
    changed = False

    if _UNSAFE_DYNAMIC.search(expression):
        blockers.append("fórmula usa referência dinâmica INDIRECT/ADDRESS")
    if _EXTERNAL.search(expression):
        blockers.append("fórmula contém referência externa de workbook")

    def rewrite_segment(segment: str) -> str:
        nonlocal changed

        def repl(match: re.Match[str]) -> str:
            nonlocal changed
            raw_sheet = match.group("sheet")
            reference_sheet = _sheet_name(raw_sheet) if raw_sheet else context_sheet
            if reference_sheet.casefold() != transform.sheet.casefold():
                return match.group(0)
            start = _strip_dollars(match.group("start"))
            end_raw = match.group("end")
            ref = start if end_raw is None else f"{start}:{_strip_dollars(end_raw)}"
            try:
                if end_raw is None:
                    new_ref = transform.transform_cell_ref(start)
                    if new_ref is None:
                        blockers.append(f"referência {match.group(0)!r} aponta para célula removida")
                        return match.group(0)
                    relation = "shifted" if new_ref != start else "unaffected"
                else:
                    result = transform.transform_range(ref)
                    new_ref = result.ref
                    relation = result.relation
                    if result.relation == "partial":
                        blockers.append(f"range {match.group(0)!r} cruza parcialmente a transformação")
                        return match.group(0)
                    if new_ref is None:
                        blockers.append(f"range {match.group(0)!r} foi totalmente removido")
                        return match.group(0)
            except RecipeError as exc:
                blockers.append(str(exc))
                return match.group(0)
            if relation == "unaffected" or new_ref == ref:
                return match.group(0)
            changed = True
            prefix = match.group("prefix") or ""
            if end_raw is None:
                return prefix + _restore_cell_dollars(match.group("start"), new_ref)
            new_start, new_end = new_ref.split(":")
            return (
                prefix
                + _restore_cell_dollars(match.group("start"), new_start)
                + ":"
                + _restore_cell_dollars(end_raw, new_end)
            )

        return _A1.sub(repl, segment)

    rewritten = _map_double_quoted(expression, rewrite_segment)
    return rewritten, changed, sorted(set(blockers))


def rewrite_simple_ref(ref: str, transform: Transform, *, allow_partial: bool = False) -> tuple[str | None, str]:
    clean = ref.replace("$", "")
    if ":" not in clean:
        result = transform.transform_cell_ref(clean)
        return result, "removed" if result is None else ("shifted" if result != clean else "unaffected")
    change = transform.transform_range(clean)
    if change.relation == "partial" and not allow_partial:
        raise RecipeError(f"Range {ref!r} cruza parcialmente a transformação.")
    return change.ref, change.relation


def rewrite_sqref(value: str, transform: Transform, *, allow_partial: bool = False) -> tuple[str, bool]:
    refs = value.split()
    output: list[str] = []
    changed = False
    for ref in refs:
        new_ref, _ = rewrite_simple_ref(ref, transform, allow_partial=allow_partial)
        if new_ref is None:
            changed = True
            continue
        output.append(new_ref)
        changed = changed or new_ref != ref.replace("$", "")
    if not output:
        raise RecipeError(f"Transformação remove integralmente o range {value!r}.")
    return " ".join(output), changed


def ref_intersects(ref: str, other: str) -> bool:
    a = parse_range_ref(_as_range(ref))
    b = parse_range_ref(_as_range(other))
    return not (a[2] < b[0] or a[0] > b[2] or a[3] < b[1] or a[1] > b[3])


def ref_contains(outer: str, inner: str) -> bool:
    a = parse_range_ref(_as_range(outer))
    b = parse_range_ref(_as_range(inner))
    return a[0] <= b[0] and b[2] <= a[2] and a[1] <= b[1] and b[3] <= a[3]


def _as_range(ref: str) -> str:
    clean = ref.replace("$", "")
    return clean if ":" in clean else f"{clean}:{clean}"


def _strip_dollars(ref: str) -> str:
    return ref.replace("$", "").upper()


def _restore_cell_dollars(template: str, cell_ref: str) -> str:
    row, column = parse_cell_ref(cell_ref)
    letters = make_cell_ref(1, column)[:-1]
    col_absolute = template.startswith("$")
    row_absolute = "$" in template[1 if col_absolute else 0 :]
    return ("$" if col_absolute else "") + letters + ("$" if row_absolute else "") + str(row)


def _sheet_name(raw: str) -> str:
    if raw.startswith("'") and raw.endswith("'"):
        return raw[1:-1].replace("''", "'")
    return raw


def _map_double_quoted(expression: str, transform: Callable[[str], str]) -> str:
    output: list[str] = []
    buffer: list[str] = []
    quoted = False
    index = 0
    while index < len(expression):
        char = expression[index]
        if char == '"':
            if quoted and index + 1 < len(expression) and expression[index + 1] == '"':
                buffer.append('""')
                index += 2
                continue
            if buffer:
                segment = "".join(buffer)
                output.append(segment if quoted else transform(segment))
                buffer.clear()
            quoted = not quoted
            output.append(char)
            index += 1
            continue
        buffer.append(char)
        index += 1
    if buffer:
        segment = "".join(buffer)
        output.append(segment if quoted else transform(segment))
    return "".join(output)
