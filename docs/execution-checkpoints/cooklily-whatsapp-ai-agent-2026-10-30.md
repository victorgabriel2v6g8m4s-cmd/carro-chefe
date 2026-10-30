# Atendimento CookLily por WhatsApp com agente IA

- status: in_progress
- owner: AG-DEV
- branch: `cooklily/canonical` (fundação integrada; homologação visual concluída; piloto real pendente)
- base_branch: `cooklily/canonical`
- base_sha_verified: `b4673469cb75a96cd45c62ed3e46ad1c25f753ac`
- head_sha_verified: `b4673469cb75a96cd45c62ed3e46ad1c25f753ac`
- pull_requests: PR #278 merged; PR #279 merged; PR #280 merged; PR #281 aberto para reconciliação final do roadmap: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/281
- last_verified_at: 2026-10-30 14:42 America/Sao_Paulo
- interruption_state: none

## Entrega

Reconciliar o roadmap CookLily com a implementação canônica e implantar a fundação do atendimento inbound por WhatsApp com processamento idempotente, inbox humana e agente OpenAI stateless, contexto mínimo, segurança em camadas, busca de conhecimento e controles de custo. Atendimento a clientes permanece desligado até completar os gates de configuração, privacidade, avaliação e piloto controlado.

## Concluído e persistido

- PR #278 integrado por squash em `cooklily/canonical` no SHA `c589b7949226ff9269687e448903c9dbc3a9c5fa`; todos os checks passaram.
- Migration `20261030160000_lily_whatsapp_ai_inbox` aplicada na produção após backup verificado. Primeiro release do recurso: `c02ed62a89350053679a5b6ba2c59b88a99494e9`.
- PR #279 (`97170803b79430c8dc5d6df452b215d3dbe23225`) e PR #280 (`f8e64ce0bcc357e5b51a7a648434d9dfe77b1fce`) integrados; ajustes corrigiram contraste dos metadados e estados vazios.
- Release da aplicação confirmado em `b4673469cb75a96cd45c62ed3e46ad1c25f753ac`. Deploy passou health interno/externo, Nginx, build, testes e gates, serviço ativo; backups verificados. Sem migration adicional nos deploys CSS.
- Inbox `/lilyacai/painel/whatsapp` homologada pelo navegador integrado do Codex: desktop 1365×900 e mobile 390×844. Painéis legíveis, responsivos e sem overflow horizontal na inbox. Nenhuma conversa de cliente ou mensagem externa foi usada. Melhoria de UX ainda possível: reduzir rolagem longa da página administrativa em mobile.
- PR #281 atualiza o roadmap e diferencia fundações implementadas de ativação real. Alteração documental em `docs/lily-acai/ROADMAP_COOKLILY.md`; `git diff --check` passou. O CI do PR está enfileirado no GitHub e ainda não concluiu.
- Suíte na VPS após release: 80 arquivos e 420 testes passaram. Backup pré-release do banco Lily: 2,674,688 bytes, SHA-256 no log do deploy.
- `npm run check`, `npm test` (80 arquivos, 417 testes passaram, 3 ignorados), `npm run build` sequencial e `git diff --check` passaram durante as entregas. Build reportou JS 185.95 KiB gzip/187 KiB, inicial 49.46/110 KiB, CSS 34.78/35 KiB, combinado 220.74/222 KiB, maior chunk 68.01/280 KiB.
- Todos os gates de PR #280 passaram: Quality Node 20/24, Tool Health, Windows Supervisor, Workbook Snapshot e Excel Recipe Windows/Linux.
- VPS verificada sem expor segredos: credenciais Meta presentes; inbox, IA, consulta por embeddings e orçamento diário desativados/ausentes; segredo OpenAI, chave de cifra e retenção não configurados.

## Capacidades implantadas

- Webhook Meta com assinatura/handshake, validação de schema, idempotência/deduplicação, rate limits e processamento inbound durável por fila.
- Inbox cifrada com APIs staff autenticadas, controles de sessão, handoff e resposta humana; conteúdo não deve ir para logs e há expurgo por retenção configurada.
- Orquestrador para OpenAI Responses API stateless (`store:false`), prompt versionado, contexto limitado, guardrails, fallback humano e limites de custo/tokens; sem ferramentas transacionais para o modelo.
- Conhecimento público curado, embeddings cacheados e busca vetorial local em SQLite. Texto de cliente só é enviado para embedding quando consentimento/configuração explícita permite; flag permanece desligada.
- Rascunhos de templates Meta continuam dependendo de revisão/submissão e aprovação no WhatsApp Manager. A entrega não envia mensagens reais.

## Em andamento e bloqueios

- PR #281: CI aguardando execução; integrar por squash após todos os gates passarem.
- Operação humana avançada ainda parcial: atribuição/SLA, busca e rotina de operação devem ser fechadas.
- Antes do piloto: provisionar segredo OpenAI e chave de cifra, definir retenção e transparência/consentimento, validar WABA/número/templates aprovados, definir teto financeiro e monitoramento, executar avaliações offline benignas e adversariais, e testar num número de homologação consentido.
- Não habilitar flags de inbox, agente ou embeddings de consulta na VPS até que os gates de segurança, privacidade, operação e custo estejam documentados e aprovados.

## Próxima ação exata

Aguardar conclusão dos checks do PR #281; corrigir falhas se houver e integrar por squash se todos passarem. Depois atualizar este checkpoint com o SHA do merge. Manter o agente desativado e iniciar avaliação offline dos guardrails antes de qualquer piloto Meta.
