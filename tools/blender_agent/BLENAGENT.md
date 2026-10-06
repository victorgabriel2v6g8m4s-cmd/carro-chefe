# `blenagent` — CLI curta do Blender Agent

O comando `blenagent` evita repetir `powershell -NoProfile -ExecutionPolicy Bypass -File tools/blender_agent/...` e concentra o ciclo de vida do bridge em uma interface curta.

## Instalação no Windows

Na raiz do repositório, depois de atualizar a branch:

```powershell
.\blenagent.cmd install
```

O instalador cria `%LOCALAPPDATA%\CarroChefe\bin\blenagent.cmd`, registra `CARRO_CHEFE_REPO` para o usuário atual e adiciona esse diretório ao `PATH` do usuário. O shim global usa a variável de ambiente em vez de gravar o caminho Unicode do repositório dentro do `.cmd`.

Abra uma nova janela do PowerShell depois da instalação. A partir daí:

```powershell
blenagent status
blenagent start
blenagent stop
blenagent restart
```

`restart` faz `stop` seguido de `start`. Se existir uma sessão ativa, o encerramento usa `checkpoint` por padrão antes de abrir um novo Blender Agent. Se não existir sessão, `restart` apenas inicia uma nova.

Opções de ciclo de vida:

```powershell
blenagent stop -Mode checkpoint
blenagent stop -Mode save
blenagent stop -Mode discard
blenagent restart -Mode checkpoint
blenagent restart -BlenderExe "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
blenagent start -BlendFile "C:\caminho\arquivo.blend"
```

`-Force` continua sendo contingência e pode perder alterações não salvas/checkpointed:

```powershell
blenagent restart -Force
```

## Smoke tests

O smoke de imagens usa `.runtime\blender-agent\assets\referencia.jpg` por padrão:

```powershell
blenagent image-smoke -OpenImages
```

Outra imagem:

```powershell
blenagent image-smoke -ImagePath ".runtime\blender-agent\assets\outra.jpg" -OpenImages
```

Outros atalhos:

```powershell
blenagent smoke -OpenImages
blenagent context-smoke -OpenImages
blenagent sculpt-smoke -OpenImages
blenagent recipe-smoke -OpenImages
blenagent iteration-smoke -OpenImages
blenagent install-mcp
```

Ajuda:

```powershell
blenagent help
```

## Uso antes da instalação global

O shim versionado na raiz pode ser chamado diretamente:

```powershell
.\blenagent.cmd restart
.\blenagent.cmd image-smoke -OpenImages
```

Isso permite usar a interface curta imediatamente, mesmo antes de abrir um novo terminal com o `PATH` atualizado.
