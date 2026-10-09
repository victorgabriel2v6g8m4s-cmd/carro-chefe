# Especificação da nova UI CookLily — Reels, Dashboard e fidelidade

- status: merged
- owner: AG-DEV (documentação/integração)
- branch: docs/cooklily-reels-dashboard-loyalty-2026-10-09
- base_branch: cooklily/canonical
- base_sha_verified: 9fc8854f4f0398c4231973a443ac6d95b02e7cc9
- head_sha_verified: 9f45769f0d95d1f6cc1da82dc753e1ae172d614c
- pull_requests: #154 (merged; squash commit 76af8dac2974c6bbecebd9df8fefaced38052c5a), #155 (checkpoint merged; squash commit c6d3ec957878320718641f0a45ee678a74450f15), #156 (UI baseline supplement merged; squash commit b54d4b33f37b7b3813c36e8c27cede1bc8bc533d)
- last_verified_at: 2026-10-09T14:00:00Z
- interruption_state: none

## Escopo

Documentar a nova UI pública CookLily e o sistema de fidelidade. Esta entrega é exclusivamente documental: não altera código de aplicação, banco, schema ou migrations.

## Concluído e persistido

- Criado `docs/lily-acai/UX_REELS_DASHBOARD_FIDELIDADE_2026-10-09.md` com 856 linhas de especificação funcional, regras, requisitos não funcionais, roadmap, testes, critérios de aceite, riscos e questões em aberto.
- PR #156 acrescentou o baseline de UI já homologado informado pelo proprietário: lazy-loading de imagens, profile picture picker com editor integrado, spinners personalizados, separadores de categorias e correções avulsas; estes itens devem ser preservados e cobertos por testes de regressão.
- Atualizado `docs/lily-acai/ROADMAP_COOKLILY.md` com fases U7–U9 (Reels, Dashboard/repetição de pedidos, fidelidade configurável).
- Atualizado `docs/lily-acai/README.md` e `docs/cooklily/README.md` com links para a nova especificação.
- Diferenciadas as decisões dadas pelo proprietário, propostas de planejamento e questões pendentes.
- Incluídos todos os detalhes informados: capa primeiro no carrossel; gestos; pausa/áudio/2×; feedback do carrinho em 250 ms; modos de ordenação; atribuição de compartilhamento com limites de privacidade; cinco abas mobile; regras de Dashboard e últimos sete dias; repetição de pedido com escolhas anteriores; barra de progressão; 21 ranks; 200 pontos; multiplicador 1,66; 10.000.000 Mestre→Elite; referência interna 990 pontos = R$ 1 não pública; missões por rank; cupons/cashback/produtos; página de configuração.
- PR #154 integrado por squash à branch canônica.

## Gates e testes

- Verificados via GitHub API os conteúdos e links dos quatro arquivos na branch da tarefa e novamente na `cooklily/canonical`.
- Commit da branch de documentação original: `9f45769f0d95d1f6cc1da82dc753e1ae172d614c`.
- Complemento do baseline de UI: branch head `27aa3388c3f60e8fe361a3d2519ef414fc8965cc`, merge SHA `b54d4b33f37b7b3813c36e8c27cede1bc8bc533d`.
- Merge SHA: `76af8dac2974c6bbecebd9df8fefaced38052c5a`.
- Status checks e workflow runs consultados para o HEAD do PR: nenhum status ou workflow run foi retornado.
- Testes de aplicação não executados, pois a alteração é exclusivamente documental.
- Não houve deploy nem homologação funcional; nenhuma UI nova foi implementada.

## Migrations

Nenhuma migration ou alteração de schema.

## Bloqueios/riscos

- A fórmula completa de progressão e o significado incremental/acumulado dos 10.000.000 Mestre→Elite permanecem pendentes.
- Comentários, autenticação de ações sociais, algoritmo de relacionados, janela de atribuição/retensão anônima e política de mudança de configuração para usuários existentes precisam de decisão antes das respectivas fases.
- A documentação não deve ser interpretada como implementação concluída.

## Homologação/dependências externas

Não aplicável nesta entrega documental. Quando houver implementação, a UI deverá ser testada em aparelhos reais e os fluxos de pontos/recompensas terão testes transacionais separados.

## Próxima ação exata

Iniciar a Fase 0 do documento `docs/lily-acai/UX_REELS_DASHBOARD_FIDELIDADE_2026-10-09.md`: auditar componentes/rotas/serviços atuais de catálogo, janela do produto, mídia, carrinho, tracking e pedidos; registrar contratos reutilizáveis e dependências antes de implementar Reels. Antes da Fase 5, fechar e aprovar a tabela matemática de progressão dos 21 ranks.

