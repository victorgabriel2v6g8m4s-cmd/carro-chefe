# Excel Recipe V3B — DrawingML e ChartML

## Status

A V3B promove suporte **fail-closed** a uma parte explicitamente modelada de DrawingML e ChartML clássico. Ela estende as transformações físicas da V3A; não cria novas operações estruturais.

O princípio permanece: um objeto só deixa de ser blocker quando o motor consegue provar como sua posição ou referência deve mudar. VML, ActiveX/OLE, pivôs e variantes ainda não modeladas continuam protegidos.

## Capacidades promovidas

### DrawingML

Para a sheet alvo da transformação, o planner resolve:

```text
worksheet -> worksheet relationship -> drawing -> drawing relationships -> chart
```

São suportados:

- `xdr:oneCellAnchor`, transformando o marker `from` e preservando offsets/`ext`;
- `xdr:twoCellAnchor` com `editAs` ausente ou `twoCell`, transformando `from` e `to`;
- `xdr:absoluteAnchor`, preservado sem alteração porque não depende de coordenadas de células;
- objetos conhecidos `graphicFrame`, `pic`, `sp`, `cxnSp` e `grpSp` dentro de anchors suportados.

Os índices `xdr:row` e `xdr:col` são zero-based no OOXML. A implementação converte cada marker para A1, aplica o mesmo transformador puro da V3A e converte o resultado de volta. `rowOff` e `colOff` são preservados.

Se um marker cair em linha/coluna removida, o plano bloqueia. `twoCellAnchor` com `editAs="oneCell"` ou `editAs="absolute"` também permanece blocker até existir semântica específica testada.

### ChartML clássico

Todos os parts `xl/charts/*.xml` em ChartML clássico são verificados como dependências globais. Isso é importante porque um gráfico pode estar visualmente ancorado em uma sheet e referenciar dados de outra sheet que está sendo transformada.

A V3B reescreve elementos `c:f` quando o parser A1 existente consegue provar a transformação. Isso cobre, nos padrões OOXML clássicos suportados:

- nome/texto de série vinculado a célula;
- categorias;
- valores;
- títulos ou textos vinculados expressos por `c:f`;
- ranges A1 absolutos, relativos e qualificados por sheet já aceitos pelo parser V3A.

Charts somente entram em `allowed_parts` quando realmente foram alterados. Um chart não relacionado à transformação permanece byte-for-byte intocado.

## Caches de chart e recálculo

A V3B altera a fonte `c:f`, mas não tenta reconstruir manualmente `numCache`/`strCache`. Assim como o restante da V3, a transformação estrutural marca o workbook para recálculo completo ao abrir.

O recálculo não é usado para esconder inconsistência estrutural: a fórmula/fonte precisa estar corretamente reescrita antes de o candidato ser aceito.

## Firewall

`xl/charts/` deixa de ser uma família globalmente imutável apenas porque o firewall já exige que cada part alterado pertença à `allowed_parts` da execução. O caminho V3B adiciona um drawing/chart à allowlist somente após planejamento e reescrita suportados.

Continuam protegidos por padrão:

- `xl/activeX/`;
- `xl/pivotTables/`;
- `xl/pivotCache/`;
- `xl/media/`;
- `xl/vbaProject.bin`;
- qualquer outro part não incluído explicitamente na allowlist.

## Blockers V3B

Continuam bloqueando a transformação, entre outros:

- VML;
- ActiveX e OLE;
- `chartEx`/namespace de chart não clássico;
- SmartArt/diagramas e relationships de desenho ainda não modelados;
- anchor desconhecido;
- `twoCellAnchor` com `editAs` ainda não suportado;
- marker obrigatório ausente;
- objeto DrawingML desconhecido dentro de anchor dependente de células;
- marker removido pela transformação;
- fórmula `c:f` ambígua ou não regravável pelo parser A1;
- PivotTable/PivotCache;
- Power Query/conexões, links externos e demais blockers herdados da V3A;
- VBA estático que precisaria ser alterado.

Não existe `force: true` para atravessar esses casos.

## Dependência global de charts

A V3A tratava qualquer referência afetada em `xl/charts/` como `protected_ooxml`. A V3B substitui esse blocker somente depois de reexecutar o scanner ChartML específico sobre **todos os charts do pacote**.

Isso evita o caso perigoso em que um chart ancorado em `Sheet B` aponta para `Sheet A` e uma alteração estrutural em `Sheet A` passaria despercebida porque o drawing pertence a outra sheet.

## Arquitetura

- `tools/excel_recipe/drawings.py` — descoberta, scanner e rewriter DrawingML/ChartML;
- `tools/excel_recipe/structural_v3b.py` — promoção do planner/engine V3A;
- `tools/excel_recipe/operations_v3b.py` — runner que mantém V1/V2/V3A e usa o subsistema estrutural V3B;
- `tools/excel_recipe/tests/test_v3b_drawings.py` — fixtures sintéticos, anchors, charts globais e blockers;
- `tools/excel_recipe/tests/test_v3b_real_inventory.py` — inventário determinístico do workbook real;
- `tools/excel_recipe/probe_v3b_real.py` — gate real de escrita/dry-run em DrawingML/ChartML.

Essa separação permite continuar evoluindo V3C/V3D sem contaminar o core genérico G1.

## Workbook real do Carro Chefe

O inventário canônico atual encontrou:

- `configurações`: VML real, mantido como blocker;
- `ingredientes`: DrawingML presente, mas também VML e ActiveX, portanto a sheet continua fail-closed;
- `Fluxo de Caixa`: `xl/drawings/drawing2.xml` ligado a `xl/charts/chart1.xml` e `xl/charts/chart2.xml`, sem blocker de relacionamento detectado.

O inventário determinístico produzido pela suite possui SHA-256:

```text
f78332e5158a2881002240e2f22ab95077ca922c1c2f506e81c897a32826c8c5
```

O probe `probe_v3b_real.py` seleciona deterministicamente uma transformação limpa em `Fluxo de Caixa` que precisa, simultaneamente, deslocar pelo menos um anchor e reescrever pelo menos uma fórmula de chart. Ele executa a receita completa em dry-run, exige alteração do drawing real e de chart real, prova blockers VML/ActiveX em `ingredientes` e compara o hash do workbook antes/depois.

## Validação obrigatória

Para mudança no motor V3B, execute:

```bash
python -m unittest discover -s tools/excel_recipe/tests -p "test_*.py" -v
python -m tools.excel_recipe.probe_v3a_real
python -m tools.excel_recipe.probe_v3b_real
```

CI executa os probes V3A e V3B em Ubuntu e Windows. O `plan_sha256` canônico do probe V3B deve ser fixado no próprio probe depois de comprovado idêntico nos dois ambientes.

## Limites que permanecem

V3B não implementa:

- VML;
- ActiveX/OLE;
- `chartEx`;
- semântica de `twoCellAnchor editAs="oneCell"/"absolute"`;
- PivotTable/PivotCache;
- Power Query/conexões;
- reconstrução headless de cache de chart;
- reescrita de VBA;
- múltiplas transformações físicas na mesma receita.

Esses limites continuam sendo blockers, não atalhos para edição manual silenciosa.
