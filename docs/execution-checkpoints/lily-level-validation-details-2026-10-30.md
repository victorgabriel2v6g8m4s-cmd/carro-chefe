# Diagnóstico detalhado ao salvar níveis CookLily

- status: implementado e implantado; homologação da interação real bloqueada pela reconexão do Codex IAB.
- owner: AG-DEV.
- implementation_branch: `codex/lily-level-validation-errors`.
- base_branch: `cooklily/canonical`.
- base_sha_verified: `7d95339f6e4eb12f42234b12bbff0341ac126227`.
- canonical_deploy_sha: `f974ad26d9db9f1435e3c21e7c102dcf6bb04b55`.
- pull_requests: PR #270, squash merge concluído.
- migrations: nenhuma.
- deploy: concluído em 2026-10-30; evidence `/srv/carro-chefe/data/deploy-logs/deploy-20261030-055243-f974ad26d9db.evidence`; log `/srv/carro-chefe/data/deploy-logs/deploy-20261030-055243-f974ad26d9db.log`.
- última verificação: 2026-10-30, America/Sao_Paulo.

## Entrega

- O salvamento de níveis preserva detalhes de validação do backend e exibe o caminho do campo e a regra que falhou, sem ecoar valores enviados. Limita a exibição a cinco itens e mantém erros sem estrutura no texto original.
- O SVG `cooklily-level-badge-upload (3).svg` foi validado com `sanitizeLilySvg`: 465.241 bytes, aceito, sem filtros/metadados bloqueantes.

## Gates

- Preflight AG-DEV para `apps/lily_acai/src/features/admin`: PASS.
- Teste focado `admin-api-error.test.ts`: 2/2 PASS.
- `npm run check`: PASS.
- `npm run build`: PASS; orçamento CookLily 214,95 KiB gzip combinado / 220 KiB.
- `git diff --check`: PASS.
- CI run `41010555997`: concluído com sucesso; todos os jobs verdes.
- Deploy canônico: migrations existentes confirmadas, 77 arquivos/407 testes PASS, build PASS (215,14 KiB gzip combinado), tool health PASS, Nginx syntax PASS, health e external smoke PASS.

## Homologação e riscos

- O Codex IAB continua mostrando `browser.user is unavailable` ao obter a aba autenticada, mesmo que o inventário do app liste o painel. Não foi feita homologação de UI/UX real e nenhum navegador externo foi usado.
- Nenhum dado administrativo de produção foi alterado.
- O motivo preciso da falha original ainda depende de uma nova tentativa de salvar níveis já com o build implantado; a UI deve então apresentar o caminho e a mensagem da validação.

## Próxima ação exata

1. Na aba autenticada de `/lilyacai/painel/fidelidade`, salvar os níveis novamente.
2. Se ainda houver erro, registrar o texto detalhado exibido e corrigir o campo indicado; se salvar, confirmar a mensagem de sucesso.
3. Atualizar este checkpoint com o resultado observado no navegador integrado.
