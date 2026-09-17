# Excel Recipe V3B — gráficos e DrawingML

## Status

Implementada nesta entrega, condicionada aos gates de CI e probes reais descritos neste documento. A V3B amplia a V3A sem alterar as operações JSON existentes: qualquer transformação física continua exigindo `structural.assert_clean` imediatamente antes da mutação.

A V3B não transforma o Excel Recipe em editor genérico de gráficos. Ela promove apenas famílias de DrawingML e referências de gráfico cujo round-trip é conhecido e cuja transformação pode ser provada deterministicamente.

## Objetivo

Permitir que `sheet.insert_rows`, `sheet.delete_rows`, `sheet.insert_columns`, `sheet.delete_columns`, `range.move` e as transformações físicas de Table atravessem worksheets com drawings/gráficos quando:

1. o anchor DrawingML é compreendido;
2. as referências afetadas do chart são referências A1 em nós conhecidos;
3. a mudança preserva a cardinalidade do cache do gráfico;
4. nenhuma parte binária ou família ainda não suportada precisa ser regravada;
5. o firewall conhece exatamente quais partes podem mudar.

Qualquer condição fora desse contrato continua blocker.

## Arquitetura

A implementação é separada da V3A:

- `drawingml.py` descobre relacionamentos, anchors DrawingML e referências de charts;
- `structural_v3b.py` estende o planner/executor V3A e incorpora as ocorrências visuais ao mesmo `plan_sha256`;
- `operations_v3b.py` conecta a extensão ao runner sem duplicar operações V1/V2/V3A;
- o firewall continua baseado em allowlist de partes exatas.

Charts deixaram de ser um prefixo globalmente imutável porque a V3B precisa regravar parts específicos. Isso **não** libera alterações arbitrárias em `xl/charts/`: qualquer chart modificado que não tenha sido explicitamente adicionado à allowlist continua bloqueado pelo firewall.

VBA, ActiveX, OLE, PivotTables/PivotCaches e mídia permanecem protegidos como antes.

## DrawingML suportado

### `oneCellAnchor`

O motor atualiza o marker `from` quando a transformação move a célula de ancoragem. O tamanho em EMUs (`ext`) é preservado.

Se a célula de ancoragem fosse removida, a operação é bloqueada.

### `twoCellAnchor`

O retângulo entre `from` e `to` é tratado como um range de células. O mesmo transformador puro da V3A calcula deslocamento/expansão/contração.

Transformações parciais ou remoção integral do anchor são bloqueadas; a V3B não tenta inferir como redimensionar um objeto em cenário ambíguo.

### Objetos DrawingML aceitos

Dentro dos anchors conhecidos, o parser reconhece as famílias OOXML `sp`, `grpSp`, `graphicFrame`, `cxnSp` e `pic`, além de `ext` e `clientData` próprios do anchor.

`absoluteAnchor`, anchors desconhecidos ou estruturas que não possuam um objeto DrawingML reconhecido continuam bloqueados.

## Gráficos clássicos suportados

O parser reconhece os charts clássicos DrawingML abaixo quando a referência afetada está em `c:f` e respeita todas as demais regras V3B:

- area/area 3D;
- bar/bar 3D;
- bubble;
- doughnut;
- line/line 3D;
- ofPie;
- pie/pie 3D;
- radar;
- scatter;
- stock;
- surface/surface 3D.

Essa lista é uma allowlist. Tipos novos, extensões modernas ou famílias não identificadas não são implicitamente aceitos.

## Referências de gráfico

A V3B regrava referências A1 afetadas encontradas em `c:f`. Isso cobre os padrões clássicos usados para:

- nome/título de série;
- categorias;
- valores;
- títulos vinculados a células;
- outras referências clássicas representadas por `c:f`.

O parser existente de referências A1 continua responsável por sheets quoted, referências absolutas/relativas e ranges simples.

Uma referência textual afetada fora de `c:f` vira blocker porque não existe semântica de reescrita comprovada para esse contexto.

## Regra de cardinalidade do cache

Charts costumam armazenar caches de categorias/valores. A V3B **não reconstrói cache**.

Por isso, uma referência só pode ser regravada quando a forma do range permanece igual. Por exemplo:

