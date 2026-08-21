# Roadmap de execução

O roadmap é organizado por portões de decisão. Uma fase não deve avançar se o portão anterior deixar risco crítico sem responsável.

## Caminho crítico

```mermaid
flowchart LR
    G0["G0 • conceito aprovado"] --> G1["G1 • viabilidade e licenças"]
    G1 --> G2["G2 • produto e unit economics"]
    G2 --> G3["G3 • ERP, compras e estrutura"]
    G3 --> G4["G4 • operação ensaiada"]
    G4 --> G5["G5 • abertura controlada"]
    G5 --> G6["G6 • otimização de 30 dias"]
```

## G0 — Fundação imediata

Objetivo: transformar a ideia em decisões controladas.

- confirmar nome legal/comercial, responsáveis e orçamento-limite;
- decidir o papel de “Paulistinha” no cardápio;
- medir o ponto e registrar infraestrutura disponível;
- congelar escopo do MVP do cardápio;
- definir data-alvo somente depois da análise de licenças e obras;
- criar contas e acessos com autenticação forte e proprietários definidos.

Saída: decisões críticas registradas, orçamento preliminar e responsável por cada frente.

## G1 — Viabilidade, conformidade e espaço

Objetivo: saber se, onde e sob quais condições a operação pode abrir.

- consultar contador e responsáveis locais sobre empresa, fiscal e contratação;
- mapear alvará, vigilância sanitária, bombeiros, ocupação de calçada, resíduos, gás/energia e venda de álcool;
- desenhar planta operacional com fluxo de crus, prontos, equipe, fila e retirada;
- dimensionar energia, água, frio, ventilação, iluminação, internet e segurança;
- cotar adequações e criar reserva de contingência.

Saída: checklist de licenças, planta validada e custo de implantação por faixa.

## G2 — Produto, cardápio e economia unitária

Objetivo: tornar cada produto repetível, seguro e rentável.

- testar receitas, gramaturas, tempos, rendimento e apresentação;
- criar ficha técnica de ingrediente, embalagem e perda;
- calcular CMV, margem de contribuição e preço por cenário;
- mapear alérgenos e substituições;
- testar Simples, Cheddar, Chefão e Espeto Completo com clientes-piloto;
- aprovar nomes, descrições e arquitetura de modificadores.

Saída: cardápio MVP com ficha técnica, custo, preço aprovado, foto e tempo padrão.

## G3 — ERP, equipamentos, fornecedores e canais

Objetivo: ligar venda, produção, estoque e financeiro antes de gerar demanda.

- selecionar ERP por prova de conceito com o fluxo real do Chefão;
- escolher totem, pin pad/adquirente, impressora/KDS e contingência de internet;
- cadastrar produtos, modificadores, insumos, receitas e fornecedores;
- validar baixa automática de estoque e conciliação de pagamento;
- contratar equipamentos e insumos pelo método de custo total/avaliações;
- construir versão leve de `/welcome` e integrar `/cardapio`;
- configurar analytics, UTMs, pixels e política de privacidade.

Saída: pedido de ponta a ponta aprovado em todos os canais e compras críticas entregues.

## G4 — Operação ensaiada

Objetivo: provar a rotina sem clientes reais.

- contratar/definir parrilheiro, atendente e assistente;
- treinar abertura, pré-preparo, atendimento, produção, conferência e fechamento;
- simular pico com pedidos mistos e falhas de internet/pagamento;
- medir capacidade, gargalo, tempo de fila e tempo de preparo;
- calibrar estoque mínimo, ponto de reposição e desperdício;
- produzir banco inicial de fotos/vídeos e campanha de pré-abertura.

Saída: dois ensaios completos sem falha crítica e plano de contingência conhecido pela equipe.

## G5 — Abertura controlada

Objetivo: aprender com risco e volume limitados.

- realizar soft opening com janela e público controlados;
- acompanhar pedidos, aprovação de pagamento, tempo, ruptura, erro e feedback;
- limitar mídia paga até estabilizar produção e disponibilidade;
- fazer reunião diária de 15 minutos e fechamento de caixa/estoque;
- corrigir descrição, embalagem, layout e treinamento com evidência.

Saída: três ciclos de operação estáveis antes de ampliar mídia ou horário.

## G6 — Primeiros 30 dias e escala

Objetivo: transformar aprendizagem em crescimento rentável.

- revisar cardápio por margem, popularidade e complexidade;
- ativar remarketing e campanhas por raio somente com rastreamento conciliado;
- criar rotina de recompra via WhatsApp com consentimento;
- negociar fornecedores com base em consumo real;
- decidir novos horários, delivery e expansão apenas após capacidade comprovada;
- fechar painel de DRE gerencial, desperdício, CAC, recompra e NPS/avaliação.

## Matriz de prioridade

| Quadrante | Conduta | Exemplos iniciais |
|---|---|---|
| Impacto 5 / Urgência 5 | fazer agora | viabilidade do ponto, licenças, fichas técnicas, ERP prova de conceito |
| Impacto 5 / Urgência 3–4 | agendar no caminho crítico | site, analytics, ensaio de pico, fornecedores alternativos |
| Impacto 3–4 / Urgência 5 | resolver com prazo curto | artes de impressão, cadastro de canal, treinamento específico |
| Impacto 1–2 | manter no backlog | expansões, novas linhas e automações não essenciais |

O painel calcula a base como `impacto × urgência`. A nota não substitui julgamento de segurança, dependência ou caixa.

## Cadência de gestão

- **Diária na implantação:** bloqueios, compras com prazo, decisões e caminho crítico.
- **Semanal:** entregas por agente, orçamento, risco, próximos sete dias e métricas de aquisição.
- **Diária na abertura:** vendas, tempo, ruptura, desperdício, incidentes e avaliação.
- **Mensal:** DRE gerencial, mix, margem, campanhas, fornecedores, pessoas e roadmap.

## Critério de mudança de fase

Cada portão exige: evidências anexadas, decisões fechadas, riscos críticos com mitigação, orçamento atualizado, dependências satisfeitas e aprovação da Gestão/proprietário.

