# Especificação funcional — nova UI do cardápio, Reels e fidelidade CookLily

- **Produto:** CookLily
- **Projeto/repositório:** Carro Chefe, com escopo CookLily isolado
- **Branch canônica de integração:** `cooklily/canonical`
- **Data de registro:** 2026-10-09
- **Estado:** planejamento documentado; não representa implementação ou homologação
- **Escopo:** experiência pública do cliente, navegação mobile, descoberta de produtos, carrinho, dashboard, ranking, pontos, missões, recompensas e configuração administrativa.

> **Regra de escopo:** este documento pertence exclusivamente à CookLily. A existência no mesmo repositório/VPS não autoriza misturar identidade, usuários, sessões, catálogo, pedidos, pagamentos, tracking, mídia ou dados da CookLily com o Carro Chefe. Os caminhos técnicos históricos permanecem preservados conforme a documentação canônica.

## 1. Como ler este documento

Para não transformar propostas em decisões involuntárias, cada requisito pertence a uma das categorias:

- **DECIDIDO PELO PROPRIETÁRIO:** instrução direta já definida na conversa.
- **PROPOSTA DE PLANEJAMENTO:** regra recomendada para tornar o comportamento implementável; precisa ser validada quando altera a economia, a privacidade, a operação ou a experiência comercial.
- **PENDENTE:** questão que ainda não foi decidida e deve ser fechada antes da fase correspondente.
- **IMPLEMENTAÇÃO/HOMOLOGAÇÃO:** só pode ser marcada como concluída após evidência no código e/ou teste real aplicável.

A estrutura atual de catálogo e janela de produto, incluindo detalhes, adicionais e botões de ação, foi descrita como já implementada. A documentação não declara a nova experiência Reels, as novas abas, o dashboard ou o sistema de fidelidade como implementados.

### Contexto anterior de UI já homologado

O proprietário informou que, na revisão de UI anterior a este planejamento, já foram homologados:

- lazy-loading das imagens;
- profile picture picker com editor integrado;
- spinners personalizados;
- separators/separadores para organizar as categorias no catálogo;
- correções avulsas de UI.

Esses itens são o baseline de referência informado para a continuação do trabalho. Esta entrega documental não os reimplementa nem substitui a homologação anterior. Ao auditar os componentes na Fase 0, a equipe deve preservar esses comportamentos, identificar seus componentes reais no código e incluir verificações de regressão nas fases que possam afetá-los.

## 2. Objetivos e princípios

A experiência combina três modos conectados:

1. **Compra orientada pelo catálogo:** navegação por categorias, busca, filtros e cards.
2. **Descoberta imersiva por Reels:** mídias por produto, navegação vertical entre produtos, carrossel horizontal dentro do produto e ações rápidas.
3. **Relacionamento com o cliente:** pedidos, pontos, ranks, missões, metas, reivindicações e recompensas.

Princípios obrigatórios de planejamento:

- Preservar o fluxo de compra existente sempre que possível, ampliando-o em vez de duplicá-lo.
- Tratar o carrinho como estado compartilhado entre catálogo, janela de produto, Reels e Dashboard.
- Manter consistência de produto, variante, adicionais, preço, disponibilidade e quantidade em todos os pontos de entrada.
- Não perder contexto de navegação nem escolhas do cliente ao alternar de área.
- Não reservar áreas vazias para conteúdo inexistente.
- Usar feedback visual rápido, sem apresentar uma operação como concluída antes da confirmação necessária.
- Tornar regras de pontos, ranks, missões e recompensas configuráveis por interface administrativa e backend.
- Manter regras comerciais e decisões de autorização no servidor; a UI não é fonte de verdade de preço, pagamento, saldo, rank ou resgate.
- Garantir acessibilidade, responsividade, privacidade e desempenho desde o planejamento, não como acabamento posterior.
- Separar **planejado**, **implementado**, **validado tecnicamente**, **integrado**, **homologado** e **pronto comercialmente**.

## 3. Mapa geral da experiência

### 3.1 Fluxo principal

`Catálogo → Janela de visualização do produto → Reels do produto → Personalização/adicionais → Carrinho → Checkout`

O cliente pode entrar nos Reels a partir da capa de um produto na janela de visualização. A partir do Reel, pode percorrer as mídias do produto, navegar para outros produtos, adicionar quando permitido ou abrir a personalização.

### 3.2 Navegação mobile inferior

**DECIDIDO PELO PROPRIETÁRIO — ordem exata das cinco abas:**

1. **Cardápio** — primeira aba; catálogo e categorias.
2. **Ranking** — segunda aba; rank, níveis e progresso.
3. **Reels** — aba central; descoberta visual de produtos.
4. **Dashboard** — quarta aba; pedidos, pontos, metas, missões e reivindicações.
5. **Perfil** — quinta aba; dados e preferências pessoais.

A aba Reels deve ficar no meio, não apenas ser uma rota acessível a partir do catálogo. A área Perfil ainda precisa de especificação detalhada própria; esta definição registra apenas sua posição e função geral.

**PROPOSTA DE PLANEJAMENTO:** preservar a posição de rolagem do catálogo e o produto de origem ao voltar dos Reels; manter carrinho e personalização válidos durante a navegação; mostrar claramente a aba ativa; adaptar a navegação em desktop sem impor uma barra mobile artificial.

### 3.3 Modelo de navegação

- **Navegação vertical entre Reels:** muda o produto/Reel atual.
- **Navegação horizontal dentro do Reel:** muda a mídia do produto atual.
- **Saída no fim do carrossel:** abre a personalização do produto atual.
- **Retorno no início do carrossel:** retorna à tela anterior à entrada nos Reels.
- **Abas inferiores:** mudam a área principal do aplicativo mobile.

Esses eixos de navegação devem ser implementados e testados como gestos distintos para evitar conflitos entre scroll, carrossel, controles e botões.

## 4. Catálogo e janela de visualização do produto

### 4.1 Catálogo

**Estado informado:** estrutura de catálogo existente; separadores de categorias e lazy-loading de imagens já homologados em revisão anterior da UI.

O catálogo deve continuar oferecendo categorias, busca/filtros e cards de produtos de acordo com a implementação canônica atual. A nova experiência não deve remover essas funções.

**Requisitos:**

- A capa do produto deve ser uma entrada clara para a janela Reels.
- O clique em outras áreas do card deve manter o comportamento já existente, salvo decisão de UI específica.
- O produto deve manter um identificador estável entre catálogo, Reels, carrinho, histórico e analytics.
- Disponibilidade e preços exibidos devem corresponder à fonte autoritativa.
- O catálogo não deve depender de todas as mídias de todos os produtos estarem carregadas ao mesmo tempo.

### 4.2 Janela do produto

**DECIDIDO PELO PROPRIETÁRIO:** a estrutura de janela do produto com detalhes, adicionais e botões de ação já está implementada. Clicar na capa abre os Reels.

A janela deve continuar sendo a experiência completa para consultar o produto e selecionar personalizações. Os Reels não substituem essa janela.

