# Social Growth Engine — plano de automação de redes sociais

**Data:** 24/09/2026  
**Status:** planejado; nenhuma implementação deste sistema é declarada neste documento  
**Owner funcional:** `AG-MARKETING`  
**Owner técnico:** `AG-DEV`  
**Apoio:** `AG-MIDIAS`, `AG-DADOS`, `AG-GESTAO`  
**Escopo:** radar de tendências, social listening, geração de backlog/roteiros, aprovação, publicação assistida, analytics e aprendizado contínuo  
**Fora de escopo desta entrega:** implementar código, criar credenciais, conectar contas, publicar conteúdo, comprar mídia ou autorizar respostas automáticas em produção

## 1. Objetivo

Construir uma camada de automação que transforme sinais externos e dados próprios do Carro Chefe em um ciclo contínuo de:

```text
coletar
→ classificar
→ priorizar
→ gerar pauta
→ preparar produção
→ aprovar
→ publicar
→ medir
→ aprender
→ alimentar o próximo ciclo
```

A meta arquitetural é automatizar o trabalho repetitivo e analítico, mantendo pessoas nas decisões em que erro pode afetar marca, oferta, cliente, privacidade, segurança alimentar ou operação.

A automação não deve existir para "postar mais". Ela deve reduzir tempo operacional e aumentar a qualidade da decisão sobre:

- o que produzir;
- para qual estágio do funil;
- em qual plataforma;
- com qual gancho;
- qual pergunta vale fazer;
- qual conteúdo repetir;
- qual trend ignorar;
- qual comentário deve virar resposta;
- qual formato realmente gera cadastro, pedido e margem.

## 2. Princípios

1. **Dados próprios vencem benchmark externo com o tempo.** O radar externo inicia o aprendizado; depois, o histórico do Carro Chefe deve orientar mais peso.
2. **Trend é sinal, não ordem.** Nenhuma tendência obriga alteração de produto, oferta ou identidade.
3. **Human-in-the-loop por padrão.** Publicação comercial e respostas sensíveis exigem aprovação humana até decisão formal em contrário.
4. **Automação fail-closed.** Falha de API, permissão, classificação ou regra deve bloquear a ação externa, não improvisar.
5. **Sem perfil oculto de pessoas.** A análise usa métricas agregadas e sinais permitidos; não constrói score individual com usernames, DMs ou atributos sensíveis.
6. **Uma peça = um ID rastreável.** Todo conteúdo e experimento deve poder ser ligado a hipótese, campanha, versão e métricas.
7. **Métrica de negócio > vaidade.** Alcance e likes são diagnóstico; o funil termina em cadastro válido e, depois da abertura, pedido pago, margem e recompra.
8. **Produto real como núcleo.** IA pode gerar planejamento, copy e roteiro; não deve substituir silenciosamente o produto real por imagens artificiais.
9. **Termos e APIs mudam.** Integrações externas devem ser implementadas contra documentação oficial atual e possuir health checks.

## 3. Resultado pretendido

No Centro Operacional, a frente deve evoluir para:

```text
/gestao/marketing/radar
/gestao/marketing/conteudos
/gestao/marketing/experimentos
/gestao/marketing/audiencia
/gestao/marketing/social-listening
/gestao/marketing/creators
```

Visão conceitual:

```text
REDES + BUSCA + NOTÍCIAS + DADOS PRÓPRIOS
                  │
                  ▼
             SOCIAL RADAR
                  │
                  ▼
       NORMALIZAÇÃO + DEDUPLICAÇÃO
                  │
                  ▼
      TREND / INTENT / RISK ANALYSIS
                  │
                  ▼
            PRIORITY ENGINE
                  │
                  ▼
            CONTENT ENGINE
                  │
                  ▼
           FILA DE APROVAÇÃO
                  │
           ┌──────┴──────┐
           │             │
        rejeita        aprova
                         │
                         ▼
                  PUBLICAÇÃO/API
                         │
                         ▼
                    ANALYTICS
                         │
                         ▼
                  LEARNING ENGINE
                         │
                         └──────────► priorização futura
```

## 4. Componentes planejados

Estrutura conceitual. O caminho final é decisão de `AG-DEV`; não criar diretórios vazios apenas para coincidir com este desenho.

