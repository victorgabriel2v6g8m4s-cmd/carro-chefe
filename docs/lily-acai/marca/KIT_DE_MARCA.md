# Kit de marca — Lily Gourmet

**Status:** estrutura planejada; logo oficial ainda pendente de upload.

## Regra principal

O kit deve ser derivado da **logo oficial fornecida pelo proprietário**. Não escolher cores exatas, fonte principal ou proporções oficiais por suposição.

## Ativos

Estrutura prevista:

```text
docs/lily-acai/marca/
  KIT_DE_MARCA.md
  assets/
    originais/
      logo-lily-gourmet-master.<formato-fonte>
      logo-lily-gourmet.png
    derivados/
      web/
      social/
      impressao/

apps/lily_acai/public/brand/
  # somente derivados otimizados para runtime
```

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
