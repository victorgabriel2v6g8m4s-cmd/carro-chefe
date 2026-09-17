from __future__ import annotations

import zipfile
from pathlib import Path

from tools.excel_recipe.tests.v3_helpers import make_v3_xlsm

DRAWING_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing"
CHART_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart"


def make_v3b_xlsm(
    path: Path,
    *,
    anchor: str = "twoCellAnchor",
    chart_type: str = "barChart",
    external_data: bool = False,
    pivot_chart: bool = False,
) -> None:
    make_v3_xlsm(path)
    with zipfile.ZipFile(path, "r") as archive:
        files = {info.filename: archive.read(info) for info in archive.infolist()}

    sheet = files["xl/worksheets/sheet1.xml"].decode("utf-8")
    sheet = sheet.replace("</worksheet>", '<drawing r:id="rId2"/></worksheet>')
    files["xl/worksheets/sheet1.xml"] = sheet.encode("utf-8")

    rels = files["xl/worksheets/_rels/sheet1.xml.rels"].decode("utf-8")
    rels = rels.replace(
        "</Relationships>",
        f'<Relationship Id="rId2" Type="{DRAWING_REL}" Target="../drawings/drawing1.xml"/></Relationships>',
    )
    files["xl/worksheets/_rels/sheet1.xml.rels"] = rels.encode("utf-8")

    content_types = files["[Content_Types].xml"].decode("utf-8")
    content_types = content_types.replace(
        "</Types>",
        '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>'
        '<Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>'
        "</Types>",
    )
    files["[Content_Types].xml"] = content_types.encode("utf-8")

    files["xl/drawings/drawing1.xml"] = _drawing_xml(anchor).encode("utf-8")
    files["xl/drawings/_rels/drawing1.xml.rels"] = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        f'<Relationship Id="rId1" Type="{CHART_REL}" Target="../charts/chart1.xml"/>'
        "</Relationships>"
    ).encode("utf-8")
    files["xl/charts/chart1.xml"] = _chart_xml(chart_type, external_data, pivot_chart).encode("utf-8")

    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, data in files.items():
            archive.writestr(name, data)


def _drawing_xml(anchor: str) -> str:
    if anchor == "absoluteAnchor":
        body = (
            '<xdr:absoluteAnchor><xdr:pos x="0" y="0"/><xdr:ext cx="100" cy="100"/>'
            + _graphic_frame()
            + '<xdr:clientData/></xdr:absoluteAnchor>'
        )
    elif anchor == "oneCellAnchor":
        body = (
            '<xdr:oneCellAnchor><xdr:from><xdr:col>5</xdr:col><xdr:colOff>0</xdr:colOff>'
            '<xdr:row>2</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>'
            '<xdr:ext cx="100" cy="100"/>'
            + _graphic_frame()
            + '<xdr:clientData/></xdr:oneCellAnchor>'
        )
    else:
        body = (
            '<xdr:twoCellAnchor><xdr:from><xdr:col>5</xdr:col><xdr:colOff>0</xdr:colOff>'
            '<xdr:row>2</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>'
            '<xdr:to><xdr:col>9</xdr:col><xdr:colOff>0</xdr:colOff>'
            '<xdr:row>9</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>'
            + _graphic_frame()
            + '<xdr:clientData/></xdr:twoCellAnchor>'
        )
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" '
        'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
        'xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        + body
        + "</xdr:wsDr>"
    )


def _graphic_frame() -> str:
    return (
        '<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Gráfico 1"/>'
        '<xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm/>'
        '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">'
        '<c:chart r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame>'
    )


def _chart_xml(chart_type: str, external_data: bool, pivot_chart: bool) -> str:
    pivot = '<c:pivotSource><c:name>Pivot</c:name><c:fmtId val="0"/></c:pivotSource>' if pivot_chart else ""
    external = '<c:externalData r:id="rIdExternal"/>' if external_data else ""
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        + pivot
        + '<c:chart><c:title><c:tx><c:strRef><c:f>Dados!$C$3</c:f></c:strRef></c:tx></c:title>'
        '<c:plotArea><c:'
        + chart_type
        + '><c:ser><c:idx val="0"/><c:order val="0"/>'
        '<c:cat><c:strRef><c:f>Dados!$C$4:$C$6</c:f><c:strCache><c:ptCount val="3"/></c:strCache></c:strRef></c:cat>'
        '<c:val><c:numRef><c:f>Dados!$D$4:$D$6</c:f><c:numCache><c:ptCount val="3"/></c:numCache></c:numRef></c:val>'
        '</c:ser></c:'
        + chart_type
        + '></c:plotArea></c:chart>'
        + external
        + "</c:chartSpace>"
    )
