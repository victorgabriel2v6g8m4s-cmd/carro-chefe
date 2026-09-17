from __future__ import annotations

import copy
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

from .constants import (
    IMMUTABLE_EXACT,
    IMMUTABLE_PREFIXES,
    MAX_SOURCE_BYTES,
    MAX_UNCOMPRESSED_BYTES,
    MAX_ZIP_ENTRIES,
)
from .errors import RecipeError
from .util import canonical_path, sha256_bytes, sha256_file
from .xml_compat import assert_excel_xml_compatible, serialize_preserving_namespaces


class PackageEditor:
    def __init__(self, source: Path) -> None:
        self.source = source
        self.entries: dict[str, bytes] = {}
        self.infos: dict[str, zipfile.ZipInfo] = {}
        self.order: list[str] = []
        self._load()
        self.before_hashes = self.hash_map()

    def _load(self) -> None:
        if self.source.suffix.lower() != ".xlsm":
            raise RecipeError(f"A fonte deve ser .xlsm: {self.source}")
        if not self.source.is_file():
            raise RecipeError(f"Planilha não encontrada: {self.source}")
        if self.source.stat().st_size > MAX_SOURCE_BYTES:
            raise RecipeError("Planilha excede o limite de segurança de 25 MiB.")
        if not zipfile.is_zipfile(self.source):
            raise RecipeError("Arquivo não é um pacote XLSM/ZIP válido.")

        total = 0
        with zipfile.ZipFile(self.source, "r") as archive:
            infos = archive.infolist()
            if len(infos) > MAX_ZIP_ENTRIES:
                raise RecipeError("Pacote possui entradas demais.")
            for info in infos:
                name = canonical_path(info.filename)
                if not name or name.startswith("/") or ".." in Path(name).parts:
                    raise RecipeError(f"Entrada ZIP suspeita: {info.filename}")
                if name in self.entries:
                    raise RecipeError(f"Entrada ZIP duplicada: {name}")
                if info.flag_bits & 0x1:
                    raise RecipeError(f"Entrada ZIP criptografada não suportada: {name}")
                total += info.file_size
                if total > MAX_UNCOMPRESSED_BYTES:
                    raise RecipeError("Pacote descompactado excede o limite de segurança.")
                self.entries[name] = archive.read(info)
                self.infos[name] = copy.copy(info)
                self.order.append(name)

        for required in ("[Content_Types].xml", "xl/workbook.xml"):
            if required not in self.entries:
                raise RecipeError(f"Pacote XLSM incompleto: falta {required}")

    @property
    def source_sha256(self) -> str:
        return sha256_file(self.source)

    @property
    def vba_sha256(self) -> str | None:
        data = self.entries.get("xl/vbaProject.bin")
        return sha256_bytes(data) if data is not None else None

    def get(self, path: str) -> bytes:
        normalized = canonical_path(path)
        try:
            return self.entries[normalized]
        except KeyError as exc:
            raise RecipeError(f"Parte OOXML não encontrada: {normalized}") from exc

    def set(self, path: str, data: bytes) -> None:
        normalized = canonical_path(path)
        self.entries[normalized] = data
        if normalized not in self.order:
            self.order.append(normalized)

    def delete(self, path: str) -> None:
        normalized = canonical_path(path)
        self.entries.pop(normalized, None)
        self.infos.pop(normalized, None)
        if normalized in self.order:
            self.order.remove(normalized)

    def get_xml(self, path: str) -> ET.Element:
        try:
            return ET.fromstring(self.get(path))
        except ET.ParseError as exc:
            raise RecipeError(f"XML inválido em {path}: {exc}") from exc

    def set_xml(self, path: str, root: ET.Element) -> None:
        normalized = canonical_path(path)
        original = self.entries.get(normalized)
        self.set(normalized, serialize_preserving_namespaces(root, original))

    def hash_map(self) -> dict[str, str]:
        return {name: sha256_bytes(data) for name, data in self.entries.items()}

    def changed_parts(self) -> list[str]:
        after = self.hash_map()
        changed = set(self.before_hashes) | set(after)
        return sorted(name for name in changed if self.before_hashes.get(name) != after.get(name))

    def assert_firewall(self, allowed_parts: set[str]) -> None:
        allowed = {canonical_path(path) for path in allowed_parts}
        violations: list[str] = []
        for path in self.changed_parts():
            protected = path in IMMUTABLE_EXACT or any(path.startswith(prefix) for prefix in IMMUTABLE_PREFIXES)
            if protected or path not in allowed:
                violations.append(path)
        if violations:
            raise RecipeError("Firewall OOXML bloqueou alterações inesperadas: " + ", ".join(violations))

    def assert_excel_compatible(self, parts: list[str] | set[str] | None = None) -> None:
        targets = sorted(parts if parts is not None else self.entries)
        for path in targets:
            normalized = canonical_path(path)
            if normalized not in self.entries:
                continue
            if normalized.endswith(".xml") or normalized.endswith(".rels"):
                assert_excel_xml_compatible(self.entries[normalized], normalized)

    def write(self, target: Path) -> None:
        target.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(target, "w", allowZip64=False) as archive:
            for name in self.order:
                if name not in self.entries:
                    continue
                info = self.infos.get(name)
                if info is None:
                    info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
                    info.compress_type = zipfile.ZIP_DEFLATED
                    info.external_attr = 0o600 << 16
                else:
                    info = copy.copy(info)
                    info.filename = name
                archive.writestr(info, self.entries[name])
