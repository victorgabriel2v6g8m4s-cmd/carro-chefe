# Programa VIP CookLily

- status: merged
- owner: AG-DEV
- branch: `codex/cooklily-vip-program`
- base_branch: `cooklily/canonical`
- base_sha_verified: `9c0e52275026c0384b38a65174e8ec2c78529b28`
- head_sha_verified: `1c7e619a699a17cd1c4cbac154ff651d9aa419fa`
- pull_requests: [PR #198](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/198) (merged)
- merge_commit_sha: `ca26efdbec22d1b67ae5a24f90cdbc79df16a18f`
- ci_run: `40401921173` (#795), todos os 7 jobs concluídos com sucesso; Quality Node 20 e 24 passaram testes e build
- last_verified_at: 2026-10-26
- interruption_state: none

## Escopo

Programa CookLily VIP: códigos de convite/vouchers individuais, consentimento versionado, inscrição e cancelamento, candidatura por pontos, acesso antecipado a produtos, painel, termos e analytics próprios minimizados.

## Decisões registradas

- Códigos são normalizados e armazenados como hash; o código completo aparece apenas uma vez na criação.
- Resgatar convite deixa a membership em `invited`; somente consentir com os termos vigentes e confirmar inscrição ativa o VIP.
- Analytics necessários do piloto são próprios, minimizados e consentidos separadamente. Sem analytics de terceiros ou compartilhamento de respostas abertas.
- Cancelamento encerra benefícios e remove imediatamente eventos experimentais da conta; expiração configurada remove eventos de membros ainda ativos.
- VIP obtido por pontos usa o mesmo consentimento; limite configurável no painel.
- Produto VIP exibe teaser e imagem desfocada para clientes comuns; usuários VIP veem produto normalmente. API, configuração, cotação e pedido validam autorização no servidor.
- Código de campanha pode conceder cupons individuais vinculados à conta, respeitando escopos e regras do cupom de origem.

## Entregas

- Schema Prisma e migration `20261026180000_lily_vip_program`.
- API com autorização, CSRF, MFA/staff, hashing, limites, idempotência, auditoria e vouchers account-bound.
- Painel para configurar threshold/retention, gerar/pausar códigos e configurar lançamentos VIP por produto.
- Perfil VIP com resgate, modal metálico/confete, consentimento, inscrição, vouchers, cancelamento e coroa.
- Projeção de catálogo com teaser/selo VIP e acesso antecipado.
- Política documentada em `docs/lily-acai/PROGRAMA_VIP.md`.
- Merge squash do PR #198 para `cooklily/canonical`: `ca26efdbec22d1b67ae5a24f90cdbc79df16a18f`.

## Testes e gates

- Preflight AG-DEV para apps Lily/API/database/docs: PASS. Central Operacional local indisponível para registrar execução.
- `npm test`: PASS local — 61 arquivos, 327 testes aprovados, 3 ignorados.
- `npm run check`: PASS; Prisma generate/validate e TypeScript.
- `npm run build`: PASS; budget atualizado à medição real e pequena folga. Warning do Vite para chunk principal >500 KiB continua.
- `npm run test:lily-ui`: PASS — 13 arquivos, 62 testes.
- `npm run policy:check`: PASS.
- `git diff --check`: PASS.
- Playwright mobile com APIs mockadas: teaser bloqueado/coroa VIP verificados; zero erros de console após mocks.
- GitHub Actions run `40401921173` (#795): todos os 7 jobs concluíram PASS, incluindo Quality Node 20 e 24 (prepare database, static checks, tests e production builds).

## Migration e deploy

Schema validado e SQL aplicado em banco SQLite descartável por `better-sqlite3`, após erro vazio do Prisma migrate engine no Windows. CI passou o preparo do banco nas versões Node 20 e 24. Deploy/homologação real na VPS ainda pendentes; não foi executado nesta tarefa.

## Riscos e limites

- Antes de convidar participantes reais, confirmar aprovação do controlador/jurídico e o prazo de retenção dos dados do piloto.
- Bundle principal mostra warning genérico >500 KiB apesar do budget aprovado.
- A UI foi inspecionada com mocks; jornada e migration ainda precisam de homologação na VPS.

## Próxima ação exata

Executar deploy da `cooklily/canonical` na VPS e homologar: criação de convite no painel, resgate, consentimento e inscrição, cancelamento, candidatura por pontos, teaser versus produto VIP e validação de voucher vinculado à conta. Registrar resultado da homologação após o deploy.
