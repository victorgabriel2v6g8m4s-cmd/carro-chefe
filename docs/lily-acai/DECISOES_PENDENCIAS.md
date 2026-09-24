# Decisões e pendências — CookLily

## Confirmado

- nome público definitivo: **CookLily**;
- wordmark oficial: **cookLily**;
- linha de gelato normalizada como **LilyShake / LilyShakes**;
- descritor: **Milk-shake de gelato caseiro**;
- cardápio inicial canônico em docs/lily-acai/produtos/CARDAPIO_INICIAL_DEFINITIVO.md;
- categorias: Batidas de Açaí, LilyShakes e Doces “em breve”;
- preços, combinações, adicionais, limites e combos iniciais aprovados;
- 300 ml e 500 ml aprovados;
- compra sem conta aprovada; telefone obrigatório no pedido;
- catálogo com busca, filtros, rolagem incremental, mídia em tela cheia e produto esgotado visível;
- landing exibe somente destaques/ofertas em carrossel;
- tracking aceita la_* e cc_*;
- QR físico atual permanece;
- banco/autenticação/dados CookLily separados do Carro Chefe;
- parceria pública permanece CookLily × Carro Chefe — parceria temporária;
- fotos reais de morango e maracujá aprovadas;
- base LilyShake: 10 g de Emustab, 30 g de liga neutra, 800 g creme de leite, 300 g açúcar, 750 ml leite, rendimento conservador 2,5 L;
- processo LilyShake e validade operacional aproximada de 2 semanas documentados;
- garrafa 300/500 ml: R$ 1,00;
- uma sacola por pedido;
- margem líquida mínima de 10% como guardrail comercial.

## Pendências / implementação

| ID | Tema | Situação necessária | Impacto |
|---|---|---|---|
| LILY-PEND-001 | Logo | resolvida | — |
| LILY-PEND-002 | Tokens | resolvida | — |
| LILY-PEND-003 | Landing P0 | resolvida tecnicamente; deploy pendente | Entrega 04 |
| LILY-PEND-004 | WhatsApp P0 | resolvida para atendimento humano | — |
| LILY-PEND-005 | Cardápio inicial | **resolvida** pelo documento canônico | — |
| LILY-PEND-006 | Preços | **resolvida** para o cardápio inicial | — |
| LILY-PEND-007 | Adicionais | **resolvida** para o cardápio inicial | — |
| LILY-PEND-008 | Admin | criar primeira conta staff segura | Entrega 05 |
| LILY-PEND-009 | Fotografia | morango/maracujá aprovados; produzir Café e demais gradualmente | mídia |
| LILY-PEND-010 | Horários/capacidade | implementar como configuração do sistema | checkout/operação |
| LILY-PEND-011 | Entrega | áreas/taxas/pedido mínimo configuráveis | Entrega 06 |
| LILY-PEND-012 | Retirada | regras/horários configuráveis | Entrega 06 |
| LILY-PEND-013 | Pagamento | definir/integrar credenciais do provedor | Entrega 07 |
| LILY-PEND-014 | Jurídico | controlador/contato de privacidade | publicação final |
| LILY-PEND-015 | Retenção | prazos de PII/logs | política final |
| LILY-PEND-016 | Marketing | regras operacionais de envio/CRM | CRM |
| LILY-PEND-017 | Naming CookLily | resolvida | — |
| LILY-PEND-018 | Foto morango | resolvida | — |
| LILY-PEND-019 | Tipografia | resolvida; Summer e Amsterdam Four | — |
| LILY-PEND-020 | Fontes web | receber binários/licença quando conveniente | não bloqueia catálogo |
| LILY-PEND-021 | Nome do gelato | **resolvida: LilyShake** | — |
| LILY-PEND-022 | Emustab | **resolvida: 10 g por lote** | sincronizar workbook |
| LILY-PEND-023 | Sabores | **resolvida** para inauguração | — |
| LILY-PEND-024 | Embalagem 300 ml | **resolvida: R$ 1/un.** | sincronizar workbook |
| LILY-PEND-025 | Densidade Nutella | medição futura melhora precisão; não bloqueia cardápio | financeiro |
| LILY-PEND-026 | Operação LilyShake | **resolvida** | — |
| LILY-PEND-027 | Workbook | aplicar receita de sincronização com decisões finais | financeiro |
| LILY-PEND-028 | Alergênicos | criar configuração específica antes da venda comercial completa | compliance |
| LILY-PEND-029 | Catálogo | implementar modelo dinâmico LilyMix, subcategorias, oferta e adicionais | Entrega 05 |
| LILY-PEND-030 | Checkout | carrinho, entrega/retirada, pedido e checkout online | Entregas 06–07 |

Não inventar dado operacional ausente. Valores configuráveis ficam no sistema, não hardcoded em documentação.

## Fonte canônica do cardápio

docs/lily-acai/produtos/CARDAPIO_INICIAL_DEFINITIVO.md
