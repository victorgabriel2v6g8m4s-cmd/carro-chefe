# Roadmap do fluxo de pedido e entrega CookLily

- status: validated
- owner: AG-DEV (documentação de implementação; decisões operacionais permanecem com o proprietário)
- branch: `codex/cooklily-delivery-flow-roadmap`
- base_branch: `cooklily/canonical`
- base_sha_verified: `7a0bd73dee5dd1f639058ef9ab39c33579931d4a`
- head_sha_verified: `31bde7ae3d955687cd7bfa16748e036e211d93a0`
- pull_requests: PR #297 aberto; CI run `41160392805` aprovado em todos os jobs
- last_verified_at: 2026-10-30
- interruption_state: none

## Concluído e persistido

- Branch canônica atualizada antes do trabalho; PR #296 (dashboard) está incluído na base.
- Revisados roadmap, implementação de pagamentos, operações de cozinha, logística, tracking seguro, ETA/mapas, WhatsApp operacional e impressão de cozinha.
- Atualizada a seção 9 do roadmap com inventário implementado e prioridades P0/P1/P2/condicionais.
- Ajustada a regra de prioridade principal para incluir a jornada completa até coleta e entrega segura.

## Em andamento

- Revisar diff e consistência das afirmações; validar links internos e `git diff --check`.
- Atualizar o checkpoint com os resultados de CI e integrar PR #297 por squash.

## Gates e testes

- Documentação somente; sem alteração de código, schema, migration ou aplicação.
- `git diff --check`: aprovado antes do commit.
- CI `41160392805`: todos os jobs aprovados (Node 20/22/24, Tool Health, Excel Recipe Linux/Windows, Windows Supervisor, Workbook Snapshot).
- Testes de aplicação/deploy: não aplicáveis a esta alteração de roadmap.

## Migrations

- Nenhuma.

## Bloqueios/riscos

- A política comercial/operacional para frota, área atendida, pagamento na entrega e tratamento de exceções depende de decisão do proprietário.
- Integração de logística externa depende de elegibilidade, contrato e APIs oficiais confirmados.
- A existência do fluxo implementado não equivale a homologação operacional real completa.

## Homologação/dependências externas

- Esta entrega altera somente documentação; não requer deploy.
- Validação ponta a ponta real do pedido depende de ambiente/conta consentidos e segue o roadmap atualizado.

## Próxima ação exata

Depois deste commit do checkpoint, aguardar novamente os gates do PR #297 e integrar por squash se permanecerem verdes; registrar SHA de merge e concluir o checkpoint.
