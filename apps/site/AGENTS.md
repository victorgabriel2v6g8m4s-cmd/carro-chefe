# AGENTS — Site público

## Região

Experiência pública `carrochefe.com`, incluindo `/welcome` e a ponte segura para `/cardapio`.

## Regras locais

- Preserve `Carro Chefe` para a marca e `Carro‑Chefe` para o produto; não sobrescreva ativos originais.
- Priorize mobile, acessibilidade, Core Web Vitals, imagens otimizadas e movimento reduzido.
- Textos visíveis ficam em i18n/conteúdo centralizado; use tokens oficiais e contraste adequado.
- `/cardapio` só embute o ERP se contrato e headers permitirem; caso contrário usa redirecionamento claro.
- Não implemente checkout, armazene cartão ou envie PII/conteúdo livre a analytics/anúncios.

## Agentes

- `AG-DEV` implementa; Marca e Mídias aprovam derivados; Marketing define mensagem/métrica; Dados valida eventos.

## Pronto

- [ ] Desktop/mobile, teclado, leitor de tela, erro e fallback de integração verificados.
- [ ] Bundle, mídia, analytics minimizado e consentimento avaliados.
- [ ] Testes e build do site passam.
