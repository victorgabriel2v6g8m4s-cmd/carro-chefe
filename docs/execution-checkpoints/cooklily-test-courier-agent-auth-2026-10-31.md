# Autenticação por chave para couriers de teste CookLily

- status: in_progress
- owner: AG-DEV
- branch: `codex/cooklily-test-courier-bundle-fix`
- base_branch: `cooklily/canonical`
- base_sha_verified: `b181939417df1cbe429b789bcbb3be4ae356a91b`
- head_sha_verified: `01eea446242b388f2e45ebb7f8a65af8c0ff0cc2`
- pull_requests: [#303](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/303) — merged as `0bcc615e7348e08c221e6485f60e0274fea1a58d`; [#304](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/304) — merged as `b181939417df1cbe429b789bcbb3be4ae356a91b`
- last_verified_at: 2026-10-31 05:54 UTC
- interruption_state: retomado; deploy validado e homologação real em andamento, pausada antes de transmitir geolocalização

## Concluído e persistido

- Commit `398a31ea` contém implementação, testes e documentação; commit `f658cb3f` corrige o budget de bundle e reforça o teste de senha/MFA para courier de teste não agente.
- Branch `codex/cooklily-test-courier-agent-auth` publicada e PR #303 integrado; correção de bundle em PR #304 também integrada à canonical.
- Implementação local permite identidade de agente para admin e, de forma restrita, courier com `isTestAccount=true`.
- A flag de teste sozinha não altera autenticação. Contas de teste sem identidade de agente mantêm login por senha e MFA exigido pelo papel; somente identidade dedicada com chave provisionada reporta `authenticationMethod=agent-key`, sem solicitar senha/MFA e sem gravar TOTP como verificado.
- Sessões courier de agente só são aceitas enquanto a conta estiver ativa, for `courier`, estiver marcada como teste e possuir chave ativa; remoção da flag/papel invalida sessão e credenciais.
- A equipe pode marcar/desmarcar couriers de teste e visualizar estado da chave; o CLI de provisionamento aceita somente admin ativo ou courier de teste ativo. O provisionamento explícito da chave é o que converte a identidade para login de agente.
- Courier agente tem escopo apenas courier. Couriers reais continuam sujeitos a senha e MFA.
- A elegibilidade de despacho aceita courier agente de teste, mantendo os requisitos humanos de senha/MFA para os demais. A marcação explícita de disponibilidade continua sendo necessária.

## Em andamento

- PR #303 está integrado à canonical como `0bcc615e7348e08c221e6485f60e0274fea1a58d`; correção #304 integrada como `b181939417df1cbe429b789bcbb3be4ae356a91b`.
- O deploy de `b181939417df1cbe429b789bcbb3be4ae356a91b` concluiu em 2026-10-31. Serviço `carro-chefe` ativo; deploy log `/srv/carro-chefe/data/deploy-logs/deploy-20261031-054247-b181939417df.log`, evidência `.evidence`; build VPS Vite 8.2.1 passou o budget de JS gzip por 0.01 KiB; nenhuma migration pendente.
- CI do PR #304: run `41173396639` passou. Build local Vite 8.3.5 ficou em 192.37 KiB JS gzip / 193 KiB e 227.72 KiB combinado JS+CSS / 229 KiB.
- Duas chaves Ed25519 distintas foram cadastradas para as contas courier de teste. O comando de status confirmou papel courier, conta ativa, flag de teste, identidade `agent` e chave ativa em ambas. Nenhuma chave SSH da VPS/admin foi reutilizada.
- Homologação por chave foi concluída no domínio real por handoff do navegador integrado. A rota `/lilyacai/entregas` abriu como courier; `/lilyacai/painel` mostrou “Acesso staff necessário”.
- Validação visual da página courier: mobile 390×844, `scrollWidth=375`; desktop 1440×900, `scrollWidth=1425`. Ambas carregaram.
- A tentativa de ativar disponibilidade terminou em “Não foi possível atualizar sua disponibilidade.” A tela permaneceu offline; nenhuma localização foi compartilhada e nenhum pedido/oferta foi criado.

## Gates e testes

- `npm run policy:build` e `npm run policy:preflight -- --agent AG-DEV --scope lily-test-courier-auth`: passaram após atualizar as diretivas da API.
- `git diff --check`: passou.
- Vitest focado `agent-auth.test.ts`, `team.test.ts`, `logistics.test.ts`: 27/27 passaram, incluindo teste de conta de teste não dedicada a IA mantendo senha e MFA.
- `npm run check`: passou.
- `npm test`: passou com 84 arquivos, 438 testes aprovados e 3 ignorados.
- Build local original: JS raw 606.74/608 KiB, gzip 192.44/193 KiB, total JS+CSS gzip 227.78/229 KiB.
- CI run `41172013595` no head anterior `1603a405` falhou no build Node 22/24 por JS raw 608.34 KiB e gzip 193.17 KiB; Tool Health reportou app-lily com a mesma falha de build.
- CI runs `41172445366` e `41172717775` passaram para o PR #303; o segundo head incluiu o checkpoint e passou em Node 20/22/24, Tool Health e jobs auxiliares.
- O primeiro deploy de `0bcc615e7348e08c221e6485f60e0274fea1a58d` falhou no gate de build em 2026-10-31 05:33 UTC por JS gzip acima em 0.04 KiB. O follow-up #304 corrigiu a margem e o deploy subsequente passou.
- Nenhuma migration nova era necessária no follow-up. A migration de logística já havia sido aplicada no deploy anterior.

## Migrations

- Nenhuma migration necessária.

## Bloqueios/riscos

- O padrão exige uma chave Ed25519 exclusiva por identidade de courier; nunca reutilizar a chave SSH da VPS. Registrar somente as chaves públicas. As chaves privadas devem permanecer no ssh-agent e não ser lidas, enviadas ao chat ou versionadas.
- As duas contas courier de teste permanecem ativas como identidades por chave; a flag de teste e o papel courier foram verificados antes do cadastro.
- O despacho de produção é opt-in por disponibilidade; contas de teste só devem ser marcadas disponíveis durante uma homologação coordenada.
- A ativação pede geolocalização do navegador. Foi solicitado ao proprietário permitir uma posição simulada no ponto de coleta em abas temporárias do navegador integrado; aguardar a resposta antes de conceder a permissão ou enviar coordenadas.
- A tentativa inicial permaneceu offline. Ainda não foi criado pedido de homologação sem pagamento real nem demonstrada oferta sequencial.

## Homologação/dependências externas

- Autenticação por chave está homologada no domínio real usando o navegador integrado. Desktop e mobile carregaram a rota courier; a área administrativa negou acesso.
- Disponibilidade e despacho continuam pendentes; nenhum dado de localização foi transmitido, e a interface mostrou uma mensagem genérica de erro ao tentar ativar.
- Após autorização do proprietário para simulação, testar disponibilidade, oferta sequencial, recusa/expiração, aceite, status/ETA, coleta e avaliação com pedido identificado como homologação e sem cobrança real.
- Não usar pedido real nem cobrança real. Revalidar prioridade, recusa e expiração sequenciais como parte do checkpoint de despacho.

## Próxima ação exata

Após a resposta do proprietário sobre a posição simulada, concluir a validação de disponibilidade e investigar a mensagem de erro. Em seguida, criar pedido explicitamente marcado como homologação sem qualquer transação financeira e testar ofertas sequenciais, recusa/expiração, aceite, status/ETA e avaliação em desktop/mobile. Colocar os couriers offline no final e publicar este checkpoint atualizado na canonical. Se o modo de homologação envolver pagamento externo, notificações reais ou dados não isolados, parar antes de submeter.
