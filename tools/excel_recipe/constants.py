from __future__ import annotations

MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
CONTENT_TYPES_NS = "http://schemas.openxmlformats.org/package/2006/content-types"

NS = {"x": MAIN_NS, "r": REL_NS, "pr": PKG_REL_NS, "ct": CONTENT_TYPES_NS}

IMMUTABLE_PREFIXES = (
    "xl/activeX/",
    "xl/charts/",
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

# Compatibilidade do perfil financeiro do Carro Chefe. O core não depende
# destes caminhos para operar em outros workbooks; eles existem apenas como
# defaults legados/convenientes para o workbook versionado do projeto.
DEFAULT_WORKBOOK = "anexos/financeiro/carro chefe.xlsm"
DEFAULT_SNAPSHOT_OUTPUT = "anexos/financeiro/snapshot"
DEFAULT_SNAPSHOT_SCRIPT = "tools/excel_snapshot/export.py"
TOOL_VERSION = "3.1.0"
