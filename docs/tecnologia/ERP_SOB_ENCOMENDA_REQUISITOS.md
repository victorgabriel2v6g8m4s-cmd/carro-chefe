# ERP sob encomenda — mapa de requisitos e homologação de `/cardapio`

Status em 2026-08-13: **solução sob encomenda informada pelo proprietário, em planejamento e ainda não homologada**. O redirecionamento HTTPS de `/cardapio` foi aprovado como estratégia baseline. A futura fornecedora informada é a Datwork; isso não comprova contratação, capacidade técnica ou entrega.

Este documento converte os requisitos já aprovados do Carro Chefe em um contrato funcional e técnico verificável para o ERP sob encomenda. Ele não comprova que o sistema existe ou atende aos requisitos; a comprovação depende de especificação técnica, ambiente de teste e prova de conceito transacional.

## 1. Limites e fontes oficiais

- O ERP é a fonte oficial de catálogo comercial, preços, disponibilidade, estoque, pedidos, pagamentos, fiscal e financeiro.
- O site público apresenta a marca e encaminha o cliente ao ERP; não mantém catálogo manual, checkout paralelo nem dados de cartão.
- A Central Operacional mantém tarefas, decisões, riscos, evidências e coordenação; não substitui o ERP.
- IDs de produto, modificador e ingrediente devem ser estáveis e não reutilizáveis.
- Preços, custos, gramaturas, regras fiscais, horários e políticas ainda não aprovados permanecem pendentes; o ERP deve permiti-los sem presumir valores.

Fontes usadas: `AGENTS.md`, `docs/DADOS_ERP.md`, `docs/ARQUITETURA.md`, `docs/PRODUTO_CARDAPIO.md`, `docs/OPERACAO.md`, `site/AGENTS.md` e a tarefa `TASK-DEV-002` na Central.

## 2. Mapa funcional obrigatório

| Domínio | Funções mínimas | Evidência de aceite |
|---|---|---|
| Catálogo e canais | produtos, categorias, fotos, descrições, preços aprovados, disponibilidade por canal/horário, versão de catálogo e publicação coordenada para balcão, totem e web | mesma versão e disponibilidade nos três canais, sem cadastro paralelo no site |
| Produtos e modificadores | `PROD-*` e `MOD-*` estáveis; grupos com mínimo/máximo; repetição configurável; gratuitos e pagos separados; remoções sem desconto; ordem de exibição/produção | pedido do Chefão respeita dois espetos, até dois adicionais gratuitos, adicionais pagos e remoções |
| Fichas técnicas | ingredientes `ING-*`, unidade, quantidades bruta/líquida, rendimento, fator de correção, perdas, embalagem, custo vigente e versão da receita | venda baixa ingrediente e consumível corretos, preservando a versão usada na venda |
| Estoque e compras | entradas, saídas, inventário, perdas com motivo, lotes/validade quando aplicável, ruptura, estoque mínimo, fornecedor e compras | baixa e estorno rastreáveis; ruptura atualiza simultaneamente os canais |
| Carrinho e pedido | sessão/carrinho, validação no servidor, canal, itens, quantidades, modificadores, remoções, descontos aprovados, observação controlada, identificadores e totais | soma dos itens consistente com total; pedido idempotente e sem duplicação |
| Canais | `counter`, `totem`, `web` e futuro `delivery`, todos em uma única comanda e com origem preservada | pedidos equivalentes entram na mesma fila com canal identificável |
| Pagamentos | iniciação com adquirente, múltiplos métodos aprovados, aprovação, recusa, cancelamento, estorno, cortesia estruturada e conciliação, sem armazenar cartão | estados auditáveis e totais conciliados com adquirente/caixa |
| Produção | KDS ou impressão, estações, fila, prioridade, modificadores/remoções legíveis, início, pronto, entrega, refação, descarte e motivo de exceção | sequência completa do pedido com timestamps e comanda clara para parrilla/montagem |
| Fiscal | configuração fiscal por produto, emissão, cancelamento, contingência e exportação contábil conforme validação profissional | documento e cancelamento demonstrados em ambiente apropriado, sem inventar regra tributária |
| Financeiro | caixa, sangria/suprimento, contas a pagar/receber, taxas, centros de custo, plano de contas e fechamento diário | relatório de vendas líquidas e conciliação por método/status/canal |
| Cliente e LGPD | cliente opcional no balcão, identificador pseudonimizado para recorrência, consentimento de marketing separado, finalidade, retenção, acesso e exclusão/anominização aplicável | pedido funciona sem cadastro indevido; nenhuma PII é enviada a analytics/mídia |
| Analytics | eventos mínimos, UTMs permitidas, custos/receitas conciliáveis e exportação para indicadores | funil da abertura do cardápio ao pedido entregue ligado por IDs sem PII |
| Administração | usuários, papéis, menor privilégio, MFA para perfis críticos, auditoria append-only de alterações e segregação de ambientes | matriz de permissões e trilha de quem alterou catálogo, preço, estoque ou pedido |
| Integrações | API versionada, webhooks assinados, idempotência, paginação/filtro incremental, limites, retentativas e exportação aberta | contrato OpenAPI e exemplos; webhook repetido não duplica estado |
| Continuidade | operação offline/manual numerada, tabela de preços offline, contingência de pagamento, reconciliação posterior, backup, restauração e RPO/RTO definidos | simulação de indisponibilidade e retorno sem perda/duplicação de pedidos |
| Observabilidade e suporte | logs estruturados sem segredos/PII, correlação, métricas, alertas, fila de reprocessamento, histórico de deploy e procedimento de incidente | falha simulada é detectada, reprocessada e auditada |

