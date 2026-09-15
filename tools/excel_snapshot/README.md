# Exportador de snapshot da planilha XLSM

Ferramenta interna para transformar `anexos/financeiro/carro chefe.xlsm` em uma representação textual, determinística e versionável no Git.

## Escopo e fronteira de dependência

Esta ferramenta pertence exclusivamente a `tools/`. Ela **não é dependência de runtime** do site, da API, da Central Operacional, do ERP ou de qualquer serviço em produção. Suas bibliotecas Python ficam isoladas em `tools/excel_snapshot/requirements.txt` e não são adicionadas ao `package.json`, ao lockfile Node nem às imagens de produção.

O objetivo é permitir que agentes e pessoas revisem dados, fórmulas, tabelas estruturadas e código VBA sem depender da leitura direta do binário `.xlsm`.

## O que é exportado

A execução normal recria `anexos/financeiro/snapshot/` com:

- `manifest.json`: SHA-256 da fonte, SHA-256 de `xl/vbaProject.bin`, contagens e hashes de cada arquivo gerado;
- `workbook.json`: propriedades do workbook, abas, estados de visibilidade, nomes definidos e índice das tabelas;
- `formulas.json`: todas as fórmulas detectadas e o valor em cache salvo pelo Excel quando existir;
- `sheets/*.csv`: valores de cada aba, incluindo abas ocultas;
- `tables/*.json`: conteúdo das tabelas estruturadas, preservando colunas e ordem das linhas;
- `vba/index.json`: inventário dos módulos VBA e hash de cada código extraído;
- `vba/modules/*.bas`, `*.cls`, `*.frm` ou `*.txt`: código-fonte VBA em texto UTF-8;
- `README.md`: resumo gerado do snapshot.

A ferramenta **não executa macros**. A extração VBA é estática, feita com `oletools`. Recursos binários associados a UserForms/ActiveX, como `.frx`, não são convertidos em código-fonte; o código dos módulos é exportado e o `vbaProject.bin` é identificado por hash.

## Pré-requisitos

Use Python 3.10+ em um ambiente isolado. Exemplo Linux/macOS:

```bash
python3 -m venv .venv-xlsm-snapshot
. .venv-xlsm-snapshot/bin/activate
python -m pip install -r tools/excel_snapshot/requirements.txt
```

No PowerShell:

```powershell
py -m venv .venv-xlsm-snapshot
.\.venv-xlsm-snapshot\Scripts\Activate.ps1
python -m pip install -r tools/excel_snapshot/requirements.txt
```

O ambiente virtual é local e não deve ser versionado.

## Gerar ou atualizar o snapshot

Depois de editar/recalcular a planilha no Excel Desktop e salvá-la:

```bash
python tools/excel_snapshot/export.py
```

O exportador valida o pacote antes de processar, gera tudo em diretório temporário e só então troca o snapshot gerenciado. Um diretório de saída com arquivos manuais desconhecidos é recusado em vez de ser apagado.

## Verificar sincronização

```bash
python tools/excel_snapshot/export.py --check
```

O modo `--check` gera uma cópia temporária e compara todos os hashes com o snapshot versionado. Qualquer alteração no `.xlsm`, nas fórmulas, nas tabelas ou no VBA que mude a saída faz o comando retornar código diferente de zero.

O primeiro bootstrap já foi concluído. O CI usa a verificação estrita acima, sem `--allow-bootstrap`.

`--allow-bootstrap` permanece implementado somente como mecanismo controlado para uma inicialização excepcional: ele aceita `BOOTSTRAP_REQUIRED.json` apenas quando ainda não existe `manifest.json` e quando a fonte continua exatamente no SHA-256 registrado no marcador. Esse não é mais o estado normal deste repositório.

## Determinismo e finais de linha

Os arquivos gerados não incluem horário de geração variável. `manifest.json` registra `generated_at: null` de propósito e aponta o histórico Git como fonte do momento da geração. Isso permite que duas execuções sobre o mesmo binário produzam o mesmo conteúdo e que o CI compare hashes byte a byte.

Como o `--check` é byte a byte, `.gitattributes` força `LF` em `anexos/financeiro/snapshot/**`. Isso evita falsos positivos em checkouts Windows configurados para converter arquivos de texto para `CRLF`.

A regra versionada é:

```gitattributes
anexos/financeiro/snapshot/** text eol=lf
```

## Valores e fórmulas

São abertas duas visões do workbook:

1. `data_only=False`, para preservar fórmulas;
2. `data_only=True`, para ler o último valor em cache salvo pelo Excel.

Se uma fórmula não tiver valor em cache, o CSV usa a própria fórmula como fallback e `formulas.json` registra `cached_value: null`. O script **não possui o motor de cálculo do Excel** e não deve ser usado como prova de recálculo correto.

## Limites de segurança

Antes de abrir o workbook, o script:

- exige extensão `.xlsm`;
- limita o tamanho da fonte a 25 MiB;
- limita o pacote ZIP a 5.000 entradas;
- limita o total descompactado a 250 MiB;
- rejeita caminhos ZIP absolutos ou com `..`;
- rejeita entradas ZIP criptografadas;
- limita cada aba a 50.000 linhas e 512 colunas por padrão.

Os limites de linhas/colunas podem ser ajustados explicitamente com `--max-rows` e `--max-columns` quando houver justificativa.

## Fluxo recomendado de atualização

1. editar a planilha no Microsoft Excel Desktop;
2. executar recálculo completo e revisar erros;
3. salvar o `.xlsm` preservando macros;
4. executar `python tools/excel_snapshot/export.py`;
5. revisar o diff textual de `snapshot/`, principalmente `tables/`, `formulas.json` e `vba/modules/`;
6. versionar o `.xlsm` e o snapshot no mesmo commit/PR;
7. executar `python tools/excel_snapshot/export.py --check` ou deixar o CI confirmar que o snapshot corresponde exatamente à fonte.

## Governança

O `.xlsm` continua sendo a fonte binária desta representação. O snapshot é uma projeção para auditoria e leitura por agentes; ele não transforma preços, custos ou parâmetros legados em decisões aprovadas. O ERP continua destinado a ser a fonte transacional oficial, conforme `AGENTS.md` e a documentação do projeto.

Como o repositório é público, não devem ser versionados dados pessoais, credenciais, dados bancários ou transações operacionais sensíveis no `.xlsm` nem nos artefatos gerados.

## Testes

```bash
python -m unittest discover -s tools/excel_snapshot/tests -p 'test_*.py' -v
```

Os testes cobrem determinismo básico, preservação de fórmulas/tabelas, rejeição de ZIP com path traversal, proteção do bootstrap e proteção contra exclusão de diretório não gerenciado.
