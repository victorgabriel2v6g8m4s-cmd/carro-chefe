# AGENTS — UI compartilhada

## Região

Componentes visuais e tokens reutilizáveis, sem regra de negócio ou infraestrutura.

## Regras locais

- API de props é semântica, tipada, previsível e pequena; use variantes em vez de booleanos confusos.
- Centralize tokens, estados, foco, contraste, área de toque, responsividade e `prefers-reduced-motion`.
- Não importar API, Prisma ou feature específica; callbacks e dados chegam por props.
- Não duplique componentes por desktop/mobile nem crie barrel global indiscriminado.

## Pronto

- [ ] Teclado, leitor de tela, foco, zoom, contraste e estados disabled/loading/error testados.
- [ ] Consumidores existentes não regrediram.
