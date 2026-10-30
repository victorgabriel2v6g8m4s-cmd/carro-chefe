# Diagnóstico detalhado ao salvar níveis CookLily

- status: PR aberta; aguardando CI e homologação após integração.
- owner: AG-DEV.
- branch: `codex/lily-level-validation-errors`.
- base_branch: `cooklily/canonical`.
- base_sha_verified: `7d95339f6e4eb12f42234b12bbff0341ac126227`.
- head_sha_verified: `65b24c88c833ec672e661b67ca9b03f50d1a4457` (checkpoint será anexado no próximo commit).
- pull_requests: PR #270.
- migrations: nenhuma.
- deploy: pendente.
- última verificação: 2026-10-30, America/Sao_Paulo.

## Entrega

- O salvamento de níveis agora preserva detalhes de validação do backend e exibe o caminho do campo e a regra que falhou, sem ecoar valores enviados. Limita a exibição a cinco itens e mantém erros sem estrutura no texto original.
- O SVG `cooklily-level-badge-upload (3).svg` foi validado com `sanitizeLilySvg`: 465.241 bytes, aceito, sem filtros/metadados bloqueantes.

## Gates

- Preflight AG-DEV para `apps/lily_acai/src/features/admin`: PASS.
- Teste focado `admin-api-error.test.ts`: 2/2 PASS.
- `npm run check`: PASS.
- `npm run build`: PASS; orçamento CookLily 214,95 KiB gzip combinado / 220 KiB.
- `git diff --check`: PASS.
- CI workflow run `41010512806`: queued na última consulta.

## Homologação e riscos

- A API hoje retorna detalhes Zod em `details`; a interface antes descartava esse campo e mostrava apenas “Entrada inválida.”. A causa específica do payload atual ainda não é conhecida até que os detalhes sejam exibidos na tentativa seguinte.
- O Codex IAB mostrou erro `browser.user is unavailable` nesta sessão, embora inventário liste a aba autenticada. Homologação de produção não concluída; não usar Chrome/Edge externos.
- Nenhum dado administrativo de produção foi alterado.

## Próxima ação exata

1. Confirmar que todos os jobs da CI da PR #270 passaram.
2. Integrar por squash e implantar o SHA canônico resultante.
3. Retentar salvar os níveis pela aba Codex IAB e verificar que o painel exibe caminho e motivo de qualquer validação; corrigir o campo apontado e repetir até salvar.
4. Atualizar este checkpoint com SHA, deploy e evidência real do navegador.
