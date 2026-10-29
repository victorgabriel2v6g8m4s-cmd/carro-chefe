# CookLily — benefícios de nível, painel de fidelidade e migrations

- status: candidate
- owner: AG-DEV
- branch: codex/lily-loyalty-benefits-levels-ui
- base_branch: cooklily/canonical
- base_sha_verified: 5742fe5bfc59e200f61ea28d825fc7e286f2adf7
- head_sha_verified: 5742fe5bfc59e200f61ea28d825fc7e286f2adf7 (staged candidate, commit pending)
- pull_requests: none
- last_verified_at: 2026-10-29 America/Sao_Paulo
- interruption_state: active

## Objetivo

Implementar no painel CookLily benefícios estruturados por nível, limites configuráveis de resgate, configurações de produto/combo, marca LilyCoins, ícones, progresso do cliente e curva interativa; evitar erros recorrentes de migration nos testes locais sem trocar o banco a cada execução; integrar à canonical, publicar e homologar desktop/mobile no navegador integrado.

## Concluído e persistido

- Preflight `AG-DEV`, escopo `lily-loyalty-benefits-curve`: PASS.
- Task runtime `TASK-DEV-LOYALTY-BENEFITS-UI`, execução `cmvu0kcga000lactpxz5lelcs` iniciada.
- Migrations versionadas criadas: `20261029210000_lily_loyalty_benefit_assets` e `20261029220000_lily_level_benefit_redemptions`.
- Respostas do proprietário aplicadas: benefícios de nível desbloqueados para resgate no dashboard; limite individual configurável por benefício (padrão 1); LilyCoins ficam preparadas para a futura Store sem implementar Store nesta tarefa.
- Hook `pretest`/`pretest:api` aplica migrations pendentes no banco local padrão `.runtime/lily-acai.db`; respeita e não modifica URLs explícitas usadas por CI/testes isolados.
- A chave VPS foi localizada e o fingerprint conferido: `SHA256:/Fl2E1ADG3RPCCNxS65PRbmN1f07jyCTYsPesSDd2B8`.

## Em andamento

- Implementação frontend, API, schema, migrations e documentação presentes no working tree; falta commit.
- Revisão final, integração, CI, release/deploy, homologação IAB desktop/mobile e fechamento da task runtime.

## Gates e testes

- `npm test`: PASS, 74 arquivos, 387 testes passaram, 3 skipped, antes do caso concorrente adicionado.
- `npm run test:lily-ui`: PASS, 20 arquivos, 93 testes.
- `npm run test:api -- --run apps/api/src/modules/lily/loyalty.test.ts`: PASS, comando executou os 49 arquivos, 281 testes passaram, 3 skipped. Inclui limite de resgate concorrente.
- `npm run test:lily-ui`: PASS, 20 arquivos, 93 testes.
- `npm run check`: PASS após ajustes finais de cupom/transação.
- `npm run build`: PASS após ajustes; build CookLily 789.11 KiB JS raw / 800 KiB, 217.73 KiB gzip / 220 KiB, CSS 169.74 KiB raw / 174 KiB, combinado 250.80 KiB gzip / 254 KiB.
- `git diff --cached --check`: PASS.
- CI/CodeQL/PR: pendentes.

## Migrations

- Nova migration de ativos de benefícios e marca LilyCoins.
- Nova migration de resgates de benefícios, snapshot, código único e status de fulfillment por equipe.
- Ambas aplicadas no `.runtime/lily-acai.db` local e verificadas com `npm run db:deploy:lily` (38 migrations, zero pendentes). Banco da VPS não foi alterado.

## Bloqueios/riscos

- Nenhum bloqueio de autorização para deploy; acesso SSH autorizado via arquivo `C:\Users\valdi\.ssh\hostinger_cooklily_ed25519`, fingerprint comparado ao `.pub`.
- Em homologação real, não alterar dados/configuração comercial nem resgatar benefícios de clientes.
- CI, operação de deploy e homologação de domínio ainda não comprovadas.

## Homologação/dependências externas

- Usar exclusivamente a aba integrada Codex autenticada no domínio real, desktop e em viewport mobile.
- Backup do banco Lily e confirmação do SHA liberado antes de migration/deploy.
- Guardar evidência e corrigir/redeploy/retestar qualquer falha.

## Próxima ação exata

Fazer commit das mudanças staged, publicar branch e abrir PR para `cooklily/canonical`; depois aguardar CI/revisão obrigatória e integrar por squash, preparar backup/migration/release VPS e homologar no IAB desktop/mobile.
