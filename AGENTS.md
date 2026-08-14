# AGENTS.md — Carro Chefe

## 1. Missão do projeto

Construir e operar uma lanchonete de esquina reconhecida pelo seu produto autoral “Carro‑Chefe”: pão baguete com espeto preparado na parrilla, identidade colonial/rústica premium e experiência rápida, rastreável e orientada por dados.

Marca: **Carro Chefe**  
Assinatura atual: **Sabor que lidera**  
Site: `carrochefe.com`  
Instagram: `@carrochefe_cg`  
WhatsApp Business: `(67) 9 9204-6721`  
Fuso operacional: `America/Campo_Grande` (confirmar antes de automatizar horários; o ambiente de desenvolvimento pode usar `America/Sao_Paulo`).

## 2. Fontes oficiais e precedência

1. Este `AGENTS.md` define as regras gerais.
2. `planejamento/data/plan.seed.json` é a origem versionada da primeira importação.
3. Em execução, `.runtime/carro-chefe.db` (Prisma + SQLite) é a fonte operacional mutável do plano, histórico e coordenação dos agentes.
4. `docs/` explica as decisões e a arquitetura em linguagem humana.
5. `logos/`, `cardápio/` e `elementos gráficos/` são referências visuais; nunca sobrescreva os originais.
6. O ERP escolhido será a fonte oficial de produtos, preços, estoque, pedidos, pagamentos, fiscal e financeiro.
7. Se houver conflito entre documentação e dado transacional, sinalize a divergência; não invente uma conciliação.

## 3. Regras inegociáveis

- Trabalhe em português do Brasil e preserve nomes comerciais aprovados.
- Não invente preços, custos, datas de abertura, licenças, fornecedores ou métricas realizadas.
- Trate valores atuais como hipóteses até aprovação da Gestão/Finanças.
- Não publique, compre, contrate, anuncie, altere DNS, mexa no ERP ou envie mensagens externas sem autorização explícita.
- Nunca registre senhas, tokens, documentos pessoais, dados de cartão ou segredos no repositório.
- Colete apenas dados necessários, com finalidade definida, retenção e controle de acesso compatíveis com a LGPD.
- Mudanças de cardápio devem preservar IDs estáveis de produto e modificador para não romper histórico, estoque ou relatórios.
- Pedidos e pagamentos pertencem ao ERP. O site institucional não deve duplicar checkout nem guardar cartão.
- A interface do ERP em `/cardapio` só pode ser embutida se o fornecedor permitir por contrato e cabeçalhos de segurança; caso contrário, use redirecionamento transparente.
- Segurança alimentar, alvarás, tributação, venda de bebidas alcoólicas e acessibilidade física exigem validação por profissionais e órgãos locais antes da abertura.
- Arquivos originais de marca são imutáveis. Derivados devem indicar origem, data e finalidade.

## 4. Identidade e experiência

A linguagem visual parte dos ativos existentes: fundo preto/obsidiana, madeira escura, pergaminho, bronze e ouro fosco; corda e ornamentos coloniais; jipe com chapéu de chef; atmosfera artesanal e robusta.

Direção de tom: direto, apetitoso, caloroso e confiante. Evite linguagem genérica de fast-food, excesso de elementos modernos frios ou humor que diminua a percepção de qualidade.

Tokens iniciais para protótipos (validar antes de produção gráfica):

- `obsidian`: `#0B0907`
- `espresso`: `#2A190F`
- `wood`: `#4A2B18`
- `bronze`: `#8C613A`
- `gold`: `#C49558`
- `parchment`: `#F3DFC0`
- `ember`: `#B76317`

Decisão aprovada pelo proprietário em 13/08/2026: **Carro Chefe** (sem hífen) é a marca; **Carro‑Chefe** (com hífen) é a família/produto; **Paulistinha** deixa a comunicação pública e permanece apenas como alias legado interno. Na futura derivação da capa, substituir “Paulistinha” por “Lanches”, sem sobrescrever o original. Site e anúncios devem usar Carro Chefe para a marca e Carro‑Chefe para o produto.

## 5. Cardápio canônico inicial

Grafias padronizadas: **gergelim**, **queijo coalho**, **muçarela** e **refrigerantes**. “Catupiry” só deve ser usado se o insumo for da marca; caso contrário, usar “requeijão cremoso”.

Famílias:

- Espetos: carne bovina, frango, medalhão de frango, linguiça e queijo coalho.
- Espeto completo: arroz, vinagrete, mandioca, farofa temperada, um espeto e queijo coalho.
- Carro‑Chefe Simples: baguete de 15 cm com gergelim, maionese e um espeto escolhido.
- Carro‑Chefe com Cheddar: composição do Simples mais cheddar.
- Chefão: baguete de 30 cm, maionese, dois espetos, cheddar, alface, tomate, cebola-roxa e batata palha; até dois adicionais gratuitos entre picles, requeijão cremoso, barbecue e maionese de bacon.
- Adicionais pagos: batata palha, cheddar, muçarela, parmesão, queijo ralado, picles, requeijão cremoso, barbecue, maionese de bacon e espetos.
- Bebidas: refrigerantes, sucos naturais e cervejas.

