# Excel Recipe V3 — plano de evolução estrutural avançada

## Status

Planejada. Este documento define o escopo técnico proposto para a V3 e serve como contrato de implementação. Nenhuma capacidade descrita aqui deve ser considerada disponível até existir código, testes, probes no workbook real, documentação de operação e CI verde na respectiva entrega.

A V3 deve partir da `main` contendo a V2 e preservar integralmente as garantias já existentes: SHA-256 da fonte e do VBA, candidato temporário, firewall OOXML, rollback, snapshot determinístico, receipts, `plan_sha256`, detecção de plano obsoleto, CI em Linux/Windows e princípio fail-closed.

## Objetivo

Evoluir o Excel Recipe de refactors de nomes para **mudanças estruturais físicas controladas**, usando o grafo de dependências para provar o impacto antes de mover células, linhas ou colunas.

A V3 não tem como objetivo reproduzir o Excel Desktop nem permitir mutações arbitrárias no pacote. O objetivo é liberar operações estruturais somente quando a ferramenta consegue:

1. identificar todas as dependências conhecidas afetadas;
2. classificá-las como regraváveis, informativas ou bloqueadoras;
3. calcular uma transformação determinística;
4. provar quais partes OOXML podem mudar;
5. abortar diante de qualquer dependência não compreendida.

## Princípio de desenho

A V3 continua sendo um sistema de **refactor com prova**, não um editor livre.

Toda operação estrutural deve seguir:

```text
snapshot/base conhecida
        ↓
dependency.scan
        ↓
structural.plan
        ↓
revisão de impacto
        ↓
dependency.assert_clean
        ↓
operação estrutural
        ↓
firewall + validação de pacote
        ↓
snapshot + receipt
```

Não haverá `force: true` genérico, modo “best effort” nem fallback para substituição textual cega.

## Escopo dividido por fases

### V3A — linhas e colunas físicas

É a primeira fase e deve ser implementada antes das demais.

Operações-alvo:

- `sheet.insert_rows`;
- `sheet.delete_rows`;
- `sheet.insert_columns`;
- `sheet.delete_columns`;
- `range.move` em ranges explicitamente delimitados;
- `table.insert_column` em posição explícita, não apenas à direita;
- `table.delete_column` com cascata comprovada;
- `table.compact_rows` para substituir a exclusão lógica da V1 quando a estrutura permitir.

A V3A deve atualizar referências conhecidas em:

- fórmulas de células;
- fórmulas calculadas e de totais de Tables;
- `ref` e `autoFilter` de Tables;
- nomes definidos;
- validações de dados;
- formatação condicional;
- áreas de impressão e títulos de impressão quando representados por nomes definidos;
- ranges de autofiltro;
- hyperlinks internos baseados em referência de célula;
- células mescladas (`mergeCells`);
- panes/freeze panes quando a transformação for deterministicamente aplicável;
- dimensões de worksheet e demais ranges XML simples conhecidos.

### V3B — gráficos e objetos de desenho

Só deve começar após a V3A estar estável no workbook real.

Objetivo: substituir o blocker genérico de gráfico por um parser específico capaz de diferenciar referência apenas informativa de referência que precisa ser atualizada.

Escopo inicial sugerido:

- séries de gráficos com fórmulas/ranges A1;
- categorias e valores de séries;
- títulos vinculados a células;
- anchors de drawings quando linhas/colunas físicas forem inseridas ou removidas;
- detecção explícita de recursos de gráfico não suportados.

Qualquer tipo de chart não compreendido deve permanecer blocker.

### V3C — PivotTables e PivotCaches

Esta fase deve ser isolada da V3B porque pivôs possuem cache e semântica próprias.

Objetivos:

- identificar fonte de dados de PivotCache;
- atualizar ranges simples quando uma operação estrutural deslocar a fonte sem alterar seu significado;
- validar relacionamento entre PivotTable e PivotCache;
- recusar alterações que exijam recalcular/reconstruir cache sem Excel.

A V3C não deve prometer refresh headless compatível com Excel. Se o cache precisar ser reconstruído, a operação continua bloqueada.

### V3D — VBA como subsistema separado

Edição de VBA não deve ser incorporada ao rewriter OOXML comum.

Se implementada, a arquitetura deve ser independente, com:

- parser/exportador estático próprio;
- plano de alteração por módulo/procedimento;
- diff textual antes da recompilação;
- reconstrução controlada de `vbaProject.bin` somente com ferramenta capaz de round-trip comprovado;
- hash do projeto antes/depois;
- detecção de assinatura digital;
- regra explícita para preservar ou invalidar assinatura;
- testes em workbook sintético e no workbook real;
- nenhum suporte a execução automática de macro.

Até esse subsistema existir e ser aprovado, qualquer dependência VBA continua blocker para operações que exigiriam reescrevê-la.

