# AGENTS — QR Manipulator

## Região

Ferramenta de geração e validação de derivados QR da marca.

## Regras locais

- Valide e normalize URL, formato, dimensão e nome antes de gerar arquivo.
- Preserve contraste, quiet zone, legibilidade e rastreabilidade da origem.
- Nunca sobrescreva logos/ativos originais; derivados vão para saída ignorada ou destino aprovado.
- Separe cálculo, composição visual, I/O e UI. Imagens/arquivos são entrada não confiável.

## Pronto

- [ ] Teste automatizado decodifica o resultado e confirma a URL esperada.
- [ ] Preview mobile/desktop, teclado, erro e download verificados.
- [ ] Sem segredo, path traversal ou arquivo temporário versionado.
