# Governança da branch CookLily

## Conflito aparente com as regras do Carro Chefe

O `AGENTS.md` raiz da `main` determina que pedidos e pagamentos do Carro Chefe pertencem ao ERP e que o site institucional não deve duplicar checkout.

Essa regra **permanece válida e inalterada para todos os namespaces, aplicações e dados do Carro Chefe**.

A CookLily, porém, foi aprovada pelo proprietário como operação temporária e isolada, compartilhando apenas domínio/VPS. Portanto, antes de implementar checkout Lily, esta branch deve registrar uma delimitação explícita de escopo na política da própria branch.

## Alterações de governança exigidas antes do código

1. Atualizar o `AGENTS.md` raiz **somente na branch `lily-acai`** com uma seção curta informando que:
   - a exceção vale exclusivamente para `/lilyacai`, `/api/v1/lily`, `apps/lily_acai`, `apps/api/src/modules/lily` e `packages/lily-database`;
   - a regra de ERP continua integral para Carro Chefe;
   - nenhum dado Lily pode ser tratado como dado transacional do Carro Chefe.
2. Criar `apps/lily_acai/AGENTS.md` com regras locais de identidade, privacidade, checkout e acessibilidade.
3. Criar regra local equivalente no módulo API Lily e no banco Lily.
4. Recompilar/verificar o manifesto de política da branch com `npm run policy:build` e `npm run policy:check`.
5. Rodar `npm run policy:preflight -- --agent AG-DEV --scope <escopo>` antes de cada frente de implementação.

## Regra de merge

A branch Lily não deve ser mergeada integralmente na `main` enquanto representar a operação temporária. Se no futuro alguma ferramenta genérica criada para a Lily merecer permanecer no Carro Chefe, ela deve ser extraída em PR separado, sem documentação, marca, banco ou regras comerciais Lily.

## Regra de encerramento

O encerramento da Lily deve permitir retirar rotas, banco e mídia sem alterar o histórico ou a disponibilidade do Carro Chefe. Backups e documentação permanecem na branch para auditoria.