**PROPOSTA:** compartilhar os mesmos componentes/serviços de seleção de variantes e adicionais, evitando regras duplicadas. Se o cliente voltar dos Reels, a origem e as escolhas anteriores devem ser preservadas sempre que continuarem válidas.

## 5. Experiência Reels

### 5.1 Carrossel de mídias do produto

**DECIDIDO PELO PROPRIETÁRIO:**

- Cada produto pode ter mídias em formato de carrossel, inspirado na experiência de Reels do TikTok e do Instagram.
- A capa do produto é sempre a primeira mídia do carrossel.
- As mídias podem ser imagens e vídeos.

**Regras propostas:**

- A ordem das mídias deve ser persistida/configurada, não depender da ordem incidental de uma consulta.
- A primeira mídia precisa corresponder à capa vigente do produto.
- A interface deve indicar discretamente a progressão/posição quando isso ajudar o usuário.
- A troca de mídia não deve trocar o produto; somente a navegação vertical entre Reels troca o produto.
- Falha ao carregar uma mídia deve apresentar fallback e permitir continuar a navegação.
- A remoção ou alteração de uma mídia não pode deixar links compartilhados em estado quebrado sem tratamento.

### 5.2 Controles do Reel

**DECIDIDO PELO PROPRIETÁRIO:** incluir os seguintes controles/ações:

- **Salvar** o produto/Reel.
- **Compartilhar** o Reel/produto.
- **Comentários**.
- **Curtir**.
- **Adicionar ao carrinho** — ocupa o lugar do botão que em redes sociais normalmente serve para seguir ou entrar no perfil.
- **Pausar/retomar vídeo** ao tocar na área do vídeo.
- **Ativar/desativar som** por controle próprio.
- **Reprodução em 2×** por pressão e retenção na borda superior do vídeo.
- **Trocar o modo de sequência** entre relacionados, ordem atual dos filtros e aleatório, usando ícones e mensagem temporária.

Os ícones, estados, posição e adaptação visual devem ser definidos no refinamento de UI com base no kit de marca CookLily, sem copiar marcas/logotipos de plataformas externas.

### 5.3 Pausa, áudio e velocidade 2×

- Tocar em vídeo alterna entre pausar e retomar.
- O controle de som alterna entre mudo e som ativo.
- Pressionar e segurar nas bordas da tela **apenas na parte superior da área de vídeo** faz o vídeo rodar em 2× enquanto a pressão estiver mantida.
- Ao soltar, a velocidade volta ao valor normal.
- O comportamento 2× não se aplica a imagens.
- Controles devem oferecer feedback visual do estado atual.

**PROPOSTA DE PLANEJAMENTO:** não permitir que o gesto 2× seja acionado por botões, textos ou a área inferior de ações. A troca de Reel deve pausar/liberar corretamente a mídia anterior. Respeitar restrições de autoplay dos navegadores e não assumir que o som poderá iniciar automaticamente.

### 5.4 Gestos horizontais e verticais — regra exata

**DECIDIDO PELO PROPRIETÁRIO:**

| Contexto/gesto | Resultado esperado |
|---|---|
| Arrastar para cima | Trocar para o próximo Reel/produto |
| Arrastar para baixo | Voltar ao Reel/produto anterior |
| Arrastar da direita para a esquerda **no fim do carrossel de mídias** | Abrir a tela de seleção de adicionais e os botões de ação do produto correspondente ao Reel atual |
| Arrastar da esquerda para a direita **no início do carrossel de mídias** | Voltar para a tela que estava aberta antes de entrar nos Reels |
| Pressionar e segurar na borda superior da área de vídeo | Reproduzir em 2× enquanto pressionado, apenas para vídeo |
| Tocar em vídeo | Pausar/retomar |
| Tocar no controle de som | Ativar/desativar som |

**Regras propostas para evitar ambiguidades:**

- O gesto horizontal só sai do Reel quando a mídia atual está no limite indicado; dentro do carrossel, o gesto navega entre mídias.
- Não disparar navegação quando o gesto começar em botão/controle interativo.
- Definir um limiar de distância e velocidade para reconhecer gesto, calibrado em aparelhos reais.
- Se um gesto diagonal for ambíguo, escolher um eixo dominante e não executar duas navegações.
- O retorno deve restaurar a tela de origem e seu contexto.
- Disponibilizar alternativas por clique e teclado no desktop, e controles acessíveis para pessoas que não usam gestos.

### 5.5 Botão de adicionar ao carrinho e feedback de 250 ms

**DECIDIDO PELO PROPRIETÁRIO:**

1. O primeiro clique no botão adiciona o item ao carrinho.
2. Uma animação de feedback de **250 milissegundos** aparece para indicar que o item foi adicionado.
3. Se o usuário clicar novamente no mesmo botão depois dessa animação, é direcionado à página do carrinho.

**Regra comercial necessária:** nem todo produto pode ser adicionado sem personalização. Se o produto exige variante ou adicionais obrigatórios, o primeiro clique deve abrir a personalização do produto atual, em vez de inserir um item incompleto.

**PROPOSTA DE IMPLEMENTAÇÃO:**

- Definir estados distintos: disponível, adicionando, adicionado, erro e abrindo carrinho.
- O feedback de 250 ms é uma duração-alvo da animação, não promessa de que a rede/backend concluirá em 250 ms.
- Só confirmar visualmente a inclusão quando houver confirmação suficiente do estado do carrinho.
- Impedir inclusão duplicada causada por duplo clique, retry ou resposta de rede repetida.
- Após a animação, o próximo clique no mesmo controle pode abrir o carrinho conforme solicitado.
- Se a inclusão falhar, apresentar erro recuperável e não mostrar estado de sucesso falso.
- O contador do carrinho deve ser consistente entre catálogo, Reels e demais abas.

**PENDENTE:** definir se o segundo clique deve funcionar apenas enquanto o mesmo Reel estiver ativo ou se o estado “adicionado” persiste ao trocar de Reel. A proposta inicial é associá-lo ao produto e à inclusão confirmada, com feedback visual claramente delimitado.

### 5.6 Modos de ordenação dos Reels

**DECIDIDO PELO PROPRIETÁRIO:** três modos, apresentados por ícones, sem texto permanente:

1. **Relacionados**
2. **Ordem atual dos filtros**
3. **Aleatório**

Ao mudar o modo, mostrar uma mensagem discreta na tela por pouco tempo; a mensagem some automaticamente. O modo selecionado deve permanecer visualmente reconhecível pelo ícone/estado.

**PROPOSTA DE PLANEJAMENTO:**

- **Relacionados:** ordenar por regras de relevância configuráveis. Não assumir algoritmo complexo sem dados suficientes.
- **Ordem atual dos filtros:** respeitar os filtros e a ordenação que já estão ativos no catálogo.
- **Aleatório:** embaralhar produtos elegíveis e evitar repetições imediatas quando houver opções suficientes.
- Todos os modos devem respeitar disponibilidade, elegibilidade e filtros explicitamente mantidos pelo cliente.
- A troca de modo não deve reiniciar o carrinho nem apagar personalizações.
- Mensagens de modo não podem cobrir ações críticas ou competir com mensagens de erro.
- Registrar evento analítico da troca de modo sem enviar dados pessoais desnecessários.

