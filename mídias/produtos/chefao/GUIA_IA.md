# Guia de uso por IA — acervo do Chefão

Este arquivo existe para permitir que modelos de IA entendam o acervo sem precisar abrir todas as imagens em tarefas simples.

## Regra principal

**Para tarefas simples**, como localizar uma foto, escolher preliminarmente por ângulo, entender o que cada arquivo contém, montar inventário, referenciar a montagem ou decidir quais arquivos merecem inspeção, a IA pode usar `README.md` e `CATALOGO_IA.json` sem visualizar os JPEGs.

**Para tarefas complexas, a IA DEVE visualizar as imagens antes de utilizá-las.** Isso inclui, sem exceção:

- criação ou edição de peças publicitárias;
- escolha da imagem final para Instagram, cardápio, site, totem, banner ou anúncio;
- remoção de fundo, retoque, upscale, recorte final ou correção de cor;
- geração de imagem baseada nas fotos ou composição com IA;
- avaliação de fidelidade entre foto e ficha técnica;
- julgamento de proporção, textura, ponto da carne, quantidade aparente de recheio ou qualidade visual;
- comparação fina entre duas fotos parecidas;
- qualquer material que será publicado ou impresso.

A descrição textual é uma **camada de indexação e triagem**, não substitui inspeção visual quando a aparência importa.

## Onde estão os arquivos

- originais imutáveis: `mídias/produtos/chefao/originais/`
- catálogo detalhado para máquinas: `mídias/produtos/chefao/CATALOGO_IA.json`
- resumo humano e hashes: `mídias/produtos/chefao/README.md`
- futuras edições devem ir para `mídias/produtos/chefao/derivados/` e sempre indicar o original de origem.

## Seleção inicial sem abrir imagens

| Necessidade | Primeira candidata | Motivo | Visualização antes do uso final? |
| --- | --- | --- | --- |
| Capa do Chefão no site | `frontal-04` | frontal completa mais legível e clara do conjunto | **Sim, obrigatória** |
| Instagram/feed | `tres-quartos-01` ou `frontal-04` | melhor volume / leitura do recheio | **Sim, obrigatória** |
| Totem/cardápio digital | `frontal-04` | leitura frontal mais direta | **Sim, obrigatória** |
| Story/Reels | `tres-quartos-01` | retrato e sensação de profundidade | **Sim, obrigatória** |
| Referência 3D do pão | `superior-fechado-01` + `superior-lateral-01` | ajudam a entender forma e comprimento | **Sim, para modelagem precisa** |
| Cheddar em destaque | `frontal-molho-01` ou `tres-quartos-molho-01` | molho domina visualmente | **Sim, e validar a montagem** |
| Apenas ficha/referência interna | qualquer original conforme ângulo | valor documental | não necessariamente |

## Avaliação geral do ensaio

O acervo é valioso como **referência real do produto**, porém não está pronto para publicação direta. A maioria das fotos é subexposta, tem grande área vazia de fundo preto e precisaria de recorte, correção de luz/cor e limpeza de pequenas distrações. As fotos `frontal-04` e `tres-quartos-01` são as candidatas mais promissoras para derivados publicitários. `superior-fechado-01` é fraca como marketing, mas importante tecnicamente para forma do pão. Algumas imagens com cheddar dominante podem representar uma montagem parcial/alternativa e devem ser comparadas com a ficha aprovada antes de uso comercial.

Nenhum original deve ser sobrescrito.
