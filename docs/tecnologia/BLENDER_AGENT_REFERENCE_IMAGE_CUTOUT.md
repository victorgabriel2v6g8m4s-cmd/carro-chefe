# Recorte, contorno e composição de referência fotográfica

## Objetivo e escopo

Este roteiro descreve como transformar uma fotografia de referência em um PNG com fundo realmente transparente, contorno externo, marcações internas opcionais e camadas com opacidades controladas. O fluxo serve para garrafas e outros objetos fotografados; não depende da imagem 19 nem de uma geometria Blender.

O resultado é um recurso visual para inspeção e comparação. Ele não corrige a malha 3D, não calcula dimensões físicas e não substitui revisão humana do recorte. O Blender Agent pode consumir o resultado depois, mas o processamento de pixels permanece fora do processo Blender.

## Resultado de referência e parâmetros

Na execução de referência da garrafa:

- entrada: fotografia original 19;
- recorte: PNG RGBA produzido pelo skill `background-remove`, método `rembg`/U²-Net;
- região mantida: garrafa, com o material no topo e a sombra de piso removidos por ajuste manual do matte daquele enquadramento;
- contorno externo: ciano;
- marcações internas: amarelo, para linhas moldadas identificáveis, garganta/rosca, argola e junção com o ombro;
- opacidade da fotografia: 55%;
- máscara vermelha sólida: 15%, alinhada ao mesmo matte;
- contornos e marcações: 100% opacos, desenhados por cima das duas camadas;
- saída: PNG RGBA, com pixels de fundo totalmente transparentes.

Os valores de corte vertical usados naquela foto são específicos daquele arquivo e **não** devem ser copiados para outras referências. Para uma nova fotografia, recalcule a máscara e examine as bordas.

## Ferramentas e skills

### Skill usada

`background-remove` remove o fundo por segmentação U²-Net (`rembg`) e exporta PNG com canal alfa. No Windows desta execução, o ambiente Python isolado foi:

```text
C:/Users/valdi/.codex/tools/background-remove/.venv/Scripts/python.exe
```

O script de entrada da skill fica em:

```text
C:/Users/valdi/.codex/skills/background-remove/scripts/background_remove.py
```

O modelo U²-Net é lido do cache configurado em `U2NET_HOME`. Esses caminhos pertencem à instalação local do Codex; em outra máquina, localize a skill e o runtime instalados em vez de presumir que os mesmos caminhos existem. Não instale dependências no Python global só para seguir este roteiro.

### Composição precisa

O PNG final foi composto deterministicamente com Pillow/NumPy em uma execução Python local. A ferramenta de geração/edição por IA foi tentada como alternativa visual, mas produziu um quadriculado incorporado e alterou pixels/traços; essa saída foi descartada. Para porcentagens exatas, alinhamento pixel a pixel e alfa verificável, use composição determinística, não geração de imagem.

O programa Blender não participa da remoção de fundo nem da composição 2D. Não se deve executar código Python arbitrário dentro do Blender para fazer esse trabalho.

## Convenção das camadas

Use a mesma dimensão e origem de coordenadas em todas as camadas:

1. **Fotografia original**: RGB da foto, alfa multiplicado pelo matte do objeto e pela opacidade escolhida (55% neste exemplo).
2. **Máscara sólida**: pixels vermelhos dentro do matte, com alfa de 15% neste exemplo.
3. **Contorno/traços**: pixels dos traços coloridos por cima das camadas anteriores, alfa forçado a 100% nos traços.
4. **Fundo**: transparente. Não desenhe xadrez, cinza ou branco para “simular” transparência.

Ao compor alfa 55% e vermelho 15% sobre transparência, a opacidade combinada dentro do objeto é aproximadamente 61,75% (`0,55 + 0,15 × (1 − 0,55)`). Os traços opacos permanecem a 100%. Se a especificação pedir 55% como opacidade total final já incluindo a máscara, será necessário escolher opacidades de camada diferentes; não confunda a opacidade isolada da foto com a opacidade resultante da composição.

## Procedimento reproduzível

### 1. Preparar os arquivos

Escolha uma foto nítida, com o objeto inteiro visível, e crie um diretório de trabalho. Preserve o original; grave derivados separados. Evite nomes com `?`, `*` ou outros caracteres especiais. Exemplo PowerShell:

```powershell
$InputImage = 'C:\projeto\referencias\objeto.jpg'
$Cutout = 'C:\projeto\trabalho\objeto-recortado.png'
$Output = 'C:\projeto\trabalho\objeto-contorno.png'
$env:U2NET_HOME = 'C:/Users/valdi/.codex/tools/background-remove/models'
```

