# Decisões e pendências — CookLily

**Última auditoria:** 30/10/2026
**Fonte:** `cooklily/canonical`, código/testes/documentos integrados + ADR-001/ADR-002.
**Decisões confirmadas pelo proprietário:** 30/10/2026; revisadas após integrar PR #249.

## Decisões do proprietário — 30/10/2026

- Recuperação de senha: enviar código de verificação pelo WhatsApp ao número vinculado à conta. Implementação deve expirar e limitar tentativas/reenvios, não revelar se o telefone existe e invalidar códigos após uso ou troca de senha.
- Responsável/controlador de privacidade informado: Victor Gabriel Martins de Sousa, CNPJ 64.600.997/0001-01. Contato: `cooklily.ofc@gmail.com`.
- Retenção operacional informada: faixa de 180 a 365 dias. O prazo aplicável a cada classe de dados ainda precisa ser definido; não aplicar a faixa indiscriminadamente a dados sujeitos a obrigação legal ou preservação de auditoria.
- LILY-PEND-009 (produção de fotografias adicionais): retirada do backlog por enquanto; fotos adicionais ficam sem prioridade aprovada.
- Cancelamento com cupom/promoção/oferta: antes de confirmar, pedir ao cliente consentimento explícito de que o benefício já apurado não será restituído/disponibilizado novamente. Registrar a ciência e aplicar a regra de forma consistente no benefício efetivamente resgatado.
- Totem: criar aplicação dedicada, integrada às fontes autoritativas de catálogo/disponibilidade e ao ERP próprio.
- ERP: será desenvolvido pelo próprio projeto; seleção de fornecedor externo removida do roadmap.
- Central Operacional do Carro Chefe: descontinuada; código e artefatos associados não devem compor bundles nem deploy da VPS. A remoção das dependências remanescentes está em andamento.
- Ferramentas do repositório: ficam disponíveis para uso local dos agentes e não devem ser publicadas/copiadas para a VPS; scripts de infraestrutura de deploy em `deploy/` são exceção operacional.

## Atualização pontual — 08/10/2026

- O QR Pix próprio foi lido em outro celular e o valor da cobrança foi conferido no aplicativo bancário.
- O pagamento não foi concluído. Não marcar como homologados o recebimento efetivo, a confirmação do pagamento, a transição do pedido para pago ou a liberação da cozinha.
- A próxima prioridade do projeto é a UI definitiva do site público. A homologação financeira ponta a ponta fica para etapa posterior.
- Evidência: [HOMOLOGACAO_QR_PIX_2026-10-08.md](entregas/HOMOLOGACAO_QR_PIX_2026-10-08.md).


## Atualização de perfil — 08/10/2026

