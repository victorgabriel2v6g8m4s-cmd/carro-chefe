# CL-IMP-001 — adesivo vertical com QR

## Identificação

- **Categoria:** impresso / embalagem / aquisição.
- **Arquivo recebido:** `500ml (4 x 8 cm) (7).png`.
- **Arquivo canônico esperado:** `../originais/impressos/2026-09-23_marca-cooklily-adesivo-500ml-qr_png_v01_review.png`.
- **Dimensões digitais:** 1024×2048 px.
- **Formato:** PNG RGBA.
- **Tamanho:** 2.885.636 B.
- **SHA-256:** `7b480878a429aad9a4e0299e9a2fc3651eea84264272bb2d7fd9ccd48387ad14`.
- **Indicação no nome recebido:** 4 × 8 cm; validar tamanho físico/prova antes de imprimir.
- **Status:** `review`.

## Descrição visual

Peça vertical em roxo, magenta e rosa, com textura/gradiente. A logo `cookLily` aparece no topo; abaixo há a mensagem “cremosidade, sabor e qualidade em cada garrafa”, pictograma de garrafa, QR central em cartão branco e CTA “PEÇA JÁ!”.

A hierarquia é: marca → promessa → ação digital → CTA.

## QR atual e compatibilidade

Destino decodificado:

`https://carrochefe.com/lilyacai/cardapio?cc_qr=LILY1&cc_campaign=adesivos`

O QR continua funcional por decisão de compatibilidade. A aplicação aceita `cc_qr`/`cc_campaign` como aliases e normaliza para `laQr`/`laCampaign` antes da futura persistência.

Novas artes devem preferir:

- `la_qr`;
- `la_campaign`;
- `la_variant`.

## Usos sugeridos

- adesivo de garrafa;
- etiqueta promocional;
- material de balcão;
- QR em embalagem;
- referência de layout para flyer/story;
- campanha rastreada por variação de arte.

## Antes de nova tiragem

- validar leitura e quiet zone no tamanho físico;
- confirmar sangria/margem de corte;
- validar contraste em prova impressa;
- incluir `la_variant` quando houver teste entre artes;
- confirmar que a rota de destino publicada está ativa.

## Evitar

- reduzir o QR sem teste de leitura;
- aplicar efeitos/transparência sobre o QR;
- interpretar o nome “4 × 8 cm” como prova técnica de gráfica sem conferir o arquivo/origem.
