# Entrega 03 — Marca oficial Lily Gourmet e rebranding integral

**Status:** planejada  
**Dependência:** Entrega 02 concluída  
**Deploy:** não

## Objetivo

Versionar a logo oficial, criar o kit de marca e aplicar a identidade Lily Gourmet em toda a experiência web.

## Entrada obrigatória

Logo oficial em formato utilizável, preferencialmente vetor original ou PNG de alta resolução/transparência.

Sem o ativo, não inventar logo, cores exatas ou fontes oficiais.

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
