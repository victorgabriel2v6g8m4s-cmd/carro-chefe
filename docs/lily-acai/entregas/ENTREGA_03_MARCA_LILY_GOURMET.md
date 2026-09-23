# Entrega 03 — Marca oficial Lily Gourmet e rebranding integral

**Status:** em andamento — acervo inicial recebido e catalogado  
**Dependência:** Entrega 02 concluída  
**Deploy:** não

## Objetivo

Versionar a logo oficial, criar o kit de marca e aplicar a identidade Lily Gourmet em toda a experiência web.

## Entrada obrigatória

A primeira entrada foi recebida em 23/09/2026:

- logo raster oficial (`LG-MARCA-001`);
- adesivo/QR existente (`LG-IMP-001`);
- foto real da batida de maracujá (`LG-PROD-001`);
- foto real da batida de morango (`LG-PROD-002`, binário pendente de reenvio com nome único).

O acervo está documentado em `mídias/lily-gourmet/`.

Ainda é desejável obter vetor/editável da logo, se existir. Não inventar fontes oficiais nem redesenhar o wordmark sem aprovação.

## Etapas

1. versionar original em `docs/lily-acai/marca/assets/originais/`;
2. registrar origem/data;
3. gerar derivados web sem sobrescrever original;
4. aprovar paleta;
5. aprovar fontes/licenças;
6. preencher `marca/KIT_DE_MARCA.md`;
7. converter kit em tokens;
8. centralizar tema frontend;
9. trocar nome público para Lily Gourmet;
10. atualizar favicon/meta/header/footer/auth/cardápio/páginas legais/painel;
11. revisar “Lily Gourmet × Carro Chefe”;
12. QA responsivo/acessível.

## Compatibilidade

Não renomear nesta entrega: `lily-acai`, `apps/lily_acai`, `/lilyacai/`, `/api/v1/lily/` e `lily-acai.db`.

## Testes previstos

```bash
npm run policy:preflight -- --agent AG-DEV --scope apps/lily_acai
npm run policy:check
npm run check
npm test
npm run build
```

Mais QA visual mobile/desktop/teclado/contraste.

## Critérios de aceite

- logo original versionada;
- kit aprovado;
- derivados rastreáveis;
- tokens centralizados;
- frontend inteiro no novo tema;
- nome público consistente;
- sem identidade Carro Chefe reutilizada;
- QA concluído;
- nenhum deploy executado.

## Próxima entrega

Entrega 04 — landing, leads, WhatsApp e primeira publicação.
