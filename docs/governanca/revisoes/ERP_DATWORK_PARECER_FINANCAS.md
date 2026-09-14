# Parecer de Finanças & ERP sobre o briefing Datwork

Data da revisão: 2026-08-13  
Tarefa consultada: `TASK-DEV-002`  
Responsável pela tarefa: `AG-DEV`  
Consultor da revisão: `AG-FINANCAS`  
Documento principal: [`docs/BRIEFING_DATWORK_ERP.md`](../BRIEFING_DATWORK_ERP.md)  
Documentos complementares: [`docs/ERP_SOB_ENCOMENDA_REQUISITOS.md`](../ERP_SOB_ENCOMENDA_REQUISITOS.md), [`docs/DADOS_ERP.md`](../DADOS_ERP.md) e [`docs/PRODUTO_CARDAPIO.md`](../PRODUTO_CARDAPIO.md)

## 1. Resultado

**Parecer: APROVADO COM RESSALVAS.**

O briefing está suficientemente estruturado para continuar a revisão interna e solicitar à Datwork uma resposta técnica de planejamento. Ele não está aprovado como especificação contratual definitiva, autorização de desenvolvimento, homologação do fornecedor ou liberação para produção.

Antes do envio externo, o `AG-DEV` deve incorporar ou exigir resposta explícita para os achados críticos e altos deste parecer. Pendências que dependem de dados reais podem permanecer abertas, desde que sejam rotuladas como decisões do Carro Chefe, não sejam presumidas pela fornecedora e impeçam o início da etapa afetada até aprovação.

Nenhum preço, custo, alíquota, obrigação fiscal, fornecedor de pagamento ou valor de contrato foi validado nesta revisão. Decisões fiscais e regulatórias exigem validação da contabilidade e, quando aplicável, de assessoria jurídica.

## 2. Classificação das informações analisadas

### 2.1 Dados confirmados nos documentos

- A Datwork foi informada como futura fornecedora, mas não está contratada nem homologada pelo briefing.
- O ERP será a fonte oficial de produtos, preços, estoque, pedidos, pagamentos, fiscal e financeiro.
- Preços, custos, gramaturas, estoque inicial, margens, alíquotas, adquirente, configuração fiscal, orçamento e cronograma permanecem pendentes de aprovação.
- IDs `PROD-*`, `MOD-*` e `ING-*` devem ser estáveis, não reutilizáveis e preservados nas exportações e no histórico.
- O sistema deve versionar catálogo e receita, não armazenar dados de cartão e demonstrar pagamento, estoque, fiscal, financeiro e conciliação.
- Não há OpenAPI, sandbox, prova transacional ou software entregue; os doze gates do mapa complementar estão especificados, mas nenhum foi demonstrado.
- O redirecionamento HTTPS de `/cardapio` é a estratégia baseline registrada; qualquer embed futuro depende de permissão contratual e homologação técnica.

### 2.2 Cotação

**Não existe cotação comercial analisável.** Não foram informados preço de implantação, recorrência, cobrança por volume, taxas de provedores, hardware, suporte, manutenção, reajuste, migração ou saída. Consequentemente, custo total, retorno, impacto em caixa e comparação econômica permanecem **não calculados**.

### 2.3 Premissas que exigem decisão

- O Modelo A, “núcleo customizado modular + provedores especializados”, é uma recomendação de arquitetura para prova de conceito, não um dado confirmado de solução ou custo.
- A frequência diária de conciliação é uma premissa operacional adequada, mas horário de corte, calendário, tolerâncias, responsáveis e tratamento das diferenças ainda precisam de aprovação.
- O sistema poderá ser apenas um subledger gerencial com exportação contábil ou poderá incluir funções contábeis mais amplas; o limite não está definido.
- Método de custeio de estoque, tratamento de custos acessórios, momento de reconhecimento de receita, composição de receita líquida e política de margem ainda não foram aprovados.
- Métodos de pagamento, fluxo de recebíveis, antecipação, parcelamento, múltiplos meios no mesmo pedido e tratamento de chargeback permanecem decisões abertas.
- O fuso operacional deve ser confirmado como `America/Campo_Grande` antes de configurar fechamento, competência, vencimentos, eventos ou conciliação.

