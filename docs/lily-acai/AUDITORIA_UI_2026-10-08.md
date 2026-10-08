# Auditoria do roadmap da UI pública CookLily — 2026-10-08

**Base auditada:** `cooklily/canonical`, commit de base `4ff91e9f99b29cf36be76b540cbcf5aed654fcf1`.  
**Escopo:** comparação documental e estática do roadmap U1–U6 com arquivos do frontend e pendências de QA. Esta auditoria não substitui teste em navegador real.  
**Regra de classificação:** “implementado” significa que existe código; “validado” exige evidência para o comportamento específico. Itens que os documentos já marcam como “QA real pendente” continuam sem aceite visual.

## Resumo executivo

- **Não reescrever a estrutura compartilhada:** o header, o menu mobile, o rodapé, os tokens da marca e várias proteções de acessibilidade já existem.
- **Maior dívida transversal:** o projeto ainda depende de QA visual real para encerrar itens do header/menu, catálogo, carrossel e breakpoints.
- **Pendência funcional confirmada:** a sanfona de alergênicos fechada por padrão não está implementada. `AllergenNotice.tsx` renderiza um `aside` aberto com todo o conteúdo.
- **QR Pix:** leitura em segundo aparelho e valor da cobrança já foram homologados pelo proprietário. Isso valida QR/payload/valor no cenário observado, não a apresentação final de toda a tela nem a liquidação do pagamento.
- **Próximo trabalho de código recomendado:** implementar a sanfona de alergênicos de forma reutilizável e acessível, após confirmar os usos atuais; em paralelo, executar a matriz de QA real de U1 antes de alterar o header.

## U1 — Estrutura visual compartilhada

**Classificação: IMPLEMENTADA TECNICAMENTE; QA visual pendente. Não iniciar uma reconstrução do shell.**

| Item | Evidência no repositório | Estado |
|---|---|---|
| Tokens e paleta | `apps/lily_acai/src/theme/tokens.css`; contrato e paleta em `docs/lily-acai/marca/KIT_DE_MARCA.md` | Implementado |
| Logo/wordmark | `Shell` em `apps/lily_acai/src/main.tsx`, usa ativo da marca e grafia cookLily | Implementado; conferir fonte e ativo real no navegador |
| Navegação desktop/mobile | `Shell`: `.desktop-nav`, `.header-actions`, `.mobile-only`; breakpoints em `styles.css` | Implementado |
| Menu drawer | `menuOpen`, `aria-expanded`, `aria-controls`, backdrop, links e `closeMenu` em `main.tsx` | Implementado |
| Tecla Escape e foco | `useEffect` do menu em `main.tsx`: Escape, foco inicial, ciclo Tab/Shift+Tab e retorno ao botão | Implementado; QA real pendente |
| Rodapé | `footer` dentro de `Shell` em `main.tsx` | Implementado |
| Skip link e foco principal | `.skip-link`, `#lily-main-content:focus-visible` em `styles.css` | Implementado |
| Reduced motion | regra `@media (prefers-reduced-motion: reduce)` em `styles.css` | Implementado ao menos para o carrossel; conferir outros componentes animados |

O arquivo `docs/lily-acai/PENDENCIAS_UX_SEGURANCA_2026-09-27.md` já classifica UX-001/002/004/005 e A11Y-001/002 como resolvidos tecnicamente, mas com QA real pendente. UX-006 a UX-015 também estão em “candidato/revalidar”. A tarefa correta é testar em 320, 360, 390, 430, 768 px e desktop; corrigir apenas defeitos reproduzidos.

## U2 — Landing e catálogo

**Classificação: IMPLEMENTADA EM GRANDE PARTE; QA de conteúdo e apresentação pendente.**

Evidências:
- `apps/lily_acai/src/catalog.tsx` contém a página do catálogo, configuração de produto, seleção de combos e `ComboCarousel`.
- `ComboCarousel` implementa rolagem horizontal, snap e controles/temporização.
- `docs/lily-acai/PENDENCIAS_UX_SEGURANCA_2026-09-27.md` já registra a ordem comercial busca → hero compacto → escolha da semana → contador/grid → combos como tecnicamente resolvida, com QA real pendente.
- `docs/lily-acai/marca/KIT_DE_MARCA.md` estabelece `mídias/cooklily/` como fonte de verdade e orienta preservar cor, volume e textura dos produtos.

Não recriar busca, filtros, grid ou carrossel sem demonstrar uma lacuna. Fazer inspeção visual para verificar se fotos reais aprovadas são usadas, se o grid aparece cedo, se preço/indisponibilidade estão claros e se os combos não causam overflow. A existência de ativos aprovados em documentação não prova que todas as fotos finais estão presentes e ligadas ao catálogo.

## U3 — Produto e carrinho

**Classificação: IMPLEMENTADOS; aceite visual e cenários de borda pendentes.**

