# Blender Agent — imagens de referência e texturas

## Objetivo

O runtime V0.5 passou a oferecer duas actions semânticas para eliminar a dependência de UI manual ao trabalhar com imagens:

- `reference.image.add` — insere uma imagem como **Image Empty** de referência na cena/viewport;
- `material.image_texture` — carrega uma imagem e conecta o nó `ShaderNodeTexImage` ao **Base Color** do `Principled BSDF` de um objeto.

Essas actions fazem parte do runtime `v05-runtime-compat-20261005.4` e são expostas por RPC, CLI tipada e MCP V0.5.

Para operação diária no Windows, prefira a CLI curta `blenagent`; o uso completo está em [BLENDER_AGENT_CLI.md](./BLENDER_AGENT_CLI.md).

## Segurança de arquivos

O agente não recebe acesso irrestrito ao disco. A imagem deve estar em uma destas raízes:

1. dentro do repositório Carro Chefe;
2. dentro de `.runtime/blender-agent`;
3. dentro de uma raiz adicional explicitamente autorizada por `CC_BLENDER_ASSET_ROOT`.

Exemplo:

```powershell
$env:CC_BLENDER_ASSET_ROOT = "C:\Users\valdi\Pictures\carro-chefe-referencias"
```

Extensões aceitas:

```text
.png .jpg .jpeg .webp .tif .tiff .exr .hdr
```

Caminhos relativos são resolvidos a partir da raiz do repositório. Assim, o formato preferido para assets versionados é:

```text
mídias/referencias/baguete-frontal.jpg
```

## 1. Inserir imagem de referência

CLI tipada de baixo nível:

```powershell
python -m tools.blender_agent.image_cli reference-add "mídias/referencias/baguete-frontal.jpg" `
  --name REF_Baguete_Frontal `
  --rotation-deg 90 0 0 `
  --display-size 6 `
  --opacity 0.55 `
  --depth BACK
```

A action cria um objeto Empty do tipo imagem, não renderizável, e devolve:

- nome do objeto;
- datablock da imagem;
- caminho resolvido;
- resolução da imagem;
- posição/rotação/escala;
- display size;
- opacity;
- depth/side;
- estado de `pack`.

Parâmetros principais:

| Campo | Default | Uso |
|---|---:|---|
| `path` | obrigatório | imagem permitida |
| `name` | `REF_<stem>` | nome do Image Empty |
| `location` | `[0,0,0]` | posição 3D |
| `rotation_deg` | `[90,0,0]` | orientação em graus |
| `scale` | `[1,1,1]` | escala do Empty |
| `display_size` | `5.0` | tamanho visual |
| `opacity` | `0.55` | transparência no viewport |
| `depth` | `BACK` | `DEFAULT`, `FRONT`, `BACK` |
| `side` | `DOUBLE_SIDED` | `DOUBLE_SIDED`, `FRONT`, `BACK` |
| `pack` | `false` | embute a imagem no `.blend` |

A action exige **Object Mode**. Se uma sessão Sculpt estiver ativa, finalize-a antes de adicionar a referência.

## 2. Atribuir imagem ao material

CLI tipada de baixo nível:

```powershell
python -m tools.blender_agent.image_cli material-texture CC_Baguette `
  "mídias/texturas/pao-basecolor.jpg" `
  --material-name CC_Baguette_Texture `
  --node-name CC_BaseColorImage
```

A action:

1. seleciona o objeto pelo nome;
2. cria ou reutiliza o material solicitado;
3. garante `use_nodes=true`;
4. localiza ou cria um `Principled BSDF`;
5. cria/reutiliza um `ShaderNodeTexImage`;
6. carrega a imagem;
7. conecta `Color -> Base Color`;
8. opcionalmente conecta `Alpha -> Alpha`;
9. atribui o material ao primeiro slot do objeto;
10. informa os UV maps existentes.

Parâmetros principais:

| Campo | Default | Uso |
|---|---:|---|
| `name` | obrigatório | objeto alvo |
| `path` | obrigatório | imagem permitida |
| `material_name` | `<obj>_ImageMaterial` | material a usar/criar |
| `node_name` | `CC_BaseColorImage` | nó Image Texture |
| `colorspace` | `sRGB` | color space da imagem |
| `extension` | `REPEAT` | `REPEAT`, `EXTEND`, `CLIP`, `MIRROR` |
| `use_alpha` | `false` | conecta alpha ao Principled |
| `pack` | `false` | embute imagem no `.blend` |

Se o objeto for MESH e não possuir UV map, a action retorna `warning` e `has_uv=false`. A action **não inventa UV automaticamente**, porque isso mudaria a topologia/mapeamento de forma implícita.

