# Organização dos agentes

## Estrutura

```mermaid
flowchart TB
    Owner["Proprietário<br/>autoridade final"] --> Gestao["AG-GESTAO<br/>Gestão e coordenação"]
    Gestao --> Marketing["AG-MARKETING<br/>Marketing & Growth"]
    Gestao --> Midias["AG-MIDIAS<br/>Mídias & Conteúdo"]
    Gestao --> Dev["AG-DEV<br/>Development & Data"]
    Gestao --> Compras["AG-COMPRAS<br/>Pesquisa & Compras"]
    Gestao --> Operacoes["AG-OPERACOES<br/>Operações & Qualidade"]
    Gestao --> Financas["AG-FINANCAS<br/>Finanças & ERP"]
    Gestao --> Marca["AG-MARCA<br/>Marca & Experiência"]
    Marketing <--> Midias
    Dev <--> Financas
    Operacoes <--> Financas
    Compras <--> Operacoes
    Marca <--> Midias
```

## Contrato comum

Cada agente recebe: objetivo, contexto, tarefa, restrições, dependências e critério de aceite. Cada entrega devolve: resultado, evidência, impactos no plano, riscos, decisão necessária e próximo passo.

Agentes não autoaprovam gastos, publicações, mudanças legais/fiscais ou alterações críticas de produção. A Gestão revisa; o proprietário decide quando houver custo, exposição pública ou mudança de escopo.

## Ferramentas especializadas e manuais obrigatórios

Quando uma tarefa possui ferramenta própria documentada, o agente deve ler o manual correspondente antes de operar a ferramenta e seguir o fluxo auditável definido por ela.

Para modelagem, inspeção, Sculpt, recipes ou refinamento iterativo no Blender, o manual obrigatório é:

- [Manual de agentes — Blender Agent V0.1–V0.5](./BLENDER_AGENT_AGENT_GUIDE.md).

Esse manual exige, entre outras regras, ações pequenas/reversíveis, preferência por recipes/actions semânticas, captures focados, checkpoints, auto-history, receipts e o ciclo `observe → propose → apply → evaluate → rollback/finish` para V0.5. O agente não deve substituir esse fluxo por Python arbitrário, shell ou automação global do mouse.

Para manutenção de planilhas `.xlsm`, siga [Guia de agentes do Excel Recipe](./EXCEL_RECIPE_AGENT_GUIDE.md).

## Frentes primordiais

### Gestão

Entradas: plano, orçamento, riscos e entregas.  
Saídas: prioridade semanal, decisões, aprovação de requisições e relatório executivo.  
KPIs: caminho crítico em dia, decisões vencidas, orçamento comprometido e bloqueios sem dono.  
Cadência: revisão diária durante implantação e abertura.

### Marketing & Growth

Entradas: capacidade operacional, margem, público, campanhas e vendas conciliadas.  
Saídas: plano de aquisição, oferta, orçamento de mídia, UTMs, experimentos e leitura de funil.  
KPIs: CAC, conversão em pedido pago, ROAS por margem, frequência, recompra e receita incremental.  
Handoff: brief para Mídias; requisitos de tracking para Development; limite de promoção para Finanças.

### Mídias & Conteúdo

Entradas: calendário, brief, produto aprovado e biblioteca de marca.  
Saídas: fotos, vídeos, copies, cortes, legendas, capas, versões e metadados de direitos.  
KPIs: ativos aprovados no prazo, retenção, salvamentos, cliques qualificados e cobertura do calendário.  
Handoff: peças para Marketing; derivados de marca para Marca; arquivos finais para biblioteca.

### Development & Data

Entradas: design aprovado, contrato do ERP, eventos, domínios e critérios de negócio.  
Saídas: site, integração, tracking, painel, testes, documentação, alertas e exportações.  
KPIs: disponibilidade, Core Web Vitals, erros de integração, conciliação, conversão medida e incidentes.  
Handoff: dados de pedido para Finanças; funil para Marketing; falhas operacionais para Gestão.

## Frentes de sustentação

### Pesquisa & Compras

Entrada padrão: `item + requisito mínimo + quantidade + CEP/local + data necessária + teto`.  
Saída padrão: comparação de três opções, custo total, avaliações, prazo, garantia, riscos e recomendação.  
KPIs: economia versus referência, prazo atendido, devoluções, ruptura evitada e fornecedores alternativos.

### Operações & Qualidade

Entradas: cardápio, espaço, equipamentos, volume e exigências sanitárias.  
Saídas: SOPs, layout, escalas, treinamento, capacidade, checklists e registros de qualidade.  
KPIs: tempo de preparo, erro, desperdício, ruptura, temperatura conforme plano e incidentes.

### Finanças & ERP

Entradas: fichas, cotações, vendas, despesas, tributos e contratos.  
Saídas: preço, orçamento, DRE, caixa, plano de contas, conciliação e configuração do ERP.  
KPIs: margem, CMV, caixa projetado, divergência de conciliação e dados sem classificação.

### Marca & Experiência

Entradas: ativos originais, ambiente, embalagem, peças e feedback.  
Saídas: sistema visual, padrões, sinalização, etiquetas, jornada e aprovação de consistência.  
KPIs: peças conformes, legibilidade, consistência, avaliação visual e retrabalho.

## RACI resumido

Legenda: R responsável, A aprovador, C consultado, I informado.

| Entrega | Gestão | Marketing | Mídias | Dev | Compras | Operações | Finanças | Marca |
|---|---|---|---|---|---|---|---|---|
| Cardápio e preço | A | C | I | C | C | R | R | C |
| Seleção do ERP | A | C | I | R | C | C | R | I |
| Site `/welcome` | A | C | C | R | I | I | I | R |
| Integração `/cardapio` | A | I | I | R | I | C | R | I |
| Campanha paga | A | R | R | C | I | C | C | C |
| Equipamentos e insumos | A | I | I | I | R | R | C | C |
| Rotina do quiosque | A | I | C | C | C | R | C | C |
| Relatório semanal | R | C | C | C | C | C | C | C |

## Prompts de despacho

### Pesquisa de compra

> Pesquise o item `[...]` para uso `[...]`, quantidade `[...]`, entrega em `[...]` até `[...]`. Requisitos eliminatórios: `[...]`. Compare no mínimo três opções aprovadas por custo total, nota e quantidade de avaliações, garantia, assistência, frete e prazo. Use fontes atuais, registre a data e não efetue a compra. Envie a recomendação como requisição `create_procurement_item` ou `update_procurement_item`.

### Nova tarefa

> Leia o plano atual. Proponha uma tarefa pequena e verificável para alcançar `[...]`. Informe agente responsável, pilar, fase, impacto, urgência, dependências e critérios de aceite. Envie por `POST /api/requests` com ação `create_task`.

### Atualização executiva

> Leia tarefas, decisões, riscos e requisições. Resuma apenas mudanças desde o último ciclo: resultados, evidências, bloqueios, decisões vencidas, orçamento afetado e próximos passos. Não transforme hipótese em fato.
