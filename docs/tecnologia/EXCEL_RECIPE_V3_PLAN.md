# Excel Recipe V3 — plano de evolução estrutural avançada

## Status

A V3 é um programa evolutivo dividido em fases independentes.

- **V3A — linhas, colunas, ranges e Tables físicas:** implementada; consulte `EXCEL_RECIPE_V3A.md`.
- **V3B — DrawingML e ChartML clássico:** implementada para as famílias explicitamente suportadas; consulte `EXCEL_RECIPE_V3B.md`.
- **V3C — PivotTables e PivotCaches:** planejada.
- **V3D — eventual subsistema VBA:** planejada como projeto separado e somente se houver necessidade operacional real.

Capacidade planejada não deve ser tratada como disponível. V3B também não significa suporte irrestrito a qualquer desenho/gráfico: variantes não promovidas continuam blockers.

A V3 preserva as garantias das versões anteriores: SHA-256 da fonte e do VBA, candidato temporário, firewall OOXML, rollback, snapshot determinístico, receipts, `plan_sha256`, detecção de plano obsoleto, CI Linux/Windows e fail-closed.

## Objetivo geral

Evoluir o Excel Recipe de refactors de nomes para mudanças estruturais físicas controladas, liberando poder apenas quando a ferramenta consegue identificar dependências, calcular uma transformação determinística, provar as partes OOXML afetadas e bloquear qualquer contexto que ainda não compreende.

O Excel Recipe continua sendo um sistema de **refactor com prova**, não um editor livre nem uma tentativa de reproduzir todo o Excel Desktop.

## V3A — implementada

A V3A entrega:

- `structural.plan`;
- `structural.assert_clean`;
- `sheet.insert_rows` / `sheet.delete_rows`;
- `sheet.insert_columns` / `sheet.delete_columns`;
- `range.move`;
- `table.insert_column` / `table.delete_column`;
- `table.compact_rows`;
- transformador de coordenadas puro;
- parser A1 conservador;
- reescrita das dependências SpreadsheetML suportadas;
- receipts estruturais;
- probes determinísticos contra o workbook real em Linux e Windows.

### Dependências após V3B

| Dependência | Situação |
| --- | --- |
| fórmula A1 em worksheet | regravável nos padrões suportados |
| fórmula de Table | regravável nos padrões conhecidos |
| Table `ref` / `autoFilter` | regravável |
| nome definido | regravável em referências A1 simples |
| validação de dados | regravável em ranges/fórmulas suportados |
| formatação condicional | regravável em ranges/fórmulas suportados |
| mergeCells | regravável quando não há interseção ambígua |
| hyperlink interno | regravável quando baseado em referência simples |
| freeze pane | regravável quando o deslocamento é determinístico |
| dimension / ranges XML simples | regravável |
| DrawingML `oneCellAnchor` | V3B: regravável |
| DrawingML `twoCellAnchor` padrão/twoCell | V3B: regravável |
| `absoluteAnchor` | V3B: preservado |
| ChartML clássico `c:f` | V3B: regravável quando A1 suportado |
| referência de linha/coluna inteira (`A:A`, `1:1`) | blocker |
| `INDIRECT`/`ADDRESS` no contexto afetado | blocker |
| referência externa de workbook | blocker |
| VML / ActiveX / OLE | blocker |
| `chartEx`, SmartArt/diagramas não modelados | blocker |
| `twoCellAnchor` com `editAs` não promovido | blocker |
| PivotTable/PivotCache | blocker até V3C |
| VBA que precisaria ser regravado | blocker até V3D |
| Power Query/conexão | blocker |

A semântica base está em `EXCEL_RECIPE_V3A.md`; a promoção DrawingML/ChartML está em `EXCEL_RECIPE_V3B.md`.

## V3B — implementada

### Objetivo

Permitir que transformações estruturais atravessem sheets com drawings/charts quando for possível atualizar explicitamente os objetos e referências afetados, substituindo blockers genéricos por parsers específicos.

### Escopo promovido

- `oneCellAnchor`;
- `twoCellAnchor` com `editAs` ausente ou `twoCell`;
- preservação de `absoluteAnchor`;
- objetos `graphicFrame`, `pic`, `sp`, `cxnSp`, `grpSp` em anchors suportados;
- resolução worksheet → drawing → chart por relationships OOXML;
- ChartML clássico;
- fórmulas `c:f` de séries, categorias, valores e textos/títulos vinculados quando o parser A1 consegue provar a transformação;
- scanner global de charts, inclusive quando o gráfico está ancorado em outra sheet;
- allowlist dinâmica somente dos drawing/chart parts realmente alterados.

