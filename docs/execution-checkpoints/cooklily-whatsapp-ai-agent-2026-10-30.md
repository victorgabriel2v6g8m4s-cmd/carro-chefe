# Atendimento CookLily por WhatsApp com agente IA

- status: in_progress
- owner: AG-DEV
- branch: codex/cooklily-whatsapp-ai-empty-state (merged)
- base_branch: cooklily/canonical
- base_sha_verified: fa430c8e4700006dddb0b3e62359131812578358
- head_sha_verified: f8e64ce0bcc357e5b51a7a648434d9dfe77b1fce
- pull_requests: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/278 (merged); https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/279 (merged); https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/280 (merged)
- last_verified_at: 2026-10-30 14:30 America/Sao_Paulo
- interruption_state: none

## Entrega

Reconciliar o roadmap CookLily com a implementação canônica; iniciar o atendimento inbound pelo WhatsApp usando OpenAI Responses API, com processamento idempotente, histórico minimizado e protegido, handoff humano, APIs internas, conhecimento recuperável por embeddings/cache e controles de segurança. Atendimento real permanece desligado até segredos, retenção e configuração Meta serem preparados e verificados.

## Concluído e persistido

- PR #278 integrado por squash em `cooklily/canonical` no SHA `c589b7949226ff9269687e448903c9dbc3a9c5fa`; todos os checks GitHub passaram.
- Release `c02ed62a89350053679a5b6ba2c59b88a99494e9` implantada em 30/10/2026. Migration `20261030160000_lily_whatsapp_ai_inbox` aplicada no banco real após backup verificado; health interno/externo, Nginx, gates e serviço passaram.
- A verificação visual inicial encontrou texto de baixo contraste nos painéis escuros; PR #279 foi integrado em `cooklily/canonical` por squash no SHA `97170803b79430c8dc5d6df452b215d3dbe23225`, com correção CSS e roadmap reconciliado.
- Release `fa430c8e4700006dddb0b3e62359131812578358` implantada após o PR #279; health, Nginx, migrations (sem pendências), suíte, build e gates passaram. A nova revisão desktop encontrou estado vazio ainda escuro por estilo `muted`; PR #280 prepara override explícito dos metadados/estados vazios.
- PR #280 corrigiu estados vazios/metadados nos cartões escuros, passou todos os gates e foi integrado por squash no SHA `f8e64ce0bcc357e5b51a7a648434d9dfe77b1fce`; aguarda deploy e verificação final.
- Antes da primeira implantação, VPS confirmou SHA `080eae62ae8615887b8e45f58038f6daad2de399`; canonical integrou PR #278 no SHA `c589b7949226ff9269687e448903c9dbc3a9c5fa` e publicou o checkpoint `c02ed62` antes do deploy.
- Suíte na VPS: 80 arquivos, 420 testes passaram. Banco backup pré-release: Lily 2,674,688 bytes, SHA-256 registrado no log de deploy; backup verificado.
- Ambiente da VPS verificado sem imprimir segredos: inbox, agente, consulta por embeddings e orçamento diário desligados/ausentes; credenciais Meta existentes; segredo OpenAI, chave de cifra e retenção não configurados.
- Commit de implementação `26a149f` inclui webhook inbound idempotente, schema/migration, criptografia, inbox/API staff, fila/worker, guardrails, RAG público, embeddings e painel.
- Commit `a9d8a25` reforça detecção de prompt injection e afirmações de pagamento/pedido no guardrail de saída; testes unitários após o ajuste passaram.
- Roadmap reconciliado: entregas anteriores de dashboard/ranking/perfil marcadas concluídas com referência ao PR #277; backlog de temporada/missões/analytics continua aberto; WhatsApp atualizado para status parcial.
- OpenAI Docs oficial consultada: Responses pode operar com `store:false`; embeddings retornam vetores que podem ser armazenados em vector store. Manter estado e histórico do lado CookLily, sem `previous_response_id`.
- Sem credencial OpenAI disponível por ferramenta nesta sessão.
- Configuração de consulta exige consentimento explícito para enviar texto do cliente ao endpoint de embeddings; IA, inbox e consultas continuam desligadas por padrão.

## Em andamento

- Deploy do SHA `c589b7949226ff9269687e448903c9dbc3a9c5fa` e migration real pendentes.
- Inbox visualizado no domínio real com sessão de agente autenticada pelo navegador integrado. Desktop em 1365×900 confirmou layout de duas colunas; foi encontrado contraste baixo em estado vazio e metadados. PR #280 corrige e foi integrado; aguarda deploy e revalidação desktop/mobile.
- Aprovar retenção e transparência do envio de consultas à OpenAI antes de ativar flags em qualquer WABA.

## Gates e testes