**PENDENTE:** fechar quais sinais definem “relacionados” (categoria, sabores/ingredientes, popularidade, campanha, preferências ou histórico), se a ordem aleatória persiste durante a sessão e como tratar filtros sem resultados.

### 5.7 Salvar, curtir e comentários

- **Salvar:** deve indicar claramente salvo/não salvo.
- **Curtir:** deve indicar estado ativo/inativo e evitar contagens duplicadas.
- **Comentários:** o botão deve abrir a área correspondente ao produto/Reel.

**PENDENTE:** autenticação exigida para salvar/curtir/comentar, visibilidade de comentários, moderação, denúncia, limites anti-spam, edição/exclusão, ordenação e política de conteúdo. Não criar comentários públicos sem definir controles de abuso e moderação.

**PROPOSTA:** permitir descoberta para visitantes, mas pedir autenticação quando uma ação precisar de persistência vinculada à conta; se uma ação anônima for permitida, explicar como ela será guardada e seus limites.

### 5.8 Compartilhamento e atribuição

**DECIDIDO PELO PROPRIETÁRIO:** o compartilhamento deve preservar o tracking de quem compartilhou. Quando a pessoa estiver conectada, indicar o usuário que compartilhou. Quando não estiver conectada, preservar o máximo possível de identificação permitido pela tecnologia e analytics.

**Regras e limites de privacidade:**

- Para usuário autenticado, associar evento ao identificador interno da conta, com acesso e finalidade definidos.
- Para visitante, usar identificador de sessão ou identificador first-party com retenção controlada e, quando necessário, consentimento.
- Criar URL/referência compartilhável que preserve produto/Reel e origem da campanha/compartilhamento.
- Atribuição posterior a cadastro ou compra deve seguir regras explícitas de janela e prioridade de atribuição.
- Não prometer identificar todos os indivíduos sem autenticação.
- Não usar fingerprinting invasivo nem coletar dados pessoais sem necessidade e base legal.
- Respeitar opt-out, consentimento, retenção e exclusão aplicáveis.
- Links compartilhados devem funcionar para destinatários autenticados e não autenticados.

Eventos sugeridos (nomes provisórios, não contrato final): `reel_view`, `reel_media_view`, `reel_like`, `reel_save`, `reel_share`, `reel_add_to_cart`, `reel_open_customization`, `reel_open_cart`, `reel_navigation_mode_change`.

Cada evento deve definir: nome, momento de disparo, origem, campos mínimos, deduplicação, identidade/anonimato, retenção e consumidores autorizados. O contrato final de analytics deve ser revisado pela frente responsável por dados antes da implementação.

## 6. Dashboard do cliente

### 6.1 Conteúdo

**DECIDIDO PELO PROPRIETÁRIO:** o Dashboard reúne:

- Histórico de pontos com gráficos.
- Reivindicações.
- Metas.
- Missões.
- Histórico de pedidos em formato de carrossel.
- Botão rápido de “Pedir novamente”.
- Status do pedido ativo, quando houver.
- Status final do pedido recente, quando aplicável.
- Barra lateral vertical de progressão e recompensas por nível.

O Dashboard deve ser uma visão útil mesmo para um usuário novo, sem dados ou sem pedido ativo.

### 6.2 Status de pedido e regra de sete dias

**DECIDIDO PELO PROPRIETÁRIO:**

- Se houver pedido ativo, mostrar o status do pedido.
- Se não houver pedido em andamento, mas houver um último pedido nos últimos sete dias, mostrar apenas o status final (por exemplo, “Pedido entregue” ou “Pedido cancelado”), sem timeline completa.
- Se não houver informação aplicável, não renderizar uma área vazia reservada para o status.

**Regras propostas:**

- Pedido ativo: mostrar apenas a timeline correspondente ao fluxo real e ao estado autoritativo do pedido.
- Pedido recente sem pedido ativo: mostrar cartão compacto com status final e dados úteis mínimos.
- Nenhum pedido aplicável: omitir o bloco de status por completo; outros blocos do Dashboard devem fluir sem lacuna.
- Definir a janela de sete dias usando horário do servidor e fuso operacional documentado.
- Evitar mostrar pedido cancelado como se estivesse ativo.
- A timeline deve refletir estados persistidos, não uma animação otimista sem confirmação.

**PENDENTE:** esclarecer se “último pedido nos últimos sete dias” inclui o último pedido de qualquer estado ou apenas pedidos finalizados. A interpretação provisória é o pedido mais recente que não esteja ativo, incluindo entregue/cancelado, mas deve ser validada antes de fechar os critérios de aceite.

### 6.3 Histórico de pedidos em carrossel

O carrossel deve permitir consultar pedidos anteriores e iniciar novamente uma compra sem refazer todo o processo manualmente.

Cada cartão deve incluir os dados essenciais que existirem: data, itens principais, status, valor quando apropriado e ação “Pedir novamente”. Evitar excesso de informação em telas pequenas.

#### Regra de “Pedir novamente”

**DECIDIDO PELO PROPRIETÁRIO:** abrir a tela do produto com adicionais e preencher previamente as últimas escolhas do cliente.

**Regras propostas:**

1. Reabrir a personalização do produto correspondente.
2. Recuperar as últimas escolhas associadas àquele produto/linha de pedido.
3. Pré-selecionar somente opções ainda existentes e elegíveis.
4. Consultar preço e disponibilidade atuais no servidor.
5. Não reutilizar silenciosamente preço antigo.
6. Não incluir automaticamente adicional removido, indisponível ou que agora exija confirmação.
7. Informar escolhas que não puderam ser restauradas e permitir correção.
8. Não submeter pedido nem pagamento automaticamente.
9. Se o produto não estiver disponível, informar a indisponibilidade e oferecer retorno ao catálogo.
10. Preservar o histórico original do pedido sem alterá-lo.

**PENDENTE:** decidir se a ação de repetir pedido reabre um único produto com suas escolhas ou um pedido completo com vários produtos. A descrição atual menciona “tela do produto”; a primeira implementação deve seguir essa interpretação mais restrita até aprovação de fluxo de pedido completo.

### 6.4 Pontos, gráficos, metas, missões e reivindicações

O Dashboard deve apresentar:

- Saldo de pontos atual.
- Histórico de pontos com origem e data.
- Gráficos por período, sem confundir saldo com pontos ganhos.
- Metas em andamento e progresso.
- Missões disponíveis, em andamento, concluídas e bloqueadas.
- Reivindicações disponíveis, pendentes, concluídas ou expiradas.
- Recompensas que podem ser resgatadas.

Os gráficos devem ter legenda, período e alternativa textual acessível. Estados sem dados devem explicar como começar, sem gráficos vazios enganosos.