### 2.4 Cenários, não compromissos realizados

- Os modelos A, B e C do mapa complementar são cenários de fornecimento.
- Os cenários A a E do briefing e os gates `E01` a `E12` são provas futuras de aceite.
- Projeções de volume, custo, faturamento, CMV, margem, ponto de equilíbrio e caixa ainda não existem e não podem ser inferidas dos documentos.

## 3. Pontos adequadamente cobertos

- Proibição de fixar no código preços, custos, alíquotas e dados pendentes.
- Preservação de IDs, versões de catálogo/receita e histórico da venda.
- Separação entre adicionais gratuitos e pagos, com reflexo em estoque e custo teórico.
- Ficha técnica contendo quantidades bruta e líquida, rendimento, perda, embalagem e custo vigente.
- Movimentos de estoque auditáveis, inclusive estorno, inventário e perda com motivo.
- Ciclo básico de pagamento e proibição de armazenamento de dados de cartão.
- Caixa, sangria, suprimento, fechamento, contas a pagar/receber, taxas, centros de custo e plano de contas.
- Configuração fiscal sujeita a validação profissional e prova em ambiente apropriado.
- Exportação aberta, API versionada, webhooks idempotentes e reconciliação diária.
- Gates de homologação baseados em evidência, e não em promessa comercial.

## 4. Achados por severidade

### 4.1 Críticos

| Achado | Risco | Requisitos afetados | Alteração proposta |
|---|---|---|---|
| **FIN-C01 — Contrato monetário e de custeio incompleto.** Não estão definidos precisão e arredondamento, moeda, composição de preço bruto/líquido, vigência e aprovação de preços, base do custo da receita, método de custeio do estoque, nem tratamento de atualização retroativa. | Divergência entre tela, pedido, pagamento, fiscal, estoque e relatório; reprocessamento pode reescrever CMV e margem históricos. | `ERP-CAT-001`, `ERP-CAT-004`, `ERP-STK-001`, `ERP-STK-004`, `ERP-ORD-003`, `ERP-DAT-001`, `ERP-FIN-004`, gates `E02` e `E08`. | Exigir um contrato monetário versionado: campos decimais e regra de arredondamento por operação; moeda; preço de tabela, acréscimo, desconto, estorno e valor líquido; `effective_from`/`effective_to`, origem, aprovador e versão; custo-fonte, método de custeio aprovado e snapshot imutável de preço/receita/custo no pedido. Alteração posterior não pode recalcular venda fechada sem evento de ajuste auditado. |
| **FIN-C02 — Conciliação de pagamento e recebíveis não fecha o ciclo econômico.** O texto cobre estados básicos, mas não exige de modo explícito identificadores da adquirente/provedor, captura, liquidação, taxa, valor líquido, datas previstas/realizadas, estorno parcial ou chargeback quando aplicável. | Venda pode constar como paga sem ser conciliável ao crédito bancário; taxas e divergências podem ficar fora do CMV/margem/caixa. | `ERP-PAY-001`, `ERP-PAY-002`, `ERP-FIN-002`, `ERP-FIN-003`, `ERP-FIN-004`, `ERP-DAT-001`, `ERP-DAT-004`, gate `E04`. | Exigir modelo de pagamento e recebível com estados documentados e IDs não sensíveis: pedido, pagamento, provedor, conta comercial, transação, referência/NSU quando aplicável, autorização, método, valor bruto, taxa prevista/real, valor líquido, data de captura, vencimento e liquidação, cancelamento, estorno parcial/total e disputa/chargeback quando suportados. Cada evento deve ser idempotente e reversível por lançamento, sem apagar histórico. |
| **FIN-C03 — Licenciamento, propriedade intelectual e portabilidade permanecem abertos demais.** “Código-fonte conforme regime contratual a aprovar” e “plano de portabilidade” não garantem continuidade operacional. | Aprisionamento ao fornecedor, perda de acesso ao código/dados, custo de saída imprevisível e impossibilidade de manter o ERP após término contratual. | Entregáveis da seção 8; pendência da seção 10; `ERP-API-004`, gates `E07`, `E08`, `E10` e `E12`. | Antes de contratar, exigir matriz de titularidade/licença por componente; direitos sobre código sob encomenda; acesso ao repositório, histórico, migrações, infraestrutura como código e instruções de build/deploy; inventário e licenças de terceiros; exportação integral de dados e documentos com schema; preservação de IDs; frequência, prazo e custo de extração; assistência de saída; entrega/rotação de credenciais sob controle do Carro Chefe; retenção e descarte pós-término. Submeter as cláusulas a validação jurídica. |

