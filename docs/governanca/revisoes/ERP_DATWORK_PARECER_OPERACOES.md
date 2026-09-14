# Parecer de Operações — briefing Datwork ERP sob encomenda

**Tarefa consultada:** `TASK-DEV-002` (responsável: AG-DEV)

**Revisor:** AG-OPERACOES

**Data:** 2026-08-13
**Escopo:** revisão documental para planejamento interno; não constitui homologação sanitária, fiscal, de álcool, acessibilidade física ou de hardware.

## Resultado

**Aprovado com ressalvas para envio como briefing de planejamento, condicionado às alterações abaixo constarem da versão encaminhada ou de anexo contratual de aceite.**

O briefing já define o ERP como fonte transacional única, preserva o canal (`counter`, `totem`, `web`), exige validação no servidor, KDS/impressão, estoque rastreável, contingência e demonstrações. Não há sistema, sandbox, hardware ou evidência de operação real disponíveis; portanto, este parecer **não aprova produção nem comprova capacidade da Datwork**. A regra já documentada de que qualquer gate `E01`–`E12` sem evidência impede produção permanece aplicável.

## Evidência documental considerada

- [Briefing Datwork ERP](../BRIEFING_DATWORK_ERP.md): requisitos `ERP-MOD-*`, `ERP-STK-*`, `ERP-ORD-*`, `ERP-KDS-*` e `ERP-OPS-*`; cenários de aceite A–E; pendências de hardware, fichas e regras do Chefão.
- [Mapa de requisitos do ERP](../ERP_SOB_ENCOMENDA_REQUISITOS.md): regra canônica do Chefão, contrato de dados, redirect de `/cardapio`, matriz de homologação e gates `E01`–`E12`.
- [Dados, ERP e integrações](../DADOS_ERP.md): teste eliminatório, campos do pedido, eventos, qualidade, backup e continuidade.
- [Produto e cardápio](../PRODUTO_CARDAPIO.md): `PROD-CHF-001`, grupos `MOD-*`, decisões pendentes e ficha técnica mínima.
- [Operação e qualidade](../OPERACAO.md): papéis, fluxo do pedido, abertura, serviço, fechamento, ensaio de capacidade, contingências e documentos sanitários a validar.

## Achados e alterações propostas