## 3. Regras canônicas do cardápio a suportar

- `PROD-CCS-001` e `PROD-CCC-001`: exatamente um espeto pelo grupo `MOD-ESP-1`.
- `PROD-CHF-001` (Chefão): exatamente dois espetos por `MOD-ESP-2`; a repetição permanece configurável até decisão de Operações.
- Chefão: zero a dois adicionais gratuitos por `MOD-GRATIS-2`; adicionais pagos ficam separados em `MOD-PAGO`.
- Remoções devem chegar à produção por `MOD-REMOVER`, sem desconto automático.
- Ficha técnica, rendimento, gramatura, custo, preço, margem, alérgenos, tempo, embalagem, foto e regra de estoque são obrigatórios antes da venda.
- Cervejas exigem cadastro de volume/teor e fluxo de validação legal/idade aprovado antes da ativação.

## 4. Contrato de dados mínimo

### Pedido

`order_id`, `external_order_id`, `idempotency_key`, `channel`, `status`, timestamps de criação/aprovação/produção/pronto/entrega/cancelamento, itens, modificadores, remoções, quantidades, preço de tabela, desconto, valor líquido, custo teórico vigente, método/status de pagamento, campanha/UTM permitida, motivo estruturado de exceção e versão de catálogo/receita.

### Eventos

`welcome_view`, `menu_open`, `product_view`, `add_to_cart`, `checkout_start`, `payment_approved`, `order_in_production`, `order_ready`, `order_delivered` e `repeat_order`.

Cada evento deve ter `event_id`, `occurred_at`, `source`, chave de ligação documentada, versão do schema e propriedades minimizadas. Telefone, nome, endereço, observação livre e dados de cartão não podem seguir para analytics ou mídia.

### Qualidade e conciliação

- unicidade de IDs e pedidos;
- timestamps essenciais completos e status válidos;
- valores não negativos e total consistente com itens;
- versão histórica de catálogo/receita preservada;
- reconciliação diária de quantidade e valor por status, método e canal;
- atraso de sincronização mensurado e responsável por correção definido.

## 5. Superfície de API requerida

Os nomes abaixo são um contrato de capacidade, não uma implementação fechada. O responsável técnico pode ajustar recursos mantendo semântica, versionamento e critérios.

### API consumida por `/cardapio`

| Método e recurso | Finalidade |
|---|---|
| `POST /api/v1/sessions` | criar sessão anônima e chave de correlação |
| `GET /api/v1/catalog?channel=web` | obter catálogo publicado, versão e disponibilidade |
| `GET /api/v1/products/{product_id}` | obter produto, grupos, limites, alérgenos e disponibilidade |
| `POST /api/v1/carts` | criar carrinho idempotente |
| `PUT /api/v1/carts/{cart_id}/items` | incluir/alterar item com modificadores e remoções |
| `POST /api/v1/carts/{cart_id}/validate` | recalcular e validar preço, limites, estoque e canal no servidor |
| `POST /api/v1/orders` | confirmar pedido a partir do carrinho |
| `GET /api/v1/orders/{order_id}` | consultar estado sem expor dados desnecessários |
| `POST /api/v1/orders/{order_id}/payment-intents` | iniciar pagamento pela integração aprovada |
| `POST /api/v1/events` | receber eventos de jornada permitidos ou encaminhá-los ao coletor adequado |

