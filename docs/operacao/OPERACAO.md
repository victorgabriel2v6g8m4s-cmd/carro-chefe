# Operação e qualidade

## Unidade inicial — endereço operacional

Endereço informado e aprovado pelo proprietário em 17/09/2026:

**Rua Vicente Solari, 531 — CEP 79006-440.**

Já existem **fotos do local, medidas registradas, levantamento de infraestrutura e validações presenciais do ponto**. Por decisão do proprietário, esse material não será versionado no repositório neste momento.

Consequências operacionais:

- os dados físicos não devem ser tratados como inexistentes;
- agentes não devem estimar medidas, infraestrutura ou condições presenciais quando o valor exato for necessário;
- quando uma tarefa depender desses dados, o agente deve pedir diretamente ao proprietário somente a informação necessária;
- se não for possível obter a informação naquela execução, registrar uma pendência `INFO-PEND-*` em [`../governanca/RISCOS_DECISOES.md`](../governanca/RISCOS_DECISOES.md);
- fotos, plantas e medições detalhadas só entram no Git mediante nova decisão explícita do proprietário;
- validações legais/profissionais aplicáveis continuam necessárias mesmo existindo levantamento presencial.

O endereço continua sendo a referência para vistorias, logística de abastecimento, análise de fluxo e validações de licenciamento.

## Princípio de preparo visível

Os lanches devem ser **montados na hora, diante do cliente**, como parte da experiência Carro Chefe. A parrilla, o corte/abertura do pão, a aplicação do caldo do vinagrete, a montagem dos ingredientes, o queijo maçaricado do Brasa Dourada e a escolha final de molhos formam um ritual observável.

A operação deve ser desenhada para que esse ritual não comprometa higiene, segurança, ergonomia ou velocidade. O cliente observa e escolhe; ele não deve cruzar a área de manipulação nem tocar utensílios da estação de montagem.

## Papéis no turno

### Parrilheiro

- controla fogo/calor, pontos e sequência dos espetos;
- confirma comanda e modificadores antes de iniciar;
- executa tostagem de cebola e demais etapas de parrilla definidas;
- sinaliza ruptura, perda e atraso no momento em que ocorrem;
- mantém separação e higienização previstas nos POPs validados.

### Atendente

- orienta escolha, registra pedido assistido e recebe quando aplicável;
- acompanha a montagem visível e conduz a etapa final de escolha de molhos;
- monitora fila, pagamento, nomes/números e retirada;
- resolve exceções pelo procedimento, sem alterar preço informalmente;
- coleta feedback sem atrasar o fluxo.

### Assistente

- repõe pão, ingredientes, molhos, embalagens e bebidas;
- apoia montagem quando o desenho sanitário permitir;
- controla identificação, lote, validade e reposição dos molhos;
- mantém a estação de pimentas de balcão limpa, identificada e abastecida;
- registra estoque, limpeza, temperatura e perdas conforme rotina;
- assume contingência do totem/atendimento conforme treinamento.

## Fluxo padrão do pedido

1. pedido entra no ERP com canal e pagamento;
2. disponibilidade, espeto(s), remoções e modificadores são validados;
3. produção recebe comanda clara e ordenada;
4. espeto(s) entram na parrilla conforme sequência/capacidade;
5. estação prepara pão e ingredientes sem cruzar fluxo de cru;
6. **maionese não é passada como base do pão**; o pão é umedecido com quantidade padronizada de **caldo do vinagrete** imediatamente antes de receber o recheio;
7. lanche é montado diante do cliente conforme receita e fotografia padrão;
8. no Brasa Dourada, o queijo de cobertura é maçaricado no final da montagem quente, antes da etapa de molhos;
9. cliente escolhe os molhos à vontade aprovados para a finalização do lanche;
10. produto é conferido, fechado/acomodado e entregue;
11. molhos de pimenta ficam separados no balcão para aplicação pelo próprio cliente;
12. erro, cortesia, descarte ou refação recebe motivo estruturado.

## Estação de molhos

### Molhos à vontade caseiros aprovados

- supreme;
- cebola agridoce;
- maionese de bacon;
- molho verde;
- chipotle;
- parmesão;
- maionese temperada;
- molho rosé;
- molho de picles agridoce.

### Molho à vontade não caseiro aprovado

- barbecue.

Os molhos à vontade fazem parte da etapa de finalização dos lanches. A quantidade/forma de dispensação precisa ser operacionalmente homologada para evitar contaminação, desperdício excessivo e fila, sem descaracterizar a política comercial de escolha livre aprovada.

### Pimentas de balcão

Os molhos de pimenta fotografados no projeto são uma categoria separada. Eles **não entram na estação de molhos à vontade da montagem**. Ficam no balcão, identificados, para o próprio cliente escolher e aplicar no espeto ou lanche depois da entrega.

A operação deve definir antes da abertura:

- quais pimentas estarão ativas;
- identificação de intensidade/alérgenos quando aplicável;
- rotina de limpeza externa dos frascos;
- reposição e descarte;
- local que não gere cruzamento de fila/retirada.

## Controle do caldo do vinagrete no pão

A substituição da maionese-base pelo caldo do vinagrete reduz um componente específico da receita, mas o ganho econômico só deve ser considerado depois de medir o consumo adicional do vinagrete.

O procedimento precisa definir:

- quantidade por baguete de 15 cm e 30 cm;
- utensílio de aplicação;
- como obter o caldo sem comprometer a proporção do vinagrete servido;
- ponto visual de umidade aceitável;
- intervalo máximo entre umedecer e entregar;
- resposta para pão encharcado, rompido ou fora do padrão.

Até essas quantidades serem homologadas, nenhum agente deve inventar volume.

