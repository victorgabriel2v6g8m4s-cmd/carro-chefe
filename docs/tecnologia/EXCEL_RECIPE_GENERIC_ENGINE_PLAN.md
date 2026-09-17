# Excel Recipe Engine — plano de reutilização

## Objetivo

Transformar `tools/excel_recipe` em um **motor reutilizável de edição segura de Excel por receitas JSON**, mantendo a planilha financeira do Carro Chefe apenas como uma integração/perfil de uso do motor, e não como dependência arquitetural do core.

O eixo de reutilização é independente do roadmap V3 de capacidade OOXML. Uma versão pode avançar em segurança estrutural (V3A/V3B/V3C/V3D) e, em paralelo, avançar em generalidade (G1/G2/G3/G4).

## Invariantes que não mudam

A generalização nunca reduz os guardrails existentes:

- SHA-256 exato do workbook antes da escrita;
- SHA-256 de VBA quando a receita o fixa;
- VBA nunca é executado;
- firewall OOXML continua fail-closed;
- partes não compreendidas não são regravadas por conveniência;
- candidato temporário, reabertura, validação e instalação atômica;
- falha de pós-processamento restaura o workbook anterior;
- receipts continuam determinísticos;
- paths continuam confinados ao workspace/repositório autorizado;
- nenhuma extensão de formato é aceita sem fixtures e testes proporcionais.

## Arquitetura alvo

```text
Receita JSON
    |
    v
Excel Recipe Engine (core genérico)
    |-- parser/validação
    |-- PackageEditor OOXML
    |-- operações V1/V2/V3
    |-- planner/dependency graph
    |-- firewall/rollback/receipt
    |
    +--> integrações opcionais
         |-- snapshot textual
         |-- sync Git seguro
         |-- probes de um workbook específico
         |-- políticas/perfis de domínio

Carro Chefe Workbook Integration
    |-- anexos/financeiro/carro chefe.xlsm
    |-- anexos/financeiro/snapshot
    |-- recipes/probes canônicos
    `-- validações específicas do projeto
