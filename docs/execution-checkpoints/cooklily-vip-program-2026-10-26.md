# Programa VIP CookLily

- status: candidate (CI remoto parcialmente concluído; integração aguardando Node 20)
- owner: AG-DEV
- branch: `codex/cooklily-vip-program`
- base_branch: `cooklily/canonical`
- base_sha_verified: `9c0e52275026c0384b38a65174e8ec2c78529b28`
- head_sha_verified: `c97bcf11a248d16b44c1b56e434e0d35334deabe`
- pull_requests: [PR #198](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/198) (draft)
- last_verified_at: 2026-10-26
- interruption_state: CI Node 20 ativo na etapa Tests; 6/7 jobs concluídos com sucesso

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
- Ignora artefatos locais do Playwright via `.gitignore`.
- Commit local/remoto: `c97bcf11a248d16b44c1b56e434e0d35334deabe`.

## Testes e gates

- Preflight AG-DEV para apps Lily/API/database/docs: PASS. Central Operacional local indisponível para registrar execução.
- `npm test`: PASS local — 61 arquivos, 327 testes aprovados, 3 ignorados.
- `npm run check`: PASS; Prisma generate/validate e TypeScript.
- `npm run build`: PASS; budget atualizado à medição real e pequena folga. Warning do Vite para chunk principal >500 KiB continua.
- `npm run test:lily-ui`: PASS — 13 arquivos, 62 testes.
- `npm run policy:check`: PASS.
- `git diff --check`: PASS.
- Playwright mobile com APIs mockadas: teaser bloqueado/coroa VIP verificados; zero erros de console após mocks.
- GitHub Actions run `40401454947` (#794): Excel Recipe Windows/Linux, Workbook Snapshot, Tool Health Linux, Windows Supervisor e Quality Node 24 concluíram PASS. Quality Node 20 está ativo em `Tests`; seus gates anteriores passaram. Logs do job não estavam publicados ao consultar. Não marcar CI completo até estado terminal.

## Migration

Schema validado e SQL aplicado em banco SQLite descartável por `better-sqlite3`, após erro vazio do Prisma migrate engine no Windows. CI Node 24 passou `Prepare database`; deploy/homologação VPS ainda pendentes.

## Riscos e limites

- A página de termos declara escopo e retenção, mas a aprovação jurídica/controlador de dados e prazo antes de participantes reais continuam necessários.
- Bundle principal mostra warning genérico >500 KiB apesar do budget aprovado.
- A UI foi inspecionada com mocks, sem acesso de homologação à VPS.
- Não executar deploy; aguarda operação autorizada na VPS após merge.

## Próxima ação exata

Consultar o run `40401454947` até Quality Node 20 terminar. Se sucesso, atualizar este checkpoint, retirar draft se necessário e fazer merge squash do PR #198; verificar SHA da canonical. Se falhar, obter diagnóstico do job, corrigir, repetir gates e atualizar o PR. Depois atualizar checkpoint final com merge SHA/CI; deploy da VPS segue separado.