- `C4:C6` → `C5:C7`: permitido, pois continua 3×1;
- `D4:D6` → `E4:E6`: permitido, pois continua 3×1;
- `C4:C6` → `C4:C7`: bloqueado, pois passaria de 3 para 4 pontos.

Isso permite deslocamentos físicos seguros e impede que o XML do chart fique semanticamente incompatível com seu cache.

## Blockers deliberados

Continuam bloqueados:

- VML;
- ActiveX, OLE e controls;
- `absoluteAnchor` e anchors desconhecidos;
- PivotChart/PivotTable/PivotCache — pertencem à V3C;
- `externalData` em chart;
- chart type fora da allowlist V3B;
- extensão de chart que contenha a mesma referência afetada sem rewriter específico;
- referência afetada fora de `c:f`;
- transformação que alteraria a cardinalidade do cache;
- referência estruturada de chart durante alteração física de coluna de Table;
- referências A1 já bloqueadas pela V3A, como sintaxe não classificada, workbook externo ou ranges ambíguos;
- qualquer alteração que exigiria reescrever VBA.

Não existe `force: true` para esses casos.

## Compatibilidade com V3A

A V3B mantém os mesmos comandos e a mesma regra de uma transformação física por receita.

O planner V3A continua sendo executado primeiro. A V3B substitui somente os blockers genéricos de DrawingML/chart que agora possuem parser específico. Blockers VML/ActiveX/OLE permanecem registrados pela V3A para preservar compatibilidade, inclusive os `plan_sha256` históricos dos probes V3A.

## Receipt

Além dos campos V3A, a mutação registra:

- `rewritten_drawing_anchors`;
- `rewritten_chart_references`.

Esses valores também entram em `rewritten_references` para manter a contagem agregada compatível.

## Firewall

A regra permanece: uma parte OOXML só pode mudar se o executor que a regravou a adicionou explicitamente a `workbook.allowed_parts`.

Na V3B isso significa:

- `xl/drawings/<part>.xml` só entra na allowlist se um anchor foi realmente regravado;
- `xl/charts/<part>.xml` só entra na allowlist se uma referência `c:f` foi realmente regravada;
- partes de mídia não são reescritas;
- partes de ActiveX/OLE/VBA/pivô continuam protegidas.

## Testes sintéticos

Os fixtures V3B provam:

- deslocamento de `twoCellAnchor`;
- deslocamento de `oneCellAnchor` preservando tamanho;
- atualização de título, categorias e valores de um chart clássico;
- bloqueio quando inserção mudaria a cardinalidade do cache;
- bloqueio de `absoluteAnchor`;
- bloqueio de tipo de chart desconhecido;
- bloqueio de PivotChart;
- bloqueio de `externalData`;
- preservação de toda a suíte V1/V2/V3A.

## Probe do workbook real

O gate canônico é:

```bash
python -m tools.excel_recipe.probe_v3b_real
```

Ele procura deterministicamente no workbook real um cenário limpo que efetivamente regrave pelo menos um DrawingML/chart em candidato temporário e também mantém o cenário VML bloqueado em `configurações`.

O gate exige:

- SHA exato da fonte e do VBA;
- zero blockers no candidato limpo;
- pelo menos uma dependência visual realmente regravável;
- alteração em `xl/drawings/` ou `xl/charts/` no candidato;
- receipt com contagem visual positiva;
- workbook original preservado após dry-run;
- mesmo `plan_sha256` em Linux e Windows.

Os hashes canônicos são fixados no próprio script depois da primeira descoberta validada contra o workbook real.

## Limites

A V3B não edita o design de um gráfico, não cria charts, não muda tipo de gráfico, não reconstrói caches, não redimensiona objetos de forma subjetiva e não executa Excel Desktop.

Quando uma inserção/exclusão mudaria o número de pontos da série, a operação continua bloqueada até existir uma fase específica de cache/rebuild com round-trip comprovado.

## Próxima fase

A evolução seguinte é a V3C, voltada exclusivamente a PivotTables/PivotCaches. O fato de a V3B compreender alguns charts não autoriza manipular PivotChart por aproximação.