## Modelo de coordenadas estruturais

A V3A deve introduzir um modelo explícito de transformação de coordenadas, separado do código de serialização OOXML.

Exemplo conceitual:

```json
{
  "axis": "row",
  "sheet": "insumos",
  "at": 12,
  "delta": 3
}
```

Esse objeto deve ser capaz de responder deterministicamente:

- onde uma célula antiga passa a ficar;
- se uma célula foi removida;
- como um range é expandido, contraído ou deslocado;
- quando uma referência cruza parcialmente a região removida;
- quando a transformação é ambígua e deve bloquear.

O transformador de coordenadas não deve conhecer XML, VBA ou Git. Ele deve ser testável como função pura.

## Novas operações planejadas

### Análise

`structural.plan`

Produz o plano completo de uma alteração física sem escrever no workbook. Deve incluir:

- operação solicitada;
- sheet/range alvo;
- transformação de coordenadas;
- partes OOXML impactadas;
- ocorrências regraváveis;
- blockers;
- contagem de células/ranges movidos;
- `source_sha256`;
- `package_state_sha256`;
- `vba_sha256`;
- `plan_sha256`.

`structural.assert_clean`

Refaz o plano e exige zero blockers. Deve ser obrigatório imediatamente antes de qualquer mutação estrutural V3.

### Mutação

Operações previstas para a primeira entrega executável:

- `sheet.insert_rows`;
- `sheet.delete_rows`;
- `sheet.insert_columns`;
- `sheet.delete_columns`.

Operações seguintes, somente depois das quatro anteriores estarem validadas:

- `range.move`;
- `table.insert_column`;
- `table.delete_column`;
- `table.compact_rows`.

## Regras de segurança específicas

### Uma transformação estrutural por receita

A primeira versão da V3 deve manter a restrição de apenas **uma transformação física** por receita. Isso reduz composições implícitas e torna o plano/receipt auditável.

Receitas diferentes podem ser encadeadas em branches sucessivas, cada uma sobre o novo SHA resultante.

### Interseção parcial é caso de risco

Quando uma exclusão ou movimento corta apenas parte de um range referenciado, o motor não deve adivinhar a intenção.

Exemplo: deletar linhas que atravessam metade de um range de gráfico, nome definido ou validação deve ser blocker até existir regra específica testada para aquele tipo de dependência.

### Partes binárias continuam imutáveis por padrão

VBA, ActiveX, OLE e outros binários permanecem protegidos pelo firewall, mesmo se a V3 aprender a atualizar referências XML próximas deles.

### Cálculo não é prova de correção

O motor pode marcar recálculo completo ao abrir, mas não deve considerar um workbook “correto” apenas porque o Excel conseguirá recalcular fórmulas depois. Estrutura e referências precisam estar corretas antes da abertura.

## Dependências que a V3A deve classificar

O scanner precisa diferenciar pelo menos:

| Dependência | V3A |
| --- | --- |
| fórmula A1 em worksheet | regravável |
| fórmula estruturada de Table | regravável quando relação é conhecida |
| Table `ref` / `autoFilter` | regravável |
| nome definido | regravável em ranges simples |
| validação de dados | regravável em ranges/fórmulas suportadas |
| formatação condicional | regravável em ranges/fórmulas suportadas |
| mergeCells | regravável quando transformação é total e não ambígua |
| hyperlink interno | regravável quando alvo é referência simples |
| freeze pane | regravável quando deslocamento é determinístico |
| gráfico | blocker até V3B |
| PivotTable/PivotCache | blocker até V3C |
| VBA | blocker até subsistema V3D |
| ActiveX/OLE | blocker |
| Power Query/conexão externa | blocker |
| fórmula/referência não reconhecida | blocker |

## Estratégia para fórmulas

A V3 deve evitar regex global para coordenadas A1.

O parser precisa distinguir, no mínimo:

- referência relativa/absoluta (`A1`, `$A$1`, `A$1`, `$A1`);
- range (`A1:B20`);
- referência com sheet (`Dados!A1`);
- sheet quoted (`'Fluxo de Caixa'!A1`);
- ranges múltiplos quando suportados;
- referências estruturadas de Table;
- strings literais dentro da fórmula.

Se a expressão contiver sintaxe que o parser não classifica com confiança, a ocorrência deve virar blocker.

## Receipts V3

O receipt deve evoluir sem quebrar leitura dos receipts V1/V2.

Para uma transformação estrutural, deve registrar adicionalmente:

- tipo de transformação;
- coordenadas antes/depois;
- contagem de elementos deslocados/removidos;
- `plan_sha256`;
- partes regravadas;
- dependências regravadas por categoria;
- blockers verificados como zero;
- qualquer parte conhecida analisada e preservada.