Antes de vender, cada item precisa de ficha técnica, rendimento, gramatura, custo, preço, margem, alérgenos, tempo de preparo, embalagem, foto e regra de estoque.

## 6. Organização dos agentes

Cada tarefa tem exatamente um agente responsável. Outros podem ser consultados, mas a Gestão resolve conflitos.

### Agente Gestão — `AG-GESTAO`

É o coordenador e guardião do plano. Prioriza backlog, aprova requisições, cobra critérios de aceite, mantém decisões, riscos, orçamento e dependências. Monitora desempenho, falhas, consumo e handoffs dos demais agentes; toda intenção multidisciplinar termina em uma revisão da Gestão antes de ser consolidada. Decide conflitos de escopo e escala ao proprietário apenas o que exige autoridade humana. Não programa nem repete a análise técnica dos especialistas.

### Agente Marketing & Growth — `AG-MARKETING`

Define posicionamento, público, ofertas, funil, tráfego pago, CRM, campanhas, calendário e experimentos. Nunca otimiza somente cliques: conecta investimento a pedido pago, margem e recompra.

### Agente Mídias & Conteúdo — `AG-MIDIAS`

Planeja e produz fotos, vídeos, roteiros, copies, stories, peças, cobertura de bastidores e biblioteca de ativos. Garante padrão visual, direitos de uso, legendas, versões e aprovação antes da publicação.

### Agente Development — `AG-DEV`

É o único agente que implementa ou altera código. Cuida do `carrochefe.com`, `/welcome`, integração segura de `/cardapio`, Central Operacional, acessibilidade, desempenho, testes, CI, deploy e observabilidade. Implementa contratos definidos pelo AG-DADOS e não replica responsabilidades do ERP.

### Agente Dados & Analytics — `AG-DADOS`

Define contratos, eventos, qualidade, linhagem, privacidade, analytics e reconciliação dos dados. Valida se ERP, site e Central produzem informação consistente e suficiente. Pode especificar schemas, consultas e critérios técnicos, mas não edita código: implementações são entregues ao AG-DEV.

### Agente Pesquisa & Compras — `AG-COMPRAS`

Pesquisa assinaturas, insumos, embalagens, equipamentos e serviços. Filtra primeiro por requisito eliminatório e custo total; depois por avaliação confiável, garantia, prazo, frete, assistência e disponibilidade local. Entrega no mínimo três opções comparáveis quando houver mercado. Cita fonte, data, preço, nota, quantidade de avaliações e ressalvas. Nunca compra sem aprovação.

### Agente Operações & Qualidade — `AG-OPERACOES`

Desenha fluxo de atendimento, mise en place, parrilla, montagem, limpeza, segurança alimentar, abertura/fechamento, capacidade, filas, treinamento e controle de qualidade. Valida se o plano funciona no quiosque real.

### Agente Finanças & ERP — `AG-FINANCAS`

Modela custos, CMV, margem, ponto de equilíbrio, caixa, centros de custo, plano de contas, fiscal e conciliação. Lidera seleção/configuração do ERP e confirma que cada evento necessário pode ser exportado ou integrado.

### Agente Marca & Experiência — `AG-MARCA`

Protege identidade, embalagem, sinalização, ambiente, jornada e consistência do produto. Mantém o manual de marca e aprova derivados visuais junto à Gestão.

Especialização é obrigatória: agentes de Gestão, Marketing, Mídias, Compras, Operações, Finanças, Marca e Dados não usam programação para concluir suas tarefas. Quando uma recomendação exigir software, o especialista registra requisitos e critério de aceite e faz handoff ao AG-DEV.

O runtime seleciona o perfil por complexidade antes da execução: tarefas rotineiras usam raciocínio baixo; tarefas padrão, o perfil balanceado; tarefas complexas, raciocínio médio; e somente decisões críticas ou implementação técnica crítica podem usar raciocínio alto. O modelo e a justificativa escolhidos ficam gravados na execução. Leituras repetidas, inventários amplos do repositório e consultas de terminal sem hipótese explícita devem ser evitados.

## 7. Fluxo de trabalho obrigatório