## Atualização do checkpoint — resultados manuais da Fase 0 (2026-10-09)

**Estado da Fase 0:** em andamento. Resultados abaixo foram relatados pelo proprietário após testes manuais; ainda não representam confirmação por inspeção do código ou testes executados pelo agente.

- **OK:** T01 catálogo; T02 categorias; T03 abertura do produto; T04 adicionais/escolhas; T05 carrinho; T06 mídia; T07 seletor/editor de foto de perfil; T08 spinners/carregamento; T12 DevTools sem erros aparentes.
- **FALHOU — prioridade alta:** T09. Pedidos cancelados continuam sendo exibidos como ativos; o filtro de cancelados não apresenta os pedidos cancelados existentes; o próprio cliente continua vendo o pedido como ativo após o cancelamento.
- **PARCIAL/INCOMPLETO:** T10. Aba Ranking existe, mas sua página não foi construída; Reels e Dashboard não existem; o Perfil não mostra selo de ranking.
- **AUSENTE:** T11. Não há botão de compartilhamento na interface testada.
- **Reels:** o proprietário relata que nenhum dos recursos planejados de Reels está disponível na versão testada.

### Próximas ações exatas

1. Investigar T09 de ponta a ponta: persistência/status do pedido, regras de pedido ativo, filtros de cancelados, histórico e atualização do status no acompanhamento do cliente. Registrar evidência e causa antes de alterar código.
2. Auditar no repositório rotas, componentes e serviços reutilizáveis para catálogo, janela de produto, adicionais, carrinho, mídia, conta/perfil, pedidos e tracking/analytics.
3. Mapear a aba Ranking existente e as dependências de backend necessárias para Ranking, selo de rank, Reels, Dashboard e compartilhamento.
4. Preservar os fluxos aprovados manualmente e incluir regressão para lazy-loading, editor de foto de perfil, spinners personalizados, separadores de categoria e correções de UI.
5. Só então propor a implementação, separando causa confirmada, hipótese, funcionalidade ausente e decisão pendente.

**Limites:** não foi feita correção de aplicação; o agente não executou testes automatizados, não fez deploy e não confirmou tecnicamente a causa de T09. Os estados OK refletem apenas os testes manuais relatados pelo proprietário. A especificação funcional contém o registro detalhado na seção 18.

## Investigação de T09 — atualização de código (2026-10-09)

- **Causa técnica confirmada:** a torre de controle filtrava os pedidos cancelados apenas em memória depois de buscar os 200 mais recentes; cancelados mais antigos podiam ser excluídos antes do filtro. Nas telas do cliente, `customerOrderStatus` não considerava `operationStatus = cancelled` antes de exibir um status logístico antigo.
- **Correção preparada:** filtro de estado terminal no Prisma antes do limite; regra de status do cliente centralizada e compartilhada entre histórico/detalhe autenticado e tracking guest.
- **Testes adicionados:** integração com 201 pedidos ativos mais recentes para verificar o filtro de um cancelado antigo; testes unitários para precedência de cancelamento operacional/logístico e preservação de estorno.
- **Branch de trabalho:** `fix/cooklily-cancelled-orders`; destino pretendido: `cooklily/canonical`.
- **Status de validação:** os testes ainda não foram executados neste ambiente. Aguardar CI do PR. Sem deploy ou homologação manual.
- **Atenção semântica:** “Cancelar cobrança” no financeiro permanece diferente de “Cancelar pedido”; essa ação não foi alterada para cancelar automaticamente o pedido.

### Próxima ação

Executar CI/revisão da branch de correção; resolver qualquer falha; merge para `cooklily/canonical` se permitido; deploy separado e repetição manual de T09 após autorização.

## Resultado da correção T09 — 2026-10-09

- PR [#158](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/158) **merged** para `cooklily/canonical`.
- Commit squash: `287b5327bc750597aca4d187c68e5ac6c63a5727`.
- Código e testes de regressão foram integrados.
- O conector GitHub retornou nenhum status de commit nem execução de workflow para o HEAD consultado; logo, **testes não confirmados como executados/passando**.
- Nenhum deploy ou teste manual pós-correção foi realizado.
- Próximo passo: executar preflight, testes da API de pedidos e testes de UI Lily em checkout canonical; corrigir qualquer falha; fazer deploy controlado; reexecutar T09 na interface e confirmar também um pedido ativo normal.