Se `/cardapio` apenas redirecionar para a aplicação web do ERP, essas capacidades podem ser internas ao ERP, mas o contrato de eventos, IDs e exportação continua obrigatório.

### API operacional e exportação

| Método e recurso | Finalidade |
|---|---|
| `GET /api/v1/orders?updated_since=...` | sincronização incremental e reconciliação |
| `GET /api/v1/payments?updated_since=...` | conciliação sem dados de cartão |
| `GET /api/v1/stock-movements?updated_since=...` | auditar consumo, estorno, entrada e perda |
| `GET /api/v1/production-events?updated_since=...` | medir fila e tempo de preparo |
| `GET /api/v1/catalog/versions/{version}` | reconstruir o catálogo vigente em uma venda |
| `GET /api/v1/exports/daily?date=...` | exportar totais por canal, status e método |
| `GET /api/v1/health` | saúde técnica sem revelar segredos |

### Webhooks emitidos

`catalog.published`, `availability.changed`, `order.created`, `payment.approved`, `payment.refunded`, `order.in_production`, `order.ready`, `order.delivered`, `order.cancelled` e `stock.threshold_reached`.

Todo webhook precisa de assinatura verificável, `event_id`, timestamp, versão, política contra replay, entrega ao menos uma vez e idempotência no consumidor. Consulta incremental é a contingência obrigatória.

## 6. Contrato específico de `/cardapio`

### Estratégia aprovada para homologação

1. Usar **redirecionamento transparente** para URL oficial HTTPS do ERP como baseline seguro. Esta estratégia foi aprovada pelo proprietário em resposta registrada na Central Operacional em 2026-08-13.
2. Considerar embed somente após permissão contratual e comprovação de `Content-Security-Policy`/`frame-ancestors`, cookies compatíveis, autenticação/sessão, pagamento, acessibilidade e comportamento mobile.
3. Preservar UTMs somente nas chaves autorizadas e emitir `menu_open` antes da transição.
4. Exibir estado de carregamento/erro e manter fallback operacional aprovado; WhatsApp pode ser contingência temporária, mas não comprova integração ERP.
5. Não colocar token, segredo ou PII na URL; não depender de cookies de terceiros para concluir o pedido.

### Matriz de homologação

| Cenário | Resultado exigido |
|---|---|
| entrada direta e a partir de `/welcome` | abre a experiência oficial e registra `menu_open` uma vez |
| celular pequeno, tablet e desktop | catálogo, modificadores, carrinho e pagamento utilizáveis sem rolagem horizontal indevida |
| teclado/leitor de tela/contraste | fluxo completo operável e estados anunciados |
| nova sessão, retorno e expiração | carrinho segue política explícita; expiração gera recuperação compreensível |
| bloqueio de cookie/iframe | redirect entra automaticamente ou por ação clara, sem perda indevida de contexto |
| ERP lento/indisponível | timeout, mensagem segura, correlação e contingência aprovados |
| recarga, duplo clique e webhook repetido | pedido/pagamento não duplica |
| sucesso, recusa, cancelamento e estorno | estados coerentes no cliente, ERP, adquirente e exportação |
| ruptura durante o carrinho | revalidação impede venda e oferece retorno seguro ao catálogo |
| analytics | eventos completos, sem PII, conciliáveis com pedidos pagos |

## 7. Situação observada nesta análise

| Critério de `TASK-DEV-002` | Situação | Evidência |
|---|---|---|
| rota `/cardapio` acessível | parcial | servidor local respondeu HTTP 200 e a aplicação possui a rota |
| embed ou redirect para ERP | não atendido | a rota atual é uma página de espera; não há URL/cliente do ERP |
| fallback | parcial | há link temporário para WhatsApp, mas não há fallback de uma integração ERP |
| sessão | não verificado | não há ambiente/contrato do ERP nem fluxo integrado |
| mobile e acessibilidade ponta a ponta | não verificado | inspeção visual automatizada indisponível e ERP ausente |
| analytics | não atendido | não há implementação dos eventos mínimos na rota pública/ERP |
| prova do Chefão e exportação | não atendido | `TASK-ERP-002` está bloqueada e não há demonstração transacional |
| governança de dados | não concluído | `TASK-DAT-001` está bloqueada |

