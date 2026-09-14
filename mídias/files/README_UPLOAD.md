# Upload de mídias

Esta pasta contém mídias originais incorporadas ao repositório por
`tools/media-uploader`.

O inventário técnico fica em `MEDIA_MANIFEST.json`.

## Fluxo para IA

Uma IA pode utilizar o manifesto para:

- localizar arquivos;
- entender nomes, formatos, tamanho e dimensões;
- verificar se um arquivo ainda aguarda avaliação;
- realizar busca e triagem inicial sem abrir todas as imagens.

Depois do upload, o status inicial de cada mídia é:

`pending_ai_review`

A avaliação editorial deve preencher informações como descrição visual,
qualidade, necessidade de edição, limitações e usos recomendados.

## REGRA CRÍTICA

**Para tarefas complexas ou visualmente sensíveis, a IA DEVE abrir e
inspecionar os arquivos originais antes de utilizá-los.**

Isso vale especialmente para:

- seleção final para Instagram;
- capa de produto no site;
- totem;
- cardápio;
- banner;
- campanha paga;
- impressão;
- geração ou edição de imagens;
- remoção de fundo;
- correção de cor;
- recorte final;
- controle de qualidade;
- comparação de versões;
- verificação da fidelidade do produto.

A documentação textual existe para economizar inspeções visuais
desnecessárias durante busca e triagem. Ela NÃO substitui a visão quando
a aparência do material influencia a decisão.

## Preservação

Os originais desta pasta não devem ser sobrescritos por arquivos editados.
Derivados devem ser armazenados separadamente e manter referência ao
arquivo-fonte.

A presença dos originais em `main` significa apenas que o acervo foi consolidado e inventariado. Ela não equivale a aprovação editorial ou autorização automática para publicação.
