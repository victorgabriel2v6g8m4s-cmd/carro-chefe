# AGENTS — Central Operacional

## Região

Frontend React da gestão: tarefas, decisões, riscos, compras, agentes, auditoria e memória operacional.

## Arquitetura

```text
route fina → componente de feature → hook orquestrador → serviço HTTP → API
                         ↘ componentes e tokens compartilhados
```

## Regras locais

- Componentes não fazem regra de negócio, Prisma ou `fetch` disperso; extraia hooks/services/tipos/textos.
- Reutilize tokens, padrões de formulário, estados e feedback. Não crie versão duplicada desktop/mobile.
- Toda ação assíncrona evita duplo envio, preserva entrada em erro e informa próximo passo.
- Tabelas/árvores grandes usam paginação ou lazy loading; efeitos e subscriptions limpam recursos.
- Links de arquivo/site são seguros, acessíveis e não executam conteúdo não confiável.

## Pronto

- [ ] Testado em mobile/desktop, teclado, foco, contraste e zoom.
- [ ] Loading, vazio, erro, offline/reconexão e confirmação destrutiva avaliados.
- [ ] Typecheck, testes e build da gestão passam.