Conclusão: o mapa de requisitos está definido e a estratégia baseline de redirect foi decidida, mas o ERP sob encomenda permanece **em planejamento e pendente de verificação**. Ainda não existem OpenAPI, webhooks, sandbox ou sistema entregue. `TASK-DEV-002` não atende ao critério de pronto enquanto não houver ambiente de teste, contrato técnico e prova de conceito com evidências.

## 8. Pacote de evidências necessário para a homologação

1. responsável técnico e URL HTTPS do ambiente de teste;
2. OpenAPI ou contrato equivalente e schemas de webhooks/eventos;
3. política de autenticação/sessão, CORS, CSP, cookies e proteção contra replay;
4. matriz de papéis, auditoria, retenção, backup, restauração e contingência;
5. demonstração gravada/logada do Chefão em web, totem e balcão;
6. pagamento aprovado, recusado, cancelado e estornado em sandbox;
7. baixa/estorno de ingredientes, KDS e documentos/exportações fiscal-financeiros validados pelos responsáveis;
8. exportação reconciliável e testes de idempotência;
9. execução da matriz de `/cardapio` em celular e desktop;
10. confirmação, no contrato técnico, da URL oficial e do comportamento do redirect aprovado; qualquer embed futuro exigirá nova homologação contratual e técnica.

## 9. Matriz eliminatória para o ERP sob encomenda

A informação “será feito sob encomenda” define a modalidade de fornecimento, mas não demonstra capacidade. Cada linha abaixo é um **gate**: o requisito só passa de “especificado” para “atendido” após a evidência indicada. Promessa, protótipo visual ou documentação sem execução não aprovam o gate.

| Gate | Requisito eliminatório | Fonte rastreada | Evidência mínima | Situação em 2026-08-13 |
|---|---|---|---|---|
| `E01` | Pedido completo do Chefão com regras de modificadores e remoções | `AGENTS.md` §5; `docs/DADOS_ERP.md` | pedido persistido com dois espetos, 0–2 gratuitos, adicionais pagos e remoções na produção | especificado; não verificado |
| `E02` | Ficha técnica versionada e baixa/estorno por ingrediente e embalagem | `AGENTS.md` §§5 e 11; `docs/PRODUTO_CARDAPIO.md` | movimentos reproduzíveis, custo vigente e receita histórica preservada | especificado; não verificado |
| `E03` | Balcão, totem e web na mesma fila, com canal e disponibilidade consistentes | `docs/ARQUITETURA.md`; `docs/OPERACAO.md` | três pedidos equivalentes, origem preservada e ruptura simultânea | especificado; não verificado |
| `E04` | Pagamento aprovado, recusado, cancelado e estornado, com conciliação e sem guardar cartão | `AGENTS.md` §§3 e 11; `docs/DADOS_ERP.md` | transações em sandbox e fechamento por método/status sem divergência inexplicada | especificado; não verificado |
| `E05` | Produção por KDS ou impressão, com comanda legível e timestamps até entrega | `docs/OPERACAO.md`; aceite de `TASK-ERP-002` | fluxo parrilla/montagem, pronto, entrega, refação e descarte demonstrado | especificado; não verificado |
| `E06` | Fiscal, caixa e financeiro exportáveis e validados pelos responsáveis | `AGENTS.md` §§3, 6 e 11; `docs/DADOS_ERP.md` | emissão/cancelamento em ambiente apropriado, fechamento e exportação contábil | especificado; pendente de validação profissional |
| `E07` | API/exportação versionada, incremental e idempotente, com webhooks assinados | `AGENTS.md` §11; `docs/DADOS_ERP.md` | OpenAPI/schemas, repetição sem duplicidade, consulta de contingência e reconciliação | especificado; não verificado |
| `E08` | IDs estáveis e histórico de catálogo, preço, receita e pedido | `AGENTS.md` §§3 e 11; `docs/PRODUTO_CARDAPIO.md` | alteração de cadastro não reescreve venda histórica nem reutiliza ID | especificado; não verificado |
| `E09` | LGPD, menor privilégio, auditoria e segregação de ambientes | `AGENTS.md` §§3 e 11; `docs/DADOS_ERP.md` | matriz de acesso, logs sem PII/segredo, retenção e pedido de balcão sem cadastro obrigatório | especificado; não verificado |
| `E10` | Contingência, backup e restauração testados | `docs/DADOS_ERP.md`; `docs/OPERACAO.md` | pedido manual numerado, reconciliação pós-retorno e teste de restauração com RPO/RTO definidos | especificado; não verificado |
| `E11` | `/cardapio` seguro, responsivo, acessível e com fallback | `AGENTS.md` §3; aceite de `TASK-DEV-002`; `site/AGENTS.md` | redirect ou embed autorizado testado em celular/desktop, teclado, falha e expiração | especificado; integração ausente |
| `E12` | Suporte e observabilidade compatíveis com a operação | `AGENTS.md` §§9 e 12; `docs/DADOS_ERP.md` | responsável/SLA, alertas, correlação, reprocessamento e procedimento de incidente demonstrados | especificado; não verificado |