### 4.2 Altos

| Achado | Risco | Requisitos afetados | Alteração proposta |
|---|---|---|---|
| **FIN-A01 — CMV e margem são fórmulas conceituais, sem trilha de cálculo.** Não há separação explícita entre CMV teórico, CMV real, variação de estoque, perdas e custo de embalagem/consumíveis; “receita líquida” e “taxas variáveis” não têm dicionário. | Indicadores com nomes iguais e resultados diferentes; decisões de preço e engenharia de cardápio sem base reproduzível. | `ERP-STK-001` a `ERP-STK-004`, `ERP-FIN-003`, `ERP-FIN-004`, `ERP-DAT-001`, gate `E02`. | Definir dicionário aprovado para receita bruta, descontos, cancelamentos/estornos, receita líquida, CMV teórico, CMV real, perdas, variação, taxas variáveis e margem de contribuição. Exigir memória de cálculo por pedido/item/período e relatório de ponte entre consumo teórico e inventário real. Tributos e demais componentes só entram conforme política validada por Finanças/contabilidade. |
| **FIN-A02 — Ficha técnica e estoque não cobrem conversões e transformação operacional.** Faltam regra explícita para unidades de compra/estoque/receita, precisão de conversão, subreceitas ou semielaborados, produção/rendimento real, transferência/local de estoque, reserva, saldo disponível e bloqueio de estoque negativo. | Baixa incorreta, ruptura tardia, custo distorcido e impossibilidade de explicar saldo físico. | `ERP-MOD-005`, `ERP-STK-001` a `ERP-STK-005`, `ERP-CAT-003`, gates `E02` e `E03`. | Exigir conversões versionadas entre unidade de compra, armazenamento e consumo; subreceitas/semielaborados; ordem de produção com entrada do rendimento e consumo dos componentes; locais e transferências; saldo físico, reservado e disponível; política aprovada para negativo; inventário com corte, dupla conferência quando definida e ajuste por motivo/aprovador; devolução de compra e recebimento com divergência. |
| **FIN-A03 — Fiscal está correto como dependência, mas insuficiente como contrato verificável.** Não estão explícitos versionamento da configuração por vigência, vínculo pedido–pagamento–documento, estados de autorização/rejeição/contingência, documentos exportáveis e gestão segura de certificados/credenciais. | Emissão incorreta, quebra de rastreabilidade, retrabalho contábil ou operação sem documento recuperável. | `ERP-FIN-001`, `ERP-FIN-004`, `ERP-DAT-001`, cenários A/C/D, gate `E06`. | Exigir configuração fiscal parametrizada e versionada por vigência, nunca codificada; vínculo por IDs entre pedido, pagamento e documento; estados, chave/referência, protocolo, rejeição, cancelamento, inutilização/correção e contingência somente quando aplicáveis e aprovados; guarda/exportação dos documentos e eventos; segregação de acesso e proteção de certificados. Layouts, regras, prazos e obrigações devem ser aprovados pela contabilidade e assessoria jurídica aplicável antes da homologação. |
| **FIN-A04 — Escopo financeiro e plano de contas não distinguem gestão de contabilidade oficial.** “Plano de contas” e “exportação compatível” não esclarecem se haverá razão contábil, apenas classificação gerencial ou integração com sistema contábil externo. | Expectativa contratual incompatível, duplicação de lançamentos e relatórios de caixa/competência confundidos. | `ERP-FIN-002`, `ERP-FIN-003`, `ERP-FIN-004`, gate `E06`. | Decidir e declarar a fronteira: subledger gerencial exportável ou módulo contábil. No mínimo, exigir plano de contas e centros de custo versionados; contas financeiras; títulos com emissão, competência, vencimento, liquidação e estorno; vínculo de compras/taxas/recebíveis; relatórios claramente rotulados por caixa ou competência; fechamento de período, reabertura autorizada e ajuste sem exclusão. O layout de integração deve ser homologado pela contabilidade. |
| **FIN-A05 — Reconciliação diária não possui matriz de fontes, chaves e exceções.** “Sem divergência inexplicada” é um aceite subjetivo. | Diferenças podem ser ignoradas ou ajustadas sem responsável, evidência e prazo. | `ERP-PAY-001`, `ERP-FIN-002`, `ERP-FIN-004`, `ERP-DAT-004`, cenários A/C/D, gates `E04` e `E06`. | Exigir matriz pedido × pagamento × documento fiscal × caixa × agenda/liquidação do provedor, com chaves, status, quantidade, valor bruto, taxas, líquido e datas. Definir corte operacional, reprocessamento, tolerância somente se aprovada, fila de exceções, responsável, causa, evidência, resolução e reabertura. Divergência não pode ser ocultada por ajuste automático. |
| **FIN-A06 — Custo total de propriedade não tem estrutura de resposta nem horizonte.** O mapa apenas lista categorias gerais e reconhece que o custo não foi calculado. | Propostas incomparáveis e subestimação de recorrência, mudança fiscal, suporte e saída. | Resultado esperado 2.8–2.9; pendências de orçamento/licença; seção 10 do mapa complementar. | Fornecer à Datwork planilha-modelo de TCO com premissas e exclusões: descoberta, desenvolvimento, migração, homologação, treinamento, hardware, implantação; hospedagem, banco, observabilidade, backup, segurança, suporte, manutenção e evolução; licenças/provedores por volume; meios de pagamento e fiscal separados; reajustes, tributos conhecidos, deslocamento, contingência, exportação e transição de saída. Gestão deve definir horizonte e cenários de volume antes da comparação. |
| **FIN-A07 — Critérios financeiros de aceite ainda são resumidos demais.** Não há massa de teste com resultados esperados, fechamento de período ou prova de alteração histórica. | Uma demonstração visual pode passar sem garantir integridade monetária e contábil. | Seção 7 do briefing; `ERP-ORD-003`, `ERP-STK-001/002`, `ERP-PAY-001`, `ERP-FIN-001` a `004`, `ERP-DAT-004`, gates `E02`, `E04`, `E06` e `E08`. | Criar caderno de aceite financeiro com entradas e saídas esperadas aprovadas: mudança de preço/custo por vigência; venda antes/depois da mudança; adicional/removido; perda e estorno; inventário; cancelamento antes/depois do pagamento; estorno parcial/total quando aplicável; duplicidade; recusa; liquidação com taxa; diferença de caixa; rejeição/contingência fiscal em ambiente apropriado; fechamento, reabertura autorizada, exportação e reconciliação. Valores usados devem ser dados fictícios de teste claramente rotulados. |

