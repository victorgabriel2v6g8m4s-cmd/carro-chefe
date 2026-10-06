# Blender Agent — imagens de referência e texturas

## Objetivo

O runtime V0.5 passou a oferecer duas actions semânticas para eliminar a dependência de UI manual ao trabalhar com imagens:

- `reference.image.add` — insere uma imagem como **Image Empty** de referência na cena/viewport;
- `material.image_texture` — carrega uma imagem e conecta o nó `ShaderNodeTexImage` ao **Base Color** do `Principled BSDF` de um objeto.

Essas actions fazem parte do runtime `v05-runtime-compat-20261005.4` e são expostas por RPC, CLI tipada e MCP V0.5.

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

CLI tipada:

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

CLI tipada:

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

## 3. Uso via MCP V0.5

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

## 4. Limitações atuais

Nesta primeira versão:

- `material.image_texture` conecta imagem apenas ao **Base Color** do Principled BSDF;
- normal maps, roughness maps, displacement e ORM ainda não possuem actions dedicadas;
- UV unwrap automático não é executado;
- imagens de referência são objetos da cena e aparecem nos workspaces 3D que exibem essa cena; a action não cria uma cópia por workspace;
- as duas actions são runtime actions diretas; ainda não fazem parte do schema puro de recipe/iteration para validação offline.

Essas limitações são intencionais para manter a primeira entrega pequena, previsível e reversível.

## 5. Critério de validação real

Antes de considerar a capacidade validada no Windows 10 + Blender 5.2 LTS:

1. iniciar runtime `.4`;
2. adicionar uma referência JPG/PNG e confirmar que aparece no viewport;
3. capturar a viewport com a referência presente;
4. atribuir uma imagem Base Color a um mesh com UV;
5. mudar shading para `MATERIAL` e confirmar a textura visualmente;
6. validar auto-history das duas actions;
7. confirmar que caminho fora das raízes permitidas é rejeitado;
8. confirmar que `CC_BLENDER_ASSET_ROOT` permite uma pasta externa explicitamente autorizada.
