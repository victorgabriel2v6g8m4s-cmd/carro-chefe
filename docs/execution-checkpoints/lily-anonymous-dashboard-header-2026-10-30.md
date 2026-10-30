# Header de fidelidade e dashboard para visitantes

- status: candidate
- owner: AG-DEV
- branch: codex/lily-anon-loyalty-dashboard
- base_branch: cooklily/canonical
- base_sha_verified: 6e64971574ecb61f68d52b29f6ed3fe5c53c0eb9
- head_sha_verified: 6e64971574ecb61f68d52b29f6ed3fe5c53c0eb9 (alterações locais ainda não commitadas)
- pull_requests: pending
- last_verified_at: 2026-10-30
- interruption_state: none

## Entrega

Visitantes sem sessão veem saldo de 0 LilyCoins e 0 pontos no header. Os dois controles levam ao dashboard. O dashboard informa “Faça login ou crie uma conta para monitorar seu desempenho” e oferece login/cadastro com retorno para `/dashboard`.

## Concluído e persistido

- Nenhuma alteração foi commitada ou publicada ainda.
- Implementação local em `HeaderLoyaltyControls.tsx`, `main.tsx`, `DashboardPage.tsx`, `styles.css` e `structure.test.ts`.

## Em andamento

- Preparar PR para `cooklily/canonical`, aguardar CI, integrar e fazer deploy na VPS.
- Homologação visual no domínio via navegador integrado pendente: CUA enumerou o tab IAB, mas `getTab('13')` falhou com `browser.user is unavailable`. Não usar Chrome/Edge externos.

## Gates e testes

- `npm run test:lily-ui`: passou, 23 arquivos e 101 testes.
- `npm run check`: passou (Prisma generate/validate e TypeScript raiz).
- `npm run build`: passou; inclui todas as apps, budget CookLily 215.50 KiB gzip combinado / 220 KiB, CSS gzip 33.98 / 34.00 KiB.
- `git diff --check`: passou antes do checkpoint.
- CI: pending.

## Migrations

- Nenhuma.

## Bloqueios/riscos

- CSS gzip está a 0.02 KiB do limite; build atual passou.
- CUA do navegador integrado indisponível para inspeção nesta execução; a sessão autenticada atual não foi encerrada.

## Homologação/dependências externas

- VPS: `root@2.25.182.185`, porta 22, chave autorizada `C:\Users\valdi\.ssh\hostinger_cooklily_ed25519`.
- Executar deploy por SHA completo somente depois de PR integrada em `cooklily/canonical`.
- Para alegar homologação visual desktop/mobile, será necessário recuperar CUA IAB e testar ambos tamanhos sem mudar a sessão atual.

## Próxima ação exata

Adicionar checkpoint e mudanças do produto à branch, revisar o diff, commitar e abrir PR para `cooklily/canonical`.