```text
apps/social-intelligence/          # nome de trabalho; ainda não existe
  collectors/
    instagram/
    tiktok/
    youtube/
    google-trends/
    local-news/
    first-party/
  normalization/
  analysis/
    trend-detector/
    local-relevance/
    business-value/
    intent-classifier/
    topic-clustering/
    risk-classifier/
  content/
    idea-generator/
    script-generator/
    shot-list/
    caption-generator/
    platform-adapter/
  publishing/
    approval-gate/
    scheduler/
    instagram/
    tiktok/
    youtube/
    facebook/
  analytics/
    snapshots/
    experiments/
    attribution/
    winner-detector/
    anomaly-detector/
  reports/
    daily/
    weekly/
```

Pode ser mais correto tecnicamente implementar parte disso como módulos de `apps/api` e workers compartilhados em vez de um app novo. O requisito é a separação de responsabilidades, não o caminho literal.

## 5. Fontes de dados

### 5.1 Dados first-party

Prioridade máxima:

- eventos do site;
- `cc_campaign` e `cc_variant`;
- `signup_success`;
- cadastros válidos no banco;
- métricas futuras de pedido pago conciliadas com ERP;
- catálogo de conteúdo publicado;
- resultados de enquetes registrados;
- comentários/perguntas classificados;
- experimentos.

### 5.2 Plataformas sociais

Planejado:

- métricas das contas autorizadas;
- publicações próprias;
- comentários e respostas onde a API/autorização permitir;
- pesquisa/discovery onde houver API oficial adequada;
- publicação/scheduling somente após autenticação, permissões e aceite técnico.

### 5.3 Busca e tendências

- Google Trends;
- YouTube Search;
- TikTok Creative Center como fonte de radar, quando o acesso permitido puder ser operacionalizado de forma compatível com os termos;
- busca manual assistida quando a fonte não expuser API adequada.

### 5.4 Fontes locais

- portais de Campo Grande;
- páginas públicas de gastronomia;
- eventos/novidades locais;
- creators previamente cadastrados no radar;
- termos de busca locais.

Coletores não devem contornar autenticação, CAPTCHAs, limites ou termos de uso. Onde a API não permitir coleta automatizada confiável, o sistema deve registrar a dependência como **manual assistida**, não substituir por scraping frágil ou proibido.

## 6. Estado de viabilidade das integrações em 24/09/2026

### TikTok

A documentação oficial do TikTok confirma uma **Content Posting API** com Direct Post e Upload para conteúdo autorizado. Em clientes não auditados, publicações feitas por Direct Post ficam restritas a visualização privada; a liberação pública exige auditoria/aprovação do cliente e autorização do escopo pertinente.

Implicação:

- P1/P2 pode preparar integração e testes privados;
- publicação pública automática só pode ser marcada como pronta depois da auditoria e dos testes;
- nenhuma credencial fica no Git.

Fontes oficiais:

- https://developers.tiktok.com/docs/en/content-posting-api-get-started
- https://developers.tiktok.com/docs/en/content-posting-api-reference-direct-post
- https://developers.tiktok.com/products/content-posting-api

### YouTube

A YouTube Data API oferece pesquisa e upload de vídeo. Projetos não verificados que fazem upload por API podem ficar limitados a vídeo privado até auditoria/verificação aplicável.

Implicação:

- pesquisa e métricas podem compor radar/analytics conforme quotas;
- upload automático exige OAuth, gestão segura de tokens, quota e revisão de política;
- não tratar quota como infinita.

Fontes oficiais:

- https://developers.google.com/youtube/v3/docs/search/list
- https://developers.google.com/youtube/v3/docs/videos/insert
- https://developers.google.com/youtube/v3/docs/videos

### Google Trends

O Google disponibiliza dataset público do Trends no BigQuery com consultas principais e em ascensão, incluindo cobertura internacional por país/sub-região quando disponível.

Implicação:

- bom sinal macro e regional;
- não assumir granularidade municipal para Campo Grande sem verificar o registro retornado;
- usar como uma das fontes, não como prova isolada de trend local.

Fonte oficial:

- https://support.google.com/trends/answer/12764470?hl=pt-BR

### Instagram / Facebook

Integração é planejada, mas a implementação deve verificar no momento do desenvolvimento:

- tipo da conta;
- produto/API aplicável;
- permissões;
- endpoints permitidos;
- limites;
- recursos de publicação;
- comentários;
- insights;
- requisitos de revisão do app.

Nenhuma capacidade específica de Meta deve ser marcada como implementada apenas com base neste documento.

## 7. Modelo de entidades

