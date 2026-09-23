# CL-IMP-001 — adesivo vertical com QR

## Identificação

- **Categoria:** impresso / embalagem / aquisição.
- **Arquivo recebido:** `500ml (4 x 8 cm) (7).png`.
- **Arquivo canônico esperado:** `../originais/impressos/2026-09-23_marca-lily-gourmet-adesivo-500ml-qr_png_v01_review.png`.
- **Dimensões digitais:** 1024×2048 px.
- **Formato:** PNG RGBA.
- **Tamanho:** 2.885.636 B.
- **SHA-256:** `7b480878a429aad9a4e0299e9a2fc3651eea84264272bb2d7fd9ccd48387ad14`.
- **Indicação no nome recebido:** 4 × 8 cm; confirmar tamanho físico antes de imprimir.
- **Status:** `review`.

## Descrição visual

Peça vertical em tons de roxo, magenta e rosa, com textura/gradiente. A logo `cookLily` aparece em grande destaque no topo. Abaixo há a mensagem “cremosidade, sabor e qualidade em cada garrafa”, acompanhada por um pequeno pictograma de garrafa.

O centro é dominado por um QR Code preto sobre cartão branco de cantos arredondados. Na base, o CTA “PEÇA JÁ!” aparece em tipografia alta e estreita.

A composição tem boa hierarquia de cima para baixo: marca → promessa → ação digital → CTA.

## QR atual

Decodificação local do arquivo recebido:

`https://carrochefe.com/lilyacai/cardapio?cc_qr=LILY1&cc_campaign=adesivos`

O destino `/lilyacai/cardapio` é compatível com a arquitetura atual. Porém os parâmetros `cc_qr` e `cc_campaign` pertencem ao namespace do Carro Chefe. A Lily planeja `la_qr`, `la_campaign` e `la_variant`.

**Não reimprimir esta versão sem regenerar/validar o QR.**

## Usos sugeridos

Depois de atualizar naming e QR:

- adesivo da garrafa;
- etiqueta promocional;
- material de balcão;
- QR em embalagem;
- amostra de linguagem para flyer;
- base de campanha de rastreamento por lote/arte;
- referência para versão de 500 ml;
- referência de hierarquia de CTA para Stories.

## Ajustes recomendados

- reconciliar `cookLily` com `CookLily`;
- regenerar QR com namespace Lily;
- validar quiet zone e leitura no tamanho físico;
- conferir sangria/margem de corte;
- validar contraste após impressão;
- padronizar tipografia com o kit;
- revisar se a frase continuará como mensagem oficial;
- considerar um identificador de variação de arte no QR.

## Evitar

- impressão direta desta versão como arte atual;
- reduzir o QR sem teste de leitura;
- aplicar efeitos ou transparência sobre o QR;
- usar o QR como tracking Lily sem migrar parâmetros;
- inferir que “4 × 8 cm” está tecnicamente pronto para gráfica só pelo nome do arquivo.