Não use os caminhos de exemplo literalmente. Substitua-os pelos arquivos da execução atual.

### 2. Remover o fundo com a skill

No PowerShell da instalação de referência:

```powershell
& 'C:/Users/valdi/.codex/tools/background-remove/.venv/Scripts/python.exe' `
  'C:/Users/valdi/.codex/skills/background-remove/scripts/background_remove.py' `
  --input $InputImage `
  --output $Cutout `
  --method rembg
```

O `rembg` é a opção para fotografias com fundo complexo. O método `builtin` é destinado a fundos claros simples e não é uma alternativa equivalente para toda foto:

```powershell
& 'C:/Users/valdi/.codex/tools/background-remove/.venv/Scripts/python.exe' `
  'C:/Users/valdi/.codex/skills/background-remove/scripts/background_remove.py' `
  --input $InputImage `
  --output $Cutout `
  --method builtin
```

Use apenas um dos dois métodos por execução. O comando real desta tarefa usou o primeiro método; o segundo está aqui como opção documentada.

### 3. Conferir e ajustar a máscara

Abra o recorte sobre fundos de cores diferentes e examine todo o perímetro em ampliação. Verifique topo, rosca, argola, ombro, sulcos, base, objetos encostados, reflexos e sombras. Corrija a máscara quando a segmentação incluir material estranho ou remover partes transparentes do objeto.

Em um programa de edição com suporte a alfa, remova componentes que não pertençam ao objeto e preserve uma borda suave sem deixar halo do fundo. Caso use um corte retangular auxiliar, registre as coordenadas e dimensões da imagem; esses números são próprios daquela foto. Não aplique um corte fixo a entradas futuras.

O arquivo de entrada da etapa seguinte precisa continuar em RGBA, com alfa 0 fora do objeto e alfa entre 1 e 255 somente na borda suavizada/interior. Se a máscara for fornecida separadamente, mantenha exatamente a mesma largura, altura e alinhamento.

### 4. Gerar o contorno externo

Derive a borda do matte, não do fundo original. Em termos de imagem binária, o contorno externo é a diferença entre a máscara e uma versão erodida da máscara. Suavize apenas o suficiente para remover serrilhado sem deslocar a silhueta. Pinte a linha em uma camada transparente separada.

Para implementar essa etapa em Pillow, os operadores morfológicos podem ser expressos com `ImageFilter.MinFilter` (erosão) e `ImageChops.subtract`; para segmentação avançada, use uma implementação morfológica equivalente. Ao fim, limite o contorno à borda do objeto e não pinte um segmento artificial atravessando uma borda que esteja cortada pela própria fotografia.

### 5. Registrar marcações internas

O contorno do matte só fornece a silhueta externa. Roscas, argolas, sulcos, costuras e relevos são detalhes internos e não podem ser inferidos com fidelidade garantida por essa silhueta. Marque-os sobre uma camada transparente, consultando a própria foto em ampliação. Use caminhos curtos e acompanhe a curvatura/perspectiva observada; não atravesse pixels que não representem a peça. Mantenha a camada separada para poder ajustar cor, espessura e posição sem alterar a foto ou o alfa.

Para o exemplo, ciano foi reservado à silhueta e amarelo às linhas de detalhe. Cores distintas facilitam revisão, mas são configuráveis. Use no mínimo 100% de opacidade para essas linhas quando a solicitação exigir que fiquem plenamente visíveis.

### 6. Compor fotografia, máscara e traços

O comando executado para a composição final foi um pequeno programa Python com Pillow/NumPy, alimentado por `original`, `recorte RGBA` e `arte anotada`. O essencial da composição abaixo é genérico e pode ser salvo, por exemplo, como `compose_layers.py`. O script também deriva o contorno externo do alfa do recorte. Os argumentos são arquivos da execução; a rotina não redimensiona nem realinha as camadas silenciosamente:

