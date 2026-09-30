# Entrega 10B — acessibilidade e performance em CI

**Data:** 29/09/2026  
**Branch:** `feat/lily-entrega-10b-a11y-performance`  
**Base:** `cooklily/canonical` em `e58b7042599ca783885eb5ff64cf08fb4f39a983`

## Objetivo

Fechar a parte automatizável de acessibilidade/overflow/performance da Entrega 10 sem confundir teste estrutural com homologação visual real.

## Acessibilidade

### Skip link

O Shell passa a iniciar com:

`Pular para o conteúdo principal`

O link aponta para:

`#lily-main-content`

O `main` possui `tabIndex={-1}` para poder receber foco como destino de navegação por teclado.

O skip link fica visualmente fora da tela quando não está em foco e aparece acima do header quando recebe `:focus-visible`.

O destino também mantém outline explícito; não removemos o indicador de foco.

### Foco visível

A regra de foco passa a cobrir:

- links;
- botões;
- inputs;
- selects;
- textareas.

Isso complementa as correções P0/P1 anteriores de focus trap e alvos de toque.

### Regressões estruturais

`apps/lily_acai/src/structure.test.ts` passa a proteger também:

- `lang="pt-BR"`;
- viewport mobile;
- skip link e destino;
- foco visível abrangente;
- reduced-motion.

Os testes anteriores continuam protegendo:

- ausência de overflow horizontal global mascarado;
- drawer dentro da viewport;
- focus trap do menu;
- alvos críticos de 44 px;
- carrossel com snap sem alargar a viewport;
- segurança do checkout;
- fluxos cozinha/courier.

## Performance de build

### Baseline

A baseline vem do build real validado da Entrega 10A:

| Asset | Raw | Gzip |
|---|---:|---:|
| JS CookLily | 479,36 kB | 126,14 kB |
| CSS CookLily | 90,69 kB | 16,89 kB |

Ela foi extraída do log do CI, não estimada.

### Budget

Novo helper:

`tools/lily-build-budget.mjs`

Limites:

| Métrica | Limite |
|---|---:|
| JS raw | 620.000 bytes |
| JS gzip | 165.000 bytes |
| CSS raw | 130.000 bytes |
| CSS gzip | 30.000 bytes |
| JS + CSS gzip | 190.000 bytes |

A folga evita bloquear pequenas evoluções normais, mas impede crescimento silencioso muito acima da baseline atual.

O budget contabiliza todos os `.js` e `.css` de `apps/lily_acai/dist/assets`; imagens/fontes não entram nesse orçamento específico.

### Integração com build

`npm run build:lily` agora executa:

1. Vite production build;
2. medição raw/gzip;
3. comparação com budget;
4. falha não-zero se qualquer limite for excedido.

Portanto o build geral e o deployer também falham se o bundle ultrapassar os limites.

### Testes do budget

`tools/lily-build-budget.test.mjs`

Cobertura:

- budgets acima da baseline, mas com folga limitada;
- build sintético dentro do orçamento;
- violações em cada métrica;
- medição somente de JS/CSS, ignorando mídia.

Novo script:

`npm run test:lily-budget`

Ele faz parte de `npm test`.

## O que isso não prova

Esta entrega **não** declara:

- conformidade WCAG completa;
- score Lighthouse;
- ausência de regressão visual em todos os navegadores;
- ergonomia real em aparelho;
- performance de rede real/3G;
- Core Web Vitals reais.

Esses itens dependem de execução em navegador/dispositivo e permanecem no roteiro de homologação.

## QA real ainda necessário

- 320 / 360 / 390 / 430 / 768 px;
- teclado completo;
- leitor de tela quando disponível;
- foco após modais/menus;
- contraste visual final;
- operação de cozinha/courier em aparelho;
- impressão;
- navegação em rede real;
- inspeção de Web Vitals/Lighthouse no ambiente publicado.
