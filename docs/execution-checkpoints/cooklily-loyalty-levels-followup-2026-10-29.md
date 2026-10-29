# CookLily — fidelidade: versionar progressão e ativar níveis

- status: completed
- owner: AG-DEV
- branch: codex/cooklily-loyalty-level-versioning
- base_branch: cooklily/canonical
- base_sha_verified: eb6bed9b0000905b43e41000f47f1de75c2a9365
- head_sha_verified: 2e0a4dbd634f4e1eb2fb49c7414dc14a56c8d7eb (merged canonical)
- pull_requests: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/256 (merged)
- last_verified_at: 2026-10-29 America/Sao_Paulo
- interruption_state: none

## Objetivo

Completar e homologar o sistema de níveis e LilyCoins descrito em `docs/lily-acai/UX_REELS_DASHBOARD_FIDELIDADE_2026-10-09.md`, integrado à branch `cooklily/canonical` e publicado no domínio real.

## Concluído e persistido

- Ledger idempotente de pontos de pedidos/campanhas, reversão compensatória em estorno integral e leitura consistente para perfil, ranking e VIP.
- Versionamento das configurações de pontos, níveis, recompensas e missões; auditoria vinculada às versões.
- Configuração de sequência inicial em rascunho, edição de níveis e curva logarítmica acessível com prévia de ganhos LilyCoins.
- Endpoint PATCH para ativar/pausar recompensa.
- Migration `20261029200000_lily_loyalty_versions` aplicada em produção.
- PR #256 integrado por squash em `cooklily/canonical`; merge/deploy SHA `2e0a4dbd634f4e1eb2fb49c7414dc14a56c8d7eb`.
- Deploy da VPS concluído; backup, migration, readiness, health e external smoke confirmados.

## Gates e testes

- `npm run policy:preflight -- --agent AG-DEV --scope lily-loyalty`: PASS.
- `npm run check`: PASS.
- `npm test -- --reporter=dot`: PASS (73 arquivos; 381 aprovados; 3 ignorados).
- `npm run test:lily-ui -- --reporter=dot`: PASS (20 arquivos; 91 aprovados).
- Testes direcionados de loyalty/orders/profile: PASS (28 testes).
- `npm run build`: PASS; build budget dentro dos limites. Aviso do Vite sobre chunk acima de 500 KiB.
- CI PR #256: 7 verificações PASS (Node 20/24, Ubuntu/Windows, tool health e snapshots).
- SQL e cadeia de migrations validados em banco SQLite descartável; execução Prisma no Windows retornou erro silencioso, superado por CI/Linux e deploy VPS.
- VPS deploy gates: schema, check, tests, builds, tools, integridade dos backups, migration, readiness, CookLily health e external smoke: PASS.
- Deploy log: `/srv/carro-chefe/data/deploy-logs/deploy-20261029-191906-2e0a4dbd634f.log`; evidence: `/srv/carro-chefe/data/deploy-logs/deploy-20261029-191906-2e0a4dbd634f.evidence`.
- Backups verificados: core e Lily pré-deploy, com hashes no log.

## Migrations

- `20261029200000_lily_loyalty_versions` aplicada em produção; total 36 migrations Lily no deploy.
- Migration cria versão inicial e reconcilia pontos de pedidos pagos/concluídos e campanhas existentes para o ledger.

## Bloqueios/riscos

- Nenhum bloqueio de código/deploy.
- A curva inicial de 21 níveis (0 a 10.000.000 pontos) foi testada como rascunho, mas não foi salva em produção. Salvar publica imediatamente e recalcula níveis dos clientes existentes; requer revisão dos thresholds antes da ativação.
- LilyCoins iniciais são zero e a prévia deixa explícitos os ganhos; sem conversão para dinheiro/cashback automático.
- Build passa com aviso de chunk CookLily acima de 500 KiB; budget total passou.

## Homologação/dependências externas

- Domínio real verificado exclusivamente no navegador integrado Codex, após recarga da página publicada `/lilyacai/painel/fidelidade`.
- Desktop: viewport 1280×720, layout correto, sem overflow horizontal; versão 1, configuração ainda vazia, botão de salvar desabilitado.
- Mobile: viewport 390×844 (conteúdo 375 px), sem overflow horizontal; navegação móvel, 21 níveis em rascunho, prévia da curva e LilyCoins visíveis após rolagem; botão salvar não acionado.
- Prévia informa que nada muda para clientes até salvar. Nenhuma configuração comercial foi salva durante a homologação.

## Próxima ação exata

Nenhuma para a entrega de software. Quando a gestão definir/revisar os limiares da curva inicial, carregá-la como rascunho, conferir impacto sobre os clientes e publicar a configuração pela tela de fidelidade.
