# Briefing de planejamento do ERP sob encomenda — Datwork

Versão: baseline interno aprovado pelo proprietário e consolidado após revisão formal de Finanças & ERP e Operações, 2026-08-13  
Responsáveis internos: Gestão, Finanças & ERP, Development & Data e Operações  
Fornecedor futuro informado: Datwork — **não contratado nem tecnicamente homologado por este documento**

Governança de envio: qualquer encaminhamento externo deste briefing à Datwork é de responsabilidade exclusiva do proprietário. A aprovação como baseline interno não autoriza agentes a enviá-lo, contratar, iniciar desenvolvimento ou homologar o sistema.

## 1. Objetivo

Solicitar o planejamento e posterior desenvolvimento de um ERP sob encomenda que seja o núcleo transacional do Carro Chefe: catálogo, pedidos, pagamentos, produção, estoque, fiscal, financeiro e dados conciliáveis para balcão, totem e web.

Este briefing define o que deve ser demonstrável. Valores de preço, custo, gramatura, estoque inicial, alíquotas e datas serão cadastrados após aprovação dos respectivos responsáveis; o sistema precisa suportar esses dados sem inventá-los ou fixá-los no código.

Documento técnico complementar: `docs/ERP_SOB_ENCOMENDA_REQUISITOS.md`.

## 2. Resultado esperado da fase de planejamento

Antes de desenvolver, a Datwork deverá devolver para aprovação:

1. matriz de aderência requisito a requisito: `atende`, `atende com ajuste`, `não atende` ou `depende de decisão`;
2. arquitetura proposta, fronteiras de sistemas e responsabilidades;
3. jornadas e protótipos de balcão, totem, web, produção e administração;
4. modelo de dados e dicionário inicial;
5. contrato de API e eventos proposto;
6. estratégia de segurança, LGPD, auditoria, backup e continuidade;
7. plano de testes e critérios de aceite rastreáveis;
8. fases, dependências, estimativa e riscos, sem iniciar escopo não aprovado;
9. TCO comparável, separando implantação, recorrência, volume/terceiros, hardware, suporte, evolução, reajustes e saída, com premissas e exclusões;
10. modelo de hospedagem, suporte, manutenção, atualização, licenciamento, propriedade intelectual e saída/portabilidade;
11. lista objetiva das decisões e insumos que o Carro Chefe precisa fornecer.

Nenhuma resposta comercial isolada será aceita como comprovação de capacidade. Cada item crítico precisará de demonstração no sistema entregue.

## 3. Escopo funcional rastreável

### Catálogo, produtos e canais

| ID | Requisito | Prioridade | Aceite resumido |
|---|---|---|---|
| `ERP-CAT-001` | Manter produtos, categorias, descrições, fotos, preços, disponibilidade e versão do catálogo; preços têm vigência, origem, aprovação, moeda, precisão e arredondamento parametrizados | eliminatório | mesma versão comercial e memória de cálculo disponível para balcão, totem e web |
| `ERP-CAT-002` | Usar IDs estáveis `PROD-*`, `MOD-*` e `ING-*`, sem reutilização | eliminatório | histórico continua referenciável após alterações/inativação |
| `ERP-CAT-003` | Disponibilidade por canal e horário, com indisponibilização coordenada | eliminatório | ruptura bloqueia novas vendas em todos os canais ativos |
| `ERP-CAT-004` | Versionar receita e catálogo vigentes em cada venda | eliminatório | pedido antigo pode ser reconstruído sem usar cadastro atual |
| `ERP-CAT-005` | Ativar/inativar item sem apagar histórico | obrigatório | relatórios históricos permanecem íntegros |

### Modificadores e Chefão

| ID | Requisito | Prioridade | Aceite resumido |
|---|---|---|---|
| `ERP-MOD-001` | Grupos com mínimo, máximo, quantidade e repetição configurável | eliminatório | regras são validadas no servidor, não apenas na tela |
| `ERP-MOD-002` | Chefão com exatamente dois espetos | eliminatório | pedido inválido não avança; repetição seguirá decisão posterior |
| `ERP-MOD-003` | Até dois adicionais gratuitos separados dos adicionais pagos | eliminatório | terceiro adicional gratuito é impedido ou precificado conforme regra aprovada |
| `ERP-MOD-004` | Remoções sem desconto e visíveis para produção | eliminatório | comanda/KDS mostra claramente cada remoção |
| `ERP-MOD-005` | Adicionais e modificadores baixam ingredientes/consumíveis corretos | eliminatório | estoque e custo teórico refletem a composição vendida |