## Segurança do maçarico — Brasa Dourada

O queijo maçaricado é parte aprovada do produto, mas o método definitivo deve ser homologado antes da operação real. A estação deve prever distância segura do cliente, material não inflamável, área livre de embalagens/papel, posicionamento estável do lanche e procedimento de desligamento/armazenamento do maçarico.

Tipo de queijo, gramatura, intensidade de douramento e tempo de aplicação continuam pendentes de ficha técnica. O objetivo é obter **dourado real e repetível**, não queimar pão ou usar chama como efeito visual próximo ao cliente.

## Sequência operacional resumida por item

| Item | Sequência operacional |
|---|---|
| Espeto bovino | comanda → parrilla → cocção/ponto homologado → conferência → venda avulsa ou montagem |
| Espeto de frango | comanda → parrilla → cocção segura homologada → conferência → venda avulsa ou montagem |
| Medalhão de frango | comanda → parrilla → cocção segura → conferência de estrutura → destino da comanda |
| Linguiça | comanda → parrilla → cocção homologada → conferência → destino da comanda |
| Queijo coalho | comanda → parrilla → dourar preservando estrutura → conferência → entrega/Completo |
| Carro‑Chefe Simples | espeto → pão → caldo do vinagrete → proteína → escolha de molhos → conferência → entrega |
| Brasa Dourada | espeto + cebola na parrilla → pão → caldo do vinagrete → proteína → cheddar/barbecue/cebola/batata → queijo de cobertura → maçarico → escolha de molhos → conferência → entrega |
| Chefão | 2 espetos → pão 30 cm → caldo do vinagrete → proteínas → cheddar/tomate/cebola/batata → escolha de molhos → conferência → entrega; sem alface |
| Espeto Completo | espeto → porções quentes/frias → queijo coalho → montagem → conferência → entrega; pimenta no balcão |

A descrição detalhada e os ingredientes canônicos ficam em [`../negocio/PRODUTO_CARDAPIO.md`](../negocio/PRODUTO_CARDAPIO.md).

## Checklists essenciais

### Abertura

- equipe e funções confirmadas;
- infraestrutura, gás/energia, água, iluminação, exaustão e internet verificadas;
- superfícies/equipamentos liberados;
- temperaturas e validade registradas conforme plano sanitário;
- mise en place por previsão e lote;
- caldo do vinagrete disponível dentro do padrão e separado pelo procedimento aprovado;
- molhos caseiros identificados, dentro da validade e nos recipientes corretos;
- barbecue e pimentas de balcão conferidos;
- maçarico/estação do Brasa Dourada liberados pelo checklist de segurança;
- estoque crítico, troco/terminal e contingência prontos;
- canais e itens disponíveis conferidos no ERP;
- teste de pedido e impressão/KDS concluído.

### Durante o serviço

- fila, capacidade e tempo monitorados;
- reposição por lote, sem completar recipiente antigo indevidamente;
- molhos mantidos identificados e dentro do procedimento sanitário;
- estação de pimenta limpa e sem frasco vazio/vazando;
- indisponibilidade atualizada em todos os canais;
- perdas e incidentes registrados no momento;
- estação e utensílios mantidos no padrão definido;
- venda de álcool segue validação legal e de idade aplicável.

### Fechamento

- pedidos, pagamentos e caixa conciliados;
- contagem de itens críticos e perdas concluída;
- consumo/perda de molhos e vinagrete registrado conforme rotina;
- sobras classificadas conforme plano aprovado;
- limpeza e desligamento do maçarico/estação registrados;
- limpeza da estação de molhos e pimentas concluída;
- compras/rupturas abertas como tarefa;
- incidentes, manutenção e feedback entregues à Gestão;
- equipamentos, acessos e local protegidos.

## Capacidade e ensaio

O gargalo provável deve ser medido, não presumido. O ensaio usa pedidos mistos com horários registrados e aumenta o volume por ondas até encontrar:

- capacidade de espetos simultâneos;
- tempo de ciclo da parrilla;
- capacidade de montagem e conferência;
- impacto da tostagem de cebola e do maçarico no Brasa Dourada;
- tempo adicional da escolha de molhos;
- consumo médio de molho e necessidade de reposição durante pico;
- espera de pagamento/totem;
- ponto em que fila física bloqueia circulação;
- perda de qualidade por espera.

O limite operacional do canal deve ficar abaixo do ponto de saturação observado. Marketing só amplia demanda após validação pela Operação.

## Planos de contingência

| Falha | Resposta preparada |
|---|---|
| internet | conexão reserva, cardápio/preços offline e comandas numeradas |
| ERP/totem | atendimento assistido e conciliação posterior controlada |
| pagamento | método alternativo aprovado, sem anotar dados de cartão |
| ruptura | indisponibilizar simultaneamente, sugerir substituição aprovada |
| molho caseiro indisponível | retirar aquele sabor da oferta; não substituir receita sem aprovação |
| maçarico indisponível/inseguro | Brasa Dourada deve seguir contingência previamente homologada ou ser temporariamente indisponibilizado; não improvisar chama |
| chuva/vento/calor | limites de segurança da tenda e encerramento definidos |
| equipamento crítico | manutenção, fornecedor alternativo e menu reduzido |
| ausência de pessoa | matriz de substituição e menu/capacidade reduzidos |
| incidente alimentar | interromper item/lote, preservar registros e acionar protocolo profissional |

## Documentos a validar com especialistas

Manual de boas práticas, POPs, registros de temperatura/limpeza, controle de pragas, água, resíduos, manutenção, treinamento, alérgenos e rastreabilidade. A lista exata deve seguir enquadramento e órgãos locais.