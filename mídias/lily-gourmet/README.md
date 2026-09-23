# Lily Gourmet — acervo inicial de marca e produto

Este diretório cataloga o primeiro conjunto de mídias reais da **Lily Gourmet** recebido do proprietário em 23/09/2026.

O acervo inicial contém quatro mídias:

1. logo circular fornecida como logo oficial;
2. arte vertical de adesivo/QR para embalagem;
3. fotografia real da batida de açaí com maracujá;
4. fotografia real da batida de açaí com morango.

## Estado do acervo

**Status geral:** `review`.

A documentação e as fichas editoriais estão versionadas na branch `lily-acai`. Os arquivos binários originais devem ser incorporados posteriormente sem qualquer alteração de bytes, seguindo os nomes esperados em `originais/`.

Três arquivos tiveram bytes, dimensões e SHA-256 conferidos nesta incorporação. A foto de morango foi visualmente recebida no chat, mas chegou com o mesmo nome de arquivo da foto de maracujá (`imagem_editada.jpeg`) e precisa ser reenviada com nome único para permitir incorporação byte a byte e cálculo de hash sem risco de substituir o original errado.

Isso não impede a documentação visual da foto de morango, mas impede declarar hash, tamanho técnico e arquivo binário versionado até o reenvio.

## Leitura por agentes de IA

Antes de abrir imagens, agentes podem consultar:

- [`README_IA.md`](./README_IA.md): regra curta de uso;
- [`GUIA_IA.md`](./GUIA_IA.md): critérios para inspeção e publicação;
- [`CATALOGO_IA.json`](./CATALOGO_IA.json): inventário estruturado;
- [`fichas/`](./fichas/): descrição editorial individual de cada mídia.

**Regra obrigatória:** descrição textual serve para busca, inventário e triagem. Para edição, geração derivada, escolha de peça final, impressão, publicação, avaliação de fidelidade do produto ou decisão de marca, a mídia original **deve ser aberta e inspecionada visualmente**.

## Governança

- **Origem:** arquivos fornecidos pelo proprietário ao projeto.
- **Autor/fotógrafo/design:** não informado.
- **Direitos:** uso interno no projeto solicitado pelo proprietário; antes de distribuição externa ampla, confirmar titularidade/licença quando a autoria não estiver documentada.
- **Originais:** imutáveis.
- **Derivados:** devem ser salvos separadamente e referenciar o arquivo-fonte.
- **Publicação:** nenhuma mídia deste conjunto recebe aprovação automática só por estar catalogada.
- **Marca:** a logo recebida contém o lettering `cookLily`, enquanto o nome público aprovado no projeto é **Lily Gourmet**. O original é preservado; a reconciliação do nome deve ser decidida no kit de marca antes de adaptar o lettering.
- **Produtos:** as duas fotos são referências reais identificadas pelo proprietário como sabores morango e maracujá. Não usar a fotografia como prova de volume, gramatura ou embalagem final sem validação operacional.

## Estrutura canônica

```text
mídias/lily-gourmet/
├── README.md
├── README_IA.md
├── GUIA_IA.md
├── CATALOGO_IA.json
├── fichas/
│   ├── LG-MARCA-001-logo-principal.md
│   ├── LG-IMP-001-adesivo-500ml-qr.md
│   ├── LG-PROD-001-batida-acai-maracuja.md
│   └── LG-PROD-002-batida-acai-morango.md
├── originais/
│   ├── marca/
│   ├── impressos/
│   └── produtos/
└── derivados/
    ├── web/
    ├── social/
    └── impressao/
```

## Arquivos

| ID | Arquivo esperado | Arquivo recebido | Conteúdo | Dimensões | Tamanho | SHA-256 | Status |
| --- | --- | --- | --- | ---: | ---: | --- | --- |
| `LG-MARCA-001` | `originais/marca/2026-09-23_marca-lily-gourmet-logo-principal_png_v01_review.png` | `cook (6).png` | Logo circular rosa com laço e lettering `cookLily` | 2048×2048 | 384.801 B | `70448b75e51a603540d6610fb004c0902ac011819cd5a6ff5a813246471ee92c` | `review` |
| `LG-IMP-001` | `originais/impressos/2026-09-23_marca-lily-gourmet-adesivo-500ml-qr_png_v01_review.png` | `500ml (4 x 8 cm) (7).png` | Arte vertical de adesivo com logo, mensagem, QR e CTA | 1024×2048 | 2.885.636 B | `7b480878a429aad9a4e0299e9a2fc3651eea84264272bb2d7fd9ccd48387ad14` | `review` |
| `LG-PROD-001` | `originais/produtos/2026-09-23_produto-batida-acai-maracuja_foto_v01_review.jpeg` | `imagem_editada.jpeg` | Garrafa de batida roxa com creme/mousse amarelo | 900×1600 | 111.657 B | `e64cec799074320a91b734b9b21fd9850e178aded0acd9575a37ef1d3957f74d` | `review` |
| `LG-PROD-002` | `originais/produtos/2026-09-23_produto-batida-acai-morango_foto_v01_review.jpeg` | `imagem_editada.jpeg` | Garrafa de batida roxa com creme/mousse rosa | pendente | pendente | pendente de reenvio | `review/pending_binary` |

## Observações importantes para o kit

A logo fornece uma direção visual clara: rosa-claro dominante, contorno ameixa/vinho, laço bordô e combinação de lettering condensado + manuscrito. As cores observadas no raster incluem aproximadamente `#F9C0CF`, `#44042D` e `#820023`. Esses valores são **observações técnicas do arquivo**, não tokens oficiais até aprovação no kit.

A arte do adesivo reforça a família rosa/roxa, mas é uma peça anterior à consolidação de **Lily Gourmet** e usa o logo `cookLily`. O QR foi decodificado para:

`https://carrochefe.com/lilyacai/cardapio?cc_qr=LILY1&cc_campaign=adesivos`

O destino continua coerente com a rota técnica atual, mas o tracking usa `cc_qr` e `cc_campaign`, enquanto a arquitetura Lily planejada usa `la_qr`, `la_campaign` e `la_variant`. Portanto, **o adesivo não deve ser reimpresso como peça final sem revisão do QR e do naming**.