### 6.5 Barra lateral de progressão

**DECIDIDO PELO PROPRIETÁRIO:** uma barra vertical de progresso cresce de baixo para cima conforme o usuário acumula pontos. Deve ter marcações em cada nível e mostrar o que pode ser reivindicado em cada nível, como cupom, cashback ou produto.

**Regras propostas:**

- A posição do marcador atual vem do rank/progresso calculado pelo backend.
- Cada marco pode exibir nome do rank e recompensas elegíveis.
- Diferenciar recompensa bloqueada, desbloqueada, reivindicável, resgatada, utilizada e expirada.
- Não sinalizar recompensa reivindicável se condições adicionais ainda não forem atendidas.
- O resgate deve ser confirmado e idempotente no servidor.
- Em mobile estreito, adaptar a apresentação a um formato horizontal ou componente responsivo sem perder a ordem dos níveis.
- A barra deve ter alternativa textual para leitor de tela e não usar cor como único indicador.

## 7. Sistema de pontos, ranks, missões e recompensas

### 7.1 Lista completa de ranks

**DECIDIDO PELO PROPRIETÁRIO — sequência inicial:**

| Ordem | Grupo | Níveis |
|---:|---|---|
| 1–3 | Bronze | Bronze I, Bronze II, Bronze III |
| 4–6 | Prata | Prata I, Prata II, Prata III |
| 7–10 | Ouro | Ouro I, Ouro II, Ouro III, Ouro IV |
| 11–15 | Platina | Platina I, Platina II, Platina III, Platina IV, Platina V |
| 16–19 | Diamante | Diamante I, Diamante II, Diamante III, Diamante IV |
| 20 | Mestre | Mestre |
| 21 | Elite | Elite |

Total inicial: **21 níveis**. A ordem, nomes e limiares devem ser dados configuráveis, não condicionais espalhadas pela UI.

### 7.2 Valores e regra de progressão inicial

**DECIDIDO PELO PROPRIETÁRIO:**

- Bronze I → Bronze II exige inicialmente 200 pontos.
- Bronze II → Bronze III exige 1,66× a quantidade necessária para o avanço anterior.
- A progressão continua crescendo dessa forma até Mestre.
- Mestre → Elite exige inicialmente 10.000.000 de pontos.
- A referência interna inicial é **990 pontos = R$ 1**.
- A equivalência 990 pontos = R$ 1 **não será pública**.
- Ao subir de rank, o usuário desbloqueia missões mais especiais/personalizadas e com pontuação melhor que as missões de iniciante.
- Os números são valores iniciais e podem ser alterados futuramente na página de configuração.

**PENDENTE CRÍTICO — não codificar antes de validar:**

- Os 10.000.000 de pontos para Mestre → Elite são custo incremental do avanço ou limiar de pontos acumulados?
- O fator 1,66 aplica-se ao custo de cada avanço subsequente ou a outra base?
- Qual arredondamento deve ser usado ao produzir custos inteiros?
- Os limiares serão editáveis individualmente, gerados por fórmula ou ambas as opções?
- Como tratar mudanças de limiares para clientes que já estão em ranks superiores?
- Rank é baseado em pontos acumulados históricos, pontos líquidos ou saldo disponível para resgate?
- O que acontece com o rank se pontos forem estornados por cancelamento/fraude?

**Proposta matemática inicial, sujeita à aprovação:** custo do próximo avanço = arredondar(custo anterior × 1,66), começando em 200 pontos para Bronze I → Bronze II. O limiar Mestre → Elite é um valor especial configurado separadamente em 10.000.000 inicialmente. Antes de implementação, gerar tabela com todos os custos e totais acumulados, revisar a curva e aprovar o significado de cada número.

### 7.3 Separar quatro conceitos

A implementação deve distinguir:

1. **Saldo de pontos:** pontos disponíveis para uso, se resgatáveis.
2. **Pontos acumulados de progressão:** métrica usada para determinar o rank, conforme política aprovada.
3. **Custo do próximo avanço:** pontos exigidos para o próximo nível.
4. **Rank atual:** nível reconhecido pelo sistema.

Esses conceitos não devem ser tratados como sinônimos nem calculados independentemente em componentes diferentes.

**PROPOSTA:** manter rank baseado em progressão acumulada e não rebaixar o cliente simplesmente porque resgatou pontos. Estornos de compras fraudulentas/canceladas podem exigir regra distinta. Isso é recomendação de negócio, não decisão fechada.

### 7.4 Ledger e integridade de pontos

**PROPOSTA DE PLANEJAMENTO:** manter um livro-razão de pontos com lançamentos auditáveis, evitando editar o saldo diretamente sem histórico.

Cada lançamento deve guardar, conforme aplicável:

- identificador do usuário;
- quantidade positiva ou negativa;
- tipo e motivo;
- origem (pedido, missão, campanha, resgate, ajuste ou estorno);
- data/hora do servidor;
- referência à entidade de origem;
- chave de idempotência;
- ator/sistema responsável;
- estado e referência do lançamento compensatório quando houver reversão.

Regras propostas:

- Eventos repetidos não geram pontos duplicados.
- Pontos por compra seguem o estado financeiro/comercial aprovado.
- Cancelamento, reembolso e fraude seguem política explícita de estorno.
- Ajustes administrativos exigem permissão e auditoria.
- A UI mostra apenas saldos calculados e confirmados pelo serviço.
- A referência econômica interna não é incluída em textos, endpoints públicos, analytics públicos ou respostas para o cliente.
- Não confundir pontos de progressão com saldo monetário de cashback.

### 7.5 Missões por rank

**DECIDIDO PELO PROPRIETÁRIO:** ranks mais altos desbloqueiam missões mais especiais, personalizadas e com pontuação melhor que as missões iniciais.

**PROPOSTA:** missão configurável com:

- título, descrição e instruções;
- requisito/condição de conclusão;
- evento ou evidência necessária;
- ranks elegíveis;
- período de início/fim;
- recorrência e limite de conclusões;
- pontuação e/ou recompensa;
- status (bloqueada, disponível, em andamento, concluída, reivindicável, reivindicada, expirada);
- critérios para validação server-side;
- política de estorno ou invalidação, quando aplicável.

Possíveis famílias de missões para planejamento futuro (não aprovadas como catálogo definitivo): primeira compra, retorno, frequência, experimentação de produtos/categorias, metas de fidelidade e campanhas especiais. As recompensas e pontuações devem ser calibradas com dados e não inventadas como regras definitivas neste documento.

### 7.6 Recompensas

**DECIDIDO PELO PROPRIETÁRIO:** recompensas por nível podem incluir cupons, cashback ou produtos.

Cada tipo precisa de regra própria:

- **Cupom:** validade, elegibilidade, valor/benefício, limites e combinações permitidas.
- **Cashback:** valor, origem, saldo, condições de uso, expiração e limites. Não assumir que cashback é a mesma coisa que pontos.
- **Produto:** disponibilidade, variações, estoque, condições de resgate e implicações de entrega.