### Ficha técnica, estoque e compras

| ID | Requisito | Prioridade | Aceite resumido |
|---|---|---|---|
| `ERP-STK-001` | Ficha técnica com unidades de compra/estoque/receita, conversões, subreceitas, quantidades bruta/líquida, rendimento, fator de correção, perda, embalagem, custo-fonte, método de custeio aprovado e vigência | eliminatório | venda gera consumo e snapshot imutável de receita/custo pela versão correta |
| `ERP-STK-002` | Entradas, saídas, locais, transferências, reservas, transformação, inventário, estorno, perda com motivo e ajuste auditado | eliminatório | saldo físico, reservado e disponível pode ser explicado por movimentos e reversões rastreáveis; estoque negativo segue política aprovada |
| `ERP-STK-003` | Estoque mínimo, ruptura e alerta | obrigatório | indisponibilidade e responsável ficam registrados |
| `ERP-STK-004` | Fornecedores, pedidos de compra, recebimento, divergência/devolução e composição documentada do custo de entrada | obrigatório | entrada atualiza saldo/custo conforme regra de rateio aprovada |
| `ERP-STK-005` | Lote, validade e estados de bloqueio/quarentena quando aplicáveis | obrigatório | item/lote impróprio bloqueia venda/produção conforme regra aprovada, com motivo, responsável e pedidos relacionados rastreáveis |

### Pedido, pagamento e atendimento

| ID | Requisito | Prioridade | Aceite resumido |
|---|---|---|---|
| `ERP-ORD-001` | Uma comanda para `counter`, `totem` e `web`, preservando o canal | eliminatório | os três canais chegam à mesma fila com origem identificada |
| `ERP-ORD-002` | Carrinho e pedido idempotentes, com validação de preço, regra e estoque no servidor | eliminatório | recarga/duplo clique não duplica pedido |
| `ERP-ORD-003` | Contrato monetário único: preço de referência, item, modificador, acréscimo, desconto/cortesia aprovado, estorno, valor líquido, precisão e arredondamento | eliminatório | memória de cálculo e total coincidem entre canal, pedido, pagamento, fiscal e exportação; venda fechada não é recalculada retroativamente |
| `ERP-PAY-001` | Autorização/captura, aprovação, recusa, cancelamento, recebível, taxa, liquidação, estorno parcial/total e disputa quando aplicável | eliminatório | ciclo completo, bruto/taxa/líquido, datas e IDs não sensíveis do provedor são demonstrados e conciliados em ambiente seguro |
| `ERP-PAY-002` | Não armazenar dados de cartão; integrar com adquirente aprovada | eliminatório | nenhum dado sensível de cartão aparece em banco, logs ou exportação |
| `ERP-ORD-004` | Motivos estruturados para cancelamento, cortesia, erro, refação e descarte | obrigatório | exceções podem ser analisadas sem depender de texto livre |

### Produção e entrega

| ID | Requisito | Prioridade | Aceite resumido |
|---|---|---|---|
| `ERP-KDS-001` | KDS ou impressão com roteamento por estação, itens, quantidades, modificadores, remoções, bebidas e identificação do pedido | eliminatório | parrilla e montagem recebem informação legível, completa e na ordem útil à estação |
| `ERP-KDS-002` | Estados criado, pago, recebido/iniciado/concluído por estação, pronto, entregue e cancelado | eliminatório | cada mudança possui timestamp, origem, usuário/estação e auditoria |
| `ERP-KDS-003` | Fila, prioridade controlada e medição de tempo por etapa | obrigatório | tempo de preparo é calculável por pedido |
| `ERP-KDS-004` | Conferência e entrega pelo identificador do pedido | obrigatório | pedido entregue errado pode ser rastreado como incidente |

### Fiscal, financeiro e gestão

