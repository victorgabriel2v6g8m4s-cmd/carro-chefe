# Acervo de mídias — guia para IA

Este diretório contém o acervo bruto importado para a branch `midias/upload-chefao`.

## Regra principal

A IA **pode usar a documentação textual e o `MEDIA_MANIFEST.json` sem abrir as imagens** para tarefas simples como inventário, busca, localização de arquivo, entendimento geral do assunto, contagem, filtragem por pasta/formato/dimensão e triagem preliminar.

**Para tarefas complexas ou visualmente sensíveis, a IA DEVE abrir e inspecionar as mídias candidatas antes de utilizá-las.** Isso inclui, sem exceção: edição, geração derivada, remoção de fundo, correção de cor, crop final, comparação fina, controle de qualidade, escolha final para Instagram, capa de produto no site, totem, cardápio, banner, anúncio, impressão e qualquer decisão em que aparência ou fidelidade do produto importem.

A descrição textual é uma camada de indexação. Ela não substitui visão quando a decisão depende da aparência real do arquivo.

## Estrutura atual

| Pasta | Conteúdo | Quantidade conhecida | Situação documental |
| --- | --- | ---: | --- |
| `Chefinho/` | fotografias do produto Chefinho | 13 imagens | inventariado; revisão visual individual pendente |
| `Chefão/` | fotografias e vídeo do produto Chefão | 13 imagens + 1 vídeo | inventariado; coleção já possui referências visuais no projeto, mas mapeamento arquivo-a-arquivo ainda exige inspeção |
| `Espeto Completo/` | fotografias do Espeto Completo | 18 imagens | inventariado; revisão visual individual pendente |
| `Espeto Simples/` | fotografias do Espeto Simples | 9 imagens | inventariado; revisão visual individual pendente |
| `pimentas/` | fotografias de pimentas / insumo | 2 imagens | inventariado; revisão visual individual pendente |

## Como um agente deve trabalhar

1. Ler primeiro este arquivo e o `MEDIA_MANIFEST.json`.
2. Identificar a pasta/produto relevante.
3. Usar os `README_IA.md` de cada subpasta para entender contexto e uso provável.
4. Para busca e contexto, não é necessário abrir todos os arquivos.
5. Para qualquer uso final ou avaliação visual, abrir somente os candidatos relevantes e registrar a conclusão documental.

## Estados recomendados de revisão

- `pending_ai_review`: arquivo importado, ainda sem avaliação visual individual.
- `reviewed_reference`: visualizado e útil como referência, mas não necessariamente publicável.
- `candidate_for_edit`: visualizado e promissor após tratamento.
- `approved_for_publication`: aprovado para uso final depois de inspeção visual e revisão de Marca/Marketing/Operações.
- `low_value`: pouco útil, redundante ou tecnicamente fraco.
- `archive_only`: manter por histórico/referência, sem recomendação de uso comercial.

## Preservação

Os arquivos originais devem permanecer intactos. Edições, recortes, remoções de fundo, upscales e composições devem gerar derivados separados e sempre apontar para o arquivo-fonte.