## Estratégia de testes

### Testes puros do transformador

Criar uma matriz abrangente de casos para inserção/exclusão de linhas/colunas:

- antes do range;
- depois do range;
- dentro do range;
- exatamente na borda;
- cruzando parcialmente o range;
- referências absolutas e relativas;
- ranges de uma única célula;
- coluna XFD e limites de linha do Excel;
- tentativa de gerar coordenada fora do limite.

### Workbooks sintéticos

O fixture V3 deve incluir, no mínimo:

- duas worksheets;
- Table cruzada por fórmulas externas;
- nome definido;
- validação;
- formatação condicional;
- mergeCells;
- hyperlink interno;
- freeze pane;
- gráfico referenciando o range alvo para provar blocker V3A;
- PivotTable/PivotCache sintético ou fixture dedicado para provar blocker;
- VBA textual referenciando célula/tabela para provar blocker.

### Probes no workbook real

O CI deve executar `structural.plan` em pelo menos dois cenários reais:

1. cenário limpo que possa gerar candidato temporário sem persistência;
2. cenário deliberadamente bloqueado por dependência existente, provando que o fail-closed funciona.

Linux e Windows devem produzir o mesmo `plan_sha256` para a mesma entrada.

## Critérios de aceite da V3A

A V3A só poderá ser considerada concluída quando:

- existir transformador de coordenadas isolado e determinístico;
- `structural.plan` e `structural.assert_clean` estiverem implementados;
- insert/delete de linhas e colunas tiverem testes positivos e negativos;
- o motor atualizar todas as dependências declaradas como suportadas;
- qualquer contexto não suportado virar blocker;
- não houver alteração em VBA, ActiveX, gráficos, pivôs ou mídia durante V3A;
- snapshot continuar determinístico;
- receipt registrar transformação e plano;
- probes contra o workbook real passarem em Linux e Windows;
- os checks gerais do repositório estiverem verdes;
- documentação e guia de agentes forem atualizados na mesma entrega.

## Critérios de promoção para V3B/V3C

Gráficos ou pivôs só deixam de ser blockers quando houver, para cada família suportada:

- parser específico;
- modelo de dependência documentado;
- rewriter específico;
- fixture sintético;
- teste de round-trip;
- teste de blocker para variantes não suportadas;
- probe no workbook real;
- firewall atualizado apenas para as partes estritamente necessárias.

Suportar “alguns gráficos” ou “alguns pivôs” não autoriza alterar silenciosamente os demais.

## Fora do escopo da V3 inicial

Mesmo após V3A, permanecem fora do escopo até suas fases específicas:

- refresh de Power Query;
- reconstrução de PivotCache;
- recálculo headless equivalente ao Excel;
- execução de VBA;
- edição de ActiveX/OLE;
- macros geradas ou alteradas sem subsistema VBA dedicado;
- múltiplas transformações físicas compostas em uma única receita;
- edição livre de XML pelo usuário da receita.

## Ordem recomendada de implementação

1. `CoordinateTransform` puro + testes;
2. scanner V2 ampliado para dependências por coordenada/range;
3. `structural.plan` e `structural.assert_clean`;
4. `sheet.insert_rows`;
5. `sheet.delete_rows`;
6. `sheet.insert_columns`;
7. `sheet.delete_columns`;
8. receipts V3 e probes reais multiplataforma;
9. `range.move`;
10. operações estruturais de Table;
11. somente depois iniciar V3B para gráficos;
12. V3C para pivôs;
13. avaliar separadamente se V3D/VBA deve existir ou permanecer fora do produto.

## Estratégia de entrega

A V3 deve ser entregue em PRs pequenos, cada um mantendo a `main` utilizável:

- **PR V3A.1:** transformador + plano, sem mutação;
- **PR V3A.2:** insert/delete de linhas;
- **PR V3A.3:** insert/delete de colunas;
- **PR V3A.4:** ranges/Tables e documentação consolidada;
- **PR V3B:** gráficos, se os critérios de promoção forem atendidos;
- **PR V3C:** pivôs, se os critérios de promoção forem atendidos;
- **V3D:** projeto separado, somente se houver necessidade real de editar VBA.

Cada PR precisa ter probes reais próprios e não deve depender de “vamos corrigir depois” para preservar o workbook.

## Resultado esperado

Ao concluir a V3A, um agente deverá conseguir solicitar de forma segura, por exemplo:

> “insira duas colunas antes de `Preço` na tabela de insumos”

ou:

> “remova fisicamente as linhas desses registros e compacte a tabela”

O motor deverá primeiro explicar tudo que será deslocado, bloquear dependências que ainda não sabe reescrever e somente então produzir um candidato auditável do mesmo `carro chefe.xlsm`, sem cópias paralelas e sem depender do computador do proprietário.
