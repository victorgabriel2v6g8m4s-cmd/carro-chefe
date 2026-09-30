# CookLily — Entrega 10B — Acessibilidade e performance em CI

- status: merged_validated
- owner: AG-DEV
- branch: `feat/lily-entrega-10b-a11y-performance`
- base_branch: `cooklily/canonical`
- base_sha_verified: `e58b7042599ca783885eb5ff64cf08fb4f39a983`
- validated_head_sha: `d895e51ba764382238b4227e27e2e5c8816be34e`
- canonical_merge_sha: `930f9d3aa635af099e7a1b9b0de928bb54bdd80f`
- ci_run: `36640536487` — success
- codeql_run: `36640536577` — success
- canonical_pr: #116 — squash merged
- superseded_draft_pr: #114 — closed without merge because connector could not convert draft to ready
- gate_pr: #115 — closed without merge
- last_verified_at: 2026-09-30
- previous_delivery: Entrega 10A, merge `632ad25a2e72954e301093259c28535993ef7d05`
- interruption_state: integração concluída; QA físico/mobile continua para homologação

## Entregue

- skip link para o conteúdo principal;
- destino de foco explícito no `main`;
- foco visível ampliado para botões, links, inputs, selects e textareas;
- regressões estruturais para idioma, viewport, reduced-motion, focus trap, touch targets, overflow e navegação ativa;
- budget automatizado de JS/CSS dentro de `npm run build:lily`;
- testes unitários do medidor/budget;
- budget incluído em `npm test`;
- documentação clara separando CI de homologação em navegador/aparelho real.

## Baseline e medição validada

Baseline observada na Entrega 10A:

- JS: 479,36 kB raw / 126,14 kB gzip;
- CSS: 90,69 kB raw / 16,89 kB gzip.

Medição do build validado da 10B:

- JS raw: 468,27 KiB;
- JS gzip: 121,81 KiB;
- CSS raw: 89,05 KiB;
- CSS gzip: 16,46 KiB;
- JS + CSS gzip: 138,27 KiB;
- `build_budget=ok`.

Suíte Node 24: 39 arquivos / 234 testes, todos aprovados. A matriz completa Node 20/24, Tool Health e jobs auxiliares também passou.

## Pendências deliberadas

- QA real em 320/360/390/430/768 px;
- navegação por teclado completa e leitor de tela quando disponível;
- contraste/percepção visual final;
- Lighthouse/Core Web Vitals em ambiente publicado;
- recuperação de senha continua bloqueada até canal seguro de verificação;
- retention policy continua dependente de decisão jurídica/operacional.

## Continuidade

A parte técnica automatizável da Entrega 10 está fechada em 10A + 10B. Os itens restantes da Entrega 10 são homologação real ou decisões externas, não dívida de código pronta para implementação autônoma.
