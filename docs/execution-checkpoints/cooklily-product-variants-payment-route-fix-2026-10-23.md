# CookLily — opções de produto e falha de deploy (2026-10-23)

- status: `candidate`
- owner: `AG-DEV`
- branch: `fix/cooklily-launch-products-and-payment-deploy`
- base_branch: `cooklily/canonical`
- base_sha_verified: `1cdc134c3908ce94980ac5a8d1e3be63814ef42c`
- head_sha_verified: `4e5486a09b8ffca0cea8c25e82152657dee313aa` (último commit de código verificado antes deste checkpoint)
- pull_requests: [#171](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/171) — draft aberto
- last_verified_at: 2026-10-23
- interruption_state: `in_progress`

## Concluído e persistido

- Removido o registro duplicado de `lilyPaymentChoiceRoutes` dentro de `lilyRoutes`; `app.ts` mantém um único registro canônico.
- Cliente voltou a usar o alias POST `/api/v1/lily/payments/options`, permitido pelo prefixo Nginx, que encaminha para o handler canônico.
- Formulário de produto permite preço fixo ou opções personalizadas com nome, preço e seleção de padrão.
- A API aceita chaves internas de variante fora da faixa 300/500 ml; o preço continua sendo calculado no servidor pela variante persistida.
- Catálogo, carrinho, checkout, rastreio e cozinha mostram o nome da opção, sem expor chaves internas.
- Teste estrutural atualizado para cobrir rota única e os modos de preço.

## Em andamento

- Revisão final do diff do PR #171 e inspeção dos gates disponíveis.
- Testes/build locais não foram executados; a preferência vigente é não executá-los em cada entrega sem solicitação explícita.
- Nenhum deploy foi executado.

## Gates e testes

- Log de deploy fornecido pelo usuário: falha na fase `tests` do release `1cdc134c3908ce94980ac5a8d1e3be63814ef42c`; rollback para `863e2fa3fd9eede7fbb25dbb698a869fb0843450`; nenhuma migration real iniciada.
- Causa observada: rota Fastify duplicada `GET /api/v1/lily/public/payment-options/config` e teste estrutural esperando caminho antigo no cliente.
- Execuções de workflow verificadas para o primeiro HEAD do PR: nenhuma. Verificar novamente após as últimas atualizações do branch.
- Não executar deploy sem aprovação explícita do SHA exato.

## Migrations

- Nenhuma migration criada ou iniciada. Mudança usa os campos atuais de variantes e o `sortOrder` para definir padrão.

## Bloqueios/riscos

- O código ainda não foi validado por teste/build local.
- Após merge, o deploy precisa executar os gates normais; não assumir que o fluxo financeiro real está homologado.
- Produtos novos são criados como rascunho e opções como indisponíveis/rascunho; o responsável precisa publicar e ativar cada opção após revisar preço e disponibilidade.

## Homologação/dependências externas

- Verificar cadastro de um doce de preço fixo e de um produto com pelo menos três opções.
- Verificar preço cotado pelo backend, opção padrão, checkout, pedido e cozinha.
- Verificar que o alias de pagamento responde atrás do Nginx e que o Fastify inicia sem rota duplicada.

## Próxima ação exata

1. Atualizar o diff/HEAD do PR #171 e revisar os arquivos de UI/API afetados.
2. Consultar os gates de CI para o HEAD mais recente; não alegar sucesso se não houver execução.
3. Se os gates necessários estiverem verdes e a revisão estática continuar sem bloqueios, integrar o PR por squash.
4. Não publicar/deployar sem autorização explícita para o SHA exato.
