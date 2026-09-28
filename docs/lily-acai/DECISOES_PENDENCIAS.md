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
| LILY-PEND-003 | Landing P0 | resolvida e publicada na VPS | Entrega 04 |
| LILY-PEND-004 | WhatsApp P0 | resolvida para atendimento humano | — |
| LILY-PEND-005 | Cardápio inicial | **resolvida** pelo documento canônico | — |
| LILY-PEND-006 | Preços | **resolvida** para o cardápio inicial | — |
| LILY-PEND-007 | Adicionais | **resolvida** para o cardápio inicial | — |
| LILY-PEND-008 | Admin | painel staff implementado; criar/homologar primeira conta staff segura na publicação | deploy/homologação |
| LILY-PEND-009 | Fotografia | morango/maracujá aprovados; produzir Café e demais gradualmente | mídia |
| LILY-PEND-010 | Horários/capacidade | configuração implementada; preencher/homologar valores reais na VPS | operação |
| LILY-PEND-011 | Entrega | implementação concluída; configurar/homologar regiões, taxa e mínimo reais | Entrega 06 |
| LILY-PEND-012 | Retirada | implementação concluída; configurar/homologar endereço e horários reais | Entrega 06 |
| LILY-PEND-013 | Pagamento | **provedor automático decidido tecnicamente:** camada própria + adapter Mercado Pago; Pix/cartão/webhook/refund implementados; criar conta, informar credenciais, homologar taxas e fazer deploy continuam pendentes | Entrega 07 |
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
| LILY-PEND-029 | Catálogo | **resolvida tecnicamente e publicada:** LilyMix, subcategorias, ofertas, combos, adicionais, mídia e painel; homologação conjunta 05/06 pendente | Entrega 05 |
| LILY-PEND-030 | Checkout | carrinho, entrega/retirada, pedido e domínio financeiro concluídos; gateway automático Mercado Pago integrado sem ativação por default; resta deploy/homologação comercial | Entregas 06–07 |
| LILY-PEND-031 | Branch canônica | **resolvida para integração:** `cooklily/canonical`; `lily-acai` passa a ser base histórica | governança |
| LILY-PEND-032 | Gate Entrega 07 | **resolvida tecnicamente:** correção validada no SHA `4b111c2e26b234d83111a58a9b20ef34f773a97a`; CI `36330633129` e CodeQL `36330633098` verdes | — |
| LILY-PEND-033 | QA UX/mobile | P0 estruturais implementados e validados em CI; homologação visual em aparelhos reais continua necessária; P1/P2 permanecem no backlog detalhado | lançamento |
| LILY-PEND-034 | Segurança de contas | **MFA staff/admin e revogação dedicada de outras sessões resolvidas tecnicamente**; recuperação de senha continua aberta por falta de canal de verificação aprovado | segurança |
| LILY-PEND-035 | Configurações da loja | **resolvida tecnicamente:** `/painel/configuracoes` e `/admin/store-settings` separam canais/endereço público/fidelidade de fulfillment | administração |
| LILY-PEND-036 | Deep-link de produto | **resolvida tecnicamente:** `?produto=<slug>` abre o modal correto e preserva filtros | conversão |
| LILY-PEND-037 | Recuperação de senha | definir canal confiável de verificação de titularidade antes de implementar “Esqueci minha senha” | segurança/suporte |
| LILY-PEND-038 | Pix próprio | **em implementação:** adapter `cooklily_pix`, BR Code estático, valor e txid gerados internamente; configurar chave/nome/cidade na VPS e homologar com banco recebedor | Entrega 11A |
| LILY-PEND-039 | Conciliação Pix próprio | escolher/integrar API bancária ou extrato com webhook depois de definir a conta PJ; até lá confirmação é operacional | Entrega 11A/11E |
| LILY-PEND-040 | Painel do cliente | evoluir Meus Pedidos para timeline de pagamento, produção e entrega | Entrega 11C |
| LILY-PEND-041 | Painel cozinha | fila por estágio, ações de avanço, SLA e auditoria | Entrega 11B |
| LILY-PEND-042 | Entregador | criar papel mínimo `courier`, fila, aceite, coleta/entrega e códigos | Entrega 11D |
| LILY-PEND-043 | Códigos logísticos | gerar/armazenar hash de códigos de coleta e entrega, limitar tentativas e auditar falhas | Entrega 11D |
| LILY-PEND-044 | Rotas/ETA | selecionar serviço barato/gratuito de mapas/rotas somente depois do fluxo operacional básico | Entrega 11E |
| LILY-PEND-045 | WhatsApp operacional | automatizar mensagens por etapa sem expor PII e respeitando consentimentos/regras do provedor | Entrega 11E |

Não inventar dado operacional ausente. Valores configuráveis ficam no sistema, não hardcoded em documentação.

## Backlog detalhado de UX, segurança e administração

A lista canônica dos 40 achados de homologação/QA de 27/09/2026 é:

`docs/lily-acai/PENDENCIAS_UX_SEGURANCA_2026-09-27.md`

Itens que já possuem correção no código continuam marcados como **CANDIDATO / REVALIDAR** até prova em deploy real; não fechar pendência apenas com evidência documental ou CSS aparentemente correto.

## Fonte canônica do cardápio

docs/lily-acai/produtos/CARDAPIO_INICIAL_DEFINITIVO.md
