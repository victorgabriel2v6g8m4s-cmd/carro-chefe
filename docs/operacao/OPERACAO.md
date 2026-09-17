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

## Papéis no turno

### Parrilheiro

- controla fogo/calor, pontos e sequência dos espetos;
- confirma comanda e modificadores antes de iniciar;
- monta o lanche ou coordena montagem conforme layout final;
- sinaliza ruptura, perda e atraso no momento em que ocorrem;
- mantém separação e higienização previstas nos POPs validados.

### Atendente

- orienta escolha, registra pedido assistido e recebe quando aplicável;
- monitora fila, pagamento, nomes/números e retirada;
- resolve exceções pelo procedimento, sem alterar preço informalmente;
- coleta feedback sem atrasar o fluxo.

### Assistente

- repõe embalagens/bebidas, organiza comandas e confere entrega;
- apoia montagem quando o desenho sanitário permitir;
- registra estoque, limpeza, temperatura e perdas conforme rotina;
- assume contingência do totem/atendimento conforme treinamento.

## Fluxo padrão do pedido

1. pedido entra no ERP com canal e pagamento;
2. disponibilidade e modificadores são validados;
3. produção recebe comanda clara e ordenada;
4. espeto vai à parrilla conforme sequência/capacidade;
5. pão, molhos e vegetais são preparados sem cruzar fluxo de cru;
6. montagem segue fotografia e gramatura padrão;
7. conferência compara produto, adicionais, remoções e bebida;
8. pedido é marcado pronto e chamado;
9. entrega confirma identificador e registra conclusão;
10. erro, cortesia, descarte ou refação recebe motivo estruturado.

## Checklists essenciais

### Abertura

- equipe e funções confirmadas;
- infraestrutura, gás/energia, água, iluminação, exaustão e internet verificadas;
- superfícies/equipamentos liberados;
- temperaturas e validade registradas conforme plano sanitário;
- mise en place por previsão e lote;
- estoque crítico, troco/terminal e contingência prontos;
- canais e itens disponíveis conferidos no ERP;
- teste de pedido e impressão/KDS concluído.

### Durante o serviço

- fila, capacidade e tempo monitorados;
- reposição por lote, sem completar recipiente antigo indevidamente;
- indisponibilidade atualizada em todos os canais;
- perdas e incidentes registrados no momento;
- estação e utensílios mantidos no padrão definido;
- venda de álcool segue validação legal e de idade aplicável.

### Fechamento

- pedidos, pagamentos e caixa conciliados;
- contagem de itens críticos e perdas concluída;
- sobras classificadas conforme plano aprovado;
- limpeza e desligamento registrados;
- compras/rupturas abertas como tarefa;
- incidentes, manutenção e feedback entregues à Gestão;
- equipamentos, acessos e local protegidos.

## Capacidade e ensaio

O gargalo provável deve ser medido, não presumido. O ensaio usa pedidos mistos com horários registrados e aumenta o volume por ondas até encontrar:

- capacidade de espetos simultâneos;
- tempo de ciclo da parrilla;
- capacidade de montagem e conferência;
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
| chuva/vento/calor | limites de segurança da tenda e encerramento definidos |
| equipamento crítico | manutenção, fornecedor alternativo e menu reduzido |
| ausência de pessoa | matriz de substituição e menu/capacidade reduzidos |
| incidente alimentar | interromper item/lote, preservar registros e acionar protocolo profissional |

## Documentos a validar com especialistas

Manual de boas práticas, POPs, registros de temperatura/limpeza, controle de pragas, água, resíduos, manutenção, treinamento, alérgenos e rastreabilidade. A lista exata deve seguir enquadramento e órgãos locais.
