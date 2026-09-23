# Kit de marca — CookLily

**Status:** identidade-base aprovada; aplicação web em validação.

## Nome e assinatura

- nome público definitivo: **CookLily**;
- grafia visual do wordmark oficial: **cookLily**;
- a logo recebida é a fonte visual oficial;
- `lily-acai` e `lily` permanecem somente como namespaces técnicos.

## Fonte de ativos

A fonte de verdade das mídias é `mídias/cooklily/`. Originais são imutáveis. Derivados web, social e impressão devem indicar origem e finalidade.

## Paleta e tokens aprovados

| Token | HEX | Uso |
|---|---|---|
| `brand-primary` | `#820023` | bordô; CTA/ênfase |
| `brand-secondary` | `#44042D` | ameixa; títulos/contraste |
| `brand-accent` | `#F9C0CF` | rosa principal |
| `surface` | `#FFF7FA` | superfície clara |
| `surface-strong` | `#FCE8EE` | cartões/apoio |
| `text-primary` | `#44042D` | texto principal |
| `text-muted` | `#6E3D59` | texto secundário |
| `success` | `#23664B` | sucesso |
| `danger` | `#9C123D` | erro |

Os três primeiros valores vêm diretamente do raster oficial; os demais são derivados funcionais aprovados para UI.

## Contrato CSS

```css
--cl-color-primary: #820023;
--cl-color-secondary: #44042D;
--cl-color-accent: #F9C0CF;
--cl-color-surface: #FFF7FA;
--cl-color-surface-strong: #FCE8EE;
--cl-color-text: #44042D;
--cl-color-text-muted: #6E3D59;
--cl-color-success: #23664B;
--cl-color-danger: #9C123D;
```

O prefixo oficial é `--cl-`. O antigo `--lg-` nunca virou contrato de produção.

## Tipografia

O lettering da logo é parte do ativo e não deve ser recriado com fonte aproximada. Na interface web, enquanto não houver uma família final licenciada/aprovada, usar stack condensada do sistema para títulos e `system-ui` para corpo/controles.

## Formas e linguagem

- círculos, selos e curvas suaves;
- cantos generosos;
- superfícies claras em rosa;
- bordô/ameixa para contraste;
- laço somente derivado do ativo oficial;
- fotografia real preservando cor, volume e textura;
- nenhuma estética preta/bronze/ouro/madeira/colonial do Carro Chefe.

## Tom de voz

Curto, acolhedor, apetitoso e claro. A frase do adesivo é aprovada como direção:

> cremosidade, sabor e qualidade em cada garrafa

Sem urgência falsa, desconto inventado ou promessa operacional não aprovada.

## Acessibilidade

- texto principal em `#44042D` ou `#820023` sobre superfícies claras;
- `#F9C0CF` não é cor de texto principal;
- foco visível;
- informação não depende só de cor;
- estados semânticos também usam texto;
- alvos de toque adequados.

## Fotografia

As referências reais iniciais são morango e maracujá. Derivados podem corrigir enquadramento, exposição, balanço de branco, reflexos e fundo, mas não alterar quantidade, cor essencial ou textura do produto vendido.

## Estado da Entrega 03

O sistema visual base está fechado. O frontend já recebeu os tokens CookLily e segue para CI/QA. A incorporação binária dos originais/derivados ao Git é uma tarefa separada da definição do kit.
