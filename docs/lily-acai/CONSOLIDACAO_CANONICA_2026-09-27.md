# CookLily — consolidação da linha canônica

**Data:** 27/09/2026  
**Branch canônica:** `cooklily/canonical`

## Motivo

A implementação CookLily estava distribuída entre:

- `lily-acai` — base histórica até a fundação/catálogo;
- `feat/lily-entrega-06-pedidos` — carrinho, fulfillment e pedidos;
- `feat/lily-homologacao-05-06` e gates derivados — correções de homologação;
- `feat/lily-entrega-07-pagamentos` — pagamentos, reconciliação, equipe e RBAC;
- branches `gate/lily-*` — árvores de validação usadas para CI/CodeQL.

Isso fazia documentos antigos parecerem mais atrasados que o código real e não deixava uma única referência clara de “estado atual”.

## Decisão

`cooklily/canonical` passa a ser a referência de integração para trabalho novo da CookLily.

Regras:

1. `main` continua sendo a linha principal do Carro Chefe e não recebe a CookLily automaticamente.
2. `lily-acai` fica preservada como base histórica/compatibilidade, não como fotografia completa do estado atual.
3. branches `feat/lily-*` e `gate/lily-*` anteriores passam a ser evidência histórica das entregas/gates.
4. trabalho novo CookLily deve partir da branch canônica ou de uma branch curta criada a partir dela.
5. deploy CookLily deve usar SHA imutável validado por CI/CodeQL e autorização explícita.
6. um PR técnico contra `main` pode ser usado apenas para disparar gates; isso não autoriza merge.

## Conteúdo incorporado

A linha canônica contém, em uma única árvore:

- identidade, auth e consentimentos;
- landing e leads;
- catálogo/admin/mídia;
- LilyMix, ofertas, combos e destaques;
- carrinho;
- endereços;
- retirada/entrega;
- pedidos guest/autenticados;
- perfil/ranking/fidelidade;
- correções de homologação 05/06;
- domínio de pagamentos da Entrega 07;
- Pix manual reconciliável;
- painel financeiro;
- gestão de equipe e separação staff/admin.

## Gate da Entrega 07

O gate v1 falhou em TypeScript no histórico de pedidos:

```ts
orders.map(serializeOrder)
```

A função `serializeOrder` tem um segundo argumento opcional (`guestAccessToken`). `Array.map` também fornece um segundo argumento, o índice numérico, produzindo incompatibilidade de assinatura no TypeScript.

Correção canônica:

```ts
orders.map((order) => serializeOrder(order))
```

O Tool Health falhou pelo mesmo motivo, pois `app-api` executa o check TypeScript. Não era uma segunda falha independente.

### Gate de revalidação

PR técnico: **#80**  
CI: **run 36330633129**  
CodeQL: **run 36330633098**

O resultado final deve ser registrado neste arquivo e em `entregas/ENTREGA_07_PAGAMENTOS_RECONCILIACAO.md` antes de declarar a Entrega 07 aprovada.

## Backlog canônico

Pendências de decisão/implementação:

- `DECISOES_PENDENCIAS.md`.

QA de UX, segurança e administração:

- `PENDENCIAS_UX_SEGURANCA_2026-09-27.md`.

A regra é não encerrar um item “corrigido no candidato” sem revalidação após deploy em navegador/aparelho real.