### 4.3 Médios

| Achado | Risco | Requisitos afetados | Alteração proposta |
|---|---|---|---|
| **FIN-M01 — Governança de preço, desconto, cortesia e promoção está dispersa.** | Alteração comercial sem alçada ou sem rastreio de impacto em margem. | `ERP-CAT-001`, `ERP-ORD-003/004`, `ERP-SEC-001/002`. | Exigir vigência, canal, motivo, aprovador, limite por papel, conflito entre regras, histórico e relatório de preço/abatimento concedido. Cortesia deve manter preço de referência e motivo estruturado. |
| **FIN-M02 — Compras não especificam custo posto nem devoluções.** | Custo de entrada pode omitir frete, desconto, bonificação e encargos conhecidos ou tratá-los de forma inconsistente. | `ERP-STK-004`, `ERP-FIN-003`, `ERP-FIN-004`. | Exigir composição documentada do custo de entrada, rateio configurável e aprovado, devolução, cancelamento, divergência de recebimento e vínculo entre pedido, recebimento, documento e título. Tratamento tributário depende de validação contábil. |
| **FIN-M03 — Datas e cortes não estão normalizados.** | Venda de madrugada, liquidação e documento podem cair em períodos diferentes sem explicação. | `ERP-FIN-002/004`, `ERP-DAT-001/004`, `ERP-OPS-001`. | Registrar timestamp com fuso/origem, data operacional, data de competência, vencimento e liquidação. Confirmar `America/Campo_Grande` e política de virada antes da automação. |
| **FIN-M04 — Auditoria append-only precisa abranger parâmetros financeiros.** | Alteração em taxa, conta, centro de custo, regra de preço ou configuração fiscal sem trilha. | `ERP-SEC-002`, `ERP-FIN-001` a `004`. | Incluir valor anterior/novo, usuário, horário, motivo, aprovação e correlação para mudanças financeiras/fiscais; correções por reversão ou nova versão, sem edição destrutiva. |

