# Excel Recipe V3 — plano de evolução estrutural avançada

## Status

A V3 é um programa evolutivo dividido em fases independentes.

- **V3A — linhas, colunas, ranges e Tables físicas:** implementada; consulte `EXCEL_RECIPE_V3A.md`.
- **V3B — DrawingML e gráficos clássicos:** implementada nesta entrega; consulte `EXCEL_RECIPE_V3B.md`.
- **V3C — PivotTables e PivotCaches:** planejada.
- **V3D — eventual subsistema VBA:** planejada como projeto separado, somente se houver necessidade operacional real.

Capacidade planejada não deve ser tratada como disponível. Código, testes, probes e documentação corrente do motor são a fonte para decidir o que pode ser usado.

A V3 preserva SHA-256 da fonte/VBA, candidato temporário, firewall OOXML, rollback, snapshot determinístico, receipts, `package_state_sha256`, `plan_sha256`, detecção de plano obsoleto, CI Linux/Windows e fail-closed.

## Princípio

O Excel Recipe é um **refactor com prova**, não um editor livre. Toda transformação física segue:

```text
base conhecida
  ↓
structural.plan
  ↓
classificação de dependências
  ↓
structural.assert_clean
  ↓
mutação em candidato
  ↓
rewriters específicos
  ↓
firewall + validação
  ↓
snapshot + receipt
```

Não existe `force: true` genérico, best-effort ou substituição textual cega.

## V3A — implementada

A V3A fornece:

- `structural.plan` / `structural.assert_clean`;
- insert/delete físico de linhas e colunas;
- `range.move`;
- inserção/exclusão física de coluna em Table;
- `table.compact_rows`;
- transformador puro de coordenadas;
- reescrita de fórmulas A1, Tables, nomes definidos, validações, formatação condicional, merges, hyperlinks, panes, filtros e ranges simples suportados;
- blockers conservadores para VBA, referências dinâmicas/externas, objetos ainda não suportados e interseções ambíguas.

Contrato completo: `EXCEL_RECIPE_V3A.md`.

## V3B — implementada

A V3B substitui o blocker genérico de drawings/charts somente para famílias com parser e rewriter específicos.

### DrawingML promovido

- `oneCellAnchor`;
- `twoCellAnchor`;
- objetos DrawingML conhecidos dentro desses anchors;
- deslocamento/expansão/contração quando o transformador V3A produz resultado não ambíguo.

`absoluteAnchor`, anchors desconhecidos, VML, ActiveX, OLE e controls continuam bloqueados.

### Charts promovidos

Charts clássicos em allowlist podem ter referências A1 em `c:f` regravadas quando a transformação preserva a forma/cardinalidade do range. Isso cobre séries, categorias, valores e títulos vinculados representados pelo modelo clássico.

A V3B não reconstrói cache. Portanto, mudança de `C4:C6` para `C5:C7` pode ser segura; expansão para `C4:C7` continua blocker.

Também permanecem blockers:

- PivotChart/PivotTable/PivotCache — V3C;
- `externalData`;
- chart type/extensão não compreendidos;
- referência afetada fora de `c:f`;
- referência estruturada de chart durante alteração física de coluna de Table;
- qualquer contexto que exija editar VBA.

### Segurança V3B

`xl/charts/` deixou de ser um prefixo invariavelmente imutável, mas isso **não** libera charts genericamente. O firewall exige que cada drawing/chart realmente regravado entre na allowlist exata da operação; qualquer outra alteração é bloqueada.

Receipts acrescentam `rewritten_drawing_anchors` e `rewritten_chart_references`.

Contrato completo: `EXCEL_RECIPE_V3B.md`.

## V3C — PivotTables e PivotCaches

V3C permanece separada porque pivôs possuem cache e semântica próprios.

Objetivos planejados:

- identificar origem de cada PivotCache;
- mapear PivotTable ↔ PivotCache;
- atualizar ranges simples quando apenas o endereço muda e o significado é preservado;
- provar consistência entre table/cache/source;
- recusar alterações que exijam rebuild/refresh de cache sem uma implementação comprovada.

A V3C não deve prometer refresh headless equivalente ao Excel. PivotChart continua blocker até essa fase tratar explicitamente sua relação com PivotCache.

## V3D — VBA como subsistema separado

Edição de VBA não será incorporada ao rewriter OOXML comum.

Se V3D for implementada, deverá possuir arquitetura própria com parser/exportador, diff por módulo/procedimento, round-trip comprovado de `vbaProject.bin`, hash antes/depois, tratamento de assinatura digital, fixtures/probe real e **nenhuma execução automática de macro**.

Até lá, qualquer transformação que exigiria reescrever VBA permanece blocker.

## Regras permanentes

### Uma transformação física por receita

V3A/V3B continuam aceitando apenas uma transformação física por receita. Composição futura só pode ser promovida com semântica formal e testes específicos.

### Plano ligado ao pacote

`structural.assert_clean` carrega `source_sha256`, `package_state_sha256`, `vba_sha256` e `plan_sha256`. Mutação entre plano e escrita invalida a execução.

### Partes binárias protegidas

VBA, ActiveX, OLE, pivôs e mídia permanecem imutáveis por padrão. Cada fase amplia somente a allowlist estritamente necessária.

### Recálculo não é prova de integridade

`fullCalcOnLoad` não substitui estrutura correta. Referências e partes OOXML precisam estar consistentes antes da abertura no Excel.

## Probes reais

Cada fase executável exige cenário limpo, cenário deliberadamente bloqueado, mesmo `plan_sha256` em Linux/Windows e comprovação de que o workbook real permanece inalterado após dry-run.

Gates atuais:

```bash
python -m tools.excel_recipe.probe_v3a_real
python -m tools.excel_recipe.probe_v3b_real
```

## Próxima entrega recomendada

A próxima evolução técnica é **V3C**, começando por inventário determinístico de PivotTable/PivotCache e fonte de dados, sem habilitar escrita até parser, fixtures, blockers e probe real estarem consolidados. V3D continua independente.