Estados sugeridos: bloqueada, desbloqueada, disponível para reivindicação, reivindicada, utilizada, expirada ou invalidada.

O sistema deve evitar resgates duplicados por repetição de clique, timeout ou retry. Uma reivindicação não deve ser exibida como concluída até que o backend confirme a operação.

### 7.7 Referência de 990 pontos por real

A relação inicial de 990 pontos para R$ 1 é uma referência interna, não uma promessa pública de conversão nem necessariamente uma taxa universal para todas as recompensas.

**Regras obrigatórias de apresentação:**

- Não mostrar a equivalência no catálogo, Reels, Ranking ou Dashboard público.
- Não incluir a equivalência em analytics acessíveis a fornecedores de mídia ou clientes.
- Restringir a configuração aos papéis administrativos autorizados.
- Registrar alterações e valores anteriores na auditoria.
- Tratar cashback, cupons e produtos por suas regras específicas, não inferindo automaticamente um valor de resgate só a partir dessa equivalência.

## 8. Página administrativa de configuração

**DECIDIDO PELO PROPRIETÁRIO:** pontos, ranking e missões precisam de uma página específica de configuração. Os valores apresentados são iniciais e poderão ser alterados futuramente nessa página.

### 8.1 Configuração de ranks

- Criar, editar e ordenar ranks/níveis.
- Configurar nomes, identificadores, status e apresentação visual.
- Configurar custo de cada avanço e/ou parâmetros de fórmula.
- Configurar recompensas associadas a níveis.
- Visualizar a curva de progressão antes de publicar.
- Validar lacunas, duplicatas, custos negativos, ordem inválida e saltos inesperados.
- Definir política de aplicação para usuários existentes.
- Versionar configuração e manter trilha de auditoria.

### 8.2 Configuração de pontos

- Definir regras de ganho por evento.
- Configurar limites e elegibilidade.
- Definir políticas de estorno.
- Configurar expiração apenas se essa regra for aprovada.
- Consultar lançamentos e ajustes.
- Configurar a referência econômica interna, com acesso restrito.
- Simular o impacto de alterações antes da publicação.

### 8.3 Configuração de missões

- Criar, editar, ativar e desativar missões.
- Definir requisitos, evento de conclusão e validação.
- Definir ranks/segmentos elegíveis.
- Definir validade, recorrência e limites.
- Definir pontos e recompensas.
- Pré-visualizar a experiência do cliente.
- Ver progresso, conclusões e erros de concessão.

### 8.4 Configuração de recompensas

- Configurar cupons, cashback e produtos.
- Definir elegibilidade, custo/benefício, validade e limites.
- Configurar quantidade disponível quando houver estoque.
- Consultar resgates, uso, expiração e reversões.
- Impedir que recompensas inválidas sejam publicadas.

### 8.5 Permissões, auditoria e publicação

**PROPOSTA:**

- Somente papéis autorizados podem alterar parâmetros financeiros/econômicos.
- Registrar autor, data, valores anteriores e novos, motivo e versão.
- Separar rascunho de configuração publicada.
- Validar a configuração antes de publicar.
- Preservar uma versão anterior para rollback administrativo controlado.
- Não permitir edição silenciosa de histórico de pontos ou recompensas já resgatadas.
- Definir explicitamente se uma mudança afeta somente progressão futura ou também recalcula usuários existentes.

## 9. Privacidade, segurança e analytics

A implementação deve respeitar a separação de dados CookLily e Carro Chefe e aplicar minimização de dados.

### 9.1 Princípios

- Não usar identificação anônima invasiva.
- Definir finalidade, retenção e controle de acesso para eventos.
- Não enviar telefone, nome, endereço ou conteúdo livre para analytics de terceiros sem base legal, minimização e aprovação.
- Evitar incluir identificadores de conta em URLs públicas.
- Usar tokens/códigos de referência opacos, quando necessários.
- Permitir atribuição razoável sem prometer identificar usuários não autenticados.
- Definir consentimento/opt-out quando aplicável.
- Proteger comentários contra abuso e definir moderação antes da publicação pública.
- Restringir dados econômicos internos e trilhas de auditoria.

### 9.2 Analytics propostos

Eventos sugeridos: visualização de Reel/mídia, curtir, salvar, compartilhar, adicionar ao carrinho, abrir personalização, abrir carrinho e trocar modo de ordenação. Também avaliar eventos de conclusão de missão e reivindicação de recompensa.

Cada evento deve documentar:

- finalidade;
- disparador exato;
- identificadores permitidos;
- origem e contexto;
- deduplicação/idempotência;
- política para usuário conectado e visitante;
- retenção e controle de acesso;
- sistema consumidor.

Analytics não pode ser usado como fonte de verdade para conceder pontos, confirmar pedido, validar pagamento ou autorizar resgate.

## 10. Requisitos não funcionais

### 10.1 Responsividade e acessibilidade

- Mobile-first e compatibilidade com desktop.
- Navegação por teclado onde aplicável.
- Rótulos acessíveis para ícones sem texto.
- Estados de foco visíveis.
- Contraste suficiente sobre imagens claras/escuras.
- Área de toque adequada e sem controles sobrepostos.
- Alternativa aos gestos.
- Anúncio acessível de estado de vídeo, botão, rank, progresso e sanfona.
- Não usar apenas cor para expressar status.
- Respeitar preferência por movimento reduzido quando aplicável.

### 10.2 Desempenho e mídia

- Preservar lazy-loading já homologado.
- Carregar progressivamente as mídias necessárias ao Reel atual e próximas mídias.
- Evitar manter muitos vídeos ativos simultaneamente.
- Pausar/liberar recursos de mídia fora de foco.
- Definir limites e formatos de mídia compatíveis com dispositivos móveis.
- Apresentar placeholder/fallback e retry quando mídia falhar.
- Evitar que o carrossel aumente a largura da página.
- Não pré-carregar todo o catálogo de mídia sem necessidade.

### 10.3 Consistência e confiabilidade

- Servidor é fonte de verdade de preço, disponibilidade, pedido, pontos, rank e recompensas.
- Operações que concedem pontos ou resgatam recompensas precisam de idempotência.
- Erros de rede não podem criar duplicatas nem exibir sucesso falso.
- Configurações precisam de validação e versionamento.
- Estados vazios, erro, carregamento, sucesso e indisponibilidade devem ser definidos por área.
- Não fazer mudanças de schema ou migrações durante uma entrega exclusivamente documental.

## 11. Estados de interface a especificar por componente

Cada fase deve cobrir, quando aplicável:

- carregamento inicial;
- carregamento incremental;
- conteúdo pronto;
- conteúdo vazio;
- falha de rede;
- mídia indisponível;
- sessão expirada;
- usuário não autenticado;
- ação em andamento;
- ação concluída;
- ação recusada por regra comercial;
- indisponibilidade de produto/adicional;
- erro recuperável;
- configuração inválida;
- recompensa não elegível;
- missão expirada;
- falta de histórico de pontos/pedidos.

