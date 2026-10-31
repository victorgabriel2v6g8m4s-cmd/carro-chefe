# Autenticação por chave para couriers de teste CookLily

- status: in_progress
- owner: AG-DEV
- branch: `codex/cooklily-test-courier-agent-auth`
- base_branch: `cooklily/canonical`
- base_sha_verified: `9ef141c64fee68d774a69b8643dd483697608f3c`
- head_sha_verified: `398a31ea` (commit local; branch ainda não publicada)
- pull_requests: nenhum
- last_verified_at: 2026-10-31 05:16 UTC
- interruption_state: retomada da correção solicitada pelo proprietário; estado Git e testes reconferidos

## Concluído e persistido

- Commit `398a31ea` contém implementação, testes, documentação e checkpoint desta entrega; branch ainda não publicada.
- Implementação local permite identidade de agente para admin e, de forma restrita, courier com `isTestAccount=true`.
- A flag de teste sozinha não altera autenticação. Contas de teste sem identidade de agente mantêm login por senha e MFA exigido pelo papel; somente identidade dedicada com chave provisionada reporta `authenticationMethod=agent-key`, sem solicitar senha/MFA e sem gravar TOTP como verificado.
- Sessões courier de agente só são aceitas enquanto a conta estiver ativa, for `courier`, estiver marcada como teste e possuir chave ativa; remoção da flag/papel invalida sessão e credenciais.
- A equipe pode marcar/desmarcar couriers de teste e visualizar estado da chave; o CLI de provisionamento aceita somente admin ativo ou courier de teste ativo. O provisionamento explícito da chave é o que converte a identidade para login de agente.
- Courier agente tem escopo apenas courier. Couriers reais continuam sujeitos a senha e MFA.
- A elegibilidade de despacho aceita courier agente de teste, mantendo os requisitos humanos de senha/MFA para os demais. A marcação explícita de disponibilidade continua sendo necessária.

## Em andamento

- Revisão final de contrato, interface e documentação antes de commit/PR.
- Produção ainda não recebeu esta versão. Não foi cadastrado nenhum segredo/chave de agente nesta execução.

## Gates e testes

- `npm run policy:build` e `npm run policy:preflight -- --agent AG-DEV --scope lily-test-courier-auth`: passaram após atualizar as diretivas da API.
- `git diff --check`: passou.
- Vitest focado `agent-auth.test.ts`, `team.test.ts`, `logistics.test.ts`: 27/27 passaram, incluindo teste de conta de teste não dedicada a IA mantendo senha e MFA.
- `npm run check`: passou.
- `npm test`: passou com 84 arquivos, 438 testes aprovados e 3 ignorados.
- `npm run build`: passou; orçamento CookLily: JS raw 607.50/608 KiB, gzip 192.76/193 KiB, total JS+CSS gzip 228.11/229 KiB.
- CI/CodeQL, merge e deploy: pendentes.

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

Publicar a branch `codex/cooklily-test-courier-agent-auth`, abrir PR contra `cooklily/canonical` e aguardar CI antes de integrar/deploy. Depois do deploy, marcar explicitamente as duas contas como courier de teste, provisionar chaves públicas distintas e autenticar pelo fluxo Codex integrado. Não registrar nem acessar chave privada, senha ou MFA.
