# Pendências de ferramentas e capacidades

Use este arquivo quando uma tarefa exigir uma capacidade recorrente que **não existe** ou não está madura o suficiente no catálogo. O objetivo é impedir que agentes resolvam repetidamente o mesmo problema com procedimentos ad hoc sem deixar um plano reutilizável.

## Como registrar

Cada item deve ter: ID, data, solicitante/contexto, problema, capacidade necessária, alternativa temporária, owner, prioridade, status, critérios de aceite e dependências/bloqueios. Não inclua segredos ou dados pessoais.

Estados: `proposta`, `planejada`, `em desenvolvimento`, `validando`, `concluída`, `cancelada`.

## Backlog atual

### TOOL-PEND-001 — Teste automático de decodificação do QR Lab

- **Status:** planejada
- **Owner:** `AG-DEV`
- **Origem:** critério de pronto de `apps/qr_manipulator/AGENTS.md`
- **Problema:** o app possui build e geração de QR, mas não foi localizada evidência de um teste automatizado que decodifique o resultado e confirme o payload esperado.
- **Capacidade necessária:** gerar casos representativos, decodificar automaticamente a matriz/imagem e validar URL/texto e parâmetros de tracking.
- **Alternativa temporária:** build + inspeção manual/scan real antes de material impresso.
- **Critérios de aceite:** teste determinístico; casos de URL simples e URL com `cc_qr`, `cc_campaign`, `cc_variant`; falha em payload divergente; integração à suíte `npm test`.
- **Prioridade:** alta antes de produção em massa de QR impresso.

### TOOL-PEND-002 — Testes dedicados do agent runtime

- **Status:** planejada
- **Owner:** `AG-DEV`
- **Problema:** `tools/agent-runtime.mjs` possui validação sintática/uso operacional, mas o inventário não encontrou uma suíte dedicada que cubra falhas e ciclo de vida.
- **Capacidade necessária:** testes isolados de configuração, spawn/encerramento, timeout, falha parcial e sinais sem chamar serviços reais.
- **Critérios de aceite:** fixtures/mocks; nenhuma ação externa; execução em CI; códigos de saída previsíveis; cobertura dos caminhos de erro críticos.
- **Prioridade:** média/alta conforme o runtime se torne mais autônomo.

### TOOL-PEND-003 — Sincronização verificável do inventário de plugins

- **Status:** proposta
- **Owner:** `AG-DEV` + `AG-GESTAO`
- **Problema:** instalação/disponibilidade de plugins pertence à conta ChatGPT e muda fora do Git; CI comum não possui essa API/contexto.
- **Capacidade necessária:** capturar um snapshot não sensível do estado de plugins quando o ambiente permitir e produzir diff para revisão, sem tokens ou permissões privadas.
- **Critérios de aceite:** execução somente leitura; origem/data; redaction; falha segura sem conexão; nenhuma instalação automática; atualização revisável de `PLUGINS.md`.
- **Prioridade:** baixa enquanto o conjunto instalado for pequeno.

### TOOL-PEND-004 — Agregação cross-platform de saúde

- **Status:** proposta
- **Owner:** `AG-DEV`
- **Problema:** uma execução local do `tool-health` não consegue provar ferramentas exclusivas de outro SO, como o supervisor Windows.
- **Capacidade necessária:** consolidar resultados de runners Linux e Windows sem transformar `não testada nesta plataforma` em falha.
- **Critérios de aceite:** artefato estruturado por plataforma; merge determinístico; referência ao commit; status final por ferramenta; sem escrita concorrente na documentação.
- **Prioridade:** média se o relatório automático passar a ser gate de release.

## Regra para agentes

Se uma nova tarefa exigir ferramenta inexistente, registre aqui **antes** de propor uma implementação recorrente. A criação da ferramenta ainda segue especialização: agentes de negócio definem requisito/aceite; `AG-DEV` implementa software.