## 3. Smoke test pela CLI curta

O caminho preferido para validar as duas actions no Windows é:

```powershell
blenagent image-smoke -OpenImages
```

O arquivo padrão é:

```text
.runtime\blender-agent\assets\referencia.jpg
```

Outra imagem pode ser usada com:

```powershell
blenagent image-smoke -ImagePath "mídias\referencias\produto.jpg" -OpenImages
```

O smoke executa sete etapas:

1. confirma health do bridge;
2. cria um stage de auto-history;
3. adiciona a imagem como referência;
4. captura a referência e remove o Image Empty;
5. cria um mesh com UV e aplica a imagem ao Base Color;
6. captura o mesh em shading `MATERIAL`;
7. confirma que as duas actions foram registradas no auto-history.

As capturas ficam em:

```text
.runtime/blender-agent/history/<stage-id>/attachments/
```

## 4. Uso via MCP V0.5

Ferramentas novas:

```text
blender_reference_image_add
blender_material_image_texture
```

Fluxo recomendado para modelagem a partir de foto:

```text
blender_status
  -> blender_reference_image_add
  -> ajustar posição/orientação da referência
  -> modelar objeto
  -> captures focados
  -> comparar com a referência
```

Fluxo recomendado para textura:

```text
blender_status
  -> confirmar target e UV
  -> checkpoint
  -> blender_material_image_texture
  -> viewport MATERIAL/RENDERED
  -> capture
  -> avaliar visualmente
```

## 5. Limitações atuais

Nesta primeira versão:

- `material.image_texture` conecta imagem apenas ao **Base Color** do Principled BSDF;
- normal maps, roughness maps, displacement e ORM ainda não possuem actions dedicadas;
- UV unwrap automático não é executado;
- imagens de referência são objetos da cena e aparecem nos workspaces 3D que exibem essa cena; a action não cria uma cópia por workspace;
- as duas actions são runtime actions diretas; ainda não fazem parte do schema puro de recipe/iteration para validação offline.

Essas limitações são intencionais para manter a primeira entrega pequena, previsível e reversível.

## 6. Execução real registrada — 2026-10-05

Smoke executado em Windows com o runtime:

```text
v05-runtime-compat-20261005.4
```

Comando:

```powershell
blenagent image-smoke -OpenImages
```

Resultado registrado:

```text
1/7 bridge status
2/7 create image smoke stage
3/7 add reference image
4/7 capture reference and remove it
5/7 create UV sphere and assign image texture
6/7 capture textured mesh
7/7 verify auto-history

Blender Agent image smoke test OK.
```

Artefatos gerados na execução:

```text
.runtime/blender-agent/history/20261006T022511Z-Image-actions-smoke/attachments/image-smoke-reference.png
.runtime/blender-agent/history/20261006T022511Z-Image-actions-smoke/attachments/image-smoke-texture.png
```

Observação visual do operador: a imagem de referência foi vista sendo inserida no viewport durante o smoke. A captura final da textura não apresentou uma diferença visual muito evidente nessa imagem de teste específica, embora a action de material tenha concluído, a captura tenha sido produzida e o auto-history tenha registrado sucesso. Portanto:

- **Image Empty / referência:** validado em execução real e confirmado visualmente;
- **pipeline de atribuição Base Color + UV + captura + history:** validado pelo smoke real;
- **legibilidade visual da textura:** ainda merece um teste adicional com uma imagem diagnóstica de alto contraste para confirmar o mapeamento de forma inequívoca.

## 7. Critério de validação real

Estado atual:

1. iniciar runtime `.4` — **validado**;
2. adicionar referência JPG/PNG e confirmar que aparece no viewport — **validado**;
3. capturar viewport com a referência presente — **validado**;
4. atribuir imagem Base Color a mesh com UV — **validado pelo smoke**;
5. mudar shading para `MATERIAL` e confirmar textura visualmente — **parcial; captura produzida, diferença visual pouco evidente**;
6. validar auto-history das duas actions — **validado**;
7. confirmar que caminho fora das raízes permitidas é rejeitado — coberto por teste automatizado, ainda pode ser repetido em smoke real se necessário;
8. confirmar que `CC_BLENDER_ASSET_ROOT` permite pasta externa explicitamente autorizada — coberto por teste automatizado, ainda pode ser repetido em smoke real se necessário.

Para fechar o item 5 de modo inequívoco, use no próximo teste uma textura de diagnóstico com quadrantes ou faixas de cores contrastantes e confirme sua orientação sobre o mesh.
