# Corrigir formatação de variáveis em templates WhatsApp

- status: in_progress
- owner: AG-DEV
- branch: codex/cooklily-whatsapp-variable-formatting-checkpoint
- base_branch: cooklily/canonical
- base_sha_verified: ac3de2d7eac3e783c49ed62d5dad755927cc1863
- head_sha_verified: local follow-up changes not committed
- pull_requests: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/254 (merged); https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/255 (checkpoint and follow-up)
- last_verified_at: 2026-10-29
- interruption_state: active

## Concluído e persistido

- Reproduzido no painel publicado: aplicar negrito a seleção que inclui variável mantém o chip fora do elemento formatado.
- Identificada outra falha: parser de markdown renderiza variável formatada como texto em vez de reconstituir o chip.
- Correção local em `TemplateTextEditor.tsx`: parser inline recursivo e aplicação de estilo por range DOM preservando chips não editáveis.
- `npm run check`, `npm run test:lily-ui` (20 arquivos, 89 testes) e `npm run build:lily` passaram. Build alerta chunks grandes existentes; budget passou.
- Commit `14409f9a62eb23fe28e0a392de2ba6457e711fdd` publicado na branch remota.
- PR #254 integrado por squash em `b0ca836318c1efc62882d1cf44a565611e2e8881`.
- `npm run build` passou (builds Gestão, site, QR, Lily e TypeScript API); budget da Lily passou.
- CI do PR #254 passou em Node 20/24 e nos demais jobs do workflow (`40927600859`).
- Deploy da VPS no SHA `b0ca836318c1efc62882d1cf44a565611e2e8881` passou migrations, `npm test` (73 arquivos, 380 testes), build e smoke externo; evidência `/srv/carro-chefe/data/deploy-logs/deploy-20261029-180950-b0ca836318c1.evidence`.
- QA em desktop e viewport 390×844 confirmou chips dentro dos estilos no editor. No balão, a combinação aninhada deixou `_` literal, nova falha visual identificada.
- Correção local no `WhatsAppText.tsx`: parser inline recursivo para renderizar combinações de estilos sem delimitadores visíveis.
- `npm run check`, `npm run test:lily-ui` (20 arquivos, 89 testes) e `npm run build:lily` passaram após o parser recursivo; budget JS gzip 207.82/208 KiB.

## Em andamento

- CI do PR #255 e merge da correção complementar; novo deploy e QA desktop/mobile.

## Gates e testes

- check: passed
- test:lily-ui: passed, 20 files / 89 tests
- build:lily: passed; build budget ok
- `npm test` local inicial falhou por banco de workspace sem migrations; no deploy isolado e com bancos de preflight, suíte completa passou (380/380).
- `build`: passed
- CI: passed no PR #254 (run 40927600859): Quality Node 20/24, Excel Recipe Linux/Windows, Tool Health, Windows Supervisor e Workbook Snapshot. Follow-up no PR #255: pending.
- CodeQL: pending/unknown

## Migrations

- Nenhuma.

## Bloqueios/riscos

- Revalidar o balão simulado após parser recursivo; conferir combinações bold/italic e sem formatação.

## Homologação/dependências externas

- URL alvo: https://carrochefe.com/lilyacai/painel/whatsapp
- Aba de reprodução integrada: tab 11 (rascunho local não salvo).
- Utilizar somente navegador integrado Codex para QA desktop e mobile.
- Deploy via `sudo cc deploy <SHA>` no host conforme `docs/lily-acai/DEPLOY_VPS.md`.

## Próxima ação exata

Integrar correção de `WhatsAppText.tsx`, deployar novo SHA e confirmar no navegador integrado que o balão mantém variável formatada sem `_` literal em desktop e mobile; atualizar estado final do checkpoint.