IDs abaixo são conceituais e devem ser harmonizados com `packages/contracts` e Prisma pelo AG-DEV.

### 7.1 TrendCandidate

```text
id
platform
source
observedAt
regionScope
topic
format
audioRef?
exampleUrl?
stage            # rising | peak | declining | unknown
confidence       # A | B | C
expiresAt?
rawSignals
trendScore
businessValueScore
riskScore
status           # observed | shortlisted | rejected | converted
reason
```

### 7.2 SocialContent

```text
id
platform
campaign
variant
pillar
series
format
productId?
trendId?
hook
cta
script
shotList
caption
status
owner
rightsStatus
approvedBy?
approvedAt?
scheduledAt?
publishedAt?
externalPostId?
```

Estados mínimos:

```text
idea
→ planned
→ ready_to_record
→ recorded
→ editing
→ review
→ approved
→ scheduled
→ published
→ analyzed
→ retired
```

### 7.3 MetricSnapshot

```text
contentId
platform
capturedAt
window
views?
reach?
watchTime?
completionRate?
shares?
saves?
comments?
profileVisits?
followersGained?
linkClicks?
attributedSessions?
attributedSignups?
sourceDefinitionVersion
```

Não exigir que todas as plataformas forneçam todos os campos.

### 7.4 SocialSignal

Para comentários, perguntas ou eventos categorizados:

```text
id
platform
contentId?
observedAt
category
intentLevel
sentiment?
normalizedTopic
requiresHuman
rawReference?
retentionExpiresAt?
```

O texto bruto e identidade do autor só devem ser persistidos quando houver finalidade legítima e retenção definida. Para analytics, preferir categoria agregada.

### 7.5 Experiment

```text
id
hypothesis
primaryMetric
secondaryMetrics
controlContentId?
variantContentIds[]
startAt
endAt?
status
decision
evidence
```

## 8. TrendScore e BusinessValueScore

A pontuação deve ser transparente e versionada. Primeira hipótese:

### TrendScore

```text
20% velocidade
20% aderência local
15% aderência gastronômica
15% aderência à marca
10% compartilhamento provável
10% capacidade de gerar pesquisa
10% facilidade de execução
- penalidades de risco/saturação
```

Faixas iniciais:

| Score | Ação sugerida |
|---:|---|
| 80–100 | avaliar produção imediata |
| 65–79 | backlog |
| 45–64 | observar |
| 0–44 | descartar/arquivar |

### BusinessValueScore

Pontuar separadamente:

- encaixe no funil;
- capacidade de explicar produto;
- potencial de visita ao perfil/site;
- potencial de gerar dado útil;
- proximidade com intenção de compra;
- reutilização;
- custo/tempo de produção;
- impacto operacional.

Uma trend com `TrendScore` alto e `BusinessValueScore` baixo não deve vencer automaticamente um conteúdo menos viral e mais útil ao negócio.

### Guardrail

O score **não publica nem promete nada**. Ele só ordena candidatos.

## 9. Aprendizado com conteúdo próprio

Cada conteúdo publicado vira um experimento observacional ou controlado.

Janelas sugeridas, ajustáveis por plataforma:

```text
1h
6h
24h
72h
7d
```

O engine deve calcular baseline por:

- plataforma;
- formato;
- duração;
- série;
- estágio do funil;
- tamanho da conta/período.

Exemplos de achados que o sistema pode produzir:

- "maçarico no primeiro frame apresentou retenção superior à baseline";
- "Chefão gera mais alcance, mas Simples gera mais sessões no site por 1.000 visualizações";
- "perguntas binárias produzem mais respostas categorizáveis que caixas abertas".

### Regra estatística

Não declarar causalidade só porque uma peça performou melhor. Diferenciar:

- observação;
- correlação;
- teste controlado;
- decisão operacional.

## 10. Social listening

Pipeline:

```text
comentário/pergunta
→ limpeza/minimização
→ classificador
→ categoria
→ nível de intenção
→ risco
→ agregado
→ ação sugerida
```

Taxonomia inicial:

- preço;
- abertura;
- localização;
- horário;
- produto;
- espeto;
- molho;
- tamanho;
- delivery;
- ambiente;
- acesso/estacionamento;
- elogio;
- reclamação;
- dúvida;
- intenção de compra;
- ideia;
- outro.

Saída diária:

```text
top dúvidas
top objeções
top intenções
termos espontâneos
novos temas
assuntos sem resposta
conteúdos recomendados
```

