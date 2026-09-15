# Excel Recipe V3 — plano de evolução estrutural avançada

## Status

A V3 é um programa evolutivo dividido em fases independentes.

- **V3A — linhas, colunas, ranges e Tables físicas:** implementada nesta entrega; consulte `EXCEL_RECIPE_V3A.md`.
- **V3B — gráficos e objetos de desenho:** planejada.
- **V3C — PivotTables e PivotCaches:** planejada.
- **V3D — eventual subsistema VBA:** planejada como projeto separado e somente se houver necessidade operacional real.

Capacidade planejada não deve ser tratada como disponível. O código e a documentação corrente do motor são a fonte para decidir quais operações podem ser usadas.

A V3 preserva as garantias das versões anteriores: SHA-256 da fonte e do VBA, candidato temporário, firewall OOXML, rollback, snapshot determinístico, receipts, `plan_sha256`, detecção de plano obsoleto, CI Linux/Windows e fail-closed.

## Objetivo geral

Evoluir o Excel Recipe de refactors de nomes para mudanças estruturais físicas controladas, liberando poder apenas quando a ferramenta consegue identificar dependências, calcular uma transformação determinística, provar as partes OOXML afetadas e bloquear qualquer contexto que ainda não compreende.

O Excel Recipe continua sendo um sistema de **refactor com prova**, não um editor livre nem uma tentativa de reproduzir todo o Excel Desktop.

## V3A — implementada

A V3A entrega:

- `structural.plan`;
- `structural.assert_clean`;
- `sheet.insert_rows`;
- `sheet.delete_rows`;
- `sheet.insert_columns`;
- `sheet.delete_columns`;
- `range.move`;
- `table.insert_column`;
- `table.delete_column`;
- `table.compact_rows`;
- transformador de coordenadas puro e testável;
- parser A1 conservador;
- reescrita das dependências suportadas;
- blockers para VBA, Drawing/VML/ActiveX, gráficos, pivôs, conexões e sintaxes não regraváveis;
- receipts estruturais;
- probes determinísticos contra o workbook real em Linux e Windows.

### Dependências V3A

A V3A regrava quando a transformação é determinística:

| Dependência | V3A |
| --- | --- |
| fórmula A1 em worksheet | regravável |
| fórmula de Table | regravável nos padrões conhecidos |
| Table `ref` / `autoFilter` | regravável |
| nome definido | regravável em referências A1 simples |
| validação de dados | regravável em ranges/fórmulas suportados |
| formatação condicional | regravável em ranges/fórmulas suportados |
| mergeCells | regravável quando não há interseção ambígua |
| hyperlink interno | regravável quando baseado em referência simples |
| freeze pane | regravável quando o deslocamento é determinístico |
| dimension / ranges XML simples | regravável |
| referência de linha/coluna inteira (`A:A`, `1:1`) | blocker |
| `INDIRECT`/`ADDRESS` no contexto afetado | blocker |
| referência externa de workbook | blocker |
| Drawing/VML/ActiveX/OLE | blocker |
| gráfico | blocker até V3B |
| PivotTable/PivotCache | blocker até V3C |
| VBA que precisaria ser regravado | blocker até V3D |
| Power Query/conexão | blocker |

A semântica completa, limitações e exemplos estão em `EXCEL_RECIPE_V3A.md`.

### Validação da V3A

O aceite exige, simultaneamente:

1. transformador puro testado nos limites de linha/coluna;
2. `structural.plan` determinístico;
3. `structural.assert_clean` obrigatório antes de escrita;
4. uma transformação física por receita;
5. testes sintéticos positivos e negativos para as oito operações físicas;
6. preservação do firewall das partes imutáveis;
7. snapshot determinístico;
8. receipt com transformação + `plan_sha256`;
9. probe limpo no workbook real capaz de produzir candidato temporário;
10. probe real deliberadamente bloqueado;
11. mesmo `plan_sha256` em Linux e Windows;
12. checks gerais do repositório verdes.

A implementação foi consolidada em um único PR por orientação explícita do proprietário do projeto, embora o planejamento original sugerisse subdividir V3A em PRs menores. Internamente, a implementação ainda seguiu a sequência transformador → planner → linhas/colunas → ranges/Tables → probes/documentação.

## V3B — gráficos e objetos de desenho

### Objetivo

Permitir que transformações estruturais atravessem sheets com drawings quando for possível atualizar explicitamente os objetos afetados, substituindo o blocker genérico por parsers específicos.

### Escopo inicial planejado

- anchors `oneCellAnchor` e `twoCellAnchor` de DrawingML;
- séries de gráficos com fórmulas/ranges A1;
- categorias e valores de séries;
- títulos vinculados a células;
- atualização de posição/tamanho do objeto quando linhas/colunas forem inseridas ou removidas;
- VML apenas quando houver modelo específico comprovado;
- detecção explícita de chart/object não suportado.

### Critérios de promoção

Uma família de gráfico/objeto só deixa de ser blocker quando possuir:

- parser específico;
- modelo de dependência documentado;
- rewriter específico;
- fixture sintético;
- round-trip testado;
- blocker para variantes não suportadas;
- probe no workbook real;
- firewall ampliado somente para as partes necessárias.

Suportar alguns gráficos não autoriza alterar silenciosamente os demais.

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

`structural.assert_clean` e os planners das fases seguintes devem carregar `source_sha256`, `package_state_sha256`, `vba_sha256` e `plan_sha256`. Mutação entre o plano e a escrita invalida o plano.

### Uma transformação física por receita

A V3A mantém uma transformação física por receita. Composição só poderá ser promovida numa versão futura se houver semântica formal para composição de transforms e testes suficientes.

### Partes binárias protegidas

VBA, ActiveX, OLE e demais binários permanecem imutáveis por padrão. Cada fase só pode ampliar a allowlist para as partes estritamente necessárias.

### Recálculo não substitui integridade

Marcar `fullCalcOnLoad` é apenas uma consequência de fórmulas alteradas. A ferramenta precisa entregar estrutura e referências corretas antes que o Excel abra o arquivo.

## Receipts V3

Receipts V3 mantêm compatibilidade conceitual com V1/V2 e acrescentam, conforme a operação:

- transformação normalizada;
- coordenadas antes/depois;
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

Na V3A, os probes canônicos estão em `tools/excel_recipe/examples/probe-v3a-*.json` e o gate de aceitação está em `tools/excel_recipe/probe_v3a_real.py`.

## Próxima entrega recomendada

A próxima evolução técnica é **V3B**, começando por inventário/parse de DrawingML e anchors, sem habilitar reescrita até que os fixtures e blockers estejam consolidados. V3C e V3D devem permanecer independentes.
