# Header de fidelidade e dashboard para visitantes

- status: deployed
- owner: AG-DEV
- branch: codex/lily-anon-loyalty-dashboard
- base_branch: cooklily/canonical
- base_sha_verified: 6e64971574ecb61f68d52b29f6ed3fe5c53c0eb9
- head_sha_verified: e8a1d0c9e2dc1f3696e3bcd39c779c4a544fd4f3
- pull_requests: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/273 (merged, squash commit e8a1d0c9e2dc1f3696e3bcd39c779c4a544fd4f3)
- last_verified_at: 2026-10-30
- interruption_state: none

## Entrega

Visitantes sem sessão veem saldo de 0 LilyCoins e 0 pontos no header. Os dois controles levam ao dashboard. O dashboard informa “Faça login ou crie uma conta para monitorar seu desempenho” e oferece login/cadastro com retorno para `/dashboard`.

## Concluído e persistido

- Implementado em `HeaderLoyaltyControls.tsx`, `main.tsx`, `DashboardPage.tsx`, `styles.css` e `structure.test.ts`.
- Commit de trabalho: `4daf5173f68e770d0d8e9c1b32c81e325a98e05c`.
- PR #273 integrada na canonical por squash em `e8a1d0c9e2dc1f3696e3bcd39c779c4a544fd4f3`.
- Deploy concluído para `e8a1d0c9e2dc1f3696e3bcd39c779c4a544fd4f3`; backup e smoke externo validados.

## Em andamento

- Falta homologação visual desktop/mobile no domínio pelo navegador integrado. CUA enumera o tab IAB (`https://carrochefe.com/lilyacai/painel/fidelidade`), porém `getTab('13')` falha com `browser.user is unavailable`. Não usar Chrome/Edge externos.

## Gates e testes

- `npm run test:lily-ui`: passou localmente, 23 arquivos e 101 testes.
- `npm run check`: passou (Prisma generate/validate e TypeScript raiz).
- `npm run build`: passou; inclui todas as apps, budget CookLily 215.50 KiB gzip combinado / 220 KiB, CSS gzip 33.98 / 34.00 KiB.
- `git diff --check`: passou antes do checkpoint.
- Deploy: passou `npm test` (78 arquivos/409 testes), build e Tool Health; migrations de produção já aplicadas, readiness interno na tentativa 7 e smoke HTTPS externo na tentativa 1.
- CI PR #273: todos os checks passaram, incluindo Quality Node 20/24, Tool Health Linux, Windows Supervisor e Workbook/Excel.
- `npm run build` na VPS: budget CookLily 215.69 KiB gzip combinado / 220 KiB; CSS 33.99 / 34.00 KiB.

## Migrations

- Nenhuma.

## Bloqueios/riscos

- CSS gzip está a 0.01 KiB do limite; build atual passou.
- CUA do navegador integrado indisponível para inspeção nesta execução; a sessão autenticada atual não foi encerrada.

## Homologação/dependências externas

- VPS: `root@2.25.182.185`, porta 22, chave autorizada `C:\Users\valdi\.ssh\hostinger_cooklily_ed25519`.
- Deploy executado em 2026-10-30; evidência VPS em `/srv/carro-chefe/data/deploy-logs/deploy-20261030-063608-e8a1d0c9e2dc.evidence`.
- Para alegar homologação visual desktop/mobile, recuperar CUA IAB e testar ambos tamanhos sem mudar a sessão atual.

## Próxima ação exata

Repetir a validação visual de desktop e mobile no domínio após CUA IAB voltar a responder; manter limitação documentada enquanto indisponível.