### Comentário → pauta

Exemplo:

```text
sinal:
18 perguntas sobre o tamanho do Chefão

ação:
criar conteúdo mostrando os 30 cm com referência física real

métrica:
profile_visit + attributed_session
```

## 11. Content Engine

A saída não é apenas "uma ideia"; é um pacote de produção.

```text
content_id
prioridade
plataforma
estágio do funil
série
objetivo
gancho
roteiro
shot list
texto na tela
CTA
caption
variante por plataforma
métrica primária
trend associada
prazo de validade
restrições
```

### Geração automática permitida

- ideias;
- agrupamento de perguntas;
- roteiros;
- shot list;
- texto de tela;
- legenda;
- CTA;
- versões por plataforma;
- checklist de gravação;
- proposta de experimento.

### Não autorizar sem humano

- preço/oferta nova;
- data de abertura;
- claim de saúde/nutrição;
- resposta a crise;
- alegação competitiva;
- promessa de entrega;
- publi com creator;
- uso de imagem/voz de pessoa sem direito registrado;
- alteração de produto.

## 12. Fila de aprovação

Visão pretendida:

```text
RADAR           42
CANDIDATAS      11
PAUTAS           7
GRAVADAS         4
EM REVISÃO       4
APROVADAS        3
AGENDADAS        3
PUBLICADAS       3
EM ANÁLISE       3
```

Ações:

- **aprovar**;
- **pedir alteração**;
- **descartar**.

Aprovação deve registrar:

- ator;
- data;
- versão do conteúdo;
- escopo aprovado;
- observação;
- eventual validade.

Alterar legenda, preço, oferta ou mídia depois da aprovação deve invalidar aprovação quando a mudança for material.

## 13. Publicação

### Fase inicial

Publicação continua manual ou semiautomática:

```text
conteúdo aprovado
→ pacote final
→ humano publica/agende
→ registra externalPostId
→ analytics começa
```

### Fase madura

```text
conteúdo aprovado
→ scheduler
→ adaptador da plataforma
→ publicação
→ confirmação/status
→ externalPostId
→ analytics
```

### Regras

- sem aprovação válida: não publicar;
- erro/timeout: estado `publish_failed`, nunca duplicar silenciosamente;
- idempotência por `contentId + platform + version`;
- retries limitados;
- registrar resposta externa sem armazenar tokens;
- publicação programada usa timezone operacional explícito;
- apagar/republicar exige nova decisão humana, salvo retry idempotente comprovado.

## 14. Respostas automáticas

Estratégia por risco.

### Verde — elegível futuramente para automação

Somente respostas factuais e estáveis, por exemplo quando aprovadas:

- localização;
- link oficial;
- composição já publicada;
- como entrar na Lista dos Primeiros.

Mesmo respostas verdes devem usar fonte canônica e permitir desativação imediata.

### Amarelo — IA prepara, humano aprova

- preço ainda sujeito a contexto;
- abertura;
- delivery;
- reservas;
- disponibilidade;
- exceções.

### Vermelho — sempre humano

- reclamação;
- alergia;
- segurança alimentar;
- pedido/pagamento;
- acidente;
- ameaça;
- imprensa;
- jurídico;
- creator/parceria;
- conflito;
- privacidade/dados;
- qualquer mensagem sensível.

## 15. Enquetes como dados estruturados

Objetivo: transformar pesquisa de Story em histórico auditável.

Exemplo:

```text
poll_id: POLL-029
question: Qual espeto você pediria primeiro?
options:
  carne: 47%
  frango: 23%
  linguiça: 21%
  queijo: 9%
n: 382
campaign: prelaunch-social
observedAt: 2026-10-02
source: instagram-story
```

Regras:

- salvar `n`;
- não comparar porcentagens com bases muito diferentes sem contexto;
- registrar texto/pergunta exatos;
- não ligar voto individual a telefone;
- permitir repetir pergunta para verificar estabilidade;
- depois da abertura, comparar preferência agregada com mix real de vendas.

## 16. Anomaly / Winner Detector

O sistema deve destacar mudanças relevantes, não gerar dashboard passivo.

Exemplos:

```text
ALERTA
Reel SOC-X teve 2,4x mais compartilhamentos que a mediana
do mesmo formato e janela.

Hipótese:
primeiro frame com queijo maçaricado.

Próxima ação:
criar 2 variações mantendo primeiro frame
e mudando somente CTA.
```