## 5. Alterações mínimas propostas ao briefing

As redações abaixo podem ser incorporadas aos requisitos existentes sem renumerar ou substituir IDs já publicados.

1. Em `ERP-STK-001`, acrescentar conversões de unidade, subreceitas, vigência, custo-fonte, método de custeio aprovado, precisão/arredondamento e snapshot histórico.
2. Em `ERP-STK-002`, acrescentar locais, transferências, produção/transformação, reserva/disponível, política de saldo negativo, corte de inventário e reversão auditada.
3. Em `ERP-ORD-003`, exigir contrato monetário comum a todos os canais, com memória de cálculo e preservação do preço de referência mesmo em desconto/cortesia.
4. Em `ERP-PAY-001`, acrescentar captura, recebível, liquidação, taxas, estorno parcial/total e disputa quando aplicáveis, além das chaves de conciliação sem dado de cartão.
5. Em `ERP-FIN-001`, exigir configuração fiscal versionada por vigência, vínculo por IDs e exportação de documentos/eventos, sob homologação contábil e jurídica aplicável.
6. Em `ERP-FIN-002`, definir fechamento por data operacional e reconciliação de caixa por operador/terminal/método, com diferença, motivo e aprovação.
7. Em `ERP-FIN-003`, declarar a fronteira contábil, o regime de relatório, o ciclo dos títulos, o vínculo com compras/recebíveis e o plano de contas versionado.
8. Em `ERP-FIN-004` e `ERP-DAT-004`, incluir reconciliação pedido–pagamento–fiscal–caixa–liquidação, memória de cálculo, exceções e trilha de resolução.
9. Nos entregáveis, substituir a indefinição sobre código/licença por uma matriz contratual obrigatória de propriedade, licenças de terceiros, acesso técnico, portabilidade e assistência de saída.
10. Na seção de aceite, adicionar um caderno financeiro com dados fictícios controlados e resultados esperados para cada cenário crítico.

## 6. Critérios financeiros de aceite recomendados

Para aprovação da entrega, as evidências devem permitir que um revisor independente reproduza os resultados sem consultar o cadastro atual nem depender de planilha paralela oculta.

| Domínio | Evidência mínima |
|---|---|
| Preço e pedido | memória de cálculo por item/modificador; vigência; aprovador; arredondamento; total igual entre canal, pedido persistido, pagamento e exportação |
| Ficha e CMV | versão de receita/custo aplicada na venda; baixa e estorno reproduzíveis; embalagem e modificadores incluídos; ponte entre CMV teórico e real |
| Estoque | saldo inicial + movimentos = saldo final por item/local/lote quando aplicável; inventário e perdas com motivo/aprovador; ruptura coerente nos canais |
| Pagamento | estados e IDs do provedor; bruto, taxa e líquido; agenda e liquidação; cancelamento/estorno/chargeback quando aplicáveis; ausência de dados de cartão |
| Fiscal | pedido ligado ao documento e eventos; autorização/rejeição/cancelamento/contingência demonstrados quando aplicáveis; exportação validada profissionalmente |
| Caixa e financeiro | abertura, suprimento, sangria, vendas, estornos, diferença e fechamento; títulos/recebíveis rastreáveis; relatórios de caixa e competência não confundidos |
| Conciliação | totais por fonte e chave; divergências em fila com causa, responsável e resolução; nenhuma diferença ocultada por tolerância não aprovada |
| Portabilidade | exportação integral testada, schema e anexos/documentos disponíveis, IDs preservados, restauração ou carga de validação demonstrada e custo/prazo contratados |