| Severidade | Achado operacional | Requisitos afetados | Alteração proposta antes do envio | Condição de aceite/evidência |
|---|---|---|---|---|
| Alta | A regra do Chefão está correta em intenção, mas o Cenário A não exige casos-limite nem comprova a troca da configuração de repetição. A decisão sobre espetos iguais permanece pendente. | `ERP-MOD-001` a `005`, `E01` | Acrescentar matriz de testes de modificadores: 1 e 3 espetos recusados; 2 aceitos; repetição permitida e proibida conforme configuração aprovada; 0, 2 e tentativa de 3 gratuitos; pago separado do gratuito; remoção sem desconto e sem ambiguidade na produção. | Registro de cada resultado no servidor, pedido/KDS e baixa de ingredientes/consumíveis correspondentes. A regra comercial de repetição não deve ser escolhida pelo fornecedor. |
| Alta | A ficha e o estoque cobrem consumo teórico e lote/validade “quando aplicável”, mas não especificam o tratamento operacional de lote impróprio, vencido, em investigação ou retirado da produção. Isso é especialmente relevante para interrupção de item/lote em incidente alimentar. | `ERP-STK-001` a `005`, `ERP-CAT-003`, `ERP-OPS-001`, `E02`, `E03`, `E10` | Exigir estado auditável de bloqueio/quarentena de lote/item, motivo estruturado, responsável, impacto em disponibilidade e rastreio de pedidos atingidos. Definir a política sanitária e de retenção com profissional/órgão local; o ERP apenas deve suportá-la, sem presumir prazo ou temperatura. | Simulação de bloqueio de lote: novas vendas afetadas são impedidas nos canais aplicáveis; movimentos e pedidos relacionados são exportáveis; retorno depende de autorização registrada. |
| Alta | KDS prevê estações, porém estados e aceite tratam a produção principalmente como um único estágio. Parrilla e montagem têm riscos, responsáveis e gargalos distintos; a comanda precisa chegar completa e na ordem útil à estação certa. | `ERP-KDS-001` a `004`, `ERP-DAT-001`, `E05` | Especificar roteamento/visão por estação e eventos auditáveis de recebimento/início/conclusão por estação, ou justificar tecnicamente fluxo equivalente. Exigir apresentação inequívoca de quantidade, espeto, adicionais, remoções, bebida e identificador de retirada; a prioridade deve ser controlada e ter motivo/autoridade. | Ensaio com pedidos mistos em ambas as estações, inclusive remoção e refação, comparando comanda, produto conferido e timestamps exportados. Legibilidade deve ser validada no posto real, não apenas em protótipo. |
| Alta | A contingência registra pedido manual numerado e reconciliação, mas não determina a custódia operacional da numeração, a transição de pedido manual para digital nem os casos de pagamento/ERP/totem indisponíveis em combinações diferentes. | `ERP-ORD-002`, `ERP-PAY-001`, `ERP-OPS-001` a `004`, `E04`, `E10` | Anexar runbook de contingência com responsável por abrir/fechar bloco de comandas, identificação de canal/horário/pagamento, regra de não duplicação, momento e responsável pela digitação/reconciliação, tratamento de divergência e comunicação ao cliente. Métodos alternativos dependem de aprovação financeira. | Simulações separadas de internet, ERP/totem, pagamento e retorno; conciliação fecha sem pedido duplicado/perdido e sem registro de cartão. Backup/restauração continua sujeito a RPO/RTO aprovados. |
| Média | Há uma fila única por canal, mas ainda não há requisito de controlar a entrada diante do gargalo medido do quiosque. Sem isso, catálogo ativo pode superar parrilla, montagem, entrega ou circulação. | `ERP-CAT-003`, `ERP-ORD-001`, `ERP-KDS-003`, `ERP-OPS-005`, `E03`, `E05`, `E11` | Solicitar capacidade configurável por canal/fila, com possibilidade de pausar item/canal ou informar prazo/indisponibilidade conforme regra aprovada. Não fixar limite, tempo ou prioridade no briefing: eles só poderão ser cadastrados depois de ensaio documentado no espaço real. | Ensaio por ondas com pedidos mistos, horários e observação de fila física, pagamento/totem, parrilla, montagem, conferência e qualidade. O limite liberado fica abaixo da saturação observada e é aprovado por Operações. |
| Média | Abertura, mise en place, limpeza, fechamento, temperatura, validade, perda e incidente existem em `OPERACAO.md`, mas o briefing não define claramente se seus registros vivem no ERP ou em sistema externo controlado. Isso pode quebrar a rastreabilidade entre ocorrência e estoque/pedido. | `ERP-STK-002`, `ERP-ORD-004`, `ERP-OPS-004`, `E02`, `E05`, `E10` | Declarar a fronteira: o ERP deve suportar registros operacionais mínimos ou referenciar, por identificador auditável, a ferramenta aprovada de checklist/POPs. Incluir abertura com teste de KDS/impressão e disponibilidade; durante serviço, perdas/rupturas; fechamento com conciliação, contagem crítica e registro de limpeza. | Demonstração de um turno de teste com responsável, timestamp, exceção e vínculo a pedido/movimento quando aplicável. POPs, parâmetros sanitários e liberação do estabelecimento permanecem sujeitos a validação profissional. |
| Média | Hardware aparece como pendência e há exigência de matriz de compatibilidade, mas faltam critérios operacionais para validar o conjunto selecionado no layout real e em falha de periférico. | `ERP-OPS-005`, `ERP-OPS-004`, `E05`, `E10`, `E11` | Exigir matriz por função e não por marca: balcão, totem, KDS/impressão, rede/energia e terminal de pagamento; incluir compatibilidade, alimentação, conectividade, fallback, manutenção, limpeza segura e responsável. A escolha do equipamento só ocorre após levantamento do quiosque e validação elétrica/rede aplicável. | Teste no equipamento candidato: emissão/visualização legível, queda e retorno de rede/energia conforme procedimento, troca para operação assistida e nenhum bloqueio de rota/acessibilidade. |
| Média | Treinamento é um entregável genérico; não há prova de competência por função nem de recuperação de exceções. | `ERP-OPS-001` a `006`, `ERP-SEC-001`, `E05`, `E10`, `E12` | Pedir plano de treinamento e avaliação prática por papel: atendente, parrilheiro, assistente e administrador. Cobrir pedido assistido, modificadores/remoções, KDS, ruptura, perda/refação, contingência, acesso mínimo, abertura e fechamento. | Lista de presença não basta: roteiro executado, resultado, lacunas e autorização para operar registrados. A capacitação em boas práticas e álcool segue profissionais e exigências locais. |
| Média | Acessibilidade digital está prevista, mas a experiência física de totem/balcão e a venda de cervejas não têm gate operacional específico. | `ERP-OPS-006`, `ERP-LGPD-001`, `E11` | Acrescentar validação da rota de atendimento assistido e do equipamento no quiosque real, incluindo circulação e alcance conforme projeto e normas aplicáveis. Para cervejas, condicionar ativação a política legal/idade aprovada; o sistema não deve reter documento ou dado excessivo. | Teste de jornada assistida e de teclado/leitor de tela/contraste; validação física e de álcool por profissional/órgão competente antes da abertura. |

