# Analytics, privacidade e relatórios — pré-lançamento

## 1. Objetivo

Medir com clareza o caminho do visitante desde o QR do banner até o cadastro e, depois da abertura, até pedido pago, margem e recompra.

A coleta deve respeitar minimização de dados e manter dados identificáveis separados do comportamento analítico sempre que possível.

## 2. Separação de domínios

### Lead identificado

Pode conter:

- `id` interno;
- `firstName` opcional;
- `phoneNormalized`;
- `marketingConsentAt`;
- `consentVersion`;
- `privacyPolicyVersion`;
- `ccQr`;
- `ccCampaign`;
- `ccVariant`;
- `firstSeenAt`;
- `signupAt`;
- `status` (`active`, `unsubscribed` etc.);
- `rewardCode` quando existir;
- `rewardRedeemedAt` quando existir.

### Sessão analítica

Pode conter:

- identificador anônimo/pseudônimo de sessão;
- origem/campanha;
- páginas e seções vistas;
- timestamps;
- duração/engajamento;
- dispositivo e resolução em nível apropriado;
- eventos de interface;
- métricas de navegação.

### Regra

Não enviar nome, telefone, endereço ou conteúdo livre para:

- URL;
- parâmetros de campanha;
- GA4;
- Clarity;
- plataformas de anúncios.

## 3. Consentimento

O visitante deve conseguir:

- aceitar analytics não essenciais;
- recusar analytics não essenciais;
- continuar usando o formulário mesmo recusando;
- acessar política de privacidade;
- cancelar comunicações futuras.

O texto de opt-in de comunicação deve ser independente do consentimento de analytics.

Mensagem-base de cadastro:

> Quero receber pelo WhatsApp novidades, informações da inauguração e promoções do Carro Chefe. Posso cancelar quando quiser.

Registrar a versão do consentimento aceito para permitir auditoria futura.

## 4. Política de privacidade

A versão pública deve refletir a implementação real e incluir, no mínimo:

1. identificação do controlador;
2. categorias de dados coletados;
3. finalidades;
4. base legal validada para cada finalidade;
5. ferramentas analíticas e fornecedores relevantes;
6. retenção e critérios de descarte;
7. compartilhamentos;
8. direitos do titular;
9. mecanismo para cancelar mensagens;
10. mecanismo para alterar preferência de cookies/analytics;
11. contato para solicitações de privacidade.

O texto deve passar por revisão jurídica antes de ser tratado como política definitiva.

## 5. Ferramentas recomendadas

### P0 — GA4

Usar para visão quantitativa:

- sessões;
- origens;
- campanhas;
- dispositivos;
- eventos;
- funil;
- conversão.

### P0/P1 — Microsoft Clarity

Usar para leitura qualitativa:

- heatmaps;
- scroll maps;
- attention maps;
- gravações de sessão;
- dead clicks;
- rage clicks;
- excessive scrolling;
- quick backs.

Inputs de formulário e regiões contendo dados identificáveis devem permanecer mascarados.

### Consentimento técnico recomendado

Preferir modo em que tags analíticas completas só executem após opt-in quando isso for viável na configuração escolhida.

## 6. Taxonomia de eventos

### Aquisição

| Evento | Definição |
|---|---|
| `qr_scan` | entrada atribuída a QR identificado |
| `landing_view` | landing carregada com sucesso |

### Interesse

| Evento | Definição |
|---|---|
| `hero_view` | hero visível |
| `section_view` | seção relevante tornou-se visível |
| `product_teaser_view` | teaser de produto visto |

Parâmetro recomendado para `section_view`:

- `hero`;
- `reward`;
- `product_teaser`;
- `brand_story`;
- `social`.

### Conversão

| Evento | Definição |
|---|---|
| `signup_cta_click` | clique no CTA principal |
| `form_start` | início real da interação com formulário |
| `signup_submit` | tentativa de envio |
| `signup_success` | lead persistido |
| `signup_duplicate` | telefone já existente |
| `signup_error` | erro no cadastro |
| `reward_view` | confirmação/benefício exibido |

### Social e suporte

| Evento | Definição |
|---|---|
| `instagram_click` | saída para Instagram |
| `whatsapp_click` | saída para WhatsApp |
| `privacy_open` | política de privacidade aberta |

### Consentimento analítico

| Evento | Definição |
|---|---|
| `consent_analytics_granted` | visitante aceita analytics |
| `consent_analytics_denied` | visitante recusa analytics |

## 7. Relatórios

### Painel executivo

Mostrar:

- QR scans;
- visitantes únicos;
- sessões;
- cadastros válidos;
- taxa QR → cadastro;
- origem por campanha e variante.

### Funil

```text
qr_scan
→ landing_view
→ signup_cta_click
→ form_start
→ signup_success
```

Medir abandono em cada transição.

### Engajamento

- tempo de sessão;
- tempo engajado;
- profundidade de scroll;
- alcance por seção;
- seção com maior retenção;
- cliques principais.

### UX

- `signup_error`;
- dead clicks;
- rage clicks;
- quick backs;
- dispositivo/tela;
- quedas anormais de conversão.

### Social

- Instagram clicks;
- WhatsApp clicks;
- relação entre cadastro e ação social.

### Privacidade

- taxa de opt-in de analytics;
- taxa de opt-in de comunicação;
- cancelamentos;
- falhas de consentimento ou registros inconsistentes.

## 8. KPIs

### Antes da abertura

1. **Taxa QR → cadastro válido**;
2. cadastros válidos totais;
3. taxa `form_start → signup_success`;
4. abandono do formulário;
5. engajamento por seção;
6. comparação por QR/variante;
7. cliques para Instagram/WhatsApp.

### Depois da abertura

Adicionar:

1. benefício entregue;
2. benefício resgatado;
3. cadastro → primeira compra;
4. ticket médio da coorte;
5. margem da coorte;
6. recompra em 30/60/90 dias;
7. receita e margem atribuídas por campanha/QR.

## 9. O que significa “por quanto tempo cada cliente navegou”

A implementação recomendada é medir **tempo por sessão anônima/pseudônima**, e não associar gravações de navegação diretamente ao telefone da pessoa.

Isso é suficiente para responder:

- quanto tempo as sessões duram;
- onde a atenção se concentra;
- qual seção precede cadastro;
- quais padrões de navegação indicam fricção.

Identificar nominalmente cada replay aumenta risco de privacidade sem benefício proporcional para esta campanha.

## 10. Central Operacional

A visualização consolidada deve ficar em área interna, por exemplo:

```text
/gestao/marketing/pre-lancamento
```

P0 pode operar inicialmente nos painéis dos fornecedores, mas P1 deve trazer ao C.O. pelo menos:

- resumo diário;
- funil;
- comparação por QR/variante;
- cadastros;
- consentimentos;
- alertas de erro.

## 11. Critérios de aceite de dados

- nenhum PII aparece em eventos analíticos;
- `cc_*` persiste durante a jornada necessária para atribuição;
- cadastro duplicado não infla conversões;
- recusa de analytics é respeitada;
- eventos não disparam múltiplas vezes sem motivo;
- `signup_success` só ocorre após persistência confirmada;
- relatórios distinguem sessão, visitante e lead;
- timezone operacional é `America/Campo_Grande` nas leituras internas;
- métricas de pedido futuro são conciliadas com o ERP, nunca inferidas apenas do site.
