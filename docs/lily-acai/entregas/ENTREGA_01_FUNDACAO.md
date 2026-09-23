# Entrega 01 — Fundação, isolamento e governança

**Status:** concluída  
**Branch:** `lily-acai`  
**Data:** 19/09/2026

## Objetivo

Criar uma fronteira técnica explícita para que a CookLily possa ser desenvolvida na mesma infraestrutura do Carro Chefe sem se transformar em parte permanente da marca e sem misturar autenticação, banco, pedidos, pagamentos ou dados de clientes.

## Implementado

1. A branch `lily-acai` existe separada da `main`.
2. A documentação Lily permanece em `docs/lily-acai`.
3. O `AGENTS.md` raiz da branch recebeu uma exceção estritamente delimitada para:
   - `/lilyacai/*`;
   - `/api/v1/lily/*`;
   - `apps/lily_acai/*`;
   - `apps/api/src/modules/lily/*`;
   - `packages/lily-database/*`.
4. A regra do ERP continua integral para os fluxos e dados Carro Chefe.
5. Foram criadas políticas locais para:
   - frontend Lily;
   - módulo API Lily;
   - banco Lily.
6. `.agent-policy/capsules.json` recebeu `region.lily`.
7. A policy foi versionada como `2026.09.19.1`.
8. O manifesto determinístico foi regenerado com os novos escopos.
9. Foram criados READMEs nos três domínios para impedir ambiguidade antes da implementação.
10. Foi criado o índice formal das entregas.

## Decisões preservadas

- Lily é temporária.
- Mesma VPS/domínio não significa mesma aplicação ou mesma base.
- Identidade Lily não reutiliza branding Carro Chefe.
- Login Lily será independente.
- Compartilhamento com Carro Chefe será opcional e não provocará mistura automática de bancos.
- A aplicação Lily poderá ter checkout/pagamento somente no namespace isolado.
- Nada disso muda o ERP ou checkout do Carro Chefe.

## Validações executadas

### Estruturais

- confirmação dos novos `AGENTS.md` na árvore da branch;
- confirmação das cadeias de herança esperadas para os três novos escopos;
- atualização dos hashes das fontes afetadas no manifesto;
- inclusão dos três novos regions no manifesto;
- cálculo do hash determinístico do manifesto;
- validação do orçamento das cápsulas para `AG-DEV` e agentes de negócio.

Resultado de orçamento:

```text
policyVersion: 2026.09.19.1
maior cápsula: apps/api/src/modules/lily / AG-DEV
runtime: 2952 caracteres
limite: 6500 caracteres
resultado: dentro do limite
```

### Segurança de escopo

Foi verificado documentalmente que:

- frontend Lily aponta para namespace API próprio;
- módulo API Lily exige persistência Lily;
- banco Lily proíbe FK/import/acesso ao banco Carro Chefe;
- pagamento Lily não autoriza armazenamento de cartão;
- compartilhamento de dados não é condição de compra;
- conteúdo provisório não pode ser tratado como oferta real.

## Testes ainda não aplicáveis

Nesta entrega não existe app executável, schema Prisma Lily nem rota Lily. Portanto não há comportamento de runtime a testar ainda.

Os seguintes comandos passam a ser obrigatórios a partir da Entrega 2, quando existir código executável:

```bash
npm run policy:check
npm run policy:preflight -- --agent AG-DEV --scope apps/lily_acai
npm run policy:preflight -- --agent AG-DEV --scope apps/api/src/modules/lily
npm run policy:preflight -- --agent AG-DEV --scope packages/lily-database
npm run check
npm test
npm run build
```

Nenhum teste de runtime foi declarado como aprovado sem ter código correspondente.

## Arquivos principais

- `AGENTS.md`
- `.agent-policy/capsules.json`
- `.agent-policy/manifest.json`
- `apps/lily_acai/AGENTS.md`
- `apps/lily_acai/README.md`
- `apps/api/src/modules/lily/AGENTS.md`
- `apps/api/src/modules/lily/README.md`
- `packages/lily-database/AGENTS.md`
- `packages/lily-database/README.md`
- `docs/lily-acai/*`

## Verificação final da branch

Comparação `main...lily-acai` após o fechamento documental:

```text
status: ahead
ahead_by: 16
behind_by: 0
arquivos alterados: somente policy/governança, fronteiras Lily e documentação Lily
```

A busca de código na branch padrão por `CookLily` / `lilyacai` retornou zero resultados, confirmando que a documentação específica não foi gravada na `main`.

### CI

Não houve workflow automático para a branch `lily-acai` até esta verificação:

```text
workflow_runs: 0
```

Portanto, `npm run policy:check`, `npm run check`, `npm test` e `npm run build` **não são declarados como executados nesta entrega**. A validação executada nesta etapa foi estrutural/determinística da policy e do diff. A Entrega 2 deve executar os comandos em ambiente de código antes de ser concluída.

## Resultado

A branch agora possui governança suficiente para começar código Lily sem um agente interpretar erroneamente a exceção como autorização para mudar o checkout ou o banco do Carro Chefe.

A próxima implementação deve começar somente pelos escopos já autorizados e documentados.
