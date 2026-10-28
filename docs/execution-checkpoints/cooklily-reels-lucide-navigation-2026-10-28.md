# CookLily — experiência de Reels, ícones e navegação

- status: in_progress
- owner: AG-DEV
- branch: codex/reels-lucide-navigation
- base_branch: cooklily/canonical
- base_sha_verified: d06f0199faefbcf9e9d1afbc6ec29ea2064dac15
- head_sha_verified: 0f8605a (feat(lily): refine immersive reels navigation)
- pull_requests: pending
- deployed_sha: d06f0199faefbcf9e9d1afbc6ec29ea2064dac15
- tests/gates: `npm run policy:preflight -- --agent AG-DEV --scope lily-reels-icons-navigation` PASS; `npm run test:lily-ui` PASS (16 files, 72 tests); `npm run check` PASS; `npm test` PASS (67 files, 356 passed, 3 skipped); `npm run build` PASS, including CookLily size budget (JS+CSS gzip 216.97/217 KiB); `git diff --check` PASS. Await PR CI.
- migrations: none
- blockers: production deployment and IAB evidence pending PR integration
- known_limitations: comments control opens an accessible empty state; product comments API/persistence does not exist in this codebase. Add-to-cart is in-place for fixed products with no required add-ons; products requiring selection/minimum add-ons route to the catalog configurator to avoid silently choosing required customizations.
- last_verified_at: 2026-10-28 America/Sao_Paulo
- next_action: push commit `0f8605a`, open draft PR to `cooklily/canonical`; wait for CI, merge under existing owner authorization, deploy canonical, then visually verify via Codex integrated browser and update evidence/status.

## Entrega solicitada

- Usar Lucide nos controles de Reels e nos ícones do header/footer da CookLily.
- Header da esquerda para a direita: notificações, perfil, carrinho, menu.
- Trocar o atalho de carrinho no footer mobile por Ranking; manter Cardápio.
- Reels em feed vertical com snap e carregamento contínuo do catálogo; navegação vertical por gesto/scroll, mouse drag e setas Up/Down. Setas Left/Right e arraste horizontal continuam no carrossel de mídias do produto.
- Remover os controles visuais de avançar/voltar o Reel; manter apenas a ação explícita de sair.
- Adicionar item fixo sem adicionais mínimos no próprio Reel, com animação/estado visual do ícone do carrinho; seleções obrigatórias seguem pelo configurador do catálogo.
- Controles de ação sem borda/background, somente ícones com sombra para contraste.
- Linha do tempo do vídeo após a descrição, oculta enquanto reproduz e mostrada quando pausado.
- Descrição responsiva com quebra de palavras, limite visual e “Ver mais” sem caixa.
- Botão de abrir comentários.
- Preservar a regra documentada de modos relacionados/ordem/aleatório, 2× pressionado, som, pausa de vídeo e carrossel horizontal.

## Evidências locais

- `npm run policy:preflight -- --agent AG-DEV --scope lily-reels-icons-navigation`: PASS, executado antes de alterar código.
- `npm run test:lily-ui`: PASS, 16 arquivos e 72 testes.
- `npm run check`: PASS, schemas e TypeScript.
- `npm test`: PASS, 67 arquivos, 356 aprovados, 3 ignorados.
- `npm run build`: PASS, incluindo assets CookLily dentro do orçamento: JS+CSS gzip 216.97 KiB de 217 KiB.
- `git diff --check`: PASS.
- Base remota `origin/cooklily/canonical` confirmada em `d06f0199faefbcf9e9d1afbc6ec29ea2064dac15`.
- A tentativa opcional de migrar um SQLite core descartável falhou no schema engine sem diagnóstico; o banco `.runtime` versionado/operacional não foi alterado. `npm test` passou usando banco de teste isolado e o check db de Lily.

## Testes de produção anteriores

- PR #227 introduziu o modo Reels imersivo; PR #228 corrigiu o indicador de progresso; canonical em produção verificada na SHA `d06f0199faefbcf9e9d1afbc6ec29ea2064dac15`.
- Evidência de deploy anterior: `/srv/carro-chefe/data/deploy-logs/deploy-20261028-164500-d06f0199faef.evidence`.
- A evidência visual desta entrega será coletada apenas no navegador integrado do Codex após o deploy. Não controlar Chrome/Edge externos.

## Pendências de integração/homologação

- [ ] Revisar o diff final e registrar a SHA do commit.
- [ ] Abrir PR e registrar número/link; aguardar CI completo.
- [ ] Merge squash e confirmar SHA canonical.
- [ ] Deploy VPS via `sudo cc deploy canonical` usando sessão SSH existente autorizada.
- [ ] Capturar/registrar Reels e uma página normal no browser integrado: feed/ícones/controle de som e sequência, arraste/teclado, add-to-cart em Reel, footer Ranking e ordem dos ícones do header.
- [ ] Registrar resultado real dos comentários: painel vazio acessível porque ainda não existe API.
- [ ] Atualizar checkpoint para `completed` apenas após deploy e evidência visual.
