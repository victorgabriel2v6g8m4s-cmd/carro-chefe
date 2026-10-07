# Blender Agent — comparação visual mesh × referência

## Estado

Implementação inicial do contrato definido em `BLENDER_AGENT_MESH_REFERENCE_COMPARE.md`.

A ferramenta gera um PNG de comparação 2D em que a foto de referência fica como fundo e a projeção da malha aparece por cima com:

- preenchimento translúcido sem acúmulo por face;
- linhas da topologia real;
- contorno externo da silhueta;
- alinhamento `auto`, `manual`, `anchors` ou `none`;
- receipt JSON reproduzível e registro no auto-history.

O resultado é uma **visualização comparativa para edição**, não uma medição metrológica e não uma aprovação automática do produto.

## Instalação

A composição usa Pillow em um ambiente isolado do Blender Agent:

```powershell
blenagent install-compare
```

O instalador cria:

```text
.runtime/blender-agent/compare-venv/
```

Como a leitura da cena adicionou a action `mesh.comparison_snapshot`, atualize a branch e reinicie o bridge depois de instalar esta versão:

```powershell
git pull --ff-only origin feature/blender-agent-bridge
blenagent restart
blenagent status
```

O runtime esperado para esta entrega é `v05-runtime-compat-20261006.5`.

## Smoke real

Com a referência padrão em `.runtime/blender-agent/assets/referencia.jpg`:

```powershell
blenagent compare-smoke -OpenImages
```

Outra referência:

```powershell
blenagent compare-smoke -ImagePath "mídias/produtos/cooklily/referencia.jpg" -OpenImages
```

O smoke cria um cubo temporário, obtém sua geometria pela action read-only da cena, gera PNG + receipt, verifica o evento de history e remove o cubo ao final.

## CLI canônica

A CLI completa é:

```powershell
.runtime\blender-agent\compare-venv\Scripts\python.exe `
  -m tools.blender_agent.compare_cli compose `
  --reference ".runtime\blender-agent\assets\referencia.jpg" `
  --source scene `
  --object "NomeExatoDoObjeto" `
  --view FRONT `
  --align auto `
  --opacity 50 `
  --lines true `
  --border true `
  --json
```

Se `--output` for omitido, o arquivo é criado em `.runtime/blender-agent/exports/`. Saídas explícitas também precisam permanecer dentro dessa pasta.

## Fontes de geometria

### Cena aberta no Blender

```powershell
.runtime\blender-agent\compare-venv\Scripts\python.exe `
  -m tools.blender_agent.compare_cli compose `
  --reference ".runtime\blender-agent\assets\referencia.jpg" `
  --source scene `
  --object "CookLily_Garrafa" `
  --view FRONT `
  --align auto
```

`--source scene` usa `mesh.comparison_snapshot`, que:

- exige nome exato do objeto;
- aceita somente `MESH` nesta primeira versão;
- lê a malha avaliada pelo depsgraph;
- aplica `matrix_world` uma única vez e devolve coordenadas `WORLD`;
- informa counts, bounds, unidade da cena e hashes de geometria/transform;
- falha em vez de truncar quando excede os limites de vertices/faces/payload;
- não muda seleção, modo, workspace, visibilidade nem arquivo `.blend`;
- rejeita Geometry Nodes avaliados nesta primeira versão, em vez de fingir que o resultado é equivalente.

### Recipe JSON

```powershell
.runtime\blender-agent\compare-venv\Scripts\python.exe `
  -m tools.blender_agent.compare_cli compose `
  --reference ".runtime\blender-agent\assets\referencia.jpg" `
  --source recipe `
  --recipe "tools/blender_agent/recipes/exemplo.json" `
  --object "NomeExatoDoObjeto" `
  --view FRONT `
  --align manual
```

A leitura offline da recipe suporta nesta entrega:

- `object.add_mesh` declarativo com `vertices` + `faces`;
- `object.add_primitive` do tipo `cube`;
- `object.transform` posterior para `location`, `rotation_deg` e `scale`.

Se a recipe depender de `modifier.add` ou `object.irregularize`, o receipt inclui warning porque esses efeitos não são reproduzidos offline. Para comparar a geometria realmente avaliada, execute a recipe no Blender e use `--source scene`.

## Convenções de projeção

| View | Horizontal | Vertical |
|---|---|---|
| `FRONT` | X | Z |
| `RIGHT` | Y | Z |
| `TOP` | X | Y |
| `CAMERA` | projeção da câmera Blender | projeção da câmera Blender |

No raster final, Y cresce para baixo. A inversão é aplicada explicitamente na conversão para pixels.

`CAMERA` exige `--source scene` e uma câmera ativa válida, porque a primeira versão não tenta inferir câmera a partir de recipe ou foto.

## Alinhamento

### Auto

```powershell
--align auto
```

Ordem atual de evidências:

1. `--reference-mask` explícita;
2. alpha da imagem;
3. segmentação simples quando os cantos parecem fundo uniforme;
4. se nenhuma evidência for confiável, score baixo + warnings.

O auto-fit retorna método, score/confiança, escala e offsets. Ele não é vendido como perfeito. Para exigir confiança mínima:

```powershell
--align auto --strict-alignment
```

O limiar default é `0.65` e pode ser configurado por `CC_BLENDER_COMPARE_AUTO_CONFIDENCE`.

Ajustes manuais podem refinar o auto-fit:

```powershell
--align auto --scale 1.02 --offset-x -8 --offset-y 3 --rotate 0.4
```

### Manual

```powershell
--align manual --scale 1.0 --offset-x 0 --offset-y 0 --rotate 0
```

### Anchors

Cada anchor usa:

```text
PROJECTED_X,PROJECTED_Y,IMAGE_X,IMAGE_Y
```

As coordenadas projetadas e da imagem são pixels no canvas de saída. Exemplo:

```powershell
--align anchors `
  --anchor "120,300,118,296" `
  --anchor "540,302,548,301"
