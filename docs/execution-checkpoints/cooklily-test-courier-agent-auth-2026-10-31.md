# Autenticação por chave para couriers de teste CookLily

- status: in_progress
- owner: AG-DEV
- branch: `codex/cooklily-test-courier-agent-auth`
- base_branch: `cooklily/canonical`
- base_sha_verified: `9ef141c64fee68d774a69b8643dd483697608f3c`
- head_sha_verified: `f658cb3f655987f0e3da9d6948ddbf06de8806fe` (código publicado no PR #303)
- pull_requests: [#303](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/303) — draft, CI run `41172445366` passed; checkpoint update pending
- last_verified_at: 2026-10-31 05:32 UTC
- interruption_state: retomada da correção solicitada pelo proprietário; estado Git e testes reconferidos

## Concluído e persistido

- Commit `398a31ea` contém implementação, testes e documentação; commit `f658cb3f` corrige o budget de bundle e reforça o teste de senha/MFA para courier de teste não agente.
- Branch `codex/cooklily-test-courier-agent-auth` publicada e PR #303 draft aberto contra `cooklily/canonical`.
- Implementação local permite identidade de agente para admin e, de forma restrita, courier com `isTestAccount=true`.
- A flag de teste sozinha não altera autenticação. Contas de teste sem identidade de agente mantêm login por senha e MFA exigido pelo papel; somente identidade dedicada com chave provisionada reporta `authenticationMethod=agent-key`, sem solicitar senha/MFA e sem gravar TOTP como verificado.
- Sessões courier de agente só são aceitas enquanto a conta estiver ativa, for `courier`, estiver marcada como teste e possuir chave ativa; remoção da flag/papel invalida sessão e credenciais.
- A equipe pode marcar/desmarcar couriers de teste e visualizar estado da chave; o CLI de provisionamento aceita somente admin ativo ou courier de teste ativo. O provisionamento explícito da chave é o que converte a identidade para login de agente.
- Courier agente tem escopo apenas courier. Couriers reais continuam sujeitos a senha e MFA.
- A elegibilidade de despacho aceita courier agente de teste, mantendo os requisitos humanos de senha/MFA para os demais. A marcação explícita de disponibilidade continua sendo necessária.

## Em andamento

- Integração e deploy ainda pendentes; autenticação key-agent continua restrita às contas explicitamente dedicadas a IA.
- Produção ainda não recebeu esta versão. Não foi cadastrado nenhum segredo/chave de agente nesta execução.

## Gates e testes

- `npm run policy:build` e `npm run policy:preflight -- --agent AG-DEV --scope lily-test-courier-auth`: passaram após atualizar as diretivas da API.
- `git diff --check`: passou.
- Vitest focado `agent-auth.test.ts`, `team.test.ts`, `logistics.test.ts`: 27/27 passaram, incluindo teste de conta de teste não dedicada a IA mantendo senha e MFA.
- `npm run check`: passou.
- `npm test`: passou com 84 arquivos, 438 testes aprovados e 3 ignorados.
- `npm run build`: passou após correção do budget; orçamento CookLily local: JS raw 606.74/608 KiB, gzip 192.44/193 KiB, total JS+CSS gzip 227.78/229 KiB.
- CI run `41172013595` no head anterior `1603a405` falhou no build Node 22/24 por JS raw 608.34 KiB e gzip 193.17 KiB; Tool Health reportou app-lily com a mesma falha de build.
- O UI foi enxugado sem elevar o limite; CI run `41172445366` para o head `f658cb3f` concluiu com sucesso em Node 20, 22 e 24, Tool Health e jobs auxiliares.
- PR #303 não tem reviews nem comentários inline pendentes; está marcado como draft e mergeable. CI aprovada para `f658cb3f`; o commit de atualização deste checkpoint exigirá nova CI.
- Merge e deploy: pendentes.

## Migrations

- Nenhuma migration necessária.

## Bloqueios/riscos

- O padrão exige uma chave Ed25519 exclusiva por identidade de courier; nunca reutilizar a chave SSH da VPS. Registrar somente as chaves públicas. As chaves privadas devem permanecer no ssh-agent e não ser lidas, enviadas ao chat ou versionadas.
- As duas contas courier de teste permanecem ativas. Após o deploy, confirmar/ativar `Courier de teste` no painel antes do registro das respectivas chaves públicas.
- O despacho de produção é opt-in por disponibilidade; contas de teste só devem ser marcadas disponíveis durante uma homologação coordenada.
- O teste ponta a ponta ainda depende de pedido de teste sem cobrança real e de duas sessões de courier independentes no navegador integrado.

## Homologação/dependências externas

- Nenhuma homologação da nova versão ocorreu no domínio real, pois ela ainda não foi integrada nem implantada.
- Após merge e deploy, homologar exclusivamente no navegador integrado Codex em desktop e mobile; autenticar por desafio OpenSSH e confirmar `/courier/deliveries`, disponibilidade e aceite/rejeição sem senha ou MFA.
- Não usar pedido real nem cobrança real. Revalidar prioridade, recusa e expiração sequenciais como parte do checkpoint de despacho.

## Próxima ação exata

Persistir este resultado de CI no PR #303 e aguardar os gates do novo head. Se aprovados, marcar PR pronto, integrar por squash e fazer deploy conforme o fluxo autorizado; depois marcar explicitamente as duas contas como courier de teste, provisionar chaves públicas distintas e autenticar pelo fluxo Codex integrado. Não registrar nem acessar chave privada, senha ou MFA.
