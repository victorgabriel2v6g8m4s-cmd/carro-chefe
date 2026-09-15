# Excel Recipe V2 — mapa de dependências e refactors estruturais seguros

## Objetivo

A próxima entrega evolui o motor da V1 de um editor transacional local para um mecanismo capaz de **entender dependências** antes de alterações estruturais. O foco inicial é permitir renome de tabela e de coluna com análise explícita de impacto e reescrita controlada das referências que a ferramenta sabe interpretar.

A V2 não tem como meta “editar qualquer coisa do Excel”. Ela amplia poder somente quando consegue explicar o que será afetado, provar quais partes foram alteradas e falhar diante de dependências desconhecidas.

## Escopo da próxima entrega

A primeira fase da V2 deve adicionar um indexador de dependências que leia, no mínimo, fórmulas de células, `calculatedColumnFormula`, nomes definidos, referências estruturadas de tabelas, validações de dados, formatação condicional e código VBA extraído estaticamente. Gráficos e pivôs entram inicialmente como **detecção de possível dependência**, não como alvo de reescrita automática.

O motor deve produzir um relatório determinístico em JSON com origem, tipo de dependência, parte OOXML, expressão encontrada e grau de confiança. Esse relatório deve ser consumível por agentes e revisável em Git.

## Novas operações planejadas

A V2 introduzirá `dependency.scan` e `dependency.assert_clean` como operações de análise/precondição. Em seguida, serão habilitados `table.rename` e `table.rename_column` com modo `plan` obrigatório antes da aplicação.

Uma renomeação só poderá ser aplicada quando todas as dependências conhecidas estiverem classificadas como regraváveis ou explicitamente preservadas. Referências encontradas apenas em VBA serão reportadas; a V2 inicial não editará `vbaProject.bin`.

## Modelo de segurança

Cada refactor deve produzir, antes da escrita, um plano contendo o símbolo antigo, o novo símbolo, ocorrências encontradas, ocorrências que serão regravadas, ocorrências apenas informativas e blockers. O comando de aplicação deve conferir que o plano foi gerado sobre o mesmo SHA do workbook.

O firewall OOXML da V1 permanece obrigatório. A V2 apenas amplia a allowlist para as partes que o refactor comprovadamente precisa alterar. VBA, ActiveX e binários permanecem imutáveis.

Dependência desconhecida é um blocker por padrão. Não haverá `force: true` genérico para ignorar o grafo.

## Reescrita suportada na primeira fase

O primeiro suporte de cascata deve se limitar a referências que possam ser analisadas deterministicamente: nome/displayName da Table, cabeçalhos da Table, referências estruturadas em fórmulas XML, nomes definidos e fórmulas de células.

Validações e formatação condicional devem ser reescritas somente quando a expressão puder ser classificada com segurança. Gráficos, pivôs e VBA serão escaneados e reportados, mas qualquer dependência neles bloqueará renome automático até uma versão capaz de tratá-los.

## Entregáveis

A entrega será considerada concluída quando houver scanner determinístico, relatório JSON versionável, comando de plano, `table.rename`, `table.rename_column`, asserts de dependência, testes sintéticos cobrindo referências estruturadas/nome definido/fórmula e probes contra o workbook real sem persistir alterações.

A documentação e o schema de receita devem ser atualizados na mesma branch. O CI precisa testar Linux e Windows e confirmar que um refactor dry-run do workbook real preserva o VBA e todas as partes imutáveis.

## Fora de escopo desta fase

Continuam fora do escopo: edição de VBA/ActiveX, reescrita de PivotTable/PivotCache, reescrita de séries de gráficos, Power Query, inserção física arbitrária no meio da worksheet e recálculo headless compatível com Excel.

Esses itens só serão promovidos quando houver parser específico, testes de round-trip e uma política de rollback equivalente à já existente.
