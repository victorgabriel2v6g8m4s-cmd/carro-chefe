# CookLily — benefícios de nível, painel de fidelidade e migrations

- status: in_progress
- owner: AG-DEV
- branch: codex/lily-loyalty-benefits-levels-ui
- base_branch: cooklily/canonical
- base_sha_verified: 5742fe5bfc59e200f61ea28d825fc7e286f2adf7
- head_sha_verified: 6ec56ba7877ff2b35e9ba3e0ae92e7cf0e73cfb2
- pull_requests: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/257 (merged)
- last_verified_at: 2026-10-29 21:38 UTC
- interruption_state: active

## Objetivo

Implementar no painel CookLily benefícios estruturados por nível, limites configuráveis de resgate, configurações de produto/combo, marca LilyCoins, ícones, progresso do cliente e curva interativa; evitar erros recorrentes de migration nos testes locais sem trocar o banco a cada execução; integrar à canonical, publicar e homologar desktop/mobile no navegador integrado.

## Concluído e persistido

- Preflight `AG-DEV`, escopo `lily-loyalty-benefits-curve`: PASS.
- Task runtime `TASK-DEV-LOYALTY-BENEFITS-UI`, execução `cmvu0kcga000lactpxz5lelcs` iniciada.
- PR #257 passou todos os jobs de CI em Node 20 e Node 24 e foi integrado por squash às 21:38 UTC. SHA canônico: `6ec56ba7877ff2b35e9ba3e0ae92e7cf0e73cfb2`.
- Migrations versionadas criadas: `20261029210000_lily_loyalty_benefit_assets` e `20261029220000_lily_level_benefit_redemptions`.
- Respostas do proprietário aplicadas: benefícios de nível desbloqueados para resgate no dashboard; limite individual configurável por benefício (padrão 1); LilyCoins ficam preparadas para a futura Store sem implementar Store nesta tarefa.
- Hook `pretest`/`pretest:api` aplica migrations pendentes no banco local padrão `.runtime/lily-acai.db`; respeita e não modifica URLs explícitas usadas por CI/testes isolados.
- A chave VPS foi localizada e o fingerprint conferido: `SHA256:/Fl2E1ADG3RPCCNxS65PRbmN1f07jyCTYsPesSDd2B8`.

## Em andamento

- Implementação frontend, API, schema, migrations e documentação integradas à canonical.
- Release/deploy, homologação IAB desktop/mobile e fechamento da task runtime pendentes.

## Gates e testes

- `npm test`: PASS local, 74 arquivos, 387 testes passaram, 3 skipped, antes do caso concorrente adicionado.
- `npm run test:api`: PASS local, 49 arquivos, 281 testes passaram, 3 skipped; inclui concorrência do limite de resgate.
- `npm run test:lily-ui`: PASS local, 20 arquivos, 93 testes.
- `npm run check`: PASS após ajustes finais de validade de cupom, transação e clique duplo.
- `npm run build`: PASS após os ajustes finais; orçamento CookLily 789.21 KiB JS raw / 800 KiB, 217.74 KiB gzip / 220 KiB, CSS 169.74 KiB raw / 174 KiB, combinado 250.82 KiB gzip / 254 KiB.
- PR #257 CI: todos os jobs PASS, incluindo Quality Node 20/24, snapshots, tool health e receitas.
- `git diff --cached --check`: PASS.

## Migrations

- Nova migration de ativos de benefícios e marca LilyCoins.
- Nova migration de resgates de benefícios, snapshot, código único e status de fulfillment por equipe.
- Ambas aplicadas no `.runtime/lily-acai.db` local e verificadas com `npm run db:deploy:lily` (38 migrations, zero pendentes). Na VPS, inspeção somente leitura encontrou 36 migrations aplicadas antes desta release; banco ainda não alterado.

## Bloqueios/riscos

- Nenhum bloqueio de autorização para deploy; acesso SSH autorizado via arquivo `C:\Users\valdi\.ssh\hostinger_cooklily_ed25519`, fingerprint comparado ao `.pub`.
- Em homologação real, não alterar dados/configuração comercial nem resgatar benefícios de clientes.
- Deploy será executado pelo `/usr/local/sbin/carro-chefe-deploy`, após backup e preflight isolado integrados ao script. Inspeção read-only confirmou o helper instalado, serviço ativo e banco Lily em `/srv/carro-chefe/data/lily-acai.db`.
- Homologação de domínio ainda não comprovada.

## Homologação/dependências externas

- Usar exclusivamente a aba integrada Codex autenticada no domínio real, desktop e em viewport mobile.
- SHA de release integrado: `6ec56ba7877ff2b35e9ba3e0ae92e7cf0e73cfb2`.
- Aguardar conclusão do deployer, confirmar os backups/migrations/health check no log e então validar domínio desktop/mobile.
- Guardar evidência e corrigir/redeploy/retestar qualquer falha.

## Próxima ação exata

Publicar esta atualização do checkpoint; executar o deploy do SHA `6ec56ba7877ff2b35e9ba3e0ae92e7cf0e73cfb2`; homologar fidelidade no navegador IAB em desktop e mobile sem salvar configurações; registrar evidências, falhas e retestes; fechar execução e tarefa runtime.
