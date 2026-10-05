# Status do projeto — 29/08/2026

Este documento consolida as decisões e trabalhos mais recentes do projeto **Carro Chefe**, cruzando o estado da `main`, as frentes em branches e as definições amadurecidas nas conversas de projeto.

> Convenção: **Novo/definido** = decisão ou direção já estabelecida; **Em progresso** = existe trabalho, protótipo ou branch ainda não consolidada na `main`; **Futuro** = alteração planejada, dependente de validação, execução física ou desenvolvimento posterior.

## Resumo executivo

O projeto deixou de ser apenas uma fundação de negócio/software e passou a incluir, de forma concreta, a implantação física da lanchonete, refinamento da identidade visual, apresentação do produto, autoatendimento compacto, rastreamento de campanhas por QR Code e evolução do Centro Operacional.

As frentes mais ativas são:

1. reforma e ambientação da área externa;
2. consolidação da identidade visual e aplicações da marca;
3. representação visual/fotográfica do Chefão e materiais publicitários;
4. totem compacto de pedidos integrado ao balcão;
5. QR Lab com IDs de rastreamento para campanhas e variações;
6. evolução da Central Operacional e governança de agentes;
7. continuidade do planejamento de ERP, operação, cardápio e abertura.

---

## 1. Espaço físico e reforma da lanchonete

### Novo/definido

A direção visual da área externa foi refinada a partir das fotos reais do ponto. A reforma deve ser executável no terreno existente e preservar proporções, árvores, cobertura, calçada, posição do quiosque e leitura arquitetônica real do local.

Diretrizes atualmente aprovadas/consolidadas nas conversas:

- linguagem **rústica, moderna, profissional e convidativa**, coerente com a marca;
- muro principal em **preto**, usando a assinatura **“Sabor que lidera”** no muro direito;
- madeira como material visual importante, inclusive em piso/acabamentos onde for tecnicamente viável;
- mesas e mobiliário com linguagem rústica;
- manter a área arborizada e a grama, sem transformar o pé das árvores em canteiro volumoso;
- usar mesas na área gramada/arborizada sem espalhar mobiliário excessivamente pelo terreno;
- manter aproximadamente quatro mesas na área frontal coberta, conforme validação final de circulação;
- mesas já existentes/previstas no setor principal podem permanecer quadradas;
- novas mesas altas e redondas devem ficar concentradas **atrás da árvore**, e não ocupando aleatoriamente o restante do salão externo;
- a comunicação externa deve representar baguetes/espetos e os produtos reais da marca, evitando linguagem visual genérica de hamburgueria.

### Em progresso

- simulação arquitetônica/fotorrealista da reforma;
- refinamento da distribuição das mesas e circulação;
- definição estética final do balcão;
- posicionamento visual de sinalização, cardápio e autoatendimento;
- transformação das referências visuais em especificação executiva com medidas, materiais e orçamento.

### Futuro

- levantamento dimensional definitivo do ponto;
- planta operacional e elétrica/hidráulica;
- validação de acessibilidade, fila, retirada, segurança, chuva/sol e ocupação de calçada;
- orçamento por etapas e fornecedores;
- especificação de iluminação, tomadas, rede local, câmeras e infraestrutura do totem/KDS;
- projeto executivo antes da obra.

---

## 2. Balcão, cardápio e totem de pedidos

### Novo/definido

O balcão precisa ganhar mais presença de marca e utilidade. A solução visual anterior foi considerada simples demais e o cardápio instalado no quiosque não deve dominar a fachada.

Foi definida a intenção de usar um **totem pequeno de autoatendimento no próprio balcão**, com escala próxima a uma tela de computador/tablet, inspirado na conveniência dos totens de grandes redes, mas sem o porte de um totem de piso.

O totem promocional de esquina não deve ser confundido com o terminal de pedidos: nas iterações mais recentes da reforma, o foco é manter o **terminal de pedidos no balcão** e liberar a área próxima à árvore para mobiliário.

### Em progresso

Existe a branch `docs/totem-autoatendimento`, que desenvolve um planejamento técnico específico para o autoatendimento. A proposta inclui:

- equipamento compacto e reparável;
- pedido e confirmação no terminal;
- pagamento por adquirente/maquininha certificada;
- arquitetura offline-first;
- armazenamento local durante queda da internet;
- comunicação do totem com a cozinha pela rede local;
- contingência por impressão térmica se KDS/rede local falharem;
- sincronização posterior com ERP;
- prevenção de pedidos duplicados.

Essa documentação ainda precisa ser reconciliada com as decisões físicas mais recentes de posicionamento e tamanho do terminal.

### Futuro

- definir hardware final, tela, suporte, gabinete e fixação no balcão;
- prototipar interface de pedido usando o cardápio real;
- testar ergonomia e visibilidade sem bloquear atendimento humano;
- integrar ERP, pagamento, KDS, impressora e fila de sincronização;
- prever modo manutenção, reinício automático e observabilidade;
- realizar teste de operação sem internet antes da abertura.

