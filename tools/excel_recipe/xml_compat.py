from __future__ import annotations

import io
import re
from xml.etree import ElementTree as ET
from xml.sax.saxutils import quoteattr

from .errors import RecipeError
from .util import parse_cell_ref

MCE_NS = "http://schemas.openxmlformats.org/markup-compatibility/2006"
_XMLNS_RE = re.compile(rb"\sxmlns(?::([A-Za-z_][A-Za-z0-9_.-]*))?\s*=\s*(['\"])(.*?)\2", re.DOTALL)
_ROOT_TAG_RE = re.compile(rb"(<(?![!?])[^>]*?)(/?>)", re.DOTALL)
_RESERVED_PREFIX_RE = re.compile(r"ns\d+$")

_PREFIX_LIST_ATTRIBUTES = {"Ignorable", "MustUnderstand"}
_QNAME_LIST_ATTRIBUTES = {"ProcessContent", "PreserveAttributes", "PreserveElements"}


def collect_namespaces(data: bytes) -> dict[str, str]:
    """Coleta prefixos declarados no XML sem depender da árvore do ElementTree."""
    result: dict[str, str] = {}
    try:
        for _event, item in ET.iterparse(io.BytesIO(data), events=("start-ns",)):
            prefix, uri = item
            result[prefix or ""] = uri
    except ET.ParseError as exc:
        raise RecipeError(f"XML inválido ao coletar namespaces: {exc}") from exc
    return result


def serialize_preserving_namespaces(root: ET.Element, original: bytes | None = None) -> bytes:
    """Serializa XML preservando os prefixos/declarations do part original.

    Excel usa nomes de prefixos dentro de valores MCE, por exemplo
    ``mc:Ignorable=\"x14ac xr xr2\"``. ElementTree preserva o URI dos QNames,
    mas pode renomear/remover essas declarações porque não entende referências
    textuais a prefixos. Registramos os prefixos conhecidos e reinjetamos no
    elemento raiz qualquer declaração original que a serialização tenha omitido.
    """
    namespaces = collect_namespaces(original) if original else {}
    for prefix, uri in namespaces.items():
        if prefix == "xml" or _RESERVED_PREFIX_RE.fullmatch(prefix):
            continue
        try:
            ET.register_namespace(prefix, uri)
        except ValueError:
            # Prefixos exóticos não devem tornar o writer permissivo: a declaração
            # original ainda será reinjetada e validada no candidato.
            continue

    serialized = ET.tostring(root, encoding="utf-8", xml_declaration=True)
    if not namespaces:
        return serialized
    return _restore_root_declarations(serialized, namespaces)


def _restore_root_declarations(serialized: bytes, namespaces: dict[str, str]) -> bytes:
    match = _ROOT_TAG_RE.search(serialized)
    if match is None:
        raise RecipeError("Não foi possível localizar o elemento raiz do XML serializado.")
    start_tag = match.group(0)
    declared = _declared_prefixes(start_tag)
    missing: list[bytes] = []
    for prefix, uri in namespaces.items():
        if prefix in declared:
            continue
        name = "xmlns" if prefix == "" else f"xmlns:{prefix}"
        missing.append(f" {name}={quoteattr(uri)}".encode("utf-8"))
    if not missing:
        return serialized
    replacement = match.group(1) + b"".join(missing) + match.group(2)
    return serialized[: match.start()] + replacement + serialized[match.end() :]


def _declared_prefixes(start_tag: bytes) -> set[str]:
    return {(match.group(1) or b"").decode("utf-8") for match in _XMLNS_RE.finditer(start_tag)}


def assert_excel_xml_compatible(data: bytes, path: str) -> None:
    """Valida invariantes que XML bem-formado sozinho não cobre para Excel."""
    try:
        root = ET.fromstring(data)
    except ET.ParseError as exc:
        raise RecipeError(f"XML inválido em {path}: {exc}") from exc

    namespaces = collect_namespaces(data)
    _assert_mce_prefixes(root, namespaces, path)
    if path.startswith("xl/worksheets/") and path.endswith(".xml"):
        _assert_worksheet_order(root, path)


def _assert_mce_prefixes(root: ET.Element, namespaces: dict[str, str], path: str) -> None:
    for element in root.iter():
        for attr, raw in element.attrib.items():
            prefix = f"{{{MCE_NS}}}"
            if not attr.startswith(prefix):
                continue
            local = attr[len(prefix) :]
            needed: set[str] = set()
            if local in _PREFIX_LIST_ATTRIBUTES:
                needed.update(token for token in raw.split() if token)
            elif local in _QNAME_LIST_ATTRIBUTES:
                for token in raw.split():
                    if ":" in token:
                        needed.add(token.split(":", 1)[0])
            missing = sorted(item for item in needed if item not in namespaces)
            if missing:
                raise RecipeError(
                    f"OOXML incompatível com Excel em {path}: {local} referencia prefixo(s) "
                    f"não declarado(s): {', '.join(missing)}"
                )


def _assert_worksheet_order(root: ET.Element, path: str) -> None:
    main_ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
    sheet_data = root.find(f"{{{main_ns}}}sheetData")
    if sheet_data is None:
        return
    previous_row = 0
    for row in sheet_data.findall(f"{{{main_ns}}}row"):
        try:
            row_number = int(row.get("r", "0"))
        except ValueError as exc:
            raise RecipeError(f"Worksheet inválida em {path}: row/@r não numérico.") from exc
        if row_number <= previous_row:
            raise RecipeError(f"Worksheet inválida em {path}: linhas fora de ordem ou duplicadas em {row_number}.")
        previous_row = row_number
        previous_col = 0
        seen: set[str] = set()
        for cell in row.findall(f"{{{main_ns}}}c"):
            ref = cell.get("r")
            if not ref:
                raise RecipeError(f"Worksheet inválida em {path}: célula sem referência na linha {row_number}.")
            if ref in seen:
                raise RecipeError(f"Worksheet inválida em {path}: referência de célula duplicada {ref}.")
            seen.add(ref)
            try:
                cell_row, cell_col = parse_cell_ref(ref)
            except RecipeError:
                raise
            except Exception as exc:
                raise RecipeError(f"Worksheet inválida em {path}: referência de célula inválida {ref}.") from exc
            if cell_row != row_number:
                raise RecipeError(
                    f"Worksheet inválida em {path}: célula {ref} está dentro da linha {row_number}."
                )
            if cell_col <= previous_col:
                raise RecipeError(f"Worksheet inválida em {path}: células fora de ordem na linha {row_number}.")
            previous_col = cell_col