Não criar blocos vazios de status de pedido. Nos demais contextos, usar mensagens úteis e consistentes com o kit de marca CookLily.

## 12. Roadmap recomendado

As fases abaixo são uma proposta de execução e devem ser priorizadas junto ao roadmap canônico atual de UI pública. Nenhuma fase está concluída apenas por estar descrita aqui.

### Fase 0 — auditoria de componentes e contratos

**Objetivo:** evitar duplicação e localizar pontos de integração.

- Revisar catálogo, modal de produto, adicionais, carrinho, conta, histórico e serviços existentes.
- Mapear rotas e estado compartilhado.
- Mapear modelo atual de produto/mídias.
- Identificar analytics e tracking já disponíveis.
- Confirmar separação de dados CookLily.
- Listar dependências de backend para salvar/curtir/comentários, compartilhamento, pontos e recompensas.
- Registrar questões em aberto e responsáveis.

**Aceite:** mapa de componentes/serviços e lista de dependências aprovada; nenhuma implementação duplicada planejada sem justificativa.

### Fase 1 — navegação e estrutura de páginas

- Criar/ajustar as cinco abas mobile na ordem definida.
- Posicionar Reels no centro.
- Integrar rotas Cardápio, Ranking, Reels, Dashboard e Perfil.
- Preservar carrinho e contexto de retorno.
- Definir adaptação desktop.

**Aceite:** troca entre abas não perde indevidamente carrinho ou estado de navegação; aba ativa é clara; layout funciona em tamanhos de tela definidos.

### Fase 2 — player e carrossel Reels

- Carrossel horizontal de mídias por produto.
- Capa como primeira mídia.
- Navegação vertical entre produtos.
- Gestos de saída no limite final/inicial do carrossel.
- Pausar/retomar, áudio e 2×.
- Gestão de ciclo de vida dos vídeos.
- Fallback, retry, carregamento e estados vazios.
- Modos relacionados, ordem dos filtros e aleatório, inicialmente com critérios simples e explícitos.

**Aceite:** gestos não conflitam; imagem não exibe comportamento de vídeo; vídeo anterior não segue reproduzindo indevidamente; voltar preserva contexto.

### Fase 3 — ações sociais, carrinho e compartilhamento

- Botões salvar, curtir e comentários conforme decisões de autenticação/moderação.
- Botão de carrinho e feedback de 250 ms.
- Fluxo de personalização quando obrigatória.
- Segundo clique para abrir carrinho.
- Links compartilháveis.
- Contrato de eventos e atribuição.
- Proteção contra duplicação e tratamento de falha.

**Aceite:** preço/opções válidos; nenhuma inclusão duplicada; feedback condiz com resultado real; links preservam origem; privacidade e retenção documentadas.

### Fase 4 — Dashboard e pedidos

- Regras de pedido ativo e último pedido recente.
- Ocultação da área quando não houver status aplicável.
- Carrossel de histórico.
- Pedir novamente com escolhas anteriores.
- Estados de disponibilidade e adicionais removidos.
- Estrutura para histórico de pontos, gráficos, missões, metas e reivindicações.

**Aceite:** os três estados de pedido estão cobertos; repetição não utiliza preços antigos nem submete pedido automaticamente; não há lacuna vazia no Dashboard.

### Fase 5 — fidelidade para o cliente

- Definir e aprovar matemática de progressão.
- Implementar apresentação dos 21 níveis.
- Saldo e histórico de pontos.
- Barra de progresso e marcos de recompensa.
- Missões por rank.
- Reivindicações e estados de recompensa.
- Regras de estorno e idempotência.

**Aceite:** rank e pontos vêm do backend; missões e recompensas obedecem à configuração; operações repetidas não duplicam saldo ou resgate.

### Fase 6 — painel administrativo de fidelidade

- Configuração de ranks e limiares.
- Configuração de ganho/estorno de pontos.
- Missões, segmentação, validade e recompensas.
- Auditoria, permissões e versionamento.
- Pré-visualização e validação antes de publicar.
- Política de aplicação a usuários existentes.

**Aceite:** administradores autorizados conseguem alterar parâmetros sem editar código; alterações são auditadas; configurações inválidas não são publicadas.

### Fase 7 — homologação, desempenho e lançamento gradual

- Testes unitários, integração e interface.
- QA em dispositivos móveis reais e desktop.
- Testes de acessibilidade.
- Testes de sessão autenticada e visitante.
- Testes de falha de rede, mídia e retry.
- Testes de duplicidade de pontos/resgates.
- Verificação de analytics e privacidade.
- Ativação por feature flag/segmento, se a arquitetura existente permitir.
- Observação de métricas e rollback documentado.

**Aceite:** evidências registradas; regressões críticas resolvidas; deploy/homologação real separados dos testes locais/CI; lançamento só após autorização e gates aplicáveis.

## 13. Plano de testes e critérios de aceite detalhados

### 13.1 Navegação e Reels

- Entrar nos Reels a partir de produto específico e verificar contexto.
- Verificar que a capa é a primeira mídia.
- Avançar/voltar mídias horizontalmente.
- Avançar/voltar produtos verticalmente.
- Testar saída horizontal apenas no limite final/inicial.
- Testar gesto sobre controles e gestos diagonais.
- Testar imagem e vídeo.
- Testar pause/resume, áudio e pressão para 2×.
- Trocar de Reel durante reprodução.
- Simular erro e recuperação de mídia.
- Trocar os três modos de ordenação e validar o toast temporário.
- Voltar à tela de origem sem perder a posição do catálogo.

### 13.2 Carrinho

- Adicionar produto sem personalização obrigatória.
- Abrir personalização quando houver adicional/variante obrigatória.
- Verificar feedback de 250 ms sem supor conclusão de rede instantânea.
- Segundo clique após feedback abre carrinho.
- Repetir cliques rápidos e simular retry de rede.
- Confirmar consistência do contador em todas as abas.
- Alterar disponibilidade/preço durante a sessão e validar resposta server-side.
- Verificar que erro não gera estado de sucesso falso.

### 13.3 Compartilhamento e privacidade

- Compartilhar com usuário autenticado.
- Compartilhar como visitante, conforme política aprovada.
- Abrir link em sessão nova e em dispositivo diferente.
- Validar atribuição de referência e deduplicação.
- Verificar expiração/retenção dos identificadores anônimos.
- Confirmar que não há dados pessoais em URLs ou payloads indevidos.
- Verificar opt-out e controles de consentimento aplicáveis.

### 13.4 Dashboard e histórico

- Usuário com pedido ativo.
- Sem pedido ativo, último pedido dentro de sete dias.
- Sem pedido recente.
- Pedido recente entregue e cancelado.
- Repetir produto com todas as opções ainda válidas.
- Repetir produto com opção removida ou indisponível.
- Verificar que não se reutilizam preços antigos nem há submissão automática.
- Validar estados vazios e gráficos sem dados.

### 13.5 Pontos, ranking e missões

