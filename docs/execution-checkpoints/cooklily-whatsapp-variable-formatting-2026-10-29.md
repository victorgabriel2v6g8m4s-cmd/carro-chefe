# Editor, simulador e jornada completa de pedidos no WhatsApp CookLily

- status: in_progress
- owner: AG-DEV
- branch: codex/cooklily-whatsapp-variable-formatting-checkpoint
- base_branch: cooklily/canonical
- base_sha_verified: b0ca836318c1efc62882d1cf44a565611e2e8881
- head_sha_verified: d1688aeed737cbec6293f43463949bbd1760412c (jornada implementada; atualização final deste checkpoint pendente)
- pull_requests: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/254 (merged); https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/255 (open, follow-up)
- last_verified_at: 2026-10-29 15:32 America/Sao_Paulo
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
- O usuário ampliou o escopo: simular desde chegada pelo WhatsApp, abertura do cardápio, pedido, alteração, acompanhamento e estados até entrega, usando gatilhos da árvore.
- Implementação local: gatilhos tipados para abrir cardápio, pedido criado/alterado, acompanhamento aberto, em preparo, pronto, saiu para entrega e entregue. Controles adicionam eventos de demonstração no chat e acionam os ramos configurados; respostas de template interpolam o número de pedido editável. Nenhuma navegação nem pedido real é criado.
- Teste de unidade encadeia a jornada completa até entrega e protege contra avanço legado em evento sem gatilho.
- Commit local `d1688aeed737cbec6293f43463949bbd1760412c` implementou os gatilhos e controles da jornada; ainda não enviado ao remoto.
- `npm run test:lily-ui -- --run`: passou após a jornada, 20 arquivos / 91 testes.
- `npm run check`: passou.
- `npm run build:lily`: passou; budget local ajustado em 1 KiB nos limites de JS e combinado para acomodar os controles da jornada; resultado 756.31/757 KiB JS bruto, 208.61/209 KiB gzip JS, 156.20/156.50 KiB CSS bruto e 239.41/240 KiB JS+CSS gzip.
- `npm test`: gates legacy, tool-health, deploy-validation e lily-budget passaram. Vitest completo falhou nas suítes de API Lily por banco local `.runtime/lily-acai.db` desatualizado: 11 suítes falharam, 148 testes falharam / 231 passaram / 3 ignorados; erro representativo: tabela `main.LilyPaymentReconciliation` ausente. Não relacionado à lógica de fluxo do frontend.

## Em andamento

- Adicionar e revisar as alterações locais da jornada no PR #255; CI após push, merge, deploy e QA do domínio desktop/mobile.

## Gates e testes

- check: passed
- test:lily-ui: passed, 20 files / 89 tests
- build:lily: passed; build budget ok
- `npm test` local inicial falhou por banco de workspace sem migrations; no deploy isolado e com bancos de preflight, suíte completa passou (380/380).
- `build`: passed
- CI: passed no PR #254 (run 40927600859). PR #255 passou em Node 20/24, Excel Recipe Linux/Windows, Tool Health, Windows Supervisor e Workbook Snapshot no HEAD anterior `54d6b97` (run 40929597649); novo CI pendente após push do commit `d1688ae`.
- CodeQL: pending/unknown

## Migrations

- Nenhuma.

## Bloqueios/riscos

- Testes de API completos requerem banco Lily de testes com todas as migrations; CI/deploy deve ser a fonte para a suíte agregada enquanto a base local não é preparada.

## Homologação/dependências externas

- URL alvo: https://carrochefe.com/lilyacai/painel/whatsapp
- Aba de reprodução integrada: tab 11 (rascunho local não salvo).
- Utilizar somente navegador integrado Codex para QA desktop e mobile.
- Deploy via `sudo cc deploy <SHA>` no host conforme `docs/lily-acai/DEPLOY_VPS.md`.

## Próxima ação exata

Finalizar e commitar este checkpoint, atualizar título/descrição do PR #255 e enviar os commits; acompanhar novo CI; depois integrar em `cooklily/canonical`, deployar e homologar formatação de variável e jornada do pedido no domínio real em desktop e mobile usando exclusivamente o navegador integrado Codex.