```text
ALERTA
Conteúdo de reforma gerou seguidores,
mas baixa taxa de visita ao site.

Ação:
manter como topo de funil;
não aumentar participação no mix sem evidência adicional.
```

### Regras

- exigir baseline mínima antes de chamar algo de anomalia;
- comparar itens equivalentes;
- incluir tamanho de amostra;
- evitar "vencedor" com diferença pequena/ruidosa;
- decisão humana continua registrada.

## 17. Relatórios

### Diário

```text
novas trends relevantes
conteúdos acelerando
conteúdos abaixo da baseline
perguntas novas
principais objeções
sessões atribuídas
cadastros atribuídos
ações recomendadas
bloqueios
```

### Semanal

```text
alcance e retenção
compartilhamentos/salvamentos
visitas ao perfil
sessões no site
cadastros
custo, quando houver mídia
preferências coletadas
objeções
top hooks
top produtos
creators observados
experimentos
decisões
próximos testes
```

O relatório deve distinguir métrica disponível de métrica ausente. Nunca preencher lacuna com zero.

## 18. Atribuição

Usar o contrato first-party existente.

Proposta conceitual para social:

```text
cc_campaign=prelaunch-social
cc_variant=<content-id-ou-variante>
utm_source=<platform>
utm_medium=organic_social|paid_social
utm_campaign=prelaunch_social
utm_content=<content-id>
```

Regras:

- não usar `cc_qr` em link que não representa QR;
- nenhum PII na URL;
- IDs imutáveis depois de publicados;
- redirector first-party é preferível no futuro;
- Instagram/TikTok/YouTube podem ter limitações de link; registrar a rota real usada;
- `signup_success` só conta depois da persistência confirmada;
- pedido só conta como venda depois da conciliação com ERP.

## 19. Segurança, privacidade e segredos

### Segredos

Tokens e refresh tokens:

- somente secret store/variáveis de ambiente;
- nunca Git;
- nunca relatório;
- rotação suportada;
- menor escopo possível.

### Webhooks

Quando disponíveis:

- assinatura verificada;
- idempotência;
- replay protection quando suportado;
- rate limit;
- log com redaction.

### Dados

- PII separada de analytics;
- username não vira ID universal de cliente;
- não fazer fingerprint;
- não inferir atributo sensível;
- retenção definida por domínio;
- exclusão/revogação respeitada;
- dados de produção não entram em fixtures.

## 20. Observabilidade

Cada job:

```text
jobId
provider
startedAt
finishedAt
status
itemsRead
itemsCreated
itemsUpdated
rateLimitState?
errorCode?
retryCount
```

Health checks:

- autenticação válida;
- última coleta;
- última publicação;
- fila travada;
- quota/rate limit;
- atraso do scheduler;
- número de falhas consecutivas.

Alertas críticos:

- token inválido;
- publicação duplicada;
- conteúdo publicado sem aprovação;
- PII detectada em URL/analytics;
- fila parada;
- webhook inválido em volume anormal.

## 21. Jobs sugeridos

Frequências finais devem respeitar quotas e custo.

| Job | Cadência inicial | Fase |
|---|---|---|
| coletar métricas próprias | 1–6 h conforme plataforma | 1 |
| social listening | 1–6 h | 1 |
| radar local/notícias | 2–4x/dia | 1 |
| Google Trends | diário | 1 |
| YouTube discovery | diário | 1 |
| gerar candidatos de pauta | diário | 1 |
| relatório diário | diário | 1 |
| relatório semanal | semanal | 1 |
| snapshots pós-publicação | 1h/6h/24h/72h/7d | 1 |
| scheduler de publicação | sob demanda | 3 |
| respostas automáticas verdes | near-real-time somente após maturidade | 3 |

Nada deve rodar a cada poucos minutos sem necessidade comprovada.

## 22. Fases

## Fase 1 — Inteligência automática

Maior retorno/menor risco.

Entregas:

1. entidades e contratos;
2. catálogo de conteúdo;
3. ingestão de métricas próprias;
4. social listening;
5. radar de fontes permitidas;
6. TrendScore + BusinessValueScore versionados;
7. Content Queue;
8. relatório diário/semanal;
9. snapshots;
10. anomalias e recomendações;
11. dashboard no C.O.;
12. trilha de auditoria.

**Não inclui publicação automática.**

### Critérios de aceite F1