- `npm test`: passou; 80 arquivos, 417 testes passaram, 3 ignorados.
- `npm run check`: passou (client Prisma gerado, dois schemas válidos, TypeScript sem erros).
- Após o último ajuste de guardrails, `npm run check` e os 4 testes unitários de segurança passaram novamente.
- `npm run build`: passou; JS total 185.95 KiB gzip/187 KiB, JS inicial 49.46/110 KiB; CSS gzip 34.78/35 KiB; combinado 220.74/222 KiB; chunk máximo 68.01 KiB/280 KiB.
- `node --test deploy/scripts/survey-ops.test.mjs`: passou, incluindo migration AI em SQLite em memória.
- `npm run db:deploy:lily` em cópia descartável do banco local migrado: migration AI aplicada. Banco original não foi usado nesse teste.
- `git diff --check`: sem erros de whitespace.
- Após o primeiro ajuste visual: `npm run check`, `npm test` (80 arquivos; 417 passaram, 3 ignorados), `npm run build` sequencial e `git diff --check` passaram. Build concorrente inicial falhou por disputa de geração dos clientes Prisma, foi repetido sequencialmente e passou.
- Para o segundo ajuste visual: `npm run build` e `git diff --check` passaram; todos os gates do PR #280 passaram (Node 20/24, Tool Health, Windows Supervisor, Workbook Snapshot e Excel Recipe Windows/Linux).
- Para o segundo ajuste visual: `npm run build` e `git diff --check` passaram; PR #280 ainda aguarda gates completos.
- PR #279: todos os gates passaram (Quality Node 20/24, Tool Health, Windows Supervisor, Workbook Snapshot e Excel Recipe Windows/Linux).

## Migrations

- `20261030160000_lily_whatsapp_ai_inbox`: aplicada em cópia descartável e no banco de produção após backup verificado; adiciona tabelas de inbox, jobs, preferências, KB/vetores e uso, além de chave de idempotência. Correção CSS não altera schema.

## Bloqueios/riscos

- Não habilitar integração real até configuração de segredo Meta/OpenAI, chave de criptografia, retenção aprovada/configurada, templates aprovados e teste num número de homologação autorizado.
- O banco Lily é SQLite; vetores persistidos são apenas de conhecimento público. O texto das consultas só será enviado ao endpoint de embeddings com a flag explícita, que permanece desligada.

## Homologação/dependências externas

- VPS está no release `fa430c8`; o SHA `f8e64ce` está integrado e aguarda deploy e homologação responsiva final.
- Quando houver UI, homologação exclusivamente no navegador integrado do Codex.

## Próxima ação exata

Publicar este checkpoint atualizado em `cooklily/canonical`, implantar o HEAD resultante com `sudo cc deploy canonical` e confirmar contraste/layout de `/lilyacai/painel/whatsapp` em desktop e mobile pelo navegador integrado, mantendo flags de IA desligadas.

## Continuação 2026-10-30 — instruções do proprietário e roadmap

- Nova entrega iniciada no branch `codex/cooklily-whatsapp-roadmap-reconciled`, HEAD base `95a9e49b082dc87d5b0275f36fc156a7f29732b8`; PR #281 permanece aberto.
- Criado `docs/lily-acai/WHATSAPP_IA_GUIA_DE_CONFIGURACAO.md` com etapas externas Meta/OpenAI, privacidade/retenção, variáveis da VPS sem imprimir segredos, validação do painel, piloto, rollback e checklist do proprietário. A arquitetura referencia o guia.
- Em implementação: primeira fase do roadmap que não depende de novas credenciais — navegação lateral global, recolhível e responsiva no painel admin Lily.
- Preflight de política local passou para `lily/admin-navigation`, hash `24d8c85aea46ed391826fb0e89daad9df54cce974cadfd30f1bc6008f8d1e7a5`.
- Build de produção completo passou; budget CookLily: JS gzip 188.42/189 KiB, entry gzip 52.05/110 KiB, maior chunk 70.94/280 KiB, CSS gzip 35.24/36 KiB. Limites globais ajustados apenas para conter o delta da barra do painel; limites de entrada e chunk máximo preservados.
- `npm run check` passou; `npm run test:lily-ui` passou (24 arquivos, 106 testes); os testes de policy/tool-health (8), deploy validation (14) e build budget (4) passaram.
- Limitação de teste local: `npm test` não alcançou a suíte porque o Prisma migrate deploy falha com `Schema engine error` após instalar dependências neste worktree sem a instalação de scripts do engine. Vitest direto: 57 arquivos/261 testes passaram, 23 suites/157 falharam por tabelas não migradas no banco local. CI Linux/Windows da PR #281 estava verde no SHA anterior; precisa repetir no novo commit.
- Sidebar possui links para módulos, recolhimento desktop persistido em localStorage não sensível, menu mobile expansível e links admin-only visíveis apenas para role admin; cada módulo conserva suas próprias autorizações no servidor.
- PR #281 estava aberta com todos os checks verdes no commit anterior `95a9e49b082dc87d5b0275f36fc156a7f29732b8`; novas alterações ainda não commitadas e sem CI.
- Tentativa de criação do run AG-DEV via bridge da Central falhou porque o project root configurado nela tem manifesto stale e uma árvore diferente. Não alterado: worktree OneDrive/Central; execução manual da tarefa `TASK-DEV-COOKLILY-ADMIN-NAV-WA-20261030` registrada como run `cmvv9x6hr002tactpozv9de8e` e ativa.
- Após revisar diff, commit/push na PR #281, aguardar CI atualizado, integrar, deploy autorizado e homologar o painel administrativo via navegador Codex integrado em desktop/mobile; repetir correção se houver falhas.