Evidências:
- `apps/lily_acai/src/catalog.tsx`: configuração de item/combos e solicitação de cotação via API; trata produto esgotado e escolhas de variantes.
- `apps/lily_acai/src/features/cart/CartPage.tsx`: página de carrinho, estado vazio e uso de `AllergenNotice`.
- `apps/lily_acai/src/features/cart/CartContext.tsx`: estado compartilhado do carrinho (validar cenários, não substituir sem necessidade).

QA necessário: produto comum, LilyMix, tamanhos, adicionais, preço recotado pelo backend, remoção/quantidade, carrinho vazio, item que fica indisponível e telas estreitas. Não mudar regras de preço no frontend.

## U4 — Checkout e apresentação do pagamento

**Classificação: BASE IMPLEMENTADA; QR parcialmente homologado; tela precisa de aceite visual; fluxo financeiro não homologado.**

Evidências:
- `apps/lily_acai/src/features/payments/PaymentChoiceComponents.tsx` usa `CookLilyPixQrCode`.
- `docs/lily-acai/entregas/HOMOLOGACAO_QR_PIX_2026-10-08.md` registra leitura em outro aparelho e conferência do valor.
- O usuário confirmou a leitura do QR e o valor correto; ainda não concluiu pagamento.

Não repetir o teste básico de leitura sem motivo. Inspecionar o layout final do checkout (QR, valor, Pix Copia e Cola, botão copiar, retorno ao pedido, estados pendente/erro/expiração). O pagamento real, confirmação financeira, pedido pago e liberação operacional pertencem à etapa financeira posterior e continuam pendentes.

## U5 — Conta e acompanhamento

**Classificação: ROTAS E COMPONENTES IMPLEMENTADOS; QA de jornada completa pendente.**

Evidências:
- `apps/lily_acai/src/main.tsx` contém login/cadastro, perfil e navegação de conta.
- `apps/lily_acai/src/features/orders/GuestOrderTrackingPage.tsx` implementa acompanhamento para visitante e mapeia estados do pedido.

QA necessário: visitante vs. autenticado, retorno do checkout ao pedido, legibilidade da timeline no mobile e coerência do texto com o estado autoritativo. Não afirmar pagamento aprovado antes da confirmação financeira.

## U6 — Acessibilidade, responsividade e acabamento

**Classificação: PARCIAL. Há base de acessibilidade; uma decisão funcional permanece pendente.**

| Item | Evidência | Estado |
|---|---|---|
| Foco visível / skip link | `styles.css` | Implementado |
| Navegação de menu por teclado | `main.tsx` | Implementado; QA real pendente |
| Reduced motion | `styles.css` | Parcialmente implementado; auditar animações restantes |
| Breakpoints | múltiplos `@media` em `styles.css` | Implementado; não equivale a teste em dispositivos |
| Alergênicos em sanfona fechada | `apps/lily_acai/src/features/allergens/AllergenNotice.tsx` renderiza `aside` e exibe todo o conteúdo sem controle de expansão | **PENDENTE — implementação necessária** |
| Alergênicos no catálogo/carrinho | componente reutilizado por `catalog.tsx` e `CartPage.tsx` | Manter conteúdo e avisos; envolver em interação acessível sem escondê-los por padrão de forma irreversível |

A sanfona deve começar fechada, mostrar o aviso e os detalhes somente ao abrir, ter estado anunciado por tecnologia assistiva e funcionar com teclado. Não alterar o conteúdo médico/alergênico em si.

## Ordem de trabalho sem retrabalho

1. **QA rápido de U1 no navegador real** em 320/360/390/430/768 px e desktop. O shell já existe; registrar defeitos reproduzíveis antes de editar.
2. **Implementar sanfona de alergênicos** em componente reutilizável, fechada por padrão, mantendo a informação completa ao expandir; adicionar testes de renderização/teclado/ARIA e conferir os usos no catálogo e carrinho.
3. **QA visual de U2** (ordem, fotos reais, grid, preço, disponibilidade, combos/overflow); corrigir somente defeitos observados.
4. **QA de U3** com produtos, LilyMix, adicionais e carrinho vazio/indisponível.
5. **Ajustar U4 visualmente**, preservando o QR já homologado; não incluir teste de pagamento real nesta fase.
6. **QA de U5** em visitante/autenticado e estados da timeline.
7. **Matriz U6 final**: teclado, foco, contraste, reduced motion, alvo de toque, overflow e estados vazios/erro/loading/sucesso.

## Limitações desta auditoria

Esta passagem foi estática: arquivos e documentação da branch canônica foram comparados, mas não foi executado navegador automatizado nem feita captura de tela atual. Portanto, nenhum item visual foi marcado como plenamente homologado apenas por existir no código. Testes automatizados devem ser executados no pipeline do repositório antes do merge e a UI deve ser revalidada depois do deploy.