```

Dois anchors resolvem uma transformação de similaridade; três ou mais permitem observar residuals e detectar inconsistências melhor. O receipt guarda anchors, transformação e erro residual.

## Camadas visuais

Exemplo completo:

```powershell
.runtime\blender-agent\compare-venv\Scripts\python.exe `
  -m tools.blender_agent.compare_cli compose `
  --reference ".runtime\blender-agent\assets\referencia.jpg" `
  --source scene `
  --object "CookLily_Garrafa" `
  --view FRONT `
  --align auto `
  --fill true `
  --opacity 45 `
  --fill-color "0,190,255" `
  --lines true `
  --line-mode all `
  --line-color "255,210,0" `
  --line-opacity 90 `
  --line-width 1 `
  --border true `
  --border-color "255,60,60" `
  --border-width 3 `
  --background original `
  --json
```

`line-mode`:

- `all`: desenha todas as arestas únicas da topologia projetada;
- `silhouette`: desenha a borda da silhueta preenchida;
- `visible`: é rejeitado nesta versão porque ainda não existe oclusão confiável. A ferramenta não rotula linhas ocultas como “visíveis”.

## Diagnóstico sem gravar

```powershell
.runtime\blender-agent\compare-venv\Scripts\python.exe `
  -m tools.blender_agent.compare_cli compose `
  --reference ".runtime\blender-agent\assets\referencia.jpg" `
  --source scene `
  --object "CookLily_Garrafa" `
  --view FRONT `
  --align auto `
  --dry-run `
  --json
```

`--dry-run` valida fonte, projeção e alinhamento, mas não grava PNG ou receipt.

## Artefatos e receipt

A execução normal gera:

```text
.runtime/blender-agent/exports/<nome>.png
.runtime/blender-agent/exports/<nome>.receipt.json
```

Opcionalmente:

```powershell
--align-report ".runtime/blender-agent/exports/alignment.json"
```

O receipt registra, entre outros:

- tipo/fonte da geometria e objeto;
- hash da recipe/plano quando aplicável;
- hashes da geometria e transform;
- referência + SHA-256;
- máscara + SHA-256 quando usada;
- view, resolução e convenção de projeção;
- estratégia e parâmetros de alinhamento;
- parâmetros de fill/linhas/borda/background;
- counts da malha;
- versão do runtime e dependências;
- PNG final + SHA-256;
- stage do auto-history;
- warnings e aviso explícito de que o resultado não é metrologia.

Quando history está habilitado, a action lógica `mesh.reference.compare` registra PNG, receipt e align report como anexos do evento. O receipt não é regravado depois desse registro, para manter o SHA armazenado no histórico consistente.

## Segurança e limites

Defaults atuais:

- 8.000 vertices para snapshot/composição;
- 16.000 faces;
- 120.000 índices de faces;
- payload de snapshot abaixo de 1 MB;
- 4096 px por eixo e 16.777.216 pixels por output;
- PNG final limitado a 32 MB.

Os limites podem ser ajustados por variáveis `CC_BLENDER_COMPARE_*`, sempre dentro de hard caps definidos no código. A ferramenta falha explicitamente em vez de fazer truncamento silencioso.

Entradas seguem as mesmas raízes autorizadas de `assets.py`: repositório, `.runtime/blender-agent` ou `CC_BLENDER_ASSET_ROOT` explícita.

## Validação ainda necessária

Os testes automatizados cobrem projeção, transformação, deduplicação de arestas, alinhamento manual/anchors, camadas de raster, receipt, segurança de output e contrato read-only da action.

Antes de considerar a entrega validada de ponta a ponta ainda é obrigatório executar no Windows + Blender real:

```powershell
blenagent install-compare
blenagent restart
blenagent compare-smoke -OpenImages
```

Depois, executar um caso real da CookLily em `FRONT` e preferencialmente `RIGHT`, conferindo visualmente imagem, alinhamento e receipt. O PR deve permanecer draft até essa validação real.