| ID | Requisito | Prioridade | Aceite resumido |
|---|---|---|---|
| `ERP-FIN-001` | Configuração fiscal parametrizada/versionada por vigência, vínculo pedido–pagamento–documento, emissão, estados, cancelamento, eventos, contingência e exportação | eliminatório | fluxo, documentos/IDs e proteção de credenciais validados por Finanças/contabilidade e profissionais aplicáveis antes da produção |
| `ERP-FIN-002` | Caixa por operador/terminal/método, sangria, suprimento, data operacional, fechamento, reabertura autorizada e conciliação | eliminatório | fechamento explica vendas, cancelamentos, estornos, taxas e diferenças com motivo/aprovação |
| `ERP-FIN-003` | Contas a pagar/receber, recebíveis, taxas, contas financeiras, centro de custo e plano de contas versionado, com fronteira gerencial/contábil declarada | obrigatório | títulos preservam emissão, competência, vencimento, liquidação e estorno; exportação é homologada pela contabilidade |
| `ERP-FIN-004` | Relatórios de caixa/competência claramente rotulados e memória de cálculo por período, canal, produto, status e método | obrigatório | receita, CMV teórico/real, perdas, taxas e margem possuem dicionário e ponte reproduzível até pedidos/pagamentos exportados |

### Pessoas, segurança e LGPD

| ID | Requisito | Prioridade | Aceite resumido |
|---|---|---|---|
| `ERP-SEC-001` | Usuários, papéis, menor privilégio e MFA para perfis críticos | eliminatório | operador não altera preço, fiscal ou permissões sem autoridade |
| `ERP-SEC-002` | Auditoria append-only de catálogo, preço, estoque, pedido, pagamento, parâmetros financeiros/fiscais e acesso administrativo | eliminatório | valor anterior/novo, usuário, horário, motivo, aprovação e correlação são recuperáveis sem edição retroativa |
| `ERP-SEC-003` | Segredos protegidos, HTTPS, proteção contra abuso e ambientes separados | eliminatório | teste e produção não compartilham credenciais ou dados reais indevidamente |
| `ERP-LGPD-001` | Cliente opcional no balcão e consentimento de marketing separado | eliminatório | pedido pode ser concluído sem coleta excessiva |
| `ERP-LGPD-002` | Finalidade, minimização, retenção, acesso e anonimização/exclusão aplicável | eliminatório | inventário de dados e procedimento são entregues |
| `ERP-LGPD-003` | Analytics e mídia sem telefone, nome, endereço, cartão ou observação livre | eliminatório | payloads inspecionados não contêm PII proibida |

## 4. Integração e dados

| ID | Requisito | Prioridade | Aceite resumido |
|---|---|---|---|
| `ERP-API-001` | API versionada e documentada em OpenAPI ou equivalente aprovado | eliminatório | catálogo, pedidos, pagamentos, produção e estoque possuem contrato testável |
| `ERP-API-002` | Webhooks assinados, versionados e idempotentes | eliminatório | repetição/replay inválido não duplica nem corrompe estado |
| `ERP-API-003` | Consulta incremental por `updated_at` e paginação como contingência | eliminatório | sincronização se recupera de webhook perdido |
| `ERP-API-004` | Exportação integral, aberta, documentada e testável, sem aprisionamento de dados, documentos ou IDs | eliminatório | schema, anexos/documentos, histórico e IDs podem ser portados; prazo, frequência, custo e assistência de saída são declarados |
| `ERP-DAT-001` | IDs de pedido interno/externo, `idempotency_key`, canal, timestamps, itens, modificadores, preços, custos, pagamento e versão | eliminatório | dicionário cobre todos os campos críticos definidos no mapa técnico |
| `ERP-DAT-002` | Eventos `product_view`, `add_to_cart`, `checkout_start`, `payment_approved`, `order_in_production`, `order_ready` e `order_delivered` | eliminatório | funil pode ser ligado sem PII da visita ao pedido pago/entregue |
| `ERP-DAT-003` | Logs correlacionáveis, alertas e fila de reprocessamento sem PII/segredos | obrigatório | falha simulada é detectada, investigada e recuperada |
| `ERP-DAT-004` | Reconciliação pedido × pagamento × fiscal × caixa × adquirente/liquidação por quantidade, bruto, taxa, líquido, status, método, canal e datas | eliminatório | matriz de fontes/chaves e corte operacional; divergências entram em fila com causa, evidência, responsável, resolução e reabertura, sem ajuste automático oculto |

## 5. Integração de `/cardapio`

A estratégia baseline aprovada é redirecionamento HTTPS para a aplicação oficial do ERP.

Requisitos para a Datwork:

- fornecer URL HTTPS estável por ambiente e domínio/identidade visual acordados;
- aceitar origem/canal `web` e parâmetros de campanha estritamente permitidos;
- iniciar sua própria sessão segura sem token secreto ou PII na URL;
- funcionar com bloqueio de cookies de terceiros, pois não dependerá de iframe;
- permitir retorno seguro ao site e páginas de sucesso/erro coerentes;
- fornecer sinal verificável de indisponibilidade para acionar fallback;
- não exigir duplicação de catálogo, carrinho ou checkout no site institucional;
- documentar cache, sessão, expiração, recuperação de carrinho e compatibilidade mobile;
- expor os eventos necessários para conciliar `menu_open` com pedido pago sem enviar PII.

O lado Carro Chefe deverá registrar `menu_open`, preservar somente parâmetros autorizados e redirecionar para URL configurável. A implementação será feita quando a URL de sandbox existir; nenhuma URL fictícia será incluída agora.

## 6. Continuidade, operação e qualidade

| ID | Requisito | Prioridade | Aceite resumido |
|---|---|---|---|
| `ERP-OPS-001` | Pedido manual numerado, custódia do bloco, digitação/reconciliação e transição controlada após indisponibilidade | eliminatório | simulações separadas de internet, ERP/totem e pagamento não perdem nem duplicam pedido e preservam canal/horário/método |
| `ERP-OPS-002` | Tabela de preços offline e contingência de pagamento aprovada | obrigatório | equipe mantém operação reduzida sem anotar cartão |
| `ERP-OPS-003` | Backup, restauração testada e RPO/RTO propostos para aprovação | eliminatório | restauração é demonstrada e seu resultado registrado |
| `ERP-OPS-004` | Monitoramento, alertas, procedimento de incidente, fronteira dos checklists/POPs e suporte | eliminatório | responsáveis, canais, escalonamento e vínculos auditáveis a pedido/estoque são conhecidos |
| `ERP-OPS-005` | Matriz funcional de hardware para balcão, totem, KDS/impressão, rede/energia e pagamento | eliminatório | compatibilidade, alimentação, conectividade, fallback, manutenção, limpeza e responsável são validados antes de qualquer compra |
| `ERP-OPS-006` | Acessibilidade de web/totem, atendimento assistido e operação responsiva | eliminatório | jornada digital e rota assistida são testadas; acessibilidade física e álcool permanecem gates profissionais/legais antes da ativação |

## 7. Provas de aceite obrigatórias

### Cenário A — Chefão ponta a ponta

1. abrir catálogo web e selecionar `PROD-CHF-001`;
2. executar matriz-limite: um e três espetos recusados; dois aceitos; repetição permitida e proibida conforme configuração posteriormente aprovada;
3. testar zero e dois adicionais gratuitos, tentativa de terceiro, ao menos um adicional pago separado e uma remoção sem desconto;
4. validar preço e disponibilidade no servidor;
5. aprovar pagamento em sandbox;
6. receber comanda correta e eventos por estação no KDS/parrilla/montagem;
7. baixar ingredientes, modificadores e consumíveis;
8. marcar em produção, pronto e entregue;
9. emitir/exportar registros fiscal-financeiros apropriados;
10. reconciliar pedido, pagamento, estoque, produção e eventos pelos IDs.

### Cenário B — Canais

Executar pedidos equivalentes em balcão, totem e web. Demonstrar canal preservado, catálogo coerente, fila única, permissões e relatórios.

### Cenário C — Exceções

Demonstrar recusa, duplo clique, webhook repetido, ruptura durante o carrinho, bloqueio/quarentena de lote, cancelamento, estorno parcial/total quando aplicável, refação, falhas separadas de internet/ERP/totem/pagamento e retorno pelo runbook com conciliação.

### Cenário D — Dados e segurança

Exportar um período de teste, reconciliar pedido–pagamento–fiscal–caixa–liquidação, inspecionar ausência de PII indevida, validar papéis/auditoria, fechamento/reabertura autorizada, memória de preço/CMV/margem, portabilidade e backup/restauração.

### Cenário E — `/cardapio`

Validar redirect em celular e desktop, sessão/expiração, acessibilidade, UTMs autorizadas, `menu_open`, pedido pago e fallback em indisponibilidade.

## 8. Entregáveis técnicos esperados