- nenhuma ação externa é feita pelo engine;
- jobs são idempotentes;
- falha de uma fonte não derruba todas;
- score explica os fatores;
- conteúdo sugerido guarda evidência/origem;
- dados pessoais não aparecem no analytics;
- relatório distingue ausência de dado de zero;
- retries e rate limit são testados;
- UI mostra estado e última atualização;
- testes cobrem fixtures de duplicidade/falha.

## Fase 2 — Fábrica assistida de conteúdo

Entregas:

1. gerador de pauta estruturada;
2. roteiro;
3. shot list;
4. legenda;
5. versões por plataforma;
6. fila de aprovação;
7. histórico de versões;
8. pacote de publicação;
9. registro de direitos/consentimento;
10. recomendações baseadas em conteúdo vencedor.

### Critérios de aceite F2

- nenhuma informação comercial nova é inventada;
- conteúdo factual consulta fonte canônica;
- mudança material invalida aprovação;
- toda peça tem `contentId`;
- operador consegue aprovar/rejeitar/solicitar mudança;
- saída para cada plataforma é revisável antes da publicação.

## Fase 3 — Distribuição e ciclo fechado

Entregas:

1. OAuth/credenciais de plataformas;
2. adaptadores de publicação permitidos;
3. scheduler;
4. confirmação de status;
5. retries idempotentes;
6. coleta automática pós-publicação;
7. respostas verdes opcionais;
8. creator tracking;
9. otimização do backlog baseada no histórico próprio.

### Critérios de aceite F3

- integração oficialmente permitida e testada por plataforma;
- auditorias/reviews externos concluídos quando exigidos;
- nenhum post sem aprovação;
- nenhum post duplicado em retry;
- kill switch por plataforma;
- logs sem token;
- revogação de acesso testada;
- fallback manual documentado;
- publicação desativada quando health check de credencial falha.

## 23. Critérios para automação sem aprovação por peça

**Não faz parte do MVP.**

Uma categoria só pode deixar de exigir aprovação por peça após decisão explícita da Gestão, quando:

- template estável;
- fonte factual canônica;
- nenhum preço/oferta mutável;
- nenhuma mídia de terceiro;
- nenhuma pessoa identificável sem direito persistido;
- pelo menos histórico suficiente sem incidentes;
- rollback/kill switch;
- taxa de erro medida;
- limites de horário/frequência;
- testes automatizados;
- aprovação jurídica/operacional quando pertinente.

Mesmo nesse estágio, campanhas, promoções, claims, crise e resposta sensível continuam humanas.

## 24. Handoffs

### AG-MARKETING

Define:

- objetivo do funil;
- taxonomias;
- scores e pesos de negócio;
- hipóteses;
- critérios editoriais;
- matriz de aprovação.

Não implementa software.

### AG-MIDIAS

Define:

- formatos;
- requisitos de arquivo;
- biblioteca;
- roteiro de gravação;
- direitos de uso;
- estados de produção.

### AG-DADOS

Define:

- contratos;
- eventos;
- retenção;
- agregações;
- atribuição;
- baseline/anomalia;
- qualidade;
- reconciliação com ERP.

### AG-DEV

Implementa:

- banco;
- jobs;
- integrações;
- OAuth;
- UI;
- scheduler;
- observabilidade;
- testes;
- segurança;
- deploy.

### AG-GESTAO

Aprova:

- mudanças de escopo;
- automação de ação externa;
- novas categorias auto-publicáveis;
- gastos;
- riscos;
- exceções.

## 25. Backlog técnico recomendado

### SG-001 — contratos de domínio
TrendCandidate, SocialContent, MetricSnapshot, SocialSignal, Experiment.

### SG-002 — catálogo de conteúdo
CRUD + estados + IDs + origem + campanha + direitos.

### SG-003 — ingestão first-party
Sessões/cadastros/campanhas sem duplicação de PII em analytics.

### SG-004 — coletor de métricas sociais
Começar pela plataforma com acesso oficial mais simples da conta real.

### SG-005 — social listening
Taxonomia + agregação + fila de resposta.

### SG-006 — trend ingestion
Google Trends, YouTube e fontes locais permitidas.

### SG-007 — scoring
TrendScore/BusinessValueScore/RiskScore com versão.

### SG-008 — Content Queue
Prioridade, motivo, evidência e status.

### SG-009 — Content Engine
Pauta → roteiro → shot list → variantes.

### SG-010 — approval workflow
Versionamento, approve/change/reject e auditoria.

