# Kit de marca — Lily Gourmet

**Status:** acervo inicial recebido em 23/09/2026; kit em construção.

## Regra principal

O kit deve ser derivado da **logo oficial fornecida pelo proprietário** e das demais mídias reais catalogadas em `mídias/lily-gourmet/`.

A logo foi recebida em 23/09/2026. O original traz o lettering `cookLily`, enquanto o nome público aprovado é **Lily Gourmet**. O arquivo original é fonte visual oficial e deve permanecer imutável; a adaptação de naming precisa ser decidida e criada como derivado separado.

Não escolher fonte oficial ou alterar o lettering por suposição.

## Ativos

O repositório já possui uma governança própria para mídias. Por isso, a estrutura canônica passa a ser:

```text
mídias/lily-gourmet/
  README.md
  CATALOGO_IA.json
  fichas/
  originais/
    marca/
    impressos/
    produtos/
  derivados/
    web/
    social/
    impressao/

docs/lily-acai/marca/
  KIT_DE_MARCA.md
  ATIVOS.md

apps/lily_acai/public/brand/
  # somente derivados aprovados/otimizados usados pelo runtime
```

Não duplicar originais dentro de `docs/` nem em `public/`.

Regras:

- originais são imutáveis;
- derivados registram origem, data e finalidade;
- não sobrescrever o master;
- não versionar fonte paga sem licença de redistribuição;
- runtime usa derivados, nunca destrói o original.

## Logo

Documentar:

- versão principal;
- horizontal/símbolo quando existirem;
- monocromática/negativa;
- fundos permitidos;
- área de proteção;
- tamanho mínimo;
- proporção;
- usos proibidos;
- favicon/avatar.

## Paleta

Preencher após extração e aprovação:

| Token | HEX | RGB | Uso |
|---|---|---|---|
| `brand-primary` | pendente | pendente | CTA/ênfase |
| `brand-secondary` | pendente | pendente | apoio |
| `brand-accent` | pendente | pendente | destaque |
| `surface` | pendente | pendente | fundos |
| `text-primary` | pendente | pendente | texto |
| `text-muted` | pendente | pendente | apoio |
| `success` | pendente | pendente | confirmação |
| `danger` | pendente | pendente | erro |

Todos os pares usados em UI devem ter contraste validado.

## Tipografia

Registrar:

- fonte de títulos;
- fonte de texto;
- pesos;
- fallback;
- licença/origem;
- escala;
- line-height;
- tracking.

## Tokens web

Contrato sugerido:

```css
--lg-color-primary
--lg-color-secondary
--lg-color-accent
--lg-color-surface
--lg-color-text
--lg-font-display
--lg-font-body
--lg-radius-sm
--lg-radius-md
--lg-radius-lg
--lg-shadow-card
--lg-space-*
```

Valores entram somente após aprovação.

## Linguagem visual

Definir:

- formas/raios;
- cards;
- botões;
- campos;
- ícones;
- badges;
- fundos;
- fotografia;
- motion;
- loading/vazio/erro/sucesso.

A Lily Gourmet não deve parecer uma skin do Carro Chefe.

## Tom de voz

Comunicação curta, calorosa e comercial, sem urgência falsa, desconto inexistente, prova social inventada ou slogan do Carro Chefe.

## Acessibilidade

- contraste WCAG;
- foco visível;
- informação não transmitida somente por cor;
- toque adequado;
- motion reduzido;
- alt text quando necessário.

## Pronto

- logo original versionada;
- variantes documentadas;
- paleta aprovada;
- fontes aprovadas/licenciadas;
- tokens preenchidos;
- componentes-chave definidos;
- frontend inteiro convertido;
- QA mobile/desktop/teclado/contraste concluído.


## Acervo visual recebido em 23/09/2026

Consultar [`ATIVOS.md`](./ATIVOS.md) e `mídias/lily-gourmet/`.

O acervo inicial já permite trabalhar com:

- forma circular e laço;
- família rosa/ameixa/bordô;
- referência de tipografia/lettering existente;
- exemplo real de adesivo;
- duas referências reais de produto.

Ainda não permite fechar o manual sem decidir a relação entre o lettering `cookLily` e o nome público **Lily Gourmet**.