```python
from PIL import Image, ImageChops, ImageFilter
import numpy as np
import sys

original_path, cutout_path, annotations_path, output_path = sys.argv[1:5]
photo_opacity = float(sys.argv[5]) / 100.0
mask_opacity = float(sys.argv[6]) / 100.0
red = tuple(int(v) for v in sys.argv[7].split(','))
outline = tuple(int(v) for v in sys.argv[8].split(','))

photo = Image.open(original_path).convert('RGBA')
cutout = Image.open(cutout_path).convert('RGBA')
annotations = Image.open(annotations_path).convert('RGBA')
if photo.size != cutout.size or photo.size != annotations.size:
    raise SystemExit('Erro: foto, recorte e anotações precisam ter o mesmo tamanho.')

m_image = cutout.getchannel('A')
m = np.asarray(m_image, dtype=np.uint16)

# Cria um contorno fino pela diferença entre o matte binário e sua erosão.
hard = m_image.point(lambda value: 255 if value >= 96 else 0)
eroded = hard.filter(ImageFilter.MinFilter(3))
edge = ImageChops.subtract(hard, eroded)
edge_layer = Image.new('RGBA', photo.size, (*outline, 0))
edge_layer.putalpha(edge)

# As linhas internas são um layer separado e ficam limitadas ao objeto.
ann = np.asarray(annotations, dtype=np.uint8).copy()
ann[:, :, 3] = np.minimum(ann[:, :, 3], np.asarray(hard, dtype=np.uint8))
annotations = Image.fromarray(ann, 'RGBA')
marks = Image.alpha_composite(edge_layer, annotations)

p = np.asarray(photo, dtype=np.uint8).copy()
p[:, :, 3] = ((m * round(photo_opacity * 100) + 50) // 100).astype(np.uint8)
base = Image.fromarray(p, 'RGBA')

red_layer = Image.new('RGBA', photo.size, (*red, 0))
red_layer.putalpha(Image.fromarray(
    ((m * round(mask_opacity * 100) + 50) // 100).astype(np.uint8), 'L'))
composite = Image.alpha_composite(base, red_layer)

# Preserve the outer contour and internal annotation pixels at full opacity.
ann = np.asarray(marks, dtype=np.uint8)
visible = ann[:, :, 3] > 0
out = np.asarray(composite, dtype=np.uint8).copy()
out[visible, :3] = ann[visible, :3]
out[visible, 3] = 255

# Fully transparent pixels should not retain hidden backdrop RGB data.
transparent = out[:, :, 3] == 0
out[transparent, :3] = 0
Image.fromarray(out, 'RGBA').save(output_path, format='PNG', optimize=True)
```

O trecho assume que `matte_path` contém a máscara do objeto no canal alfa e que `annotations_path` contém somente os traços em uma camada transparente. Se houver uma imagem anotada já composta sobre a foto, primeiro extraia as linhas para uma camada própria com limiar de cor validado; não use limiares cegos que possam confundir reflexos ou cores do produto com as linhas.

Exemplo de chamada (execute do diretório onde salvou `compose_layers.py`):

```powershell
& 'C:/Users/valdi/.codex/tools/background-remove/.venv/Scripts/python.exe' `
  '.\compose_layers.py' `
  $InputImage `
  $Cutout `
  'C:\projeto\trabalho\objeto-anotacoes.png' `
  $Output `
  55 `
  15 `
  '255,0,0' `
  '0,238,255'
```

O caminho de `annotations` é uma camada RGBA sem fundo contendo somente marcações internas (por exemplo, rosca e sulcos). Para um objeto sem detalhes internos que precisem de traços, forneça uma camada transparente vazia; o script ainda cria o contorno externo ciano automaticamente.

### 7. Validar o PNG real

Confirme formato, modo, dimensões, amostras do fundo, alfa do objeto e alfa dos traços. Um quadriculado visível na imagem, mesmo que desenhado para demonstrar transparência, é parte opaca da imagem e não é transparência real.

```powershell
@'
from PIL import Image
import numpy as np
import sys
p = sys.argv[1]
im = Image.open(p)
assert im.format == 'PNG' and im.mode == 'RGBA', (im.format, im.mode)
a = np.asarray(im.getchannel('A'))
print('PNG RGBA:', im.size)
print('Alfa nos cantos:', [im.getpixel(xy)[3] for xy in
      [(0, 0), (im.width-1, 0), (0, im.height-1), (im.width-1, im.height-1)]])
