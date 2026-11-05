# CookLily — visibilidade de pagamentos e handoff da chave de agente

- status: in_progress
- owner: Codex
- branch: `codex/cooklily-payment-homologation`
- base_branch: `cooklily/canonical`
- base_sha_verified: `0c82e7b2867db06a8072d27bee6b5a46673a7ebf`
- head_sha_verified: `e1dcf0cc` (antes da correção de roteamento em andamento)
- pull_requests: #332 merged em `0c82e7b2867db06a8072d27bee6b5a46673a7ebf`; #333 aberto para correção e homologação
- last_verified_at: 2026-11-05 America/Sao_Paulo
- interruption_state: none

## Objetivo

Explicar e corrigir a mensagem genérica do checkout sem registrar dados de cartão ou segredos; alinhar autenticação por chave com os domínios e prefixos atuais (`carrochefe.com/lilyacai` e `licalily.com/cook`, API em `/api`); publicar no ambiente autorizado e homologar a jornada de pagamento e o fluxo operacional até onde as dependências externas permitirem.

## Evidência inicial

- Credencial de token carregada pelo serviço foi confirmada anteriormente como pertencente a uma conta de teste e igual à variável `_TEST`; não inferir produção pelo prefixo `APP_USR`.
- Duas tentativas de cartão no domínio público retornaram HTTP 502 em `/api/v1/lily/payments/options` (350 ms e 303 ms). Os logs existentes não registram corpo nem código sanitizado da resposta do provedor; não é possível distinguir recusa HTTP, resposta inválida e falha de transporte somente por esses logs.
- As tentativas mantiveram os pedidos aguardando pagamento; não houve confirmação local de aprovação. Não se presume ausência de registro no painel de pagamentos de teste do Mercado Pago.
- Autenticação por chave: causa do 401 identificada. O Nginx envia `/api/v1/lily/auth/*` para staging somente com o cookie `cooklily_staging=1`. O CLI fazia `challenges` e `verify` sem cookie, gravando o ticket no banco público (4173); o navegador no caminho `/lilyacai` enviava o cookie e fazia `/exchange` no banco staging (4175), onde o ticket não existia.
- A worktree de origem `cooklily-rewards-offers` contém alterações não commitadas de missões; elas não foram copiadas nem modificadas.

## Implementação e validação local — 2026-11-05

- Handoff da chave agora mapeia `https://carrochefe.com` para `/lilyacai/agent-auth.html` e `https://licalily.com` para `/cook/agent-auth.html`; a API segue em `/api`. O desafio assinado é vinculado à origem autorizada e a página estática retorna ao painel no prefixo correto.
- Erros do Mercado Pago agora registram request ID e códigos de diagnóstico estritamente permitidos, sem corpo bruto, dados de cartão ou conteúdo do pagador. Erros de transporte/5xx ficam como resultado incerto e pedem verificar pagamentos de teste antes de repetir; o checkout mostra orientação legível e referência de suporte.
- Adicionados testes focados para origem/rota do handoff, sanitização e classificação da falha do provedor, ausência de fallback inseguro e referência visível no checkout.
- Testes focados do patch atual: 1 arquivo, 17 aprovados, 3 skips.
- `npm run check`: passou (Prisma generate/validate e TypeScript).
- `npm run test:runtime`: passou (86 arquivos, 466 aprovados, 3 skips; deploy-validation 19/19).
- `npm run build`: passou. Budget CookLily: JS 670.80/715 KiB; gzip JS 211.08/227.70 KiB; JS+CSS gzip 252.21/272.80 KiB.
- `git diff --check`: passou.
- As migrations de teste foram aplicadas apenas no `.runtime/lily-acai.db` ignorado do checkout isolado; nenhuma base compartilhada/produção foi usada.
- PR #332 integrado via squash em `0c82e7b2867db06a8072d27bee6b5a46673a7ebf`.
- Deploy canônico de teste concluído em `0c82e7b2867db06a8072d27bee6b5a46673a7ebf` (log `/srv/carro-chefe/data/deploy-logs/deploy-20261105-033947-0c82e7b2867d.log`; evidência `/srv/carro-chefe/data/deploy-logs/deploy-20261105-033947-0c82e7b2867d.evidence`). Preflight aplicou 12 migrations core e 51 Lily em bancos descartáveis; migrations de produção não tinham pendências. Backups core/Lily verificados antes do stop; Nginx `ok`; readiness e external smoke `ok`.
- PR #333 contém o registro documental pós-merge; atualização do checkpoint de deploy e homologação permanece em andamento.

## Correção do roteamento e gates — 2026-11-05

- `tools/lily-agent-browser-relay.mjs` agora constrói cabeçalhos por origem: adiciona `cooklily_staging=1` somente para `https://carrochefe.com`; `https://licalily.com` continua sem cookie de staging. O CLI usa essa função em `challenges` e `verify`.
- `agent-auth.html` mostra em falhas apenas status HTTP, código validado e ID de referência, sem expor ticket nem corpo bruto.
- Teste focal `deploy-scripts.test.ts`: 17 passou, 3 skips.
- `npm run check`: passou. `npm run build`: passou; gzip JS+CSS 252.21/272.80 KiB.
- `npm run test:runtime`: passou (86 arquivos, 466 testes, 3 skips); `npm run check`, `npm run build` e teste focal passaram.
- Próximo deploy deve ser exclusivamente ao `/srv/cooklily/staging/current` (porta 4175, DB isolado), pois `cc deploy` só publicou o release canonical em `/srv/carro-chefe/current`; esse deploy não atualizou a rota de teste.

## Testes e gates

- Sem migration planejada pela correção de roteamento.
- PR #332 integrado; deploy canonical `0c82e7b2` concluído nos serviços Carro Chefe, sem mudança no release de staging `/lilyacai`.
- Correção nova ainda precisa ser enviada em #333, passar CI, integrar e publicar em staging antes da homologação do browser/pagamento.

## Bloqueios e riscos

- A causa específica da recusa 502 ainda depende de capturar metadados sanitizados ou consultar a aba de pagamentos de teste do Mercado Pago.
- O fluxo de cobrança usa credenciais de teste. Ele não pode confirmar uma cobrança real; qualquer pagamento real permanece uma ação do proprietário.
- Pedidos pendentes da homologação anterior precisam ser revisados via painel/capability antes de qualquer nova tentativa para evitar deixar estado ambíguo.

## Próxima ação exata

Commitar e atualizar #333; aguardar CI e integrar; preparar artefato com SHA para a release staging `52de0f5`, fazer backup/integridade da DB staging e swap atômico usando apenas `cooklily-staging.service`; testar autenticação por chave e checkout no navegador integrado desktop e mobile. Antes de nova tentativa MP, consultar os pedidos pendentes `CL-550BE7D35DB1` e `CL-322C029A6AEB` e os pagamentos de teste correspondentes para não duplicar cobranças ambíguas.
