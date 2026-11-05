# CookLily — visibilidade de pagamentos e handoff da chave de agente

- status: in_progress
- owner: Codex
- branch: `codex/cooklily-payment-agent-handoff-fix`
- base_branch: `cooklily/canonical`
- base_sha_verified: `c42c69af89034076d50f47dd5b0c973a07692451`
- head_sha_verified: `37a2837358138b07b5ec868f5e3aa23fe73a1e61` (implementação commitada localmente)
- pull_requests: nenhum
- last_verified_at: 2026-11-05 America/Sao_Paulo
- interruption_state: none

## Objetivo

Explicar e corrigir a mensagem genérica do checkout sem registrar dados de cartão ou segredos; alinhar autenticação por chave com os domínios e prefixos atuais (`carrochefe.com/lilyacai` e `licalily.com/cook`, API em `/api`); publicar no ambiente autorizado e homologar a jornada de pagamento e o fluxo operacional até onde as dependências externas permitirem.

## Evidência inicial

- Credencial de token carregada pelo serviço foi confirmada anteriormente como pertencente a uma conta de teste e igual à variável `_TEST`; não inferir produção pelo prefixo `APP_USR`.
- Duas tentativas de cartão no domínio público retornaram HTTP 502 em `/api/v1/lily/payments/options` (350 ms e 303 ms). Os logs existentes não registram corpo nem código sanitizado da resposta do provedor; não é possível distinguir recusa HTTP, resposta inválida e falha de transporte somente por esses logs.
- As tentativas mantiveram os pedidos aguardando pagamento; não houve confirmação local de aprovação. Não se presume ausência de registro no painel de pagamentos de teste do Mercado Pago.
- Autenticação por chave: os registros mostram HTTP 200 em `/api/v1/lily/auth/agent/challenges` e `/verify` no host `licalily.com`, sem requisição subsequente a `/exchange`. O relé local ainda aceita apenas o handoff antigo `https://carrochefe.com/lilyacai/agent-auth.html`.
- A worktree de origem `cooklily-rewards-offers` contém alterações não commitadas de missões; elas não foram copiadas nem modificadas.

## Implementação e validação local — 2026-11-05

- Handoff da chave agora mapeia `https://carrochefe.com` para `/lilyacai/agent-auth.html` e `https://licalily.com` para `/cook/agent-auth.html`; a API segue em `/api`. O desafio assinado é vinculado à origem autorizada e a página estática retorna ao painel no prefixo correto.
- Erros do Mercado Pago agora registram request ID e códigos de diagnóstico estritamente permitidos, sem corpo bruto, dados de cartão ou conteúdo do pagador. Erros de transporte/5xx ficam como resultado incerto e pedem verificar pagamentos de teste antes de repetir; o checkout mostra orientação legível e referência de suporte.
- Adicionados testes focados para origem/rota do handoff, sanitização e classificação da falha do provedor, ausência de fallback inseguro e referência visível no checkout.
- Testes focados: 5 arquivos, 36 aprovados, 3 skips.
- `npm run check`: passou (Prisma generate/validate e TypeScript).
- `npm run test:runtime`: passou (86 arquivos, 465 aprovados, 3 skips; deploy-validation 19/19).
- `npm run build`: passou. Budget CookLily: JS 670.80/715 KiB; gzip JS 211.08/227.70 KiB; JS+CSS gzip 252.21/272.80 KiB.
- `git diff --check`: passou.
- As migrations de teste foram aplicadas apenas no `.runtime/lily-acai.db` ignorado do checkout isolado; nenhuma base compartilhada/produção foi usada.
- Nenhum merge, deploy ou homologação de browser nesta etapa ainda.

## Testes e gates

- Sem migration planejada.
- PR draft #332 aberto contra `cooklily/canonical`, head `210107b56924e22dec56056aacbfe9844f9eaf6d`; checks Node 22/24, ferramentas, workbook e Windows passaram na verificação de `2026-11-05 00:35 America/Sao_Paulo`, Node 20 ainda estava em execução.
- Nenhum merge ou deploy até aqui.

## Bloqueios e riscos

- A causa específica da recusa 502 ainda depende de capturar metadados sanitizados ou consultar a aba de pagamentos de teste do Mercado Pago.
- O fluxo de cobrança usa credenciais de teste. Ele não pode confirmar uma cobrança real; qualquer pagamento real permanece uma ação do proprietário.
- Pedidos pendentes da homologação anterior precisam ser revisados via painel/capability antes de qualquer nova tentativa para evitar deixar estado ambíguo.

## Próxima ação exata

Atualizar este checkpoint após o commit de registro, aguardar e verificar os checks finais do PR #332, integrar por squash conforme o fluxo do repositório, executar deploy somente na rota de teste e homologar com o navegador integrado. Antes de tentar outro pagamento, conferir os dois pedidos de teste pendentes no painel MP; não criar pedidos duplicados enquanto a tentativa anterior continuar ambígua.
