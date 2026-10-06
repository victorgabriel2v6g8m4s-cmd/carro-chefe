# Blender Agent — CLI curta `blenagent`

## Objetivo

`blenagent` é o comando curto de operação do Blender Agent no Windows. Ele encapsula os scripts PowerShell em `tools/blender_agent/` para evitar repetir comandos longos com `powershell -NoProfile -ExecutionPolicy Bypass -File ...`.

O comando cobre ciclo de vida do bridge, diagnóstico e smoke tests mais usados.

## Instalação

Na raiz do repositório, execute uma única vez:

```powershell
.\blenagent.cmd install
```

O instalador:

- cria `%LOCALAPPDATA%\CarroChefe\bin\blenagent.cmd`;
- grava `CARRO_CHEFE_REPO` no escopo do usuário apontando para a raiz atual do repositório;
- adiciona `%LOCALAPPDATA%\CarroChefe\bin` ao `PATH` do usuário, se ainda não estiver presente.

Abra um novo PowerShell após a instalação. A partir daí, `blenagent` pode ser chamado de qualquer diretório.

Sem instalar, o wrapper da raiz do repositório continua disponível:

```powershell
.\blenagent.cmd <comando>
```

## Ciclo de vida

### Status

```powershell
blenagent status
```

Consulta o health do bridge. A CLI também diferencia sessão online, sessão stale e processo Blender ainda vivo com bridge inacessível.

### Iniciar

```powershell
blenagent start
```

Equivale ao launcher `start.ps1` com os defaults atuais de retry.

Opções úteis:

```powershell
blenagent start -MaxRetry 12 -RetrySeconds 10
blenagent start -BlenderExe "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
blenagent start -BlendFile "C:\caminho\arquivo.blend"
```

### Parar

```powershell
blenagent stop
```

O modo padrão é `checkpoint`: cria uma cópia de recuperação antes de encerrar o Blender.

Modos disponíveis:

```powershell
blenagent stop -Mode checkpoint
blenagent stop -Mode save
blenagent stop -Mode discard
```

`-Force` encerra o processo imediatamente e deve ser usado somente como contingência quando o bridge está inacessível e o estado atual pode ser descartado ou já foi salvo/checkpointado:

```powershell
blenagent stop -Force
```

### Reiniciar

```powershell
blenagent restart
```

É o fluxo recomendado após alterações no código carregado dentro do Blender. O comando executa, em ordem:

```text
checkpoint/stop
  -> aguarda encerramento
  -> start
  -> aguarda sessão válida do bridge
```

Também aceita os mesmos parâmetros de lifecycle:

```powershell
blenagent restart -Mode save
blenagent restart -Mode discard
blenagent restart -MaxRetry 12 -RetrySeconds 10
blenagent restart -Force
```

Quando existe apenas um arquivo de sessão stale e o PID correspondente já morreu, a CLI pode limpar essa sessão e iniciar novamente. Se o PID ainda estiver vivo mas o bridge estiver inacessível, a CLI não deve matar o processo silenciosamente; o operador precisa decidir se `-Force` é seguro.

## Smoke tests

### Imagens de referência e textura

```powershell
blenagent image-smoke -OpenImages
```

Por padrão usa:

```text
.runtime\blender-agent\assets\referencia.jpg
```

Outra imagem pode ser fornecida explicitamente:

```powershell
blenagent image-smoke -ImagePath "mídias\referencias\produto.jpg" -OpenImages
```

O smoke verifica status do bridge, cria stage de histórico, adiciona Image Empty, captura a referência, remove a referência, cria mesh com UV, aplica imagem ao Base Color, captura em `MATERIAL` e verifica auto-history.

### Sculpt

```powershell
blenagent sculpt-smoke -OpenImages
```

### Recipes 3D

```powershell
blenagent recipe-smoke -OpenImages
```

### Loop iterativo V0.5

```powershell
blenagent iteration-smoke -OpenImages
```

### Contexto e histórico

```powershell
blenagent context-smoke -OpenImages
```

### Smoke base

```powershell
blenagent smoke -OpenImages
```

## MCP

```powershell
blenagent install-mcp
```

Executa o instalador MCP do Blender Agent mantendo a mesma política de isolamento em `.runtime/blender-agent/mcp-venv/`.

## Ajuda

```powershell
blenagent help
```

## Parâmetros comuns

| Parâmetro | Uso |
|---|---|
| `-Mode checkpoint|save|discard` | política de encerramento |
| `-Force` | recuperação quando o bridge não responde; pode perder alterações |
| `-BlenderExe PATH` | executável Blender explícito |
| `-BlendFile PATH` | arquivo `.blend` a abrir no start |
| `-MaxRetry N` | quantidade de tentativas de startup |
| `-RetrySeconds N` | janela por tentativa |
| `-PythonExe PATH` | Python usado pelos clientes/smokes |
| `-ImagePath PATH` | imagem do `image-smoke` |
| `-OpenImages` | abre artefatos visuais produzidos pelo smoke |

## Exemplos do fluxo de desenvolvimento

Depois de alterar código carregado pelo processo Blender:

```powershell
blenagent restart
blenagent status
```

Depois de alterar suporte a imagens:

```powershell
blenagent restart
blenagent image-smoke -OpenImages
```

Para diagnóstico rápido:

```powershell
blenagent status
blenagent help
```

## Compatibilidade

A CLI curta é apenas uma camada operacional. Os scripts originais em `tools/blender_agent/*.ps1` continuam sendo a implementação canônica e podem ser executados diretamente para debug de baixo nível.