print('Alfa mínimo/máximo:', int(a.min()), int(a.max()))
print('Pixels alfa 0:', int(np.count_nonzero(a == 0)))
'@ | & 'C:/Users/valdi/.codex/tools/background-remove/.venv/Scripts/python.exe' - $Output
```

Quatro cantos transparentes não bastam se houver uma sombra ou fragmento de fundo encostado ao objeto. Inspecione toda a imagem sobre fundos contrastantes e valide amostras fora da silhueta. Verifique também que nenhum padrão quadriculado foi incorporado e que as linhas estão com alfa 255.

## Comandos efetivamente usados nesta execução

Os caminhos abaixo são relativos ao repositório e servem para identificar o exemplo, não como entradas universais:

```text
.runtime/blender-agent/references/owner-photo-copies/19.jpeg
.runtime/blender-agent/exports/cooklily-photo19-nobg.png
.runtime/blender-agent/exports/cooklily-photo19-contorno-real.png
.runtime/blender-agent/exports/cooklily-photo19-contorno-55pct-redmask15.png
```

Foi usado `background-remove` com `rembg` para a máscara inicial. A inspeção de pixels foi feita com Pillow/NumPy; a camada final foi composta fora do Blender. A composição verificou dimensões iguais, aplicou a máscara alfa ao recorte, ajustou as opacidades, recolocou os traços com alfa 255 e salvou RGBA/PNG. A validação de transparência confirmou pixels de fundo com `(0, 0, 0, 0)`. Não foi criada nem alterada malha 3D nesta etapa.

Os scripts de composição/inspeção foram executados a partir do PowerShell como here-strings enviados ao Python isolado, por exemplo:

```powershell
@'
from PIL import Image
# processamento Pillow/NumPy
'@ | C:/Users/valdi/.codex/tools/background-remove/.venv/Scripts/python.exe -
```

O corpo executado está representado de forma reutilizável na seção anterior; o processamento específico da imagem 19 também incluiu remoção de regiões estranhas ao produto e seleção das cores dos traços já existentes. Os limites de recorte daquela foto não são parâmetros universais.

## Falhas comuns e recuperação

| Sintoma | Causa provável | Correção |
|---|---|---|
| Fundo quadriculado aparece no PNG | O checker foi rasterizado como pixels opacos | Refaça a saída a partir de um RGBA com alfa 0 fora do objeto; não use screenshot do preview. |
| Fundo aparece em outro visualizador | PNG exportado em RGB ou alfa achatado | Confira `format == PNG`, `mode == RGBA` e amostras de alfa; exporte novamente sem matte de fundo. |
| Halo claro/escuro ao redor | O matte preservou cor do fundo na franja | Refine a borda/alpha matting no recorte e confira em fundos claro e escuro. Evite apagar toda a franja com threshold alto. |
| Sombra/objeto vizinho no recorte | Segmentação agrupou elementos conectados | Corrija a máscara manualmente; não trate bounding box como máscara. Reexecute composição com matte corrigido. |
| Parte transparente do produto desapareceu | O modelo tratou o interior transparente como fundo | Reconstrua a máscara com referência visual/manual; preservar apenas o exterior pode não bastar para vidro/plástico transparente. |
| Contorno duplo ou deslocado | Camadas têm dimensões ou origem diferentes | Pare a exportação, confirme resolução e posição; não redimensione camadas isoladamente. |
| Marcações internas atravessam o objeto | Traços foram gerados por limiar automático sem revisão | Separe silhueta de detalhes; revise cada caminho sobre a foto ampliada e remova linhas ambíguas. |
| Vermelho fraco ou foto escura demais | Confundiu opacidade da camada com opacidade composta | Confira o alfa por camada e a fórmula de composição acima; não altere o alfa dos traços. |
| Saída não abre como PNG transparente | Salvou visualização achatarada, RGB ou formato com perda | Gere diretamente com Pillow em modo RGBA e `format='PNG'`; valide o arquivo final, não o preview. |

Se qualquer camada estiver desalinhada, volte aos arquivos intermediários e refaça a composição. Não tente corrigir alinhamento por deformação, redimensionamento independente ou edição da geometria Blender.

## Limitações e critério de pronto

Segmentação automática é uma primeira estimativa: objetos translúcidos, reflexos fortes, peças tocando o fundo e materiais da mesma cor do ambiente exigem correção manual. A máscara sólida vermelha mostra cobertura, não espessura, profundidade ou precisão dimensional. Marcas internas representam somente detalhes que podem ser identificados com segurança na foto; pontos encobertos ou fora de foco devem ficar sem marcação, em vez de receber um traço inventado.

Considere o artefato pronto quando:

- o original continua preservado e cada derivado tem um nome distinto;
- o arquivo final é PNG RGBA e o fundo é alfa 0, não um padrão visual;
- foto e máscara usam a mesma silhueta e o mesmo enquadramento;
- os valores de opacidade correspondem ao pedido e estão documentados;
- contornos e marcações ficam a 100% quando solicitado;
- as bordas foram revisadas em zoom e sobre fundos contrastantes;
- o arquivo foi reaberto e validado depois de salvo.

## Referências

- Skill local `background-remove` (`SKILL.md`): remoção de fundo com rembg/U²-Net, parâmetros e tratamento de erros. Disponibilidade e caminho dependem da instalação local.
- [Blender Agent — comparação visual mesh × referência](./BLENDER_AGENT_MESH_REFERENCE_COMPARE_USAGE.md): geração de sobreposição entre malha projetada e fotografia. Essa ferramenta tem finalidade diferente do recorte/transparência descritos aqui.
- [Blender Agent — imagens](./BLENDER_AGENT_IMAGES.md): fluxo de imagens e referências dentro do Blender Agent.
