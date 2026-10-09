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
