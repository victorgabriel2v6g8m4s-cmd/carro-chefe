# Atendimento CookLily por WhatsApp com agente IA

- status: in_progress
- owner: AG-DEV
- branch: codex/cooklily-whatsapp-ai-agent
- base_branch: cooklily/canonical
- base_sha_verified: a0cc107155f101ea6b0d835d2b9c103653b08cf9
- head_sha_verified: a0cc107155f101ea6b0d835d2b9c103653b08cf9
- pull_requests: none
- last_verified_at: 2026-10-30 14:00 America/Sao_Paulo
- interruption_state: none

## Entrega

Reconciliar o roadmap CookLily com a implementação canônica; iniciar o atendimento inbound pelo WhatsApp usando OpenAI Responses API, com processamento idempotente, histórico minimizado e protegido, handoff humano, APIs internas, conhecimento recuperável por embeddings/cache e controles de segurança. Atendimento real permanece desligado até segredos, retenção e configuração Meta serem preparados e verificados.

## Concluído e persistido

- Confirmado que o estado funcional atual está em `cooklily/canonical` no SHA `a0cc107`; a VPS ainda precisa ser comparada antes de publicar.
- Documentação atual registra apenas webhook com assinatura/hash, templates e outbox; inbox, processamento inbound e IA não existem.
- OpenAI Docs oficial consultada: Responses pode operar com `store:false`; embeddings retornam vetores que podem ser armazenados em vector store. Manter estado e histórico do lado CookLily, sem `previous_response_id`.
- Sem credencial OpenAI disponível por ferramenta nesta sessão.

## Em andamento

- Reconciliar itens do roadmap e planejar arquitetura por entregas verificáveis.
- Implementar primeiro incremento do backend após fechar contratos de persistência e retenção fail-closed.

## Gates e testes

- Ainda não executados nesta branch.

## Migrations

- Nenhuma nesta branch até o momento.

## Bloqueios/riscos

- Não habilitar integração real até configuração de segredo Meta/OpenAI, chave de criptografia, retenção aprovada/configurada, templates aprovados e teste num número de homologação autorizado.
- O banco Lily é SQLite; vector store começa como índice local de conhecimento estático, sem enviar mensagens dos clientes ao endpoint de embeddings.

## Homologação/dependências externas

- Deploy e teste no domínio real pendentes.
- Quando houver UI, homologação exclusivamente no navegador integrado do Codex.

## Próxima ação exata

Inspecionar schemas/deploy/runtime e escrever a arquitetura de atendimento + reconciliação dos itens 4A/WhatsApp; depois implementar armazenamento criptografado e inbox durável com testes.