---

## 3. Marca e identidade visual

### Novo/definido

A assinatura oficial permanece **“Sabor que lidera”**.

A identidade continua baseada em uma estética colonial/rústica premium: madeira escura, preto, bronze/ouro fosco, pergaminho, metal envelhecido, símbolo do jipe com chapéu de chef e tipografia de personalidade western/serifada usada com moderação.

Na branch `qr-app` já existe uma evolução importante da arquitetura de nomes:

- **Carro Chefe** sem hífen para a marca institucional;
- **Carro‑Chefe** com hífen para a família/produto;
- **Chefão** para o lanche de 30 cm;
- **Lanches** como categoria pública em substituição ao uso de “Paulistinha” na comunicação;
- “Paulistinha” preservado apenas como alias legado interno para rastreabilidade.

### Em progresso

- refinamento das fontes efetivamente usadas nas peças;
- construção/ajuste do modelo 3D do lanche e baguete;
- correção do volume superior da baguete para ficar mais arredondado e fiel à referência real;
- correção das pontas da baguete, evitando aparência achatada;
- revisão da estrutura de modifiers no arquivo 3D, especialmente no objeto `PAO_SUPERIOR_NOVO`;
- desenvolvimento de aplicações consistentes da logo em banners e materiais físicos.

### Futuro

- consolidar manual definitivo de marca;
- registrar fontes e licenças;
- fechar CMYK/Pantone e acabamentos de impressão;
- criar regras de área de proteção e tamanho mínimo;
- produzir templates oficiais para feed, stories, banner, cardápio, etiqueta e placas;
- consolidar na `main` a arquitetura de nomes já documentada na branch de trabalho.

---

## 4. Chefão e apresentação dos produtos

### Novo/definido

O **Chefão** permanece como produto de forte apelo visual e deve ser apresentado como lanche de baguete, não como hambúrguer. A representação precisa priorizar o produto real e evitar exageros típicos de imagem gerada por IA.

Diretrizes visuais amadurecidas:

- mostrar o lanche inteiro quando a peça pedir apresentação de produto;
- evitar abertura exagerada das camadas;
- deixar a carne/espeto claramente visível;
- manter proporções plausíveis da baguete e dos ingredientes;
- evitar aparência de carne moída no espeto;
- reduzir elementos explicativos quando competirem com a fotografia do produto;
- usar o produto como protagonista e a logo/descrição como apoio.

### Em progresso

- refinamento do modelo/render do Chefão;
- banner vertical de calçada;
- ajustes de composição para reduzir “cara de IA”;
- adaptação das artes para edição no Canva e materiais de impressão.

### Futuro

- fotografia real padronizada após receita/gramatura final;
- criação de banco de mídia 4:5, 9:16, 1:1 e horizontal;
- substituição gradual de mockups por fotografia real aprovada;
- validação de banner em tamanho real e distância de leitura;
- integração das imagens aprovadas ao site, cardápio, totem e campanhas.

---

## 5. QR Lab e rastreamento de campanhas

### Novo/definido

A branch `qr-app` contém o novo workspace `apps/qr_manipulator`, concebido para criar e editar QR Codes diretamente no frontend.

O objetivo não é apenas gerar QR Codes bonitos: cada arte/variação pode carregar identificação própria para permitir que o **Centro Operacional** associe scans e conversões à origem física ou criativa.

O trabalho existente na branch já contempla:

- geração no navegador;
- URL, texto, WhatsApp e Wi‑Fi;
- módulos e olhos com formatos personalizáveis;
- cores, margem, correção de erro e resolução;
- background com opacidade;
- imagem central e remoção simples de fundo;
- presets reciclados dos experimentos anteriores;
- parâmetros de tracking `cc_qr`, `cc_campaign` e `cc_variant` em URLs;
- exportação PNG;
- projeto JSON reeditável;
- manifesto de tracking;
- persistência local no navegador.

### Em progresso

- UX do editor;
- validação visual e de leitura dos QR Codes personalizados;
- contrato de tracking com o Centro Operacional;
- organização dos assets/presets;
- consolidação da branch com outras mudanças paralelas do repositório.

### Futuro

- endpoint/redirecionador próprio para registrar scans antes do destino final;
- dashboards no C.O. por campanha, peça, produto e variante;
- correlação entre scan, visita, pedido e venda quando tecnicamente possível e juridicamente adequado;
- geração de IDs de tracking pelo próprio C.O.;
- comparação A/B entre artes de embalagem, banners e materiais de balcão;
- QR Codes distintos por variação de produto/campanha sem perder governança;
- encurtamento de URLs para contornar limites do encoder e melhorar densidade/leitura.

---

