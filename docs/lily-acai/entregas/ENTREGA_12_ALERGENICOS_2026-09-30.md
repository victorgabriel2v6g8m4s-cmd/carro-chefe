# Entrega 12 — alergênicos do catálogo e do pedido

**Data:** 30/09/2026  
**Branch:** `feat/lily-entrega-12-alergenicos`  
**Base:** `cooklily/canonical` em `e7d767eb84a13f2f48c0817c24d6243a6b0432df`

## Objetivo

Transformar a pendência pré-lançamento “criar configuração de alergênicos” em um domínio estruturado e auditável, fazendo a informação acompanhar a configuração escolhida pelo cliente e ser congelada no pedido.

## Princípio de segurança

**Ausência de cadastro não significa ausência de alergênicos.**

Produto, sabor e adicional começam como:

`unreviewed`

Enquanto qualquer componente escolhido estiver sem revisão, a configuração final retorna:

`complete: false`

A interface informa explicitamente que a informação está em revisão.

O sistema não declara:

- “seguro para alérgicos”;
- “livre de alergênicos”;
- “sem glúten”;
- “sem lactose”;
- ausência de contaminação/contato cruzado.

Essas alegações exigiriam evidências e processos próprios que não fazem parte desta entrega.

## Referência sanitária

O vocabulário controlado foi baseado nos principais alimentos alergênicos tratados nos materiais oficiais da Anvisa e na RDC 727/2022, que consolidou regras de rotulagem de alimentos embalados.

Esta implementação usa a lista como **taxonomia de segurança do catálogo CookLily**.

Ela não afirma que uma tela de cardápio digital substitui requisitos legais específicos de rotulagem aplicáveis a alimentos embalados.

## Vocabulário inicial

- trigo, centeio, cevada, aveia e estirpes hibridizadas;
- crustáceos;
- ovos;
- peixes;
- amendoim;
- soja;
- leite de todos os mamíferos;
- amêndoas;
- avelãs;
- castanha-de-caju;
- castanha-do-pará;
- macadâmias;
- nozes;
- pecãs;
- pistaches;
- pinoli;
- castanhas;
- látex natural.

Os dados são persistidos por código estável; o rótulo humano é resolvido pelo domínio.

## Modelo

Produto, sabor e adicional recebem:

- `allergenReviewStatus`;
- `allergenContainsJson`;
- `allergenMayContainJson`.

Valores antigos migram como `unreviewed`, com listas vazias.

Isso evita classificar o catálogo legado como seguro por omissão.

`LilyOrderItem` recebe:

`allergenSnapshotJson`

O snapshot registra a informação consolidada no momento da criação do pedido.

## Regras de agregação

A cotação autoritativa é calculada no backend.

Para item:

1. produto base;
2. sabores efetivamente escolhidos;
3. adicionais efetivamente escolhidos.

Para receita fixa, os sabores publicados vinculados ao produto são derivados pelo servidor. O navegador não pode removê-los enviando `flavorIds: []`.

Para combos, os resumos de cada item são unidos sem perder quais componentes permanecem sem revisão.

Regra de precedência:

`CONTÉM > PODE CONTER`

Se o mesmo alergênico aparecer como “contém” em qualquer componente, ele não permanece em “pode conter” no resumo final.

## API pública

Produto expõe somente forma normalizada:

```json
{
  "allergens": {
    "reviewStatus": "reviewed",
    "contains": [{ "code": "milk", "label": "leite de todos os mamíferos" }],
    "mayContain": []
  }
}
```

A cotação de item/combo expõe:

```json
{
  "allergens": {
    "complete": false,
    "contains": [],
    "mayContain": [],
    "unreviewed": ["componente pendente"]
  }
}
```

Os JSONs internos de armazenamento não são publicados.

## Administração

O painel de catálogo permite revisar separadamente:

- produto;
- sabor;
- adicional.

Cada editor possui:

- status “Pendente de revisão” / “Revisado”;
- seleção múltipla CONTÉM;
- seleção múltipla PODE CONTER.

O backend rejeita o mesmo código nas duas listas do mesmo componente.

Novos componentes continuam começando como não revisados.

## Funil do cliente

O resumo consolidado aparece em:

- configurador de produto;
- configurador de combo;
- carrinho;
- checkout;
- detalhe de pedido autenticado;
- acompanhamento guest.

O checkout usa a cotação autoritativa mais recente quando disponível.

## Cozinha

O snapshot aparece:

- na fila da cozinha;
- na comanda dedicada;
- na impressão.

A cozinha não consulta o catálogo atual para decidir a informação do pedido.

## Imutabilidade histórica

Ao criar o pedido, `allergenSnapshotJson` é gravado por item.

Se depois a equipe mudar os alergênicos no catálogo:

- o catálogo novo usa a revisão nova;
- o pedido antigo mantém o snapshot original;
- tracking cliente/guest e cozinha continuam usando o snapshot do pedido.

## Carrinhos antigos

Itens persistidos no navegador antes desta entrega podem não possuir `allergens`.

Na leitura de carrinho legado, esses itens são migrados localmente para:

- `complete: false`;
- revisão pendente.

Nunca são transformados em “sem alergênicos”.

O checkout recota no servidor antes da criação do pedido.

## Testes

Cobertura adicionada:

- ordenação/deduplicação do vocabulário;
- CONTÉM prevalece sobre PODE CONTER;
- estado incompleto explícito;
- sobreposição inválida rejeitada;
- união de combo preservando origem não revisada;
- agregação produto + sabor + adicional;
- componente não revisado torna o resultado incompleto;
- staff consegue revisar pelo contrato admin;
- endpoint público não expõe JSON interno;
- snapshot do pedido permanece imutável após alteração do catálogo;
- comanda da cozinha recebe o snapshot;
- regressão estrutural garante presença do aviso no cliente/admin/cozinha.

## Pendências de homologação

A implementação não preenche automaticamente o catálogo real.

Antes do lançamento, Operações precisa revisar cada produto, sabor e adicional usando fichas/ingredientes reais, incluindo avaliação de possibilidade de contato cruzado.

A revisão de dados reais é uma atividade operacional e não pode ser inferida pelo software.