```

O core deve depender apenas de contratos OOXML e da receita. Nenhuma operação de célula, Table, fórmula, dependência ou transformação física pode depender do nome `carro chefe.xlsm`, das abas atuais ou dos IDs de negócio do Carro Chefe.

## G1 — desacoplamento do workbook e dos artefatos

**Status: implementado nesta entrega.**

### Contrato

Qualquer `.xlsm` compatível dentro do repositório pode ser apontado por `workbook.path`.

Para workbooks genéricos:

- o receipt padrão fica ao lado lógico do workbook em `recipes/receipts/`;
- snapshot é **opt-in**;
- quando snapshot é habilitado, `workbook.snapshot.output` é obrigatório;
- o mesmo exportador determinístico recebe explicitamente `--source` e `--output`;
- falha no snapshot restaura o workbook e não publica o receipt;
- `sync` aceita `--workbook` para proteger qualquer `.xlsm` selecionado contra overwrite local.

Para `anexos/financeiro/carro chefe.xlsm`, a compatibilidade é mantida:

- snapshot padrão continua em `anexos/financeiro/snapshot`;
- receipt padrão continua em `anexos/financeiro/recipes/receipts/`;
- receitas existentes sem bloco `snapshot` continuam funcionando com a mesma semântica.

### Exemplo genérico mínimo

```json
{
  "schema_version": 1,
  "id": "ajuste-cliente-a",
  "workbook": {
    "path": "anexos/clientes/a/financeiro.xlsm",
    "expected_sha256": "<sha256>",
    "expected_vba_sha256": "<sha256-vba>"
  },
  "operations": [
    {
      "op": "cell.set",
      "sheet": "Dados",
      "cell": "B2",
      "value": "Exemplo"
    }
  ]
}
```

### Exemplo genérico com snapshot

```json
{
  "schema_version": 1,
  "id": "ajuste-com-snapshot",
  "workbook": {
    "path": "anexos/clientes/a/financeiro.xlsm",
    "expected_sha256": "<sha256>",
    "snapshot": {
      "enabled": true,
      "output": "anexos/clientes/a/snapshot"
    }
  },
  "operations": []
}
```

## G2 — compatibilidade de formatos e capability report

**Status: planejado.**

Antes de abrir suporte a novos formatos, criar um comando de inspeção, por exemplo:

```text
python -m tools.excel_recipe inspect <workbook>
```

O relatório deverá classificar, sem escrever:

- formato e Content Types;
- presença de VBA;
- ActiveX/OLE/VML;
- DrawingML/ChartML;
- PivotTable/PivotCache;
- QueryTables/connections;
- external links;
- quantidade de abas, Tables, fórmulas e defined names;
- capacidades do motor que podem operar naquele arquivo;
- blockers conhecidos.

A promoção inicial prevista é de `.xlsx`, porque compartilha o pacote OOXML SpreadsheetML e não exige preservar `vbaProject.bin`. `.xls`, `.xlsb`, `.ods` e formatos não OOXML não devem ser tratados como variações triviais; exigem arquitetura e fixtures próprias.

Critério de promoção de um formato:

1. parser/package validation específico;
2. fixture sintética;
3. round-trip sem alteração para pacote no-op;
4. happy path de edição;
5. proteção de partes desconhecidas;
6. teste de rollback;
7. CI Linux e Windows;
8. documentação de limitações.

## G3 — boundary configurável fora deste repositório

**Status: planejado.**

Hoje o boundary de segurança é o root do repositório. Para transformar o motor em ferramenta reutilizável fora do Carro Chefe, o próximo passo será separar `repo_root` de `workspace_root` e exigir que o chamador forneça explicitamente o diretório autorizado.

Requisitos:

- nunca aceitar paths fora do workspace autorizado;
- não inferir permissões a partir do diretório atual;
- receipts e snapshots devem permanecer dentro do mesmo boundary, salvo capability explícita futura;
- CLI deve mostrar claramente source, destination e efeitos antes da escrita;
- biblioteca Python deve continuar recebendo um root explícito nos testes e integrações.

## G4 — profiles/integrations

**Status: planejado; implementar somente quando houver necessidade concreta.**

Perfis não devem contaminar o core. Um perfil poderá declarar:

- caminho/default de workbook;
- snapshot esperado;
- probes de aceitação;
- convenção de receipts;
- validações de domínio adicionais;
- comandos de sync/CI.

Exemplo conceitual:

```text
profiles/
  generic/
  carro_chefe_financeiro/
```

O perfil `carro_chefe_financeiro` poderá manter os probes reais, hashes esperados e integração com `anexos/financeiro/`. O perfil `generic` não terá regras de negócio.

Não criar registry/plugin framework antes de existir ao menos um segundo perfil com requisitos próprios. G1 resolve a reutilização imediata sem abstração artificial.

## Relação com V3B/V3C/V3D

A generalização não altera a regra de promoção de partes OOXML:

- V3B: DrawingML/ChartML;
- V3C: PivotTable/PivotCache;
- V3D: subsistema separado para VBA, se e somente se houver modelo seguro.

Quando uma dessas fases for implementada, a capacidade deve ser testada tanto com fixture genérica quanto, quando aplicável, com probe do workbook do Carro Chefe. O workbook real é um gate de integração, não a especificação do motor.

## Critério de pronto do motor reutilizável

O motor poderá ser chamado de reutilizável fora do projeto quando:

- nenhum módulo core depender de nomes de abas/tabelas/produtos do Carro Chefe;
- source/receipt/snapshot forem configuráveis;
- houver `inspect`/capability report;
- ao menos `.xlsm` e `.xlsx` tiverem suites explícitas de compatibilidade;
- workspace root configurável estiver implementado;
- documentação tiver exemplos sem referências ao Carro Chefe;
- integração do Carro Chefe estiver isolada e continuar passando seus probes reais;
- CI provar comportamento equivalente em Linux e Windows.

Até esse ponto, a formulação correta é: **core reutilizável para `.xlsm` compatíveis dentro do repositório, com integração padrão do Carro Chefe**.
