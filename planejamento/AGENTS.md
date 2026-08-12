# Regras da Central Operacional

Estas instruções complementam o `AGENTS.md` da raiz para todo o conteúdo de `planejamento/`.

- Leia `README.md`, `openapi.yaml` e `../docs/ARQUITETURA_TECNICA_V2.md` antes de alterar a API.
- `data/plan.seed.json` é a fundação versionada; `../.runtime/carro-chefe.db` é o estado local mutável via Prisma.
- `public/`, `server.js` e `lib/` são o legado preservado para comparação até a paridade da V2; novas funcionalidades entram em `../apps/` e `../packages/`.
- Nunca edite o SQLite, `.runtime/plan.json`, requisições ou auditoria à mão.
- Para mudanças operacionais, use `/api/v1`; transições de status exigem justificativa e controle de versão.
- Agentes registram execução, passos, mensagens, perguntas e consumo pelos endpoints de `agent-runs`.
- Preserve IDs depois de criados. Cancelamentos substituem exclusões permanentes.
- Novas ações precisam de validação de entrada, aplicação atômica, auditoria e testes.
- O servidor deve continuar local (`127.0.0.1`) até existir autenticação e segurança de produção.
- Não permita upload executável, path traversal, segredo ou dado pessoal desnecessário.
- Após mudar código, execute `npm run check`, `npm test` e `npm run build` na raiz.
- Após mudar interface, valide desktop e 390 px, navegação por teclado, formulários e console sem erros.
