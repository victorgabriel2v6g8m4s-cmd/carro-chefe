# CookLily — fidelidade: versionar progressão e ativar níveis

- status: in_progress
- owner: AG-DEV
- branch: codex/cooklily-loyalty-level-versioning
- base_branch: cooklily/canonical
- base_sha_verified: eb6bed9b0000905b43e41000f47f1de75c2a9365
- head_sha_verified: eb6bed9b0000905b43e41000f47f1de75c2a9365 (working tree changes validated; not committed)
- pull_requests: none
- last_verified_at: 2026-10-29 America/Sao_Paulo
- interruption_state: active

## Objetivo

Completar lacunas do sistema de fidelidade documentado em `docs/lily-acai/UX_REELS_DASHBOARD_FIDELIDADE_2026-10-09.md`, preservando a operação CookLily e homologando desktop e mobile no navegador integrado Codex.

## Concluído e persistido

- Auditoria da tela real `/lilyacai/painel/fidelidade`: não havia curva configurada.
- Implementados ledger idempotente de pontos de pedido/campanha, reversão por estorno integral e leitura consistente por perfil, ranking e VIP.
- Criado versionamento de configuração de pontos, curva, recompensas e missões; configuração inicial agora é prévia até o administrador salvar.
- Adicionada prévia gráfica acessível da curva e correção do PATCH para ativar/pausar recompensa.
- Criada migration `20261029200000_lily_loyalty_versions`; migration validada em SQLite descartável com todas as migrations aplicadas.
- Arquivos de código ainda não commitados nesta branch.

## Em andamento

- Integrar por PR à `cooklily/canonical`, aguardar CI, merge, deploy e homologação visual em viewport desktop e mobile.
- Conferir configuração inicial na tela de produção e registrar impacto de thresholds antes de publicar configuração.

## Gates e testes

- `npm run check`: PASS (Prisma generate/validate e TypeScript).
- `npm test -- --reporter=dot`: PASS (73 arquivos, 381 testes aprovados, 3 ignorados), em DB descartável com migrations aplicadas.
- `npm run build`: PASS (todos os bundles e TypeScript API); aviso preexistente de chunk CookLily >500 KiB; build budget dentro do limite, com pequena folga.
- `npm run policy:preflight -- --agent AG-DEV --scope lily-loyalty`: PASS.
- `git diff --check`: PASS.
- `npm run db:deploy:lily`: falhou no Windows com `Schema engine error:` sem detalhe; SQL da migration e cadeia completa foram aplicados com sucesso em SQLite descartável por `better-sqlite3`.

## Migrations

- Nova migration `20261029200000_lily_loyalty_versions`, validada em DB descartável; produção ainda não migrada.

## Bloqueios/riscos

- A falha silenciosa local do Prisma migrate deploy precisa ser superada por runner CI/Linux ou VPS antes do deploy.
- Mudança de configuração pode alterar rank atual; não salvar curva inicial em produção antes de conferir os limites e impacto.
- Não há cashback automático nem conversão monetária: LilyCoins seguem ledger separado.

## Homologação/dependências externas

- Usar exclusivamente navegador integrado Codex para domínio real.
- Produção deve ser verificada em desktop e mobile após deploy.
- IAB atual tem sessão admin autenticada e tela real da fidelidade; última tela acessada foi a produção pre-deploy.

## Próxima ação exata

Revisar diff completo, commitar alterações, abrir PR para `cooklily/canonical`, acompanhar CI e corrigir toda falha antes do merge.
