# CookLily — Entrega 10B — Acessibilidade e performance em CI

- status: in_progress
- owner: AG-DEV
- branch: `feat/lily-entrega-10b-a11y-performance`
- base_branch: `cooklily/canonical`
- base_sha_verified: `e58b7042599ca783885eb5ff64cf08fb4f39a983`
- last_verified_at: 2026-09-29
- previous_delivery: Entrega 10A, merge `632ad25a2e72954e301093259c28535993ef7d05`

## Objetivo

Transformar correções de acessibilidade/overflow já existentes em regressões explícitas de CI e impedir crescimento silencioso do bundle CookLily.

## Baseline real

Medição observada no build validado da 10A:

- JS: 479,36 kB raw / 126,14 kB gzip;
- CSS: 90,69 kB raw / 16,89 kB gzip.

Os budgets serão derivados desta baseline com folga operacional, e não escolhidos como metas abstratas de Lighthouse.

## Escopo

1. skip link para o conteúdo principal;
2. foco visível para botões, links, inputs, selects e textareas;
3. preservar reduced-motion, focus trap, touch targets e ausência de overflow mascarado;
4. budget automatizado de JS/CSS do build CookLily;
5. testes unitários do budget;
6. execução do budget dentro de `npm run build:lily`;
7. documentação do que o CI cobre e do que continua exigindo aparelho/navegador real.

## Fora do escopo

- declarar WCAG integralmente homologado sem auditoria real;
- inventar score Lighthouse sem executar Lighthouse;
- substituir QA em 320/360/390/430/768 px;
- resolver recuperação de senha sem canal seguro;
- definir retention policy sem decisão jurídica.
