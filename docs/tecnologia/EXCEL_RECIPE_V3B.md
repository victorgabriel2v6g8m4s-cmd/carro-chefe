# Excel Recipe V3B — DrawingML e gráficos

## Status

Implementada sobre a V3A. A V3B permite que transformações físicas já suportadas atravessem worksheets com DrawingML e gráficos quando anchors e referências ChartML puderem ser atualizados deterministicamente. O princípio permanece fail-closed.

V3C (PivotTable/PivotCache) e V3D (eventual subsistema VBA) continuam fora do escopo.

## Capacidades

A V3B acrescenta ao planner/executor estrutural:

- inventário de drawings ligados às worksheets por relacionamentos OOXML;
- suporte a `oneCellAnchor` e `twoCellAnchor`;
- preservação de `absoluteAnchor`, que não usa coordenadas de célula;
- reescrita de referências ChartML em elementos `c:f`;
- suporte a referências de séries, categorias, valores e títulos vinculados a células;
- atualização de anchors para insert/delete de linhas e colunas e para transforms locais quando o modelo de coordenadas classifica o range como seguro;
- `range.move` de anchor somente quando o anchor é integralmente movido; interseção parcial bloqueia;
- firewall permitindo alteração de `xl/charts/*.xml` apenas quando a parte estiver explicitamente na allowlist da operação;
- receipts V3 existentes passam a refletir drawing/chart entre as partes alteradas.

## Modelo de segurança

A V3B não implementa um editor visual de gráfico. O conteúdo do gráfico permanece intacto; somente referências ChartML conhecidas são regravadas.

O rewriter percorre `c:f` e usa o mesmo parser A1 conservador da V3A. Referência externa, sintaxe dinâmica relevante ou transformação parcial não comprovada permanece blocker.

Para DrawingML, apenas `oneCellAnchor`, `twoCellAnchor` e `absoluteAnchor` são conhecidos. Um child/anchor desconhecido na worksheet alvo bloqueia a transformação.

## Blockers que permanecem

- VML;
- ActiveX e controles;
- OLE;
- PivotChart (`pivotSource`), reservado à V3C;
- gráfico com `externalData` quando a transformação o atinge;
- `userShapes` não modelado;
- anchor sem `from`/`to` válido;
- anchor que seria removido ou cortado parcialmente;
- ChartML cuja fórmula não possa ser classificada com segurança;
- PivotTable/PivotCache;
- VBA que exigiria reescrita;
- Power Query e conexões externas.

Não existe `force: true` para ignorar esses casos.

## Anchors

### oneCellAnchor

O marker `from` é convertido de coordenadas DrawingML zero-based para A1, transformado pelo mesmo `CoordinateTransform` da V3A e então serializado de volta. Se a célula de anchor for removida, a operação é bloqueada.

### twoCellAnchor

Os markers `from` e `to` formam um range. O range precisa resultar em transformação total e determinística. `partial` ou `removed` bloqueia. Inserções podem deslocar ou expandir o anchor; exclusões podem deslocar/contrair quando o transformador considera o resultado seguro.

### absoluteAnchor

Não depende de linha/coluna, portanto permanece inalterado pela transformação estrutural.

## ChartML

A V3B percorre as partes de gráfico alcançáveis pelos drawings e regrava elementos `c:f` com o parser A1 existente. Isso cobre os padrões OOXML usados para:

- categorias;
- valores;
- x/y values;
- nomes de série referenciados;
- títulos vinculados por `strRef`.

Tipos de gráfico não são recriados nem normalizados; o XML existente é preservado. Assim, a capacidade não depende de uma lista artificial de line/bar/pie etc., mas toda feature adicional que introduza dependência fora de `c:f` precisa de regra específica antes de ser promovida.

## Testes sintéticos

`test_v3b_drawings_charts.py` cria um `.xlsm` mínimo com worksheet, DrawingML, relationship de gráfico e ChartML. A suíte prova:

1. insert de linha atualiza `twoCellAnchor`;
2. série `Dados!$A$3:$A$6` vira `Dados!$A$3:$A$7`;
3. ChartML e drawing entram na allowlist/changed parts;
4. VML continua blocker;
5. PivotChart continua blocker até V3C;
6. anchor desconhecido continua blocker.

A suíte V1/V2/V3A permanece sendo executada junto.

## Probe real

`python -m tools.excel_recipe.probe_v3b_real` inventaria drawings/charts do workbook real, procura transformações que produzam ocorrências V3B e exige ao menos um cenário limpo. O probe nunca persiste o workbook. O gate dedicado roda em Ubuntu e Windows.

Após a primeira descoberta canônica, os hashes e o cenário selecionado devem permanecer fixos no probe para detectar drift, da mesma forma que V3A.

## Limitações deliberadas

A V3B não cria/remove gráficos, não altera estilo, layout, eixos, labels, caches de séries nem conteúdo visual. Ela também não promete equivalência de renderização com Excel Desktop; seu contrato é estrutural e de referência OOXML.

VML/ActiveX/OLE permanecem imutáveis. Pivôs e PivotCharts pertencem à V3C. VBA permanece V3D.

## Arquitetura

A implementação é aditiva: `StructuralPlannerV3B` e `StructuralEngineV3B` herdam o núcleo V3A e substituem apenas os pontos de scan/rewrite de partes protegidas. O planner V3A original permanece isolado, reduzindo regressão e mantendo a semântica histórica testável.

Consulte `EXCEL_RECIPE_V3_PLAN.md` para o roadmap e `../governanca/EXCEL_RECIPE_AGENT_GUIDE.md` para o procedimento de agentes.
