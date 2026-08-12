# Regras da Central Operacional

Estas instruções complementam o `AGENTS.md` da raiz para todo o conteúdo de `planejamento/`.

- Leia `README.md` e `openapi.yaml` antes de alterar a API.
- `data/plan.seed.json` é a fundação versionada; `.runtime/plan.json` é estado local mutável.
- Nunca edite `.runtime/plan.json`, `.runtime/requests.json` ou a auditoria à mão.
- Para mudanças operacionais, use a API de requisições e aprovação.
- Preserve IDs depois de criados. Cancelamentos substituem exclusões permanentes.
- Novas ações precisam de validação de entrada, aplicação atômica, auditoria e testes.
- O servidor deve continuar local (`127.0.0.1`) até existir autenticação e segurança de produção.
- Não permita upload executável, path traversal, segredo ou dado pessoal desnecessário.
- Após mudar código, execute `npm run check` e `npm test`.
- Após mudar interface, valide desktop e 390 px, navegação por teclado, formulários e console sem erros.

