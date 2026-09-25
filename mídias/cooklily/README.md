# CookLily — acervo inicial de marca e produto

Este diretório cataloga o primeiro conjunto de mídias reais da **CookLily** recebido do proprietário em 23/09/2026.

O acervo inicial contém quatro mídias: logo oficial, adesivo/QR, fotografia real da batida de maracujá e fotografia real da batida de morango.

## Estado do acervo

**Status geral:** `review`.

As quatro fontes foram recebidas e tiveram identidade técnica registrada. As duas fotos de produto foram reenviadas com nomes únicos e tiveram dimensões, tamanho e SHA-256 verificados.

Os binários originais completos continuam fora do Git nesta etapa, para não confundir documentação/derivados com a fonte imutável. Um derivado WebP da logo foi versionado exclusivamente para uso no frontend:

- `apps/lily_acai/public/brand/cooklily-logo-96.webp`;
- 96×96;
- 7.122 B;
- SHA-256 `85e041408bca1b64464ff009917cc234fd15dcad8f9272761d15312be115bc59`;
- fonte: `CL-MARCA-001`.

## Leitura por agentes de IA

Antes de abrir imagens, agentes podem consultar:

- [`README_IA.md`](./README_IA.md);
- [`GUIA_IA.md`](./GUIA_IA.md);
- [`CATALOGO_IA.json`](./CATALOGO_IA.json);
- [`fichas/`](./fichas/).

A descrição textual serve para busca/inventário/triagem. Para edição, geração derivada, impressão, publicação, avaliação de fidelidade ou decisão visual, a mídia original deve ser aberta e inspecionada.

## Governança

- **Origem:** arquivos fornecidos pelo proprietário.
- **Autor/fotógrafo/design:** não informado.
- **Direitos:** uso interno solicitado pelo proprietário; confirmar autoria/licença quando aplicável para distribuição externa.
- **Nome oficial:** CookLily.
- **Wordmark oficial:** `cookLily`.
- **Originais:** imutáveis.
- **Derivados:** separados e rastreáveis.
- **Publicação:** catalogar não equivale a aprovar automaticamente uma peça.
- **Produtos:** fotos de morango e maracujá são referências reais; não usar como medição de volume/gramatura sem evidência operacional.

## Estrutura canônica

```text
mídias/cooklily/
├── README.md
├── README_IA.md
├── GUIA_IA.md
├── CATALOGO_IA.json
├── fichas/
│   ├── CL-MARCA-001-logo-principal.md
│   ├── CL-IMP-001-adesivo-500ml-qr.md
│   ├── CL-PROD-001-batida-acai-maracuja.md
│   └── CL-PROD-002-batida-acai-morango.md
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

| ID | Arquivo canônico esperado | Arquivo recebido | Dimensões | Tamanho | SHA-256 | Status |
| --- | --- | --- | ---: | ---: | --- | --- |
| `CL-MARCA-001` | `originais/marca/2026-09-23_marca-cooklily-logo-principal_png_v01_review.png` | `cook (6).png` | 2048×2048 | 384.801 B | `70448b75e51a603540d6610fb004c0902ac011819cd5a6ff5a813246471ee92c` | `review` |
| `CL-IMP-001` | `originais/impressos/2026-09-23_marca-cooklily-adesivo-500ml-qr_png_v01_review.png` | `500ml (4 x 8 cm) (7).png` | 1024×2048 | 2.885.636 B | `7b480878a429aad9a4e0299e9a2fc3651eea84264272bb2d7fd9ccd48387ad14` | `review` |
| `CL-PROD-001` | `originais/produtos/2026-09-23_produto-batida-acai-maracuja_foto_v01_review.jpeg` | `imagem_editada_acai_com_maracuja.jpeg` | 900×1600 | 111.657 B | `e64cec799074320a91b734b9b21fd9850e178aded0acd9575a37ef1d3957f74d` | `review` |
| `CL-PROD-002` | `originais/produtos/2026-09-23_produto-batida-acai-morango_foto_v01_review.jpeg` | `imagem_editada_acai_com_morango.jpeg` | 900×1600 | 89.595 B | `1bd9c8602da111484c2440a1afbb1e270d410b33ec7fd2577aa6c5ba29838080` | `review` |

## Kit e QR

Os tokens `#F9C0CF`, `#44042D` e `#820023` foram aprovados e estão formalizados em `docs/lily-acai/marca/KIT_DE_MARCA.md`.

O QR do adesivo aponta para:

`https://carrochefe.com/lilyacai/cardapio?cc_qr=LILY1&cc_campaign=adesivos`

Esse QR continua válido: `cc_*` é aceito como alias legado e normalizado internamente para o modelo canônico `la_*`. Novas artes devem preferir `la_*`.