## 6. Centro Operacional e agentes

### Novo/definido

A `main` já possui a fundação da Central Operacional, API, contratos, banco Prisma, SSE/webhooks e bridge com agentes Codex. O princípio continua sendo separar:

- **ERP** como fonte oficial de produto, preço, estoque, pedido, pagamento e financeiro;
- **Centro Operacional** como fonte oficial de plano, decisões, riscos, coordenação e execução dos agentes.

### Em progresso

Branches de trabalho mostram uma evolução relevante do C.O., incluindo:

- árvore/base de conhecimento operacional;
- criação de tarefas pela interface;
- atalhos de execução;
- melhorias no chat de gestão e relatórios de execução;
- tipagem e i18n pt-BR;
- modularização de estilos;
- reforço de políticas de agentes;
- segurança de requests/origens;
- uploads e acesso controlado a arquivos;
- webhooks com política de destino, assinatura e idempotência;
- novos contratos e migrações de banco.

### Futuro

- consolidar branches sem misturar mudanças não relacionadas;
- integrar métricas do QR Lab;
- incorporar status de implantação física, compras e obra ao C.O.;
- transformar decisões de marca/reforma em tarefas rastreáveis;
- integrar dados reais do ERP escolhido;
- adicionar painéis de operação, marketing e finanças alimentados por dados reais.

---

## 7. ERP, cardápio e operação

### Estado atual

O roadmap oficial continua organizado pelos portões G0–G6: fundação, viabilidade, produto/unit economics, ERP/equipamentos, ensaio operacional, abertura controlada e primeiros 30 dias.

O cardápio-base documentado inclui espetos, Espeto Completo, Carro‑Chefe Simples, Carro‑Chefe com Cheddar e Chefão, mas ainda existem pendências de gramatura, composição, adicionais, custos, cocção e bebidas.

Branches de trabalho também contêm documentação de avaliação/requisitos de ERP, inclusive materiais relacionados à Datwork e a uma alternativa de ERP sob encomenda.

### Em progresso

- decisão/validação do ERP;
- detalhamento de requisitos transacionais;
- fichas técnicas e unit economics;
- definição de modificadores;
- planejamento de integração do totem e canais;
- preparação de infraestrutura física e digital.

### Futuro

- prova de conceito ponta a ponta com o Chefão;
- cadastro definitivo de receitas, insumos, fornecedores e modificadores;
- baixa de estoque e conciliação de pagamento;
- ensaios de pico e contingência;
- soft opening;
- DRE gerencial, CMV, desperdício, CAC, recompra e avaliação após abertura.

---

## 8. Organização documental e branches

### Situação observada

A `main` mantém os documentos diretamente em `docs/`. A branch `docs/totem-autoatendimento` propõe uma reorganização por domínios (`fundacao`, `governanca`, `negocio`, `operacao`, `tecnologia`) e adiciona um índice `docs/README.md`.

Ao mesmo tempo, `qr-app` e `3d-merge` carregam várias mudanças sobrepostas de Centro Operacional, ERP, marca e assets. Isso aumenta o risco de conflitos e de uma branch temática incorporar alterações que não pertencem ao seu escopo original.

### Recomendação para consolidação

Antes de novos merges grandes:

1. separar documentação/infra compartilhada das features específicas;
2. trazer a reorganização de `docs/` em PR próprio;
3. trazer o totem em PR próprio;
4. trazer o QR Lab em PR próprio;
5. separar mudanças de C.O./segurança/governança que hoje acompanham `qr-app`;
6. tratar assets 3D/fotos do ponto como uma frente própria;
7. atualizar este status a cada decisão importante ou merge de frente.

---

## Próximas prioridades sugeridas

| Prioridade | Frente | Resultado esperado |
|---|---|---|
| P0 | Espaço físico | medidas reais, layout e projeto executável |
| P0 | Produto | Chefão e demais fichas técnicas com custo/gramatura |
| P0 | ERP | decisão por prova de conceito do fluxo real |
| P1 | Totem | protótipo compacto no balcão + contingência validada |
| P1 | Marca | consolidar nomes, fontes e aplicações oficiais |
| P1 | QR Lab | fechar editor + tracking e preparar integração com C.O. |
| P1 | Centro Operacional | consolidar conhecimento/tarefas/segurança em PRs limpos |
| P2 | Marketing | fotografia real, banner final e campanha de pré-abertura |
| P2 | Operação | ensaios, treinamento, KDS, estoque e contingências |

## Critério para considerar uma frente concluída

Uma frente não deve ser marcada como concluída apenas porque existe uma arte, protótipo ou código. Para o projeto Carro Chefe, a conclusão exige, conforme o caso: decisão registrada, responsável, arquivo/versionamento correto, teste no contexto real, impacto operacional conhecido, custo estimado/aprovado, dependências resolvidas e evidência anexada.
