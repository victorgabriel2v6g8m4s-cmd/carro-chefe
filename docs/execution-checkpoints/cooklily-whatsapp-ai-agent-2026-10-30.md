# Atendimento CookLily por WhatsApp com agente IA

- status: in_progress
- owner: AG-DEV
- branch: codex/cooklily-whatsapp-ai-agent
- base_branch: cooklily/canonical
- base_sha_verified: a0cc107155f101ea6b0d835d2b9c103653b08cf9
- head_sha_verified: c589b7949226ff9269687e448903c9dbc3a9c5fa
- pull_requests: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/278 (merged)
- last_verified_at: 2026-10-30 13:59 America/Sao_Paulo
- interruption_state: none

## Entrega

Reconciliar o roadmap CookLily com a implementação canônica; iniciar o atendimento inbound pelo WhatsApp usando OpenAI Responses API, com processamento idempotente, histórico minimizado e protegido, handoff humano, APIs internas, conhecimento recuperável por embeddings/cache e controles de segurança. Atendimento real permanece desligado até segredos, retenção e configuração Meta serem preparados e verificados.

## Concluído e persistido

- PR #278 integrado por squash em `cooklily/canonical` no SHA `c589b7949226ff9269687e448903c9dbc3a9c5fa`; todos os checks GitHub passaram.
- Antes do deploy, VPS confirmou SHA `080eae62ae8615887b8e45f58038f6daad2de399`, serviço ativo e Nginx ok; após fetch remoto, `origin/cooklily/canonical` confirmou o SHA `c589b7949226ff9269687e448903c9dbc3a9c5fa`.
- Ambiente da VPS verificado sem imprimir segredos: inbox, agente, consulta por embeddings e orçamento diário desligados/ausentes; credenciais Meta existentes; segredo OpenAI, chave de cifra e retenção não configurados.
- Commit de implementação `26a149f` inclui webhook inbound idempotente, schema/migration, criptografia, inbox/API staff, fila/worker, guardrails, RAG público, embeddings e painel.
- Commit `a9d8a25` reforça detecção de prompt injection e afirmações de pagamento/pedido no guardrail de saída; testes unitários após o ajuste passaram.
- Roadmap reconciliado: entregas anteriores de dashboard/ranking/perfil marcadas concluídas com referência ao PR #277; backlog de temporada/missões/analytics continua aberto; WhatsApp atualizado para status parcial.
- OpenAI Docs oficial consultada: Responses pode operar com `store:false`; embeddings retornam vetores que podem ser armazenados em vector store. Manter estado e histórico do lado CookLily, sem `previous_response_id`.
- Sem credencial OpenAI disponível por ferramenta nesta sessão.
- Configuração de consulta exige consentimento explícito para enviar texto do cliente ao endpoint de embeddings; IA, inbox e consultas continuam desligadas por padrão.

## Em andamento

- Deploy do SHA `c589b7949226ff9269687e448903c9dbc3a9c5fa` e migration real pendentes.
- Homologação desktop/mobile do painel de staff no navegador integrado ainda pendente.
- Aprovar retenção e transparência do envio de consultas à OpenAI antes de ativar flags em qualquer WABA.

## Gates e testes

- `npm test`: passou; 80 arquivos, 417 testes passaram, 3 ignorados.
- `npm run check`: passou (client Prisma gerado, dois schemas válidos, TypeScript sem erros).
- Após o último ajuste de guardrails, `npm run check` e os 4 testes unitários de segurança passaram novamente.
- `npm run build`: passou; JS total 185.95 KiB gzip/187 KiB, JS inicial 49.46/110 KiB; CSS gzip 34.78/35 KiB; combinado 220.74/222 KiB; chunk máximo 68.01 KiB/280 KiB.
- `node --test deploy/scripts/survey-ops.test.mjs`: passou, incluindo migration AI em SQLite em memória.
- `npm run db:deploy:lily` em cópia descartável do banco local migrado: migration AI aplicada. Banco original não foi usado nesse teste.
- `git diff --check`: sem erros de whitespace.

## Migrations

- `20261030160000_lily_whatsapp_ai_inbox`: criada e aplicada em cópia descartável; a migration adiciona tabelas de inbox, jobs, preferências, KB/vetores e uso, além de chave de idempotência.

## Bloqueios/riscos

- Não habilitar integração real até configuração de segredo Meta/OpenAI, chave de criptografia, retenção aprovada/configurada, templates aprovados e teste num número de homologação autorizado.
- O banco Lily é SQLite; vetores persistidos são apenas de conhecimento público. O texto das consultas só será enviado ao endpoint de embeddings com a flag explícita, que permanece desligada.

## Homologação/dependências externas

- VPS verificada; deploy e teste no domínio real pendentes.
- Quando houver UI, homologação exclusivamente no navegador integrado do Codex.

## Próxima ação exata

Executar `sudo cc deploy canonical` na VPS (canonical confirmado no SHA `c589b7949226ff9269687e448903c9dbc3a9c5fa`), validar migration/serviço/health e depois homologar a tela `/lilyacai/painel/whatsapp` em desktop e mobile no navegador integrado, mantendo flags de IA desligadas.
