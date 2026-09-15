# Excel Recipe V2 — dependências e refactors estruturais

## Objetivo

A V2 adicionou ao editor transacional da V1 um mapa determinístico de dependências antes de mudanças estruturais. Seu escopo é renomear **tabelas** e **colunas de tabelas** sem fazer substituições cegas em XML ou fórmulas.

O princípio permanece fail-closed: se a ferramenta não consegue classificar uma referência como regravável com segurança, o refactor é bloqueado antes da escrita.

## Fluxo de análise

`dependency.scan` localiza ocorrências do alvo e gera um relatório com:

- tipo da ocorrência;
- parte OOXML ou módulo VBA onde foi encontrada;
- localização;
- expressão observada;
- classificação `rewritable` ou `blocker`;
- SHA da fonte, do estado interno do pacote e do VBA;
- `plan_sha256` determinístico.

`dependency.scan` não exige que o relatório esteja limpo. Ele existe justamente para investigar impacto.

`dependency.assert_clean` executa o mesmo scanner, mas aborta quando encontra blocker. Um `table.rename` ou `table.rename_column` só é aceito quando um `dependency.assert_clean` correspondente já foi executado na mesma receita.

O refactor também compara o SHA do estado interno do pacote com o estado que originou o plano. Se outra operação mutante foi executada entre o assert e o rename, o plano é considerado obsoleto.

## Dependências regraváveis

A V2 reescreve deterministicamente:

- fórmulas de células (`<f>`);
- fórmulas calculadas e de totais de Table Parts;
- nomes definidos do workbook;
- fórmulas de validação de dados;
- fórmulas de formatação condicional;
- `name` e `displayName` da Table;
- nome da `tableColumn` e célula física de cabeçalho no rename de coluna.

A reescrita de fórmulas ignora conteúdo entre aspas duplas. Assim, uma string literal como `"Itens"` não é transformada em referência estrutural.

No rename de coluna, uma referência qualificada como `Itens[Item]` é segura em qualquer fórmula conhecida. Uma referência não qualificada como `[@Item]` só é regravada quando a fórmula pertence à própria tabela-alvo. Fora desse contexto ela é tratada como ambígua e vira blocker.

## Blockers

O refactor é bloqueado quando o símbolo aparece em contexto que a V2 não modifica com segurança, incluindo:

- código VBA extraído estaticamente;
- gráficos;
- PivotTables ou PivotCaches;
- ActiveX;
- links externos;
- QueryTables;
- conexões externas;
- referência de coluna não qualificada fora da tabela-alvo.

O scanner usa `anexos/financeiro/snapshot/vba/index.json` para validar que o código VBA textual corresponde ao `vbaProject.bin` atual. Snapshot VBA ausente, inválido ou com SHA diferente também é blocker.

O motor não executa VBA.

## Renome de tabela

Exemplo:

```json
{
  "op": "dependency.assert_clean",
  "table": "TabelaAntiga"
},
{
  "op": "table.rename",
  "table": "TabelaAntiga",
  "new_name": "TabelaNova"
}
```

O motor altera `name`/`displayName` da Table e todas as fórmulas conhecidas em que o nome seja uma referência ao objeto. Strings literais e referências de sheet entre aspas simples não são tratadas como nome da tabela.

## Renome de coluna

Exemplo:

```json
{
  "op": "dependency.assert_clean",
  "table": "insumos",
  "column": "Preço"
},
{
  "op": "table.rename_column",
  "table": "insumos",
  "column": "Preço",
  "new_name": "Preço unitário"
}
```

Além da definição da `tableColumn`, o cabeçalho da worksheet é atualizado. Fórmulas regravadas perdem o valor em cache e o workbook é marcado para recálculo completo na próxima abertura no Excel.

## Um refactor por receita

A V2 aceita somente um `table.rename` ou `table.rename_column` por receita. Alterações independentes devem usar receitas separadas. Essa restrição reduz a superfície de cascata, deixa o receipt legível e evita que o segundo refactor dependa implicitamente do primeiro.

## Validação no workbook real

O CI executa o scanner/refactor em Linux e Windows e contém um probe `plan` contra o workbook real. O probe produz candidato temporário e descarta o resultado, permitindo validar o caminho de escrita sem alterar `anexos/financeiro/carro chefe.xlsm`.

O firewall da V1 permanece ativo depois do refactor; portanto, mesmo um bug no rewriter não pode alterar silenciosamente VBA, ActiveX, gráficos, pivôs ou mídia.

## Limites da geração V2

A V2, isoladamente, não é um parser completo da linguagem de fórmulas do Excel e não implementava deslocamento físico arbitrário de linhas/colunas. Esses eram limites históricos desta geração, não do motor corrente.

As transformações físicas foram implementadas posteriormente pela **V3A**, documentada em [`EXCEL_RECIPE_V3A.md`](./EXCEL_RECIPE_V3A.md). A V3A adiciona `structural.plan`, `structural.assert_clean`, insert/delete de linhas e colunas, `range.move`, inserção/exclusão de coluna no meio de Table e compactação física de linhas com análise de impacto.

Ainda permanecem fora do motor corrente a reescrita de Drawing/VML/ActiveX, gráficos, PivotTables/PivotCaches, Power Query/conexões e edição de VBA. Esses itens continuam fail-closed.

## Evolução posterior

O roadmap V3 está em [`EXCEL_RECIPE_V3_PLAN.md`](./EXCEL_RECIPE_V3_PLAN.md):

- **V3A:** implementada — operações físicas seguras;
- **V3B:** planejada — drawings/gráficos;
- **V3C:** planejada — pivôs/caches;
- **V3D:** planejada, se necessária — subsistema VBA separado.

Para saber quais operações estão disponíveis hoje, consulte sempre `tools/excel_recipe/README.md` e a documentação da versão implementada, não apenas documentos históricos de V1/V2.