## Riscos e decisões que permanecem abertas

1. **Decisão operacional obrigatória:** permitir ou não repetição dos dois espetos do Chefão. Recomendação: manter o campo configurável e o produto inativo até decisão registrada; impacto direto em `MOD-ESP-2`, ficha, estoque, KDS e prova `E01`.
2. **Insumos de ficha e segurança:** gramaturas, rendimentos, alérgenos, condições de armazenamento, lotes aplicáveis, embalagem e regras de estoque ainda não foram aprovados. Não são valores a serem estimados pela Datwork.
3. **Capacidade e layout:** não há medida do quiosque, capacidade de parrilla, tempos de estação, fluxo de fila nem hardware definido. Nenhuma capacidade, SLA ou limitação de pedidos deve ser codificada como definitiva antes do ensaio.
4. **Conformidade:** fiscal, adquirência, álcool, acessibilidade física e segurança alimentar exigem validação dos responsáveis e profissionais/órgãos locais. A demonstração de software não substitui essas aprovações.

## Condições para envio à Datwork

O briefing pode ser enviado para levantamento e proposta **somente** se:

1. for anexado este parecer ou suas alterações forem incorporadas à matriz de requisitos e às provas A–E;
2. a Datwork for solicitada a devolver aderência requisito a requisito, indicando explicitamente dependências e decisões pendentes, sem alegar atendimento por intenção comercial;
3. o contrato de planejamento exigir protótipos de balcão, totem, KDS/parrilla/montagem, rotas de exceção e runbooks de contingência;
4. a versão enviada preservar as pendências como não aprovadas e condicionar produção a todos os gates `E01`–`E12`, às provas operacionais acima e às validações especializadas aplicáveis;
5. Gestão/proprietário autorizar expressamente a comunicação externa.

## Próximo passo para AG-DEV

Antes de concluir `TASK-DEV-002`, AG-DEV deve refletir estas ressalvas no pacote de homologação: contrato técnico/eventos por estação, matriz de teste de modificadores, simulações de contingência e pedido manual, compatibilidade de hardware, matriz de `/cardapio` acessível e evidências do ensaio no quiosque. A rota pública e qualquer redirect permanecem dependentes de URL HTTPS de sandbox, contrato técnico e prova transacional; nenhum deles existe nesta revisão.