- Conferir os 21 níveis e a ordem.
- Testar limiares e arredondamento após aprovação da fórmula.
- Alterar configuração e validar versionamento.
- Concluir missão uma vez e tentar duplicar evento.
- Resgatar recompensa uma vez e repetir a requisição.
- Processar cancelamento/reembolso conforme política aprovada.
- Confirmar separação entre saldo, acumulado, custo do próximo nível e rank.
- Confirmar que a equivalência 990 pontos = R$ 1 não aparece para o cliente.
- Validar mudança de configuração para usuários já existentes.
- Testar permissão e auditoria administrativa.

## 14. Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| Conflito entre gestos vertical/horizontal | Navegação acidental e frustração | Máquina de estados de gesto, limites claros, QA em aparelhos reais e alternativa por clique |
| Inclusão de produto sem adicionais obrigatórios | Pedido inválido | Reutilizar validação server-side e encaminhar para personalização |
| Duplo clique/retry duplica item ou recompensa | Inconsistência de pedido/pontos | Idempotência, estados claros e testes de concorrência |
| Regra de 1,66/10.000.000 ambígua | Progressão impraticável ou ranks incorretos | Aprovar fórmula, tabela completa e simulação antes de implementar |
| Alteração de configuração afeta usuários existentes inesperadamente | Mudança injusta de rank | Versionamento e política de migração/recalculo explícita |
| Compartilhamento anônimo superidentificado | Risco de privacidade | Identificador first-party limitado, consentimento, retenção e proibição de fingerprinting invasivo |
| Comentários públicos sem moderação | Spam/abuso | Fechar política de acesso, denúncia, moderação e rate limit antes de ativar |
| Reels carregam mídia em excesso | Consumo de dados/bateria | Lazy-loading, prefetch limitado, liberar vídeos fora de foco |
| Cashback confundido com pontos | Risco financeiro e UX confusa | Domínios, saldos e regras separados |
| Documento confundido com entrega implementada | Planejamento incorreto | Estados explícitos e evidência de aceite por fase |

## 15. Decisões pendentes para fechamento

As questões abaixo não impedem registrar a direção geral, mas devem ser resolvidas antes da fase que depende delas.

### Produto/Reels
1. Quais mídias e metadados cada produto poderá ter? Há limite de quantidade/duração/tamanho?
2. Como exatamente serão definidos produtos relacionados?
3. O modo aleatório é mantido ao trocar de aba/sessão?
4. Salvar/curtir/comentar exigem login?
5. Qual é a política de comentários, moderação e denúncia?
6. O segundo clique de carrinho persiste ao trocar de Reel?
7. Como tratar produtos que exigem personalização quando a pessoa tenta adicionar diretamente?

### Analytics/compartilhamento
8. Quais canais de compartilhamento serão prioritários?
9. Qual janela e prioridade de atribuição serão utilizadas?
10. Qual a retenção de identificadores anônimos e quais eventos exigem consentimento?
11. Quais destinos/sistemas poderão receber analytics?

### Dashboard/pedidos
12. A janela de sete dias considera o pedido mais recente de qualquer estado ou somente pedidos finalizados?
13. “Pedir novamente” reabre apenas um produto ou futuramente o pedido inteiro?
14. Como comunicar adicionais removidos e produtos esgotados no fluxo de repetição?

### Fidelidade/economia
15. O que exatamente significa o limiar de 10.000.000 entre Mestre e Elite: custo incremental ou total acumulado?
16. Como calcular cada custo intermediário e arredondar?
17. O rank usa pontos acumulados ou saldo?
18. Resgatar pontos afeta rank?
19. Como estornos de compras alteram pontos e rank?
20. A equivalência 990 pontos/R$ 1 é apenas parâmetro econômico interno ou participa de alguma regra de cálculo de recompensa? A recomendação é não inferir cashback automaticamente dessa taxa.
21. Como alterações administrativas afetam usuários existentes?
22. Missões podem repetir? Como funcionam validade, expiração e recompensas por rank?
23. Quem pode administrar e publicar alterações de pontos/recompensas?

## 16. Definição de pronto e governança

Uma fase só pode ser considerada concluída quando:

- requisitos aplicáveis estiverem implementados;
- regras pendentes que bloqueiam a fase estiverem decididas;
- testes e evidências forem registrados;
- desktop/mobile, acessibilidade, carregamento, vazio e erro forem revisados;
- não houver regressão crítica no catálogo, adicionais, carrinho ou checkout;
- integrações usarem a fonte de verdade correta;
- privacidade e permissões forem revisadas;
- documentação e checkpoint refletirem o estado real;
- mudanças estiverem integradas à branch canônica e prontas para homologação conforme os gates do repositório.

Não declarar homologado somente porque o código existe ou um teste estrutural passa. Homologação de interface exige verificação visual aplicável; operações de pagamento e pontos exigem os testes transacionais correspondentes.

## 17. Resumo de decisão

**Direção aprovada pelo proprietário:** catálogo existente conectado a uma experiência Reels de produtos; carrossel com capa primeiro; controles sociais e botão de carrinho; gestos e controles de vídeo especificados; ordenação por relacionados/filtros/aleatório com ícones e mensagem temporária; cinco abas mobile com Reels no centro; Dashboard com pedidos, pontos, missões e recompensas; progressão de 21 níveis; pontos internos com referência inicial 990 = R$ 1 não pública; Bronze I → II em 200 pontos, multiplicador 1,66 para avanços seguintes até Mestre e 10.000.000 para Mestre → Elite; missões especiais desbloqueadas por rank; painel administrativo configurável.

**Propostas registradas para melhorar a execução:** estados de interface e aceite por fase; validação server-side; idempotência; ledger de pontos; versionamento e auditoria de configuração; proteção de privacidade no compartilhamento; política de comentários antes de ativação; roadmap incremental e gates de homologação.

**Não decidido:** fórmula completa/semântica dos limiares de rank; autenticação e moderação de comentários; detalhes do algoritmo de relacionados; janela de atribuição/retensão anônima; comportamento exato de repetição de pedido completo; política de recalcular ranks após mudança administrativa.

Este documento é uma especificação e um roadmap. A implementação, os testes e a homologação devem ser acompanhados separadamente com evidências verificáveis.

---

## 18. Registro da auditoria manual — Fase 0 (2026-10-09)

**Origem e confiabilidade:** resultados informados manualmente pelo proprietário após testar a versão atualmente disponível. Estes registros são observações de uso, não uma auditoria do código nem execução automatizada independente. Os comportamentos relatados como ausentes ainda precisam ser confirmados por inspeção do repositório antes da implementação.

