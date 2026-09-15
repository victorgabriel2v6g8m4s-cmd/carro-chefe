# Excel Recipe V2 — dependências e refactors estruturais

## Objetivo

A V2 adiciona ao editor transacional da V1 um mapa determinístico de dependências antes de mudanças estruturais. O primeiro escopo é renomear **tabelas** e **colunas de tabelas** sem fazer substituições cegas em XML ou fórmulas.

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

Na primeira fase da V2, o motor reescreve deterministicamente:

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

O refactor é bloqueado quando o símbolo aparece em um contexto que a V2 não modifica, incluindo:

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

## Limites atuais

A V2 não é um parser completo da linguagem de fórmulas do Excel. Ela suporta somente padrões de referência classificados pela implementação; padrões desconhecidos devem bloquear, não ser adivinhados.

Também continuam fora do escopo edição de VBA, reescrita de gráficos/pivôs/Power Query, inserção física arbitrária no meio da worksheet e recálculo headless equivalente ao Excel.

## Próxima evolução sugerida

Uma V3 deve priorizar o uso do grafo para operações estruturais de linhas/colunas e, separadamente, parsers específicos para gráficos/pivôs. Edição de VBA deve permanecer um subsistema independente, com assinatura/hash e testes próprios, em vez de ser misturada ao rewriter OOXML.