Regra de decisão: qualquer `E01`–`E12` sem evidência impede homologação para produção. `E06` exige validação fiscal/contábil profissional; especificação de software não a substitui.

## 10. Shortlist revista: modelos de entrega do ERP sob encomenda

Como o proprietário retirou a compra de um ERP comercial do cenário-base, a comparação passa a ser entre arquiteturas de entrega. Custos não foram informados; portanto, custo total permanece **não calculado**, sem valores inventados.

| Modelo | Fluxo do Carro Chefe | Integração | Suporte | Custo total | Classificação |
|---|---|---|---|---|---|
| **A. Núcleo customizado modular + provedores especializados** para adquirência/pagamento e fiscal | permite implementar `E01`–`E05` e preservar o ERP como fonte oficial | contratos versionados isolam cardápio, pagamento, fiscal, KDS e exportação | exige responsável técnico interno e SLA dos provedores críticos | não calculado; deve incluir desenvolvimento, provedores, hardware, suporte, segurança, backup e evolução fiscal | **recomendado para prova de conceito**, condicionado a todos os gates |
| **B. Experiência customizada sobre motor transacional de terceiro** | pode atender o fluxo se o motor suportar modificadores, estoque e produção | reduz construção do núcleo, mas cria dependência de API, exportação e regras do terceiro | compartilhado entre equipe customizada e fornecedor do motor | não calculado; inclui licenças/volume, integração, suporte e saída/migração | **alternativa de contingência**, condicionada a portabilidade e gates |
| **C. Monólito integral próprio, inclusive funções sensíveis de pagamento e fiscal** | tecnicamente possível, mas concentra toda a criticidade em uma entrega | maior superfície de integração e manutenção regulatória | integralmente dependente da equipe contratada | não calculado; tendência qualitativa de maior esforço e risco operacional, a confirmar por propostas | **reprovado nesta triagem** enquanto não houver equipe, certificações, SLA e validação especializada |

Recomendação: adotar o **Modelo A como arquitetura de referência para especificação e prova de conceito**, sem homologá-lo ainda. Pagamento e fiscal devem ser integrados por interfaces bem definidas com serviços apropriados; nenhum dado de cartão deve ser armazenado pelo ERP. O Modelo B deve permanecer como plano de contingência caso prazo, suporte ou custo total do núcleo próprio se tornem inviáveis.

## 11. Escopo de aceite e próximos marcos

1. **Especificação contratual:** aprovar esta matriz, nomear responsável técnico, definir ambientes, SLA, RPO/RTO, fornecedores especializados e critérios de custo total.
2. **Contrato técnico:** entregar OpenAPI, schemas, modelo de dados, matriz de acesso, política de retenção, plano de backup/restauração e runbooks.
3. **Prova eliminatória (`TASK-ERP-002`):** executar o Chefão de ponta a ponta em balcão, totem e web, incluindo os quatro estados de pagamento, KDS, estoque, fiscal e exportação.
4. **Dados e integração:** somente após a prova, concluir `TASK-DAT-001` e homologar `/cardapio` em `TASK-DEV-002`.
5. **Produção:** liberar apenas após todos os gates `E01`–`E12`, testes proporcionais ao risco e aprovações fiscal, contábil, LGPD e operacional aplicáveis.

Resultado desta análise: o mapa cobre as funções requeridas e oferece critérios verificáveis, mas **a aderência do ERP sob encomenda é 0 de 12 gates demonstrados**. Isso não significa que o sistema falhou; significa que ainda não há produto/ambiente e evidências para avaliação operacional.
