# Dashboard, ranking, níveis e perfil CookLily

- status: merged
- owner: AG-DEV
- branch: codex/cooklily-dashboard-ranking-profile
- base_branch: cooklily/canonical
- base_sha_verified: a9b59e7e0ffdd037317e9883a3382f092fe820e4
- head_sha_verified: 080eae62ae8615887b8e45f58038f6daad2de399 (squash merge)
- pull_requests: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/277 (merged)
- last_verified_at: 2026-10-30 13:00 America/Sao_Paulo
- interruption_state: none

## Entrega

Ampliar header e controles de fidelidade; criar rota pública de níveis com trilha equidistante e recompensas selecionáveis; corrigir ranking para não empatar clientes reais e permitir empate de uma conta de teste com um cliente real; exibir KPIs, nível atual e estatísticas com privacidade; reutilizar estatísticas no dashboard; retirar fidelidade/Reels da página de perfil.

## Concluído e persistido

- Implementação e testes integrados em `cooklily/canonical` por squash no SHA `080eae62ae8615887b8e45f58038f6daad2de399`.
- PR #277 integrou a feature; CI run `41080102538` passou em Node 20/24, Tool Health, Workbook Snapshot, Excel Recipe Windows/Ubuntu e Windows Supervisor.
- CodeQL não executou: configuração do workflow limita o gatilho a PRs com base `main`; este PR tinha base `cooklily/canonical`.
- Conta CookLily atual não possui campo de email e não há fluxo verificado de troca de telefone; esses dados seguem sem alteração.
- Nenhuma migration/schema.

## Em andamento

- Publicação do SHA integrado na VPS e homologação no domínio real usando exclusivamente o navegador integrado do Codex (desktop e mobile).

## Gates e testes

- `npm test`: passou; 79 arquivos / 413 testes passaram / 3 ignorados.
- `npm run check`: passou (Prisma validate e TypeScript).
- `npm run build`: passou para Gestão, site, QR, CookLily e TypeScript da API.
- Build CookLily: JS gzip 183.74/185 KiB, CSS gzip 33.98/34 KiB, combinado 217.72/220 KiB.
- GitHub Actions CI run `41080102538`: passou nos gates listados acima.
- CodeQL: não disparado pela configuração do workflow na base canonical.

## Migrations

- Nenhuma.

## Bloqueios/riscos

- Dados públicos de ranking/estatísticas dependem de consentimento `rankingOptIn`; contas de teste só aparecem para admin/staff/conta de teste.
- Email não existe no modelo Lily atual e troca de telefone não possui verificação; não criar formulário inseguro.

## Homologação/dependências externas

- VPS estava no SHA `b0608fc07e12b5a838148f06e044ed4d5fc1c02d`, serviço ativo e nginx saudável na última checagem.
- Deploy e verificação no domínio real pendentes.
- Homologação exclusivamente pelo navegador integrado Codex em desktop e mobile.

## Próxima ação exata

Publicar o SHA `080eae62ae8615887b8e45f58038f6daad2de399` pelo deployer oficial; em seguida verificar o domínio real em desktop e viewport mobile no navegador integrado, registrar evidências e corrigir/redeployar se necessário.
