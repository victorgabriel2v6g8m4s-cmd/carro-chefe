from __future__ import annotations

import re
from collections.abc import Callable

_QUALIFIED_TABLE = re.compile(r"(?<![\w.])(?P<name>[\w.\\]+)(?=\s*\[)", re.UNICODE)


def rewrite_table_reference(expression: str, old: str, new: str) -> tuple[str, bool]:
    pattern = re.compile(rf"(?<![\w.']){re.escape(old)}(?![\w.'!])", re.IGNORECASE)
    changed = False

    def transform(segment: str) -> str:
        nonlocal changed
        result, count = pattern.subn(new, segment)
        changed = changed or count > 0
        return result

    return _map_unquoted(expression, transform), changed


def rewrite_column_reference(
    expression: str,
    table: str,
    old: str,
    new: str,
    *,
    local_context: bool,
) -> tuple[str, bool, bool]:
    changed = False
    ambiguous = False

    def transform(segment: str) -> str:
        nonlocal changed, ambiguous
        result, did_change, is_ambiguous = _rewrite_column_segment(
            segment, table, old, new, local_context=local_context
        )
        changed = changed or did_change
        ambiguous = ambiguous or is_ambiguous
        return result

    return _map_unquoted(expression, transform), changed, ambiguous


def contains_symbol(text: str, symbol: str) -> bool:
    pattern = re.compile(rf"(?<!\w){re.escape(symbol)}(?!\w)", re.IGNORECASE)
    return pattern.search(text) is not None


def _rewrite_column_segment(
    segment: str,
    table: str,
    old: str,
    new: str,
    *,
    local_context: bool,
) -> tuple[str, bool, bool]:
    output: list[str] = []
    position = 0
    changed = False
    ambiguous = False
    local_pattern = _column_token_pattern(old)

    while True:
        match = _QUALIFIED_TABLE.search(segment, position)
        if match is None:
            tail = segment[position:]
            rewritten, tail_changed, tail_ambiguous = _rewrite_unqualified(
                tail, old, new, local_context=local_context
            )
            output.append(rewritten)
            changed = changed or tail_changed
            ambiguous = ambiguous or tail_ambiguous
            break

        prefix = segment[position : match.start()]
        rewritten_prefix, prefix_changed, prefix_ambiguous = _rewrite_unqualified(
            prefix, old, new, local_context=local_context
        )
        output.append(rewritten_prefix)
        changed = changed or prefix_changed
        ambiguous = ambiguous or prefix_ambiguous

        bracket_start = match.end()
        while bracket_start < len(segment) and segment[bracket_start].isspace():
            bracket_start += 1
        if bracket_start >= len(segment) or segment[bracket_start] != "[":
            output.append(segment[match.start() : bracket_start])
            position = bracket_start
            continue

        bracket_end = _balanced_bracket_end(segment, bracket_start)
        if bracket_end is None:
            remainder = segment[match.start() :]
            if local_pattern.search(remainder):
                ambiguous = True
            output.append(remainder)
            break

        whole = segment[match.start() : bracket_end]
        table_name = match.group("name")
        if table_name.casefold() == table.casefold():
            prefix_and_space = segment[match.start() : bracket_start]
            structured = segment[bracket_start:bracket_end]
            rewritten_structured = _replace_column_tokens(structured, old, new)
            rewritten_whole = prefix_and_space + rewritten_structured
            output.append(rewritten_whole)
            changed = changed or rewritten_whole != whole
        else:
            output.append(whole)
        position = bracket_end

    return "".join(output), changed, ambiguous


def _rewrite_unqualified(segment: str, old: str, new: str, *, local_context: bool) -> tuple[str, bool, bool]:
    pattern = _column_token_pattern(old)
    if local_context:
        result = _replace_column_tokens(segment, old, new)
        return result, result != segment, False
    return segment, False, pattern.search(segment) is not None


def _column_token_pattern(column: str) -> re.Pattern[str]:
    return re.compile(rf"\[(?P<at>@?){re.escape(column)}\]", re.IGNORECASE)


def _replace_column_tokens(text: str, old: str, new: str) -> str:
    pattern = _column_token_pattern(old)
    return pattern.sub(lambda match: f"[{match.group('at')}{new}]", text)


def _balanced_bracket_end(text: str, start: int) -> int | None:
    depth = 0
    for index in range(start, len(text)):
        if text[index] == "[":
            depth += 1
        elif text[index] == "]":
            depth -= 1
            if depth == 0:
                return index + 1
    return None


def _map_unquoted(expression: str, transform: Callable[[str], str]) -> str:
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
