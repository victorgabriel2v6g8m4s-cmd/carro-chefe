# Corrigir formatação de variáveis em templates WhatsApp

- status: in_progress
- owner: AG-DEV
- branch: codex/cooklily-whatsapp-variable-formatting
- base_branch: cooklily/canonical
- base_sha_verified: ac3de2d7eac3e783c49ed62d5dad755927cc1863
- head_sha_verified: ac3de2d7eac3e783c49ed62d5dad755927cc1863 (alterações locais não commitadas)
- pull_requests: nenhum
- last_verified_at: 2026-10-29
- interruption_state: active

## Concluído e persistido

- Reproduzido no painel publicado: aplicar negrito a seleção que inclui variável mantém o chip fora do elemento formatado.
- Identificada outra falha: parser de markdown renderiza variável formatada como texto em vez de reconstituir o chip.
- Correção local em `TemplateTextEditor.tsx`: parser inline recursivo e aplicação de estilo por range DOM preservando chips não editáveis.
- `npm run check`, `npm run test:lily-ui` (20 arquivos, 89 testes) e `npm run build:lily` passaram. Build alerta chunks grandes existentes; budget passou.
- `npm run build` passou (builds Gestão, site, QR, Lily e TypeScript API); budget da Lily passou.

## Em andamento

- Revisão do round-trip em browser e execução dos gates integrais.
- Integração à `cooklily/canonical`, deploy na VPS e QA real em desktop/mobile via navegador integrado.

## Gates e testes

- check: passed
- test:lily-ui: passed, 20 files / 89 tests
- build:lily: passed; build budget ok
- `npm test`: 229 passed, 3 skipped, 148 failed; os testes API falham por bancos SQLite legados sem tabelas/colunas do schema atual (`LilyAnalyticsEvent`, `LilyPaymentReconciliation`, `rankingOptIn` etc.).
- Reexecução com caminhos SQLite temporários não iniciou: Prisma retornou `Schema engine error` sem detalhe durante `migrate deploy`; nenhum banco de produção foi tocado.
- `build`: passed
- CI/CodeQL: pending

## Migrations

- Nenhuma.

## Bloqueios/riscos

- Nenhum conhecido. Verificar formatação de variável em seleção parcial e round-trip no editor real.

## Homologação/dependências externas

- URL alvo: https://carrochefe.com/lilyacai/painel/whatsapp
- Aba de reprodução integrada: tab 11 (rascunho local não salvo).
- Utilizar somente navegador integrado Codex para QA desktop e mobile.
- Deploy via `sudo cc deploy <SHA>` no host conforme `docs/lily-acai/DEPLOY_VPS.md`.

## Próxima ação exata

Criar commit da correção e checkpoint, publicar branch/PR e acompanhar CI; após integração, seguir deploy e QA real desktop/mobile.
