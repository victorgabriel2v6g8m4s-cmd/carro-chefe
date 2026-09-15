# Excel Recipe V2 — mapa de dependências e refactors estruturais seguros

## Status

**Implementada e validada na entrega V2.** A implementação partiu da `main` após a integração da V1 e preserva as garantias existentes de SHA, candidato temporário, firewall OOXML, rollback, snapshot e CI multiplataforma.

A documentação de uso corrente está em `docs/tecnologia/EXCEL_RECIPE_V2.md`; este arquivo permanece como registro do escopo e dos critérios que orientaram a entrega.

## Objetivo

Evoluir o motor da V1 de um editor transacional local para um mecanismo capaz de **entender dependências** antes de alterações estruturais. O foco desta fase é permitir renome de tabela e de coluna com análise explícita de impacto e reescrita controlada das referências que a ferramenta sabe interpretar.

A V2 não tem como meta “editar qualquer coisa do Excel”. Ela amplia poder somente quando consegue explicar o que será afetado, provar quais partes foram alteradas e falhar diante de dependências desconhecidas.

## Escopo entregue

A V2 adiciona um indexador de dependências que lê fórmulas de células, `calculatedColumnFormula`, `totalsRowFormula`, nomes definidos, referências estruturadas de tabelas, validações de dados, formatação condicional e código VBA extraído estaticamente. Gráficos, pivôs, ActiveX, links externos, QueryTables e conexões entram como **detecção de possível dependência**, não como alvo de reescrita automática.

O motor produz relatório determinístico em JSON com origem, tipo de dependência, parte OOXML, localização, expressão encontrada, classificação e hashes da base. O relatório inclui `plan_sha256` e é consumível por agentes e revisável em Git.

## Operações entregues

A V2 introduz `dependency.scan` e `dependency.assert_clean` como operações de análise/precondição, além de `table.rename` e `table.rename_column`.

Uma renomeação só pode ser aplicada quando `dependency.assert_clean` correspondente foi executado antes na mesma receita e nenhuma dependência bloqueadora foi encontrada. A V2 inicial não edita `vbaProject.bin`.

O comando `python -m tools.excel_recipe plan <receita.json>` executa o fluxo em dry-run para revisão humana/agente sem persistir o candidato.

## Modelo de segurança entregue

Cada refactor produz um plano contendo o símbolo alvo, ocorrências encontradas, classificação `rewritable` ou `blocker`, hashes do workbook/VBA/estado interno e `plan_sha256`.

O refactor confere que o estado interno do pacote continua idêntico ao que originou o plano. Uma mutação intermediária torna o plano obsoleto e bloqueia a escrita.

O firewall OOXML da V1 permanece obrigatório. VBA, ActiveX, gráficos, pivôs e binários continuam imutáveis. Dependência desconhecida ou não regravável é blocker por padrão; não existe `force: true` genérico para ignorar o grafo.

A V2 também limita cada receita a um único refactor estrutural, reduzindo cascatas implícitas e mantendo o receipt auditável.

## Reescrita suportada

O suporte de cascata inclui nome/displayName da Table, cabeçalho/tableColumn, referências estruturadas em fórmulas de células, fórmulas de Table, nomes definidos, validações de dados e formatação condicional.

Referências de coluna qualificadas, como `Tabela[Coluna]`, podem ser regravadas globalmente. Referências não qualificadas, como `[@Coluna]`, só são consideradas seguras dentro da própria tabela-alvo; fora dela tornam-se blocker.

Strings literais entre aspas duplas não são reescritas como referências.

## Critérios de aceite — resultado

- scanner determinístico: **atendido**;
- relatório JSON versionável e `plan_sha256`: **atendido**;
- comando `plan`: **atendido**;
- `table.rename` e `table.rename_column`: **atendido**;
- precondição `dependency.assert_clean`: **atendido**;
- blockers para VBA/gráficos/pivôs/ActiveX e dependências não suportadas: **atendido**;
- testes sintéticos de referências estruturadas, nomes definidos, blockers e plano obsoleto: **atendido**;
- probe dry-run no workbook real: **atendido**;
- validação Linux e Windows: **atendido** nos jobs específicos do Excel Recipe antes da integração final;
- preservação do VBA e firewall V1: **mantidos**.

## Fora de escopo desta fase

Continuam fora do escopo: edição de VBA/ActiveX, reescrita de PivotTable/PivotCache, reescrita de séries de gráficos, Power Query, inserção física arbitrária no meio da worksheet e recálculo headless compatível com Excel.

Esses itens só devem ser promovidos quando houver parser específico, testes de round-trip e política de rollback equivalente à já existente.
