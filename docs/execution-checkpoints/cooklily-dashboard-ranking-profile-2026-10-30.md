# Dashboard, ranking, níveis e perfil CookLily

- status: completed
- owner: AG-DEV
- branch: codex/cooklily-dashboard-ranking-profile
- base_branch: cooklily/canonical
- base_sha_verified: a9b59e7e0ffdd037317e9883a3382f092fe820e4
- head_sha_verified: 080eae62ae8615887b8e45f58038f6daad2de399 (feature squash merge; deployed)
- pull_requests: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/277 (merged)
- last_verified_at: 2026-10-30 13:42 America/Sao_Paulo
- interruption_state: none

## Entrega

Ampliar header e controles de fidelidade; criar rota pública de níveis com trilha equidistante e recompensas selecionáveis; corrigir ranking para não empatar clientes reais e permitir empate de uma conta de teste com um cliente real; exibir KPIs, nível atual e estatísticas com privacidade; reutilizar estatísticas no dashboard; retirar fidelidade/Reels da página de perfil.

## Concluído e persistido

- Implementação e testes integrados em `cooklily/canonical` pelo PR #277 (squash SHA `080eae62ae8615887b8e45f58038f6daad2de399`).
- Checkpoint atualizado e persistido em canonical no commit `f46f5fbc9d40541987b7fd2fae0b68d6465d2755` antes do deploy.
- Deploy oficial concluído no SHA funcional `080eae62ae8615887b8e45f58038f6daad2de399`; status final da VPS confirma SHA, serviço ativo, nginx saudável e gates verdes.
- Homologação no domínio real pelo navegador integrado do Codex: desktop e viewport 390×844. Dashboard, níveis, ranking, rota de estatísticas e perfil abriram sem erros; clique dashboard→níveis e seleção de nível/recompensas funcionaram. Ranking mostrou cards e KPIs; estatísticas exibiram radar de cinco categorias, frequência e gráficos/categorias com pontos. Perfil permaneceu nos dados e controles de conta/segurança.
- Testes locais antes da integração: 79 arquivos / 413 testes; check e build completos passaram. Deploy rodou novamente 79 arquivos / 416 testes, check, build e tool-health, todos passaram.
- Build CookLily no deploy: JS gzip 183.96/185 KiB, CSS gzip 33.99/34 KiB, combinado 217.95/220 KiB; budget aprovado.
- CI run `41080102538` passou em Node 20/24, Tool Health, Workbook Snapshot, Excel Recipe Windows/Ubuntu e Windows Supervisor.
- CodeQL não executou: workflow limita gatilho a PRs com base `main`; o PR tinha base `cooklily/canonical`.
- Nenhuma migration/schema nova. Migrations em produção estavam atualizadas; backups Core e Lily foram verificados pelo deployer.
- Conta CookLily não possui campo de email e não há fluxo verificado de troca de telefone; email não foi inventado nem alterado.

## Em andamento

- Nenhum.

## Gates e testes

- `npm test`: aprovado na VPS; 79 arquivos / 416 testes.
- `npm run check`: aprovado no deployer (Prisma validate e TypeScript).
- `npm run build`: aprovado no deployer para Gestão, site, QR, CookLily e TypeScript da API.
- `tools:status:check`: aprovado; tool-health sincronizado.
- Gates remotos em `/srv/carro-chefe/data/deploy-validation`: preflight-migrations, static-checks, tests, build e tool-health em `success` no release SHA.

## Migrations

- Nenhuma migration nova.

## Bloqueios/riscos

- Dados públicos de ranking/estatísticas dependem de consentimento `rankingOptIn`; contas de teste só aparecem para admin/staff/conta de teste.
- Email não existe no modelo Lily atual e troca de telefone não possui verificação; os campos precisam de contrato e fluxo seguro antes de suportá-los.
- CodeQL não foi executado pela configuração de workflow descrita acima.

## Homologação/dependências externas

- Domínio real `carrochefe.com/lilyacai` verificado em desktop e viewport mobile no navegador integrado Codex.
- Browser deixado restaurado ao viewport desktop no dashboard.

## Próxima ação exata

Nenhuma; entrega concluída. Para incluir email e troca de telefone no perfil, definir schema/validação e fluxo de verificação em uma tarefa futura.
