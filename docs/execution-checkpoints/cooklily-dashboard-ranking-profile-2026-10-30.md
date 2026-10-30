# Dashboard, ranking, níveis e perfil CookLily

- status: candidate
- owner: AG-DEV
- branch: codex/cooklily-dashboard-ranking-profile
- base_branch: cooklily/canonical
- base_sha_verified: a9b59e7e0ffdd037317e9883a3382f092fe820e4
- head_sha_verified: 8724a58 (feature commit)
- pull_requests: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/277 (ready for review, open)
- last_verified_at: 2026-10-30 12:22 America/Sao_Paulo
- interruption_state: none

## Entrega

Ampliar header e controles de fidelidade; criar rota pública de níveis com trilha equidistante e recompensas selecionáveis; corrigir ranking para não empatar clientes reais e permitir empate de uma conta de teste com um cliente real; exibir KPIs, nível atual e estatísticas com privacidade; reutilizar estatísticas no dashboard; retirar fidelidade/Reels da página de perfil.

## Concluído e persistido

- Branch de trabalho criada a partir do SHA canonical verificado.
- Componentes, endpoints e testes implementados localmente; ainda sem commit, PR ou deploy.
- Conta CookLily atual não possui campo de email e não há fluxo verificado de troca de telefone; esses dados seguem sem alteração.

## Em andamento

- Implementação backend/frontend e revisão dos dados das estatísticas.
- Build geral de produção passou; build CookLily mantém budgets incluindo CSS, sem aumentar os limites.

## Gates e testes

- `npm test`: passou; 79 arquivos / 413 testes passaram / 3 ignorados.
- `npm run check`: passou (Prisma validate e TypeScript).
- `npm run build`: passou para Gestão, site, QR, CookLily e TypeScript da API.
- Build CookLily: JS gzip 183.74/185 KiB, CSS gzip 33.98/34 KiB, combinado 217.72/220 KiB.
- Commit feature: `8724a58`; checkpoint pós-commit: `d03c5b014a7c5734e62e171f963ca9660f28bfa8`.
- GitHub Actions CI run `41079870275`: Excel Recipe, Workbook Snapshot, Tool Health e Windows Supervisor passaram; Quality Node 24 em testes/build e Node 20 em dependências, em andamento.
- CodeQL: aguardando estado no PR.

## Migrations

- Nenhuma mudança de schema prevista; foram usados dados existentes Lily.

## Bloqueios/riscos

- Dados públicos de ranking/estatísticas dependem de consentimento `rankingOptIn`; contas de teste só aparecem para admin/staff/conta de teste.
- Login administrativo de agente confirmado pelo handoff do Codex integrado; ticket de uso único consumido sem exibição.
- Email não existe no modelo Lily atual e troca de telefone não possui verificação; não criar formulário inseguro.

## Homologação/dependências externas

- Deploy e domínio real pendentes.
- Homologação deve ocorrer exclusivamente no navegador integrado Codex, em desktop e mobile.

## Próxima ação exata

Aguardar Quality Node 20/24 e CodeQL no PR #277; corrigir falhas se houver e integrar por squash quando os gates exigidos estiverem verdes.