### Segurança específica

A promoção de `xl/charts/` não remove o firewall: chart modificado precisa ser explicitamente adicionado a `allowed_parts` pelo rewriter V3B. Qualquer chart/objeto não modelado permanece blocker.

A V3B não reconstrói caches de séries. A fonte `c:f` é corrigida e o workbook é marcado para recálculo completo ao abrir; recálculo não substitui integridade estrutural.

### Evidência real

O workbook `carro chefe.xlsm` possui um cenário real suportado em `Fluxo de Caixa`, com `drawing2.xml` e `chart1.xml`/`chart2.xml`, além de cenários bloqueados reais com VML/ActiveX.

O gate `python -m tools.excel_recipe.probe_v3b_real` exige:

1. transformação determinística limpa em `Fluxo de Caixa`;
2. pelo menos um anchor realmente regravado;
3. pelo menos uma fórmula de chart realmente regravada;
4. candidato completo passando firewall;
5. blocker VML + ActiveX real em `ingredientes`;
6. workbook real preservado após dry-run;
7. mesmo plano canônico em Linux e Windows.

## V3C — PivotTables e PivotCaches

V3C permanece separada de V3B porque pivôs possuem cache e semântica próprios.

### Objetivos planejados

- identificar origem de cada PivotCache;
- mapear relação PivotTable ↔ PivotCache;
- atualizar ranges simples quando uma transformação apenas deslocar a fonte;
- provar que a semântica da fonte não mudou;
- recusar qualquer alteração que exija reconstruir ou recalcular o cache sem Excel.

A V3C não deve prometer refresh headless compatível com Excel. Se o cache precisar ser reconstruído, a operação continua blocker.

## V3D — VBA como subsistema separado

Edição de VBA não será incorporada ao rewriter OOXML comum.

Se V3D for implementada, deverá ter arquitetura própria com:

- parser/exportador estático por módulo/procedimento;
- plano de alteração textual;
- diff antes da reconstrução;
- ferramenta de round-trip de `vbaProject.bin` comprovada;
- SHA antes/depois;
- detecção de assinatura digital;
- regra explícita para assinatura preservada/inválida;
- fixtures e probe real;
- **nenhuma execução automática de macro**.

Até existir esse subsistema, qualquer alteração que exigiria reescrever VBA continua blocker.

## Regras permanentes da V3

### Fail-closed

Não haverá `force: true` genérico, best-effort nem fallback para substituição textual cega. Dependência desconhecida é blocker.

### Plano ligado ao estado interno

`structural.assert_clean` carrega `source_sha256`, `package_state_sha256`, `vba_sha256` e `plan_sha256`. Mutação entre o plano e a escrita invalida o plano.

### Uma transformação física por receita

A V3 mantém uma transformação física por receita. Composição só poderá ser promovida numa versão futura se houver semântica formal para composição de transforms e testes suficientes.

### Partes binárias protegidas

VBA, ActiveX, OLE e demais binários permanecem imutáveis por padrão. Cada fase só amplia a allowlist para as partes estritamente necessárias.

### Recálculo não substitui integridade

Marcar `fullCalcOnLoad` é apenas consequência de fórmulas alteradas. A ferramenta precisa entregar estrutura e referências corretas antes que o Excel abra o arquivo.

## Receipts V3

Receipts V3 mantêm compatibilidade conceitual com V1/V2 e registram, conforme a operação:

- transformação normalizada;
- número de células/ranges deslocados ou removidos;
- `plan_sha256` consumido;
- partes alteradas;
- dependências regravadas;
- blockers verificados como zero;
- SHA da fonte/VBA antes e depois.

## Probes do workbook real

Cada fase executável precisa de, no mínimo:

- um cenário limpo que realmente percorra o caminho de escrita em candidato temporário;
- um cenário bloqueado que prove fail-closed;
- resultado determinístico em Linux e Windows;
- fonte real preservada após o dry-run.

Gates atuais:

```bash
python -m tools.excel_recipe.probe_v3a_real
python -m tools.excel_recipe.probe_v3b_real
```

## Próxima entrega estrutural recomendada

Com V3B consolidada, a próxima evolução estrutural é **V3C — PivotTable/PivotCache**. Ela deve começar por inventário e modelo de dependências de cache, sem permitir refresh/reconstrução até que essa semântica seja comprovada.

O eixo de reutilização G2/G3/G4 permanece separado e pode continuar posteriormente sem alterar esta ordem estrutural.
