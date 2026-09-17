# Excel Recipe V3B — DrawingML e ChartML

## Status

**Implementação parcial executável.** Esta entrega promove o núcleo DrawingML/ChartML clássico, mas não declara a V3B inteira concluída até existirem probes de escrita contra os objetos reais do workbook e cobertura das variantes reais encontradas nele.

A V3A continua sendo a base estrutural. A V3B substitui blockers genéricos somente quando consegue provar que o drawing/chart pertence a uma família explicitamente suportada.

## Capacidades disponíveis nesta entrega

- resolução `worksheet -> drawing -> chart` pelas relationships OOXML;
- `oneCellAnchor`: move o marker `from` e preserva `ext`;
- `twoCellAnchor`: transforma `from` e `to`, permitindo que posição e tamanho acompanhem inserções/exclusões estruturais;
- `absoluteAnchor`: preservado, pois não depende de coordenadas de células;
- objetos DrawingML conhecidos dentro dos anchors: `graphicFrame`, `pic`, `sp`, `cxnSp` e `grpSp`;
- ChartML clássico (`http://schemas.openxmlformats.org/drawingml/2006/chart`);
- reescrita conservadora de todos os elementos `c:f`, cobrindo referências de séries, categorias, valores e títulos vinculados quando expressos como referência A1 suportada;
- `plan_sha256` inclui as ocorrências de drawing/chart;
- partes `xl/drawings/*.xml` e `xl/charts/*.xml` só entram na allowlist quando o planner as classificou como regraváveis.

## Fail-closed

Continuam blockers:

- VML;
- ActiveX e OLE;
- `chartEx`;
- diagramas/SmartArt e relacionamentos DrawingML ainda não modelados;
- anchors desconhecidos;
- objetos desconhecidos dentro de anchor que precise ser transformado;
- marker que cairia dentro de linha/coluna removida;
- fórmula de chart que o parser A1 não consegue reescrever sem ambiguidade;
- PivotTable/PivotCache e conexões externas.

Não existe `force` para atravessar esses casos.

## Semântica dos anchors

Os índices `xdr:row` e `xdr:col` são zero-based no XML. O motor converte o marker para uma célula A1, aplica o mesmo `CoordinateTransform` da V3A e converte de volta. Offsets EMU (`rowOff`/`colOff`) não são alterados.

Para `twoCellAnchor`, transformar ambos os markers é deliberado: uma inserção entre `from` e `to` pode aumentar o espaço ocupado pelo objeto; uma inserção antes dos dois move o objeto mantendo sua extensão relativa. Se a transformação remover exatamente um marker, o plano bloqueia em vez de inventar uma nova geometria.

## ChartML

A V3B não recalcula caches de séries. Ela atualiza a fonte `c:f` e mantém os caches existentes; o workbook já é marcado para recálculo ao abrir. A integridade estrutural das referências é responsabilidade do Excel Recipe; o recálculo do Excel não é usado como substituto de validação.

## Arquitetura

- `drawings.py`: descoberta de relationships, scanner e rewriter de DrawingML/ChartML;
- `structural_v3b.py`: extensão do planner/executor V3A;
- `operations_v3b.py`: runner compatível com V1/V2/V3A que promove apenas o subsistema estrutural;
- `test_v3b_drawings.py`: fixtures sintéticos e round-trip lógico de anchors/fórmulas.

A separação é intencional: o motor V3A permanece reutilizável e a promoção de novas famílias de objeto pode ocorrer sem enfraquecer seus blockers originais.

## Critério para declarar V3B completa

Além dos testes sintéticos, ainda são necessários nesta fase:

1. inventário determinístico dos drawings/charts do `carro chefe.xlsm` real;
2. pelo menos um probe real que atravesse um drawing/chart suportado em candidato temporário;
3. pelo menos um probe real bloqueado para uma variante não suportada, se existir no workbook;
4. igualdade de `plan_sha256` em Linux e Windows;
5. prova de que somente worksheet/drawing/chart/workbook previstos mudaram;
6. workbook real versionado preservado após dry-run;
7. checks gerais do repositório verdes.

Até esses gates existirem, a documentação deve chamar esta entrega de **núcleo V3B**, não de V3B completa.