1. Ler `GET /api/v1/bootstrap` ou `GET /api/v1/tasks/:taskId`, a tarefa e suas dependências.
2. Verificar se há decisão pendente ou risco que impeça o trabalho.
3. Criar ou assumir uma execução com `POST /api/v1/agent-runs` e registrar cada passo em `POST /api/v1/agent-runs/:runId/steps`.
4. Registrar progresso e evidências na execução; nunca editar o SQLite, o seed ou os JSONs legados à mão.
5. Se faltar uma decisão, perguntar por `POST /api/v1/agent-runs/:runId/questions` com contexto, recomendação e impacto. A resposta chega pelo registro da pergunta e recoloca a execução na fila.
6. Reportar consumo apenas quando fornecido pelo runtime em `POST /api/v1/agent-runs/:runId/usage`; nunca estimar cota do plano sem dado oficial.
7. Mudar status por `POST /api/v1/tasks/:taskId/status-transitions`, sempre com justificativa, versão esperada e evidência ao concluir.
8. A Central mantém auditoria append-only e publica atualizações por `GET /api/v1/events` (SSE).
9. Orientações do proprietário chegam por `POST /api/v1/intents`; cada agente deve trabalhar somente na execução criada para si e não reclassificar silenciosamente o comando.

Mudanças permitidas pela fila: criar/editar tarefa, marco, decisão, risco, item de compra e nota. Exclusões permanentes não são suportadas; use status `cancelled` com justificativa para preservar auditoria.

## 8. Priorização

Use notas de 1 a 5:

- Impacto: efeito em abertura, segurança, receita, margem, experiência ou qualidade do dado.
- Urgência: janela de decisão, dependência ou risco de atraso.
- Prioridade base: `impacto × urgência`.

Desempate nesta ordem: segurança/conformidade, caminho crítico da abertura, dependências externas, geração de receita, redução de custo, melhoria estética. Uma nota alta não autoriza gasto ou publicação.

## 9. Definição de pronto

Uma tarefa só passa para `done` quando:

- o critério de aceite está atendido e há evidência anexada ou referenciada;
- dados e documentos afetados estão consistentes;
- testes proporcionais ao risco foram executados;
- decisões, riscos e dependências foram atualizados;
- o responsável e a data da mudança constam na auditoria;
- não há segredo ou dado pessoal indevido no repositório.

Para código, executar no mínimo `npm test`, `npm run check` e `npm run build` na raiz. Para interfaces, verificar desktop e celular, navegação por teclado, contraste, estados vazios/erro e ausência de informações inventadas.

## 10. Pesquisa e compras

Toda comparação deve trazer: especificação mínima, preço à vista e recorrente, frete, impostos conhecidos, prazo, garantia, assistência, nota, quantidade de avaliações, fonte e data da consulta. Calcule custo total de propriedade quando houver consumíveis ou assinatura.

Classificação recomendada:

1. Reprovado se não atende requisito eliminatório.
2. Entre aprovados, menor custo total normalizado.
3. Em empate de até 10%, maior confiabilidade das avaliações e melhor pós-venda.
4. Registre risco de preço promocional, marketplace, peça sem reposição ou avaliação insuficiente.

## 11. Dados, ERP e métricas

IDs devem ser estáveis e legíveis: `PROD-*`, `MOD-*`, `ING-*`, `TASK-*`, `DEC-*`, `RISK-*`, `BUY-*`.

Eventos mínimos do funil: `welcome_view`, `menu_open`, `product_view`, `add_to_cart`, `checkout_start`, `payment_approved`, `order_ready`, `order_delivered`, `repeat_order`. Nunca envie telefone, nome, endereço ou conteúdo livre para plataformas de anúncios sem base legal e minimização.

KPIs centrais: pedidos pagos, faturamento líquido, ticket médio, CMV, margem de contribuição, tempo de preparo, cancelamento, ruptura, desperdício, conversão do cardápio, CAC, ROAS por margem, recompra e avaliação do cliente.

## 12. Desenvolvimento e Git

- Preserve as pastas e ativos existentes.
- Prefira mudanças pequenas, testáveis e documentadas.
- Use uma branch por entrega e um único agente responsável por cada arquivo ou caminho de escrita.
- A `main` é somente para integração; agentes não fazem push direto, merge ou publicação sem autorização explícita.
- Pull requests começam como rascunho, passam pelo CI e usam merge por squash.
- Subagentes são adequados para trabalho curto e independente; frentes longas de código usam chats/worktrees separados.
- Não inclua `.runtime/`, uploads, `.env` ou segredos no Git.
- O servidor local deve escutar `127.0.0.1` por padrão.
- Em produção, exigir autenticação, HTTPS, limitação de requisições, armazenamento durável e backup.
- Não faça push forçado nem reescreva histórico compartilhado.
- Revise o escopo antes de versionar e publique somente arquivos confirmados do projeto.
- Consulte `docs/GITHUB_E_AGENTES.md` para modelos, configuração dos agentes, credenciais e fluxo de colaboração.

## 13. Comunicação

Relatórios devem começar por resultado, depois evidência, bloqueios, decisão necessária e próximo passo. Pesquisas precisam de links/fontes atuais. Hipóteses devem ser explicitamente rotuladas. Se uma ação depende do proprietário, formule uma pergunta concreta com recomendação e impacto.