- código-fonte e instruções de compilação/deploy conforme regime contratual a aprovar;
- matriz de titularidade/licença por componente, direitos sobre o código sob encomenda, inventário de terceiros, acesso ao repositório/histórico, infraestrutura como código e assistência de saída, sujeitos a validação jurídica;
- diagramas de arquitetura, infraestrutura e fluxo de dados;
- modelo de dados e dicionário versionado;
- OpenAPI, exemplos de payload e coleção de testes;
- catálogo de eventos e schemas de webhook;
- matriz de permissões, inventário de dados e política de retenção;
- plano e relatório de testes funcionais, segurança, carga e acessibilidade;
- cadernos de aceite operacional e financeiro com massa fictícia controlada, resultados esperados/apurados, exportações e logs;
- migrações, dados de demonstração sem PII e procedimento de reversão;
- runbooks de operação, incidente, backup, restauração e contingência;
- ambientes separados de homologação e produção;
- treinamento por papel com avaliação prática de competência e recuperação de exceções, além da documentação de operação/administração;
- plano de suporte, manutenção, atualização e portabilidade integral de código, dados, documentos, IDs e credenciais sob controle do Carro Chefe;
- planilha de TCO no horizonte e cenários de volume que a Gestão definirá, com premissas, exclusões, reajustes e custos de saída.

## 9. Responsabilidades para validação

| Frente | Responsável por validar |
|---|---|
| escopo, prioridade, orçamento e aceite final | Gestão/proprietário |
| preço, pagamento, fiscal, financeiro e conciliação | Finanças & ERP + profissionais aplicáveis |
| ficha, estoque, produção, KDS e contingência | Operações + Finanças & ERP |
| `/cardapio`, API, eventos, segurança técnica, dados e observabilidade | Development & Data |
| identidade, fotos e experiência visual | Marca & Experiência |
| arquitetura, implementação, testes e documentação acordados | Datwork, após contratação/autorização |

## 10. Decisões e insumos ainda pendentes

- regra de repetição dos dois espetos e limites/gramaturas dos adicionais do Chefão;
- fichas técnicas, rendimentos, custos, preços, margens, alérgenos e embalagens;
- adquirente e métodos de pagamento;
- enquadramento/configuração fiscal e integração contábil;
- marcas, volumes e controle de bebidas;
- hardware de totem, KDS/impressão, rede e contingência;
- hospedagem, domínios, SLA, RPO/RTO e suporte;
- política final de clientes, recorrência, consentimento e retenção;
- cronograma, orçamento, propriedade/licença do código e condições de portabilidade;
- aprovação interna deste briefing antes de qualquer envio externo.

Essas pendências devem virar itens de decisão rastreáveis. Não impedem a Datwork de analisar o modelo e apontar dependências, mas impedem considerar o ERP pronto para produção.

## 11. Consolidação das revisões formais

Em 2026-08-13, `AG-FINANCAS` e `AG-OPERACOES` emitiram parecer **aprovado com ressalvas para planejamento**. As ressalvas críticas e altas foram incorporadas aos requisitos e provas acima sem transformar pendências em dados aprovados.

Pareceres integrais:

- `docs/revisoes/ERP_DATWORK_PARECER_FINANCAS.md`;
- `docs/revisoes/ERP_DATWORK_PARECER_OPERACOES.md`.

Não houve divergência entre as revisões. Permanecem dependentes de decisão/validação: método de custeio, fronteira contábil, adquirente, fiscal, critérios/horizonte de TCO, licenciamento, Chefão, fichas, capacidade, hardware, regras sanitárias, acessibilidade física, álcool, SLA e RPO/RTO. A Datwork deve tratá-las como dependências explícitas, nunca preenchê-las por presunção.

## 12. Critério de conclusão

O baseline interno foi aprovado pelo proprietário e consolidado após revisão formal de Finanças & ERP e Operações. Ele está apto a orientar planejamento e resposta técnica/comercial, mas ainda não é especificação contratual definitiva, autorização de desenvolvimento ou homologação.

O envio externo será realizado exclusivamente pelo proprietário, conforme decisão registrada na Central Operacional em 2026-08-13. Nenhum agente está autorizado a encaminhar o documento à Datwork.

A entrega do software não equivale à homologação. A homologação ocorrerá apenas depois da execução e aprovação das provas da seção 7, com evidências registradas na Central Operacional.
