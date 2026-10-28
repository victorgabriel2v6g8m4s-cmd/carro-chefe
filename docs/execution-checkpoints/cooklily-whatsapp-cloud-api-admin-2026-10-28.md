# CookLily — finalizar WhatsApp Cloud API

- status: in_progress
- owner: AG-DEV
- branch: codex/lily-whatsapp-cloud-api-admin
- base_branch: cooklily/canonical
- base_sha_verified: 0696105f160e520dfc8af1e26d9280ea995f6588
- head_sha_verified: d1f85547b2e14a36a39558ca60c3f5eae744cc84
- pull_requests: none
- deploy_sha: 1cb9741c1a97e97700eeacccfa6143a90145864e
- tests/gates: policy preflight passed for API Lily, Lily admin UI and docs; `npm test` passed (64 files, 347 passed, 3 skipped); `npm run check` passed; `npm run build` passed; Lily budget tests passed; `git diff --check` passed. PR/CI/deploy/real-domain verification pending.
- migrations: existing `20260929150000_lily_whatsapp_outbox` and `20261009130000_cooklily_whatsapp_templates_webhooks`; no new migration planned yet.
- blockers: Meta credentials and Business assets are not available in the repo/session; live sending and Meta dashboard subscription must remain disabled until the owner configures them in the protected VPS environment and Meta Developers.
- last_verified_at: 2026-10-28 America/Sao_Paulo
- next_action: review the full diff, commit and open PR to `cooklily/canonical`; wait for checks, merge, deploy and verify the real site in Codex in-app browser.

## Objetivo

Concluir a experiência administrativa e os gates operacionais da integração oficial CookLily com WhatsApp Cloud API já existente no backend, validar webhook/queue/template flow, implantar na canonical e homologar no domínio real sem ativar envio até que os ativos e credenciais da Meta estejam provisionados com segurança.

## Escopo em andamento

1. [x] Ler a documentação de implementação atual e os contratos de API existentes.
2. [x] Confirmar no repositório as duas migrations WhatsApp, o worker fail-closed, endpoints admin de status/fila/templates e endpoint de webhook HMAC.
3. [x] Implementar painel lazy-loaded em `/lilyacai/painel/whatsapp`, com checklist sem revelar segredos, callback URL, fila filtrável, retry admin e CRUD de templates; ligar a navegação do painel.
4. [x] Corrigir o erro genérico ao ativar template sem nome aprovado; adicionar teste de validação e revisar testes de opt-in, outbox e webhook.
5. [x] Executar `npm test`, `npm run check`, `npm run build`, Lily budget, policy preflight e `git diff --check`.
6. [ ] Abrir PR para `cooklily/canonical`, aguardar CI/CodeQL e integrar por squash.
7. [ ] Implantar com `sudo cc deploy canonical`; validar health/readiness/HTTPS e caminhos do painel no navegador integrado do Codex.
8. [ ] Atualizar este checkpoint e a documentação setup com SHA, evidências, screenshots, falhas/retestes e limitações.

## Estado inicial confirmado

- `apps/api/src/modules/lily/whatsapp.ts` implementa outbox, envio Graph API, opt-in, retry/backoff, configuração fail-closed, rotas admin de settings/notificações/templates e funções de verificação.
- `apps/api/src/modules/integrations/whatsapp-webhooks.ts` valida challenge GET, HMAC POST, rate limit e deduplicação; para CookLily persiste apenas metadados/hash do evento, sem corpo da mensagem ou telefone.
- `apps/api/src/server.ts` inicia e encerra o worker WhatsApp.
- A documentação atual afirma que o vínculo em Meta Developers e as credenciais de produção ainda não foram configurados. O token, App Secret e Verify Token devem ficar somente no ambiente protegido do servidor.
- A navegação do painel não contém página de operação de templates/fila; a observabilidade existente exibe apenas contagens agregadas.
- A configuração do provider permanece `disabled` sem todos os parâmetros exigidos; o deploy pode ser homologado sem envio real.

## Implementado e validado localmente

- Página administrativa separada, com carregamento sob demanda; staff/admin consulta status e fila. Mutação permanece protegida pelos endpoints admin, MFA/CSRF e auditoria existentes.
- O painel expõe apenas presença booleana dos segredos. A fila não exibe conteúdo de mensagem nem telefone.
- Template novo/editado permanece como rascunho; ativação exige nome de template aprovado informado na Meta. O PATCH agora retorna `ApiError 400` com código estável em vez de erro interno.
- `npm test`: 64 arquivos, 347 testes aprovados, 3 ignorados.
- `npm run check`: passou (geração/validação Prisma e TypeScript).
- `npm run build`: passou; bundle CookLily medido: JS bruto 656.50 KiB, JS gzip 174.66 KiB, CSS bruto 134.57 KiB, CSS gzip 25.60 KiB, combinado gzip 200.26 KiB.
- No Windows, migrations foram aplicadas apenas ao SQLite descartável do worktree. `prisma migrate deploy` e `db push` encerraram com `Schema engine error` sem detalhe; build/check e testes completos passaram. O fluxo de deploy Linux ainda precisa validar as migrations.
- O bundler ainda avisa que o chunk principal tem 574.81 kB; a nova página está separada em chunk lazy de 12.91 kB.
- `npm ci` informou 14 vulnerabilidades do lockfile (5 moderadas, 9 altas); nenhuma atualização ampla de dependências foi feita neste escopo.

## Ativos externos necessários para ativar produção

- WhatsApp Business Account e número remetente configurados/aptos na Meta.
- Phone Number ID e token de sistema apropriado com permissões Cloud API.
- App Secret e inscrição do callback `messages` no app/WABA corretos.
- Verify Token aleatório acordado entre ambiente protegido e Meta Developers.
- Template operacional aprovado e seu idioma/nome/parâmetros confirmados.
- Versão Graph vigente escolhida/configurada explicitamente.

Nenhum desses segredos será pedido para commit, incluído em URL, impresso em logs ou armazenado no Git. O painel só revela se cada variável está presente.

## Referências oficiais consultadas

- Coleção oficial Meta/Postman da WhatsApp Cloud API: https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api
- Docs oficiais Meta Developers consultados diretamente; o acesso automatizado respondeu HTTP 429, então a inspeção de detalhes dinâmicos está pendente de acesso autenticado/normal.

## Próxima ação exata

Publicar a branch `codex/lily-whatsapp-cloud-api-admin` e abrir PR para `cooklily/canonical`; acompanhar CI/CodeQL antes do merge.