Não se recomenda aceitar mera captura de tela. A evidência deve incluir exportações, logs de auditoria, registros de teste e resultado esperado/apurado.

## 7. Condições para envio à Datwork

### 7.1 Antes do envio externo

1. Incorporar os achados `FIN-C01` a `FIN-C03` e `FIN-A01` a `FIN-A07`, ou incluí-los como perguntas obrigatórias na matriz de aderência da fornecedora.
2. Manter todos os valores e parâmetros pendentes explicitamente rotulados; não fornecer preço, custo, alíquota, gramatura ou volume fictício como se aprovado fosse.
3. Definir que a resposta comercial deve separar implantação, recorrência, uso/volume, terceiros, suporte, evolução e saída, com premissas, exclusões, tributos conhecidos e reajustes.
4. Exigir resposta sobre propriedade/licença do código, componentes de terceiros, acesso ao repositório, portabilidade integral e continuidade após término.
5. Exigir que divergências e limitações sejam marcadas como `não atende` ou `depende de decisão`; promessa de desenvolvimento não equivale a evidência de aceite.
6. Obter revisão de `AG-OPERACOES`, `AG-DEV`, `AG-FINANCAS` e Gestão, seguida de autorização explícita do proprietário para o envio.

### 7.2 Antes de contratar ou autorizar desenvolvimento

1. Aprovar escopo financeiro versus contábil, método de custeio, dicionário monetário, matriz de conciliação, critérios de TCO e alçadas.
2. Escolher ou delimitar provedores especializados de pagamento e fiscal sem presumir fornecedor.
3. Submeter cláusulas de propriedade intelectual, licenciamento, proteção de dados, responsabilidade, SLA, continuidade e saída à validação jurídica.
4. Submeter enquadramento, cadastros, layouts, regras e obrigações fiscais/contábeis à contabilidade responsável.
5. Vincular desembolsos e marcos contratuais a entregáveis e aceites objetivos aprovados pela Gestão; nenhum valor ou condição é recomendado por este parecer.

### 7.3 Antes de homologar produção

1. Executar os gates `E01` a `E12` e o caderno de aceite financeiro com evidências.
2. Cadastrar somente fichas, custos, preços, alíquotas, contas e saldos aprovados.
3. Homologar adquirente, fiscal, conciliação, fechamento, exportação contábil, backup/restauração e portabilidade.
4. Confirmar o fuso operacional e os cortes de caixa, estoque, fiscal e financeiro.
5. Obter aprovação formal de Finanças, contabilidade, jurídico aplicável, Operações, Development & Data, Gestão e proprietário nas respectivas frentes.

## 8. Conclusão e orientação ao `AG-DEV`

O briefing apresenta uma base consistente e prudente para planejamento, especialmente por preservar IDs, exigir versionamento, impedir armazenamento de cartão e condicionar a homologação a provas. A principal fragilidade é que o núcleo financeiro ainda está descrito como lista de funções, não como contrato de dados e fechamento capaz de produzir preço, CMV, margem, caixa e conciliação reproduzíveis.

O `AG-DEV` deve incorporar prioritariamente: contrato monetário/custeio; ciclo completo de recebíveis; reconciliação entre pedido, pagamento, fiscal, caixa e liquidação; fronteira do módulo financeiro-contábil; caderno de aceite com resultado esperado; estrutura obrigatória de TCO; e cláusulas verificáveis de licenciamento e portabilidade.

Com essas ressalvas incorporadas, o material pode ser enviado para resposta técnica e comercial da Datwork. Isso continuará sem significar contratação, homologação do fornecedor ou autorização de desenvolvimento.
