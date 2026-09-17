from __future__ import annotations

MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
CONTENT_TYPES_NS = "http://schemas.openxmlformats.org/package/2006/content-types"
DRAWING_NS = "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"
CHART_NS = "http://schemas.openxmlformats.org/drawingml/2006/chart"
DRAWING_MAIN_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"

NS = {
    "x": MAIN_NS,
    "r": REL_NS,
    "pr": PKG_REL_NS,
    "ct": CONTENT_TYPES_NS,
    "xdr": DRAWING_NS,
    "c": CHART_NS,
    "a": DRAWING_MAIN_NS,
}

# Charts e drawings só podem mudar quando a parte exata entrar na allowlist da
# operação V3B. As famílias abaixo permanecem imutáveis em qualquer receita.
IMMUTABLE_PREFIXES = (
    "xl/activeX/",
    "xl/pivotCache/",
    "xl/pivotTables/",
    "xl/media/",
)
IMMUTABLE_EXACT = {"xl/vbaProject.bin"}

MAX_SOURCE_BYTES = 25 * 1024 * 1024
MAX_ZIP_ENTRIES = 5_000
MAX_UNCOMPRESSED_BYTES = 250 * 1024 * 1024
MAX_OPERATIONS = 500
MAX_ROWS_PER_OPERATION = 5_000

DEFAULT_WORKBOOK = "anexos/financeiro/carro chefe.xlsm"
DEFAULT_SNAPSHOT_SCRIPT = "tools/excel_snapshot/export.py"
TOOL_VERSION = "3.1.0"