### SG-011 — analytics snapshots
1h/6h/24h/72h/7d quando permitido.

### SG-012 — anomaly detector
Baseline, comparação e recomendações.

### SG-013 — daily/weekly reports
Geração e visualização no C.O.

### SG-014 — OAuth/secrets
Infraestrutura por provider.

### SG-015 — publisher adapters
TikTok/YouTube/Meta conforme revisão oficial.

### SG-016 — scheduler
Timezone, idempotência, retry e kill switch.

### SG-017 — automated replies
Somente categoria verde e depois de decisão própria.

### SG-018 — creator tracking
Cadastro de creator, campanha e resultado atribuído.

## 26. Ordem recomendada

```text
SG-001
  ↓
SG-002 + SG-003
  ↓
SG-004 + SG-005 + SG-006
  ↓
SG-007 + SG-008
  ↓
SG-011 + SG-012 + SG-013
  ↓
SG-009 + SG-010
  ↓
Fase 1/2 validadas
  ↓
SG-014
  ↓
SG-015 + SG-016
  ↓
SG-017 + SG-018
```

Não começar por publicação automática. Primeiro construir a memória e o sistema de decisão.

## 27. Métrica de sucesso da automação

Além das métricas de marketing, medir o próprio sistema:

- horas humanas por semana em coleta/relatório;
- % de dados coletados sem intervenção;
- % de pautas que chegam a gravação;
- % de peças aprovadas sem retrabalho;
- latência sinal → pauta;
- latência publicação → análise;
- taxa de jobs com sucesso;
- duplicidades;
- incidentes de privacidade;
- incidentes de publicação;
- custo computacional/API por conteúdo publicado;
- decisões úteis geradas por semana.

O sistema é bem-sucedido quando reduz trabalho repetitivo **sem reduzir controle, qualidade ou segurança**.

## 28. Dependências e decisões pendentes

| Item | Owner | Estado |
|---|---|---|
| contas profissionais e acessos oficiais | Gestão | pendente |
| política de credenciais/OAuth por provider | Dev/Gestão | pendente |
| definição final dos campos sociais no banco | Dados/Dev | pendente |
| pesos iniciais dos scores | Marketing/Dados | hipótese |
| regras de retenção de comentário bruto | Dados/Gestão | pendente |
| política de creator tracking | Marketing/Gestão | pendente |
| permissão para publicação automática | Gestão | não aprovada |
| permissão para resposta automática | Gestão | não aprovada |
| infraestrutura de produção da C.O. autenticada | Dev/Gestão | dependência |
| integração ERP para pedido/margem | Finanças/Dev/Dados | dependência futura |

## 29. Relação com documentos existentes

- [Radar de trends de Campo Grande](../negocio/REDES_SOCIAIS_TRENDS_CAMPO_GRANDE_2026.md): fornece sinais e regras editoriais.
- [Funil social de pré-lançamento](../negocio/FUNIL_SOCIAL_PRE_LANCAMENTO.md): define estágios, conteúdo, perguntas e KPIs.
- [Marketing e mídias](../negocio/MARKETING_MIDIAS.md): posicionamento e governança comercial.
- [Analytics e privacidade](../pre-lancamento/ANALYTICS_PRIVACIDADE.md): regras de dados/consentimento.
- [Atribuição omnicanal](./ATRIBUICAO_OMNICANAL.md): contrato de origem.
- [Arquitetura técnica V2](./ARQUITETURA_TECNICA_V2.md): aplicações, API, workers e C.O.
- [Pendências de ferramentas](../ferramentas/PENDENCIAS.md): registra a capacidade ainda inexistente.

## 30. Definição de pronto do projeto completo

O Social Growth Engine só pode ser tratado como completo quando:

- radar e coletores têm fontes documentadas;
- cada integração tem permissão oficial e health check;
- modelo de dados está versionado;
- scoring é explicável;
- Content Queue funciona;
- relatórios são automáticos;
- aprovação é auditável;
- publicação, quando habilitada, é idempotente e reversível;
- nenhuma ação externa ocorre fora das regras;
- analytics preserva privacidade;
- métricas sociais se conectam a cadastro;
- pedido/margem entram apenas após ERP;
- testes de falha, quota, token expirado, retry e duplicidade passam;
- documentação operacional e runbook existem;
- kill switch foi testado;
- Gestão aprovou explicitamente qualquer nível de automação externa.