| ID | Área | Estado | Resultado relatado |
|---|---|---|---|
| T01 | Abertura do catálogo | **OK** | Catálogo abriu normalmente. |
| T02 | Navegação por categorias | **OK** | Navegação entre categorias funcionou. |
| T03 | Abrir um produto | **OK** | A visualização do produto abriu. |
| T04 | Adicionais e escolhas | **OK** | Seleção de adicionais/opções funcionou. |
| T05 | Adicionar ao carrinho | **OK** | Inclusão no carrinho funcionou. |
| T06 | Mídia do produto | **OK** | Mídias dos produtos testados funcionaram. |
| T07 | Foto de perfil | **OK** | Seletor/editor de foto de perfil funcionou. |
| T08 | Spinners e carregamento | **OK** | Indicadores e carregamentos observados funcionaram. |
| T09 | Histórico e pedido ativo | **FALHOU — prioridade alta** | Pedidos cancelados continuam aparecendo como ativos; o filtro de cancelados não retorna pedidos apesar de existirem; o cliente ainda vê seu pedido como ativo depois do cancelamento. |
| T10 | Navegação mobile | **PARCIAL / INCOMPLETO** | A aba Ranking existe, mas a página ainda não foi construída; Reels e Dashboard não existem; o Perfil não mostra o selo de ranking do usuário. |
| T11 | Compartilhamento | **AUSENTE** | Não existe botão de compartilhar na interface testada. |
| T12 | Console e rede (DevTools) | **OK — sem erro aparente** | O proprietário não observou erros aparentes no DevTools. Isso não substitui inspeção de logs, respostas de API ou testes automatizados. |

### Resultado dos testes específicos de Reels

O proprietário relatou que **nenhum dos recursos planejados para Reels está implementado na versão testada**, incluindo carrossel de mídias em experiência Reels, controles de pausa/áudio/2×, ações sociais, botão de carrinho integrado à experiência Reels, gestos de navegação, modos de ordenação e compartilhamento. Este é um resultado manual; a confirmação de componentes/rotas/serviços existentes faz parte da auditoria do código.

### Ações de auditoria derivadas

1. **Investigar T09 antes de novas telas:** rastrear o estado de cancelamento desde a persistência/backend até filtros, lista/histórico e acompanhamento do cliente; verificar possíveis estados divergentes, filtros incompatíveis, cache/atualização e atualização de status. Não presumir a causa sem evidência.
2. Mapear no código as rotas, componentes e serviços existentes para catálogo, janela do produto, adicionais, carrinho, mídia, conta/perfil, pedidos e analytics.
3. Identificar o que já existe da aba Ranking e quais contratos/dados seriam necessários para o selo de rank, Dashboard e Reels.
4. Mapear se existe infraestrutura reutilizável de compartilhamento/atribuição; não assumir que existe apenas por estar descrita na especificação.
5. Preservar e revalidar o baseline homologado: lazy-loading de imagens, seletor/editor de foto de perfil, spinners personalizados, separadores de categorias e demais correções de UI.
6. Depois da investigação de T09, definir testes de regressão para pedido ativo, pedido cancelado, filtro de cancelados e atualização do status visto pelo próprio cliente.

### Limites deste registro

- Nenhuma causa técnica de T09 foi confirmada nesta etapa.
- Nenhuma alteração de aplicação foi feita como parte deste registro.
- Não foram executados testes automatizados, inspeção de código, deploy ou nova homologação pelo agente.
- T01–T08 e T12 são aprovados apenas no escopo observado manualmente pelo proprietário; não equivalem a garantia geral de ausência de regressões.
- A Fase 0 permanece **em andamento** até concluir o mapeamento de código/contratos e registrar evidências técnicas.

---

## 19. Investigação técnica de T09 — cancelamento e filtro (2026-10-09)

**Status:** causa confirmada por inspeção do código; correção preparada em branch de trabalho, aguardando CI/revisão e ainda não implantada.

### Causas confirmadas

1. Em `apps/api/src/modules/lily/order-operations.ts`, a visão da torre de controle consultava os 200 pedidos mais recentes e só depois aplicava `matchesState` em memória. Pedidos cancelados mais antigos podiam ficar fora do conjunto carregado e, por isso, não aparecer no filtro “Cancelados”.
2. Em `apps/lily_acai/src/features/account/AccountPages.tsx` e `apps/lily_acai/src/features/orders/GuestOrderTrackingPage.tsx`, o status visível ao cliente priorizava o status financeiro e depois o de entrega. Um pedido com `operationStatus = cancelled` e um estado logístico antigo ainda ativo podia ser exibido como em andamento.

### Correção preparada

- O endpoint de visão da torre de controle aplica um filtro Prisma por estado terminal no banco antes de limitar os resultados, incluindo `status` cancelado/estornado, `operationStatus = cancelled` e `deliveryStatus = cancelled`.
- A regra de status visível ao cliente foi centralizada em `apps/lily_acai/src/features/orders/status.ts`; cancelamento operacional/logístico passa a prevalecer sobre estados não terminais antigos, preservando “estornado” quando o estado financeiro for `refunded`.
- As telas de pedidos da conta e de acompanhamento guest usam a mesma função para evitar divergência de comportamento.

### Arquivos de código alterados

- `apps/api/src/modules/lily/order-operations.ts`
- `apps/api/src/modules/lily/order-operations.test.ts`
- `apps/lily_acai/src/features/account/AccountPages.tsx`
- `apps/lily_acai/src/features/orders/GuestOrderTrackingPage.tsx`
- Novo: `apps/lily_acai/src/features/orders/status.ts`
- Novo: `apps/lily_acai/src/features/orders/status.test.ts`

### Regressões adicionadas

- Teste de integração da torre de controle com mais de 200 pedidos ativos recentes, verificando que um pedido cancelado mais antigo ainda aparece no filtro “Cancelados”.
- Testes unitários para garantir que cancelamento operacional/logístico prevaleça sobre estados ativos antigos, sem substituir um estorno financeiro por “cancelado”.

### Limites e próximos passos

- Os testes foram adicionados, mas **ainda não foram executados neste ambiente**. A execução de CI no PR é necessária para confirmar compilação e comportamento.
- Não houve deploy nem homologação manual da correção.
- A ação financeira “Cancelar cobrança” continua sendo distinta de “Cancelar pedido”; não foi alterada para cancelar automaticamente o pedido, pois isso poderia impedir uma nova tentativa de pagamento.
- Após CI verde e merge, implantar na VPS e repetir T09: filtro Cancelados, fila Ativos, status em conta autenticada e status no link de acompanhamento guest.

### Atualização após merge — 2026-10-09

- PR [#158](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/158) foi integrado por squash à branch `cooklily/canonical`.
- Commit de merge: `287b5327bc750597aca4d187c68e5ac6c63a5727`.
- A verificação dos status do commit e das execuções de workflow retornou **nenhum status/execução de CI disponível**. Portanto, não afirmar que os testes passaram: os testes de regressão estão no repositório, mas não foram executados neste ambiente.
- A correção está no código da branch canonical, mas **não foi implantada na VPS nem homologada manualmente**.
- Próxima ação operacional: executar os testes relevantes e o preflight num checkout da branch canonical; depois implantar em janela controlada e repetir T09 para pedido cancelado operacionalmente, cancelado logisticamente, cancelado antigo fora dos 200 mais recentes e pedido ativo normal.