- O perfil público mantém logout discreto no rodapé; edição por ícone junto ao nome; foto abre em visualização de tela cheia, com lápis à esquerda e fechar à direita.
- O ranking fica ativado por padrão em novos cadastros. Contas existentes mantêm a escolha salva para não alterar silenciosamente a visibilidade pública.
- Preferência de atualizações de pedido pelo WhatsApp: padrão ativo para contas sem registro, com opção de desligar; o worker respeita o opt-out da conta além do opt-in individual do pedido.
- Ofertas especiais/cupons pelo WhatsApp: padrão desligado, salvo consentimento de marketing anterior; a escolha explícita no perfil passa a prevalecer e é registrada no histórico de consentimentos.
- O telefone é exibido no perfil em formato brasileiro `+55 (DD) 9XXXX-XXXX` (ou formato fixo de 10 dígitos).

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
| LILY-PEND-009 | Fotografia adicional | retirada do backlog por decisão do proprietário em 30/10/2026; sem trabalho de produção aprovado por enquanto | — |
| LILY-PEND-010 | Horários/capacidade | configuração implementada; preencher/homologar valores reais na VPS | operação |
| LILY-PEND-011 | Entrega | implementação concluída; configurar/homologar regiões, taxa e mínimo reais | Entrega 06 |
| LILY-PEND-012 | Retirada | implementação concluída; configurar/homologar endereço e horários reais | Entrega 06 |
| LILY-PEND-013 | Pagamento | **parcial:** QR e valor conferidos, sem pagamento concluído no registro. Recebimento, confirmação, conciliação e transição do pedido continuam sem homologação real; métodos aprovados pelo ADR-002 dependem de credenciais/disponibilidade e habilitação autorizada | Entrega 07 / ADR-002 |
| LILY-PEND-014 | Jurídico | controlador e contato informados: Victor Gabriel Martins de Sousa, CNPJ 64.600.997/0001-01; `cooklily.ofc@gmail.com`. Validar texto/adequação jurídica antes da publicação final | publicação final |
| LILY-PEND-015 | Retenção | faixa aprovada de 180–365 dias; falta atribuir prazo por classe/finalidade e distinguir retenção legal, auditoria e exclusão/anonimização | política final |
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
| LILY-PEND-028 | Alergênicos | **domínio técnico e sanfona fechada por padrão implementados no código:** taxonomia, admin, agregação, snapshot e apresentação acessível; faltam QA visual/teclado real e revisão de dados/contato cruzado por produto | compliance / ADR-002 |
| LILY-PEND-029 | Catálogo | **resolvida tecnicamente e publicada:** LilyMix, subcategorias, ofertas, combos, adicionais, mídia e painel; homologação conjunta 05/06 pendente | Entrega 05 |
| LILY-PEND-030 | Checkout | carrinho/pedido concluídos; QR Pix e valor da cobrança homologados em aparelho externo; **pagamento ponta a ponta não testado**. A UI pública ainda deve refletir ADR-002 e métodos realmente habilitados; confirmação e atualização do pedido serão testadas em etapa financeira posterior | Entregas 06–07 |
| LILY-PEND-031 | Branch canônica | **resolvida para integração:** `cooklily/canonical`; `lily-acai` passa a ser base histórica | governança |
| LILY-PEND-032 | Gate Entrega 07 | **resolvida tecnicamente:** correção validada no SHA `4b111c2e26b234d83111a58a9b20ef34f773a97a`; CI `36330633129` e CodeQL `36330633098` verdes | — |
| LILY-PEND-033 | QA UX/mobile | P0 estruturais implementados e validados em CI; homologação visual em aparelhos reais continua necessária; P1/P2 permanecem no backlog detalhado | lançamento |
| LILY-PEND-034 | Segurança de contas | **MFA staff/admin e revogação dedicada de outras sessões resolvidas tecnicamente**; recuperação de senha aguarda implementação pelo canal WhatsApp decidido | segurança |
| LILY-PEND-035 | Configurações da loja | **resolvida tecnicamente:** `/painel/configuracoes` e `/admin/store-settings` separam canais/endereço público/fidelidade de fulfillment | administração |
| LILY-PEND-036 | Deep-link de produto | **resolvida tecnicamente:** `?produto=<slug>` abre o modal correto e preserva filtros | conversão |
| LILY-PEND-037 | Recuperação de senha | canal decidido: código de verificação via WhatsApp ao número vinculado. Falta implementar expiração, rate limit, uso único, resposta anti-enumeração e homologação do envio | segurança/suporte |
| LILY-PEND-038 | Pix próprio | **homologação parcial:** adapter, BR Code, QR personalizado e Copia e Cola integrados; QR lido em segundo celular e valor conferido. Falta pagar uma cobrança e validar recebimento, conciliação/confirmação e transição do pedido para pago | Entrega 11A / ADR-002 |
| LILY-PEND-039 | Conciliação Pix próprio | **resolvida tecnicamente pela 11I:** ledger, poller e adapter API Pix v2 integrados; falta banco/conta real, OAuth/mTLS/certificado, smoke e tarifas | Entrega 11I |
| LILY-PEND-040 | Painel do cliente | **resolvido tecnicamente:** timeline, guest tracking, ETA/mapa sem coordenadas e WhatsApp operacional integrados; falta QA real/credenciais externas aplicáveis | Entregas 11C/11F/11G/11H |
| LILY-PEND-041 | Painel cozinha | **resolvido tecnicamente:** fila, handoff, SLA/alertas e impressão integrados; faltam SLA operacional real, QA em tablet e impressora | Entregas 11B/11J/11K |
| LILY-PEND-042 | Entregador | **implementado e validado tecnicamente em `0941ede...`:** papel `courier`, MFA, fila, aceite atômico e todas as etapas coleta→entrega; falta QA real | Entrega 11D |
| LILY-PEND-043 | Códigos logísticos | **implementado e coberto por testes:** derivação HMAC sem persistir código por pedido; segredo de 32 bytes na VPS, rate limit e auditoria de tentativas inválidas; falta homologação real | Entrega 11D |
| LILY-PEND-044 | Rotas/ETA | **resolvida tecnicamente:** OpenRouteService/HeiGIT server-side integrado; falta chave/endereço reais e homologação de geocodificação/rota | Entrega 11G |
| LILY-PEND-045 | WhatsApp operacional | **resolvido tecnicamente:** outbox, opt-in/out, Meta Cloud API e etapas integrados; falta WABA/número/template/token reais e homologação Meta | Entrega 11H |
| LILY-PEND-046 | Reatribuição/cancelamento de entrega | **resolvida tecnicamente:** recusa, desistência pré-coleta, retorno à fila, reatribuição e histórico integrados; falta QA multiusuário real | Entrega 11E |
| LILY-PEND-047 | Guest tracking | **resolvido tecnicamente:** capability token opaco/hash, página guest e polling integrados; falta QA navegador/mobile real | Entrega 11F |
| LILY-PEND-048 | QA logística real | testar duas contas courier concorrentes, cozinha e cliente em celulares reais antes de abrir a operação | Entrega 11D |
| LILY-PEND-049 | Matriz pública de pagamento | **roteamento implementado conforme ADR-002** para Pix próprio + crédito/débito Mercado Pago selecionáveis por método. Falta configuração/credenciais e homologação financeira real | ADR-002 / pagamentos |
| LILY-PEND-050 | UX de alergênicos | **implementada tecnicamente conforme ADR-002** (sanfona fechada por padrão, aviso sob ação, acessibilidade e snapshot); QA visual/teclado real e revisão dos dados permanecem abertos | ADR-002 / Entrega 12 |
| LILY-PEND-051 | Deploy da canonical | hotfix do deployer integrado no head `24bef161...`; executar novo deploy e comprovar health, backup, migrations e rollback antes de chamar a versão atual de homologada | deploy/homologação |
| LILY-PEND-052 | UI definitiva do site | **trabalho de UI segue aberto:** revisar landing, catálogo, produto/carrinho, checkout, acompanhamento, responsividade, acessibilidade e estados; sanfona já foi implementada tecnicamente, sujeita a QA real | UI / QA real |
| LILY-PEND-053 | ERP próprio | desenvolver ERP do projeto; levantar domínios, requisitos, fontes oficiais, contratos e sequência de migração. Não selecionar fornecedor externo | roadmap ERP |
| LILY-PEND-054 | Totem dedicado | decisão tomada: criar aplicação dedicada; detalhar sessão, privacidade, acessibilidade, impressão, pagamentos, contingência e hardware antes de implementação | roadmap totem |
| LILY-PEND-055 | Cupons em cancelamento | exigir confirmação explícita de ciência antes do cancelamento; benefício aplicado/resgatado não retorna ao saldo/disponibilidade. Falta especificar UX, auditoria e comportamento por status de pedido | cupons / pedidos |
| LILY-PEND-056 | Marketing/CRM | pendente decisão operacional: preferências de canal/frequência, calendário, segmentação, opt-in/opt-out e métricas aprovadas | CRM |
| LILY-PEND-057 | Convites de indicação | definir validade, revogação e estados/regras de resgate antes de campanhas; ver proposta registrada no roadmap | indicação |
| LILY-PEND-058 | Central Operacional | descontinuada; bundle e rota estática removidos do build/runtime. Endpoints, módulos administrativos e persistência legada ainda precisam inventário e remoção segura; rotas web antigas retornam 410 | deploy / manutenção |
| LILY-PEND-059 | Ferramentas locais no deploy | build e gate de Tool Health retirados do deployer; confirmar em limpeza final de runtime que `tools/` não seja copiada para VPS e manter apenas helpers de infraestrutura instalados explicitamente | deploy |

Não inventar dado operacional ausente. Valores configuráveis ficam no sistema, não hardcoded em documentação.

## Backlog detalhado de UX, segurança e administração

A lista canônica dos 40 achados de homologação/QA de 27/09/2026 é:

`docs/lily-acai/PENDENCIAS_UX_SEGURANCA_2026-09-27.md` (itens reconciliados com ADR-002 e atualizações posteriores em 30/10/2026)

Itens que já possuem correção no código continuam marcados como **CANDIDATO / REVALIDAR** até prova em deploy real; não fechar pendência apenas com evidência documental ou CSS aparentemente correto.

## Fonte canônica do cardápio

docs/lily-acai/produtos/CARDAPIO_INICIAL_DEFINITIVO.md
