# Implementação AG-DEV — pré-lançamento do Carro Chefe

**Branch:** `dev/pre-lancamento-site`  
**Base:** `marketing/pre-lancamento-banner-site` @ `334ae003a6c03ba89a64f40a70a7535d6c768bbb`  
**Responsável:** `AG-DEV`  
**Data:** 2026-09-12  
**Estado:** implementação P0 concluída na branch; validação automatizada/CI e homologação física ainda são gates de integração.

## 1. Fontes de verdade lidas antes da implementação

A implementação foi feita a partir de:

1. `AGENTS.md` — regras gerais, responsabilidades, segurança, Git e definição de pronto;
2. `site/AGENTS.md` — regras específicas do site público;
3. `docs/pre-lancamento/HANDOFF_DESENVOLVIMENTO.md` — escopo P0 e critérios de aceite;
4. `docs/pre-lancamento/ANALYTICS_PRIVACIDADE.md` — separação entre lead identificado e sessão analítica;
5. `docs/pre-lancamento/QR_ATRIBUICAO.md` — contrato `cc_qr`, `cc_campaign`, `cc_variant`;
6. `docs/pre-lancamento/PSICOLOGIA_UI.md` — princípios de redução de atrito definidos pelo Marketing;
7. `docs/ARQUITETURA_TECNICA_V2.md` — arquitetura React/Vite + Fastify + Prisma/SQLite e restrições de produção.

Não foi criada uma segunda aplicação nem um backend paralelo. O P0 foi encaixado na plataforma existente.

---

## 2. Resumo do que mudou

O endereço público deixou de apresentar uma experiência orientada a pedido/cardápio e passou a apresentar o estado real de pré-inauguração.

O fluxo agora é:

```text
banner físico / QR
    ↓
https://carrochefe.com/?cc_qr=...&cc_campaign=...&cc_variant=...
    ↓
landing React mobile-first
    ↓
formulário inline + consentimento de WhatsApp
    ↓
POST /api/v1/public/prelaunch/signup
    ↓
normalização + validação + deduplicação no Fastify
    ↓
PrelaunchLead no SQLite/Prisma
    ↓
sucesso real / duplicata / erro
```

Quando analytics é aceito:

```text
interação anônima/pseudônima
    ↓
POST /api/v1/public/prelaunch/events
    ├── PrelaunchAnalyticsEvent (first-party)
    ├── GA4, se VITE_GA4_ID estiver configurado
    └── Clarity, se VITE_CLARITY_ID estiver configurado
```

Quando analytics é recusado, o segundo fluxo não é executado; o cadastro continua igual.

---

## 3. Etapas executadas

### Etapa 1 — isolamento da entrega

Foi criada a branch `dev/pre-lancamento-site` diretamente do último commit da branch de Marketing. Nenhuma alteração foi feita em `main`, e nenhuma publicação, merge, DNS ou VPS foi executada.

**Decisão:** preservar o handoff de Marketing como base exata da implementação evita misturar requisitos posteriores ou alterações não revisadas.

### Etapa 2 — contrato de domínio e normalização

Foi criado `apps/api/src/modules/prelaunch/service.ts` com:

- versão explícita do consentimento de WhatsApp;
- versão explícita do aviso de privacidade;
- allowlist de eventos;
- normalização de telefone brasileiro;
- limpeza do primeiro nome opcional;
- sanitização dos campos `cc_*`;
- proteção contra `firstSeenAt` arbitrariamente antigo ou futuro.

Exemplos abaixo convergem para o mesmo valor persistido:

```text
67992046721
(67) 99204-6721
+55 67 99204-6721

→ +5567992046721
```

**Decisão:** a normalização é refeita no servidor mesmo existindo validação no navegador. O frontend melhora UX; o backend continua sendo a fronteira de confiança.

### Etapa 3 — persistência separada por finalidade

O Prisma foi configurado para schema multifile, mantendo `schema.prisma` existente e adicionando `prelaunch.prisma`.

Foram criados dois modelos independentes:

#### `PrelaunchLead`

Contém dados necessários ao relacionamento:

- `phoneNormalized` único;
- `firstName` opcional;
- `marketingConsentAt`;
- `consentVersion`;
- `privacyPolicyVersion`;
- `ccQr`;
- `ccCampaign`;
- `ccVariant`;
- `firstSeenAt`;
- `signupAt`;
- `status`;
- timestamps técnicos.

#### `PrelaunchAnalyticsEvent`

Contém somente comportamento sem telefone/nome:

- `sessionId` pseudônimo;
- `event`;
- `ccQr`, `ccCampaign`, `ccVariant`;
- `path` sem query string;
- metadata de UI em allowlist;
- `requestId` técnico;
- timestamp.

A migration está em:

```text
packages/database/prisma/migrations/20260912020000_prelaunch_marketing/migration.sql
```

**Decisão:** lead e analytics não possuem relação por FK. Isso evita criar, por conveniência, um vínculo nominal entre replay/comportamento e WhatsApp.

### Etapa 4 — API pública P0

Foi criado `apps/api/src/modules/prelaunch/routes.ts` e registrado em `buildApp()`.

#### `GET /api/v1/public/prelaunch/config`

Expõe somente versões públicas de consentimento/política.

#### `POST /api/v1/public/prelaunch/signup`

Responsabilidades:

1. validar shape com Zod;
2. exigir `marketingConsent: true`;
3. exigir versões reconhecidas de consentimento/política;
4. rejeitar telefone inválido;
5. normalizar telefone;
6. deduplicar por índice único;
7. preservar first-touch `cc_*`;
8. gravar o lead;
9. responder `created` somente após persistência;
10. responder `duplicate` sem revelar quando o cadastro anterior ocorreu.

Proteções P0:

- rate limit específico de 12 tentativas/minuto por cliente;
- honeypot invisível;
- validação server-side;
- deduplicação com índice único e tratamento de condição de corrida;
- nenhuma credencial no frontend;
- resposta pública não devolve telefone nem ID interno do lead.

#### `POST /api/v1/public/prelaunch/events`

Aceita somente eventos e metadata predefinidos. Não existe campo livre para telefone, nome, endereço ou texto digitado.

Rate limit específico: 180 eventos/minuto por cliente.

**Decisão:** em produção atrás de Nginx, `TRUST_PROXY=true` faz o Fastify/rate-limit interpretar o IP encaminhado pelo proxy controlado. Localmente permanece `false`.

### Etapa 5 — landing de pré-inauguração

`apps/site/src/main.tsx` foi refeito para o P0.

A home `/` agora possui:

- selo `Pré-inauguração · Campo Grande`;
- hero e promessa aprovados pelo Marketing;
- formulário inline no fluxo principal;
- WhatsApp como único dado pessoal obrigatório;
- consentimento de comunicação desmarcado por padrão;
- CTA descritivo `Entrar na Lista dos Primeiros`;
- Instagram/WhatsApp secundários somente depois/abaixo da conversão;
- nenhum botão de pedido antes da abertura;
- nenhum preço, data, contador, prova social ou escassez inventados;
- ausência intencional de foto de produto enquanto não houver ativo real aprovado.

`/welcome` e `/cardapio` redirecionam ao estado vigente `/` durante o pré-lançamento. Isso impede que URLs antigas levem a uma promessa de pedido indisponível.

### Etapa 6 — estados e acessibilidade do formulário

Estados implementados:

```text
idle
loading
success
duplicate
error
```

Comportamentos relevantes:

- label de WhatsApp permanece visível;
- `type="tel"`, `inputMode="tel"` e autocomplete apropriado;
- aceita colagem e entradas comuns;
- erro não aparece no primeiro foco;
- erro aparece ao sair do campo ou tentar enviar;
- erro desaparece quando o número se torna válido;
- input é preservado em erro de API/rede;
- botão bloqueia duplo envio durante loading;
- sucesso só aparece depois da resposta de persistência;
- mensagens usam `role="alert"`/`aria-live` onde necessário;
- foco visível;
- skip link;
- targets principais com pelo menos ~44–48 px;
- `prefers-reduced-motion` respeitado;
- layout de uma coluna no mobile;
- sem scroll horizontal intencional.

O estado de sucesso mostra somente progresso real:

```text
Cadastro confirmado ✓
→ abertura será anunciada pelo WhatsApp
→ benefício chegará próximo à inauguração
```

**Decisão:** o primeiro nome já é suportado pelo modelo/API, porém não foi colocado no formulário P0. Isso reduz esforço e PII. Progressive disclosure de nome pode ser adicionado depois do `signup_success` quando houver uso real para o dado.

### Etapa 7 — consentimento de analytics e fornecedores

A preferência é armazenada no navegador em:

```text
carrochefe.analytics-consent.v1
```

Antes da escolha, eventos ficam somente numa fila em memória. Então:

- **aceitou:** a fila é enviada, GA4/Clarity podem ser carregados e eventos futuros são enviados;
- **recusou:** a fila é descartada e nenhuma tag externa é injetada;
- **revogou depois de aceitar:** a preferência é alterada e a página recarrega para retirar scripts já carregados.

Existe controle `Preferências de analytics` para reabrir a escolha.

A configuração de fornecedores é feita por:

```text
VITE_GA4_ID=
VITE_CLARITY_ID=
```

IDs vazios significam fornecedor desativado.

O formulário possui marcação de máscara para replay e nenhum evento customizado recebe telefone/nome.

**Decisão de privacidade:** `consent_analytics_denied` não é transmitido ao backend/fornecedores nesta versão. A recusa é respeitada localmente e nenhum comportamento anterior é enviado retroativamente. Isso reduz completude do relatório de opt-out, mas evita usar a própria recusa como gatilho para iniciar telemetria não essencial. Caso Jurídico/Dados defina uma gravação first-party estritamente necessária da preferência, ela deve ser adicionada de forma explícita.

### Etapa 8 — atribuição QR first-touch

No primeiro acesso da sessão, o frontend lê:

```text
cc_qr
cc_campaign
cc_variant
```

Os valores são sanitizados e persistidos em `sessionStorage` com `firstSeenAt`. Navegação interna não troca silenciosamente a origem inicial.

A atribuição chega ao cadastro mesmo com analytics recusado, pois ela é necessária à finalidade operacional da campanha e não carrega PII.

URL P0 prevista:

```text
https://carrochefe.com/?cc_qr=QR-20260911-AV01&cc_campaign=pre_inauguracao&cc_variant=banner_avenida_a
```

`QR-20260911-AV01` continua sendo referência provisória até Marketing/Gestão confirmar o identificador realmente impresso.

### Etapa 9 — performance e identidade visual

O CSS foi refeito como mobile-first usando os tokens da marca (obsidiana, madeira, bronze, ouro, pergaminho).

Foi removida a dependência de Google Fonts da renderização inicial. O P0 usa fontes do sistema para não fazer uma chamada third-party antes de consentimento e reduzir trabalho de renderização.

Não foram adicionados:

- vídeo autoplay;
- 3D;
- parallax;
- partículas;
- animação infinita;
- biblioteca de componentes pesada;
- imagem artificial de comida.

Isso prioriza LCP/INP/CLS e leitura rápida após escanear o banner em rede móvel.

### Etapa 10 — aviso de privacidade operacional

`/privacidade` agora descreve a coleta implementada em vez de exibir um placeholder genérico.

Ele informa:

- dados coletados;
- finalidade do WhatsApp;
- atribuição de campanha;
- caráter opcional de analytics;
- cancelamento;
- retenção em princípio de necessidade;
- fornecedores analíticos condicionais;
- pendência de revisão jurídica e identificação jurídica completa.

**Importante:** isso não transforma o texto em parecer jurídico. A revisão final continua sendo dependência externa do P0 antes de tratá-lo como política definitiva.

---

## 4. Taxonomia implementada

Eventos aceitos pela API/cliente:

```text
qr_scan
landing_view
signup_cta_click
form_start
signup_submit
signup_success
signup_duplicate
signup_error
reward_view
instagram_click
whatsapp_click
privacy_open
consent_analytics_granted
```

Metadata aceita, sem conteúdo livre:

```text
experiment
ctaVariant
formPosition
hasProductMedia
section
```

Sequência normal esperada para uma sessão consentida:

```text
qr_scan
→ landing_view
→ signup_cta_click
→ form_start
→ signup_submit
→ signup_success
→ reward_view
```

Se o usuário começa diretamente pelo campo, `form_start` não depende do CTA/âncora.

---

## 5. Relatórios possíveis no P0

O dashboard consolidado da C.O. continua fora de escopo conforme o handoff. Mesmo assim, os dados first-party já suportam consultas como:

### Cadastros válidos por campanha/variante

```sql
SELECT
  ccCampaign,
  ccVariant,
  COUNT(*) AS leads
FROM PrelaunchLead
WHERE status = 'active'
GROUP BY ccCampaign, ccVariant;
```

### Eventos por etapa

```sql
SELECT event, COUNT(*) AS total
FROM PrelaunchAnalyticsEvent
GROUP BY event
ORDER BY total DESC;
```

### Sessões pseudônimas por campanha

```sql
SELECT
  ccCampaign,
  COUNT(DISTINCT sessionId) AS sessions
FROM PrelaunchAnalyticsEvent
GROUP BY ccCampaign;
```

### Conversão apenas entre sessões com analytics aceito

```sql
WITH funnel AS (
  SELECT
    sessionId,
    MAX(CASE WHEN event = 'landing_view' THEN 1 ELSE 0 END) AS landed,
    MAX(CASE WHEN event = 'signup_success' THEN 1 ELSE 0 END) AS converted
  FROM PrelaunchAnalyticsEvent
  GROUP BY sessionId
)
SELECT
  SUM(converted) AS conversions,
  SUM(landed) AS measured_sessions,
  ROUND(100.0 * SUM(converted) / NULLIF(SUM(landed), 0), 2) AS conversion_pct
FROM funnel;
```

**Limite importante:** visitantes que recusam analytics não entram no denominador comportamental. Cadastros continuam completos. Não se deve apresentar o funil consentido como se fosse 100% do tráfego total.

GA4 pode fornecer aquisição/funil quantitativo para quem consentiu; Clarity pode fornecer heatmap/replay para quem consentiu, mantendo inputs mascarados.

---

## 6. Arquitetura local e produção

### Local

```text
Vite dev :5173
   ├── /api ------------→ Fastify 127.0.0.1:4173
   └── /assets/brand ---→ Fastify 127.0.0.1:4173
```

Em build, o Fastify serve o `apps/site/dist`, portanto o frontend usa URLs relativas (`/api/...`) e não contém `localhost` hardcoded para produção.

### VPS P0

```text
Internet
  ↓ HTTPS
Nginx :443
  ├── /api/v1/public/prelaunch/* ─┐
  ├── / e ativos ─────────────────┼→ Fastify 127.0.0.1:4173
  ├── /api/* restante → 404       │
  └── /gestao* → 404              │
                                  ↓
                         Prisma + SQLite
                         /srv/carro-chefe/data/
```

Arquivos adicionados:

```text
deploy/nginx/carrochefe.com.conf.example
deploy/systemd/carro-chefe.service.example
```

### Por que o processo continua em `127.0.0.1`

Não é um resíduo de desenvolvimento: na VPS, loopback é a fronteira correta entre Nginx e aplicação. O domínio público termina no reverse proxy; Fastify não precisa ouvir diretamente na Internet.

### Por que `/gestao` continua bloqueado

`PRODUCTION_AUTH_READY` não implementa autenticação. Como login/RBAC/CSRF ainda não estão homologados, o Nginx P0 bloqueia a Central e APIs internas. Liberar essas rotas antes disso violaria as regras do repositório.

---

## 7. Variáveis por ambiente

`.env.example` foi atualizado.

### Desenvolvimento

```env
DATABASE_URL=file:./.runtime/carro-chefe.db
HOST=127.0.0.1
PORT=4173
TRUST_PROXY=false
PRODUCTION_AUTH_READY=false
VITE_GA4_ID=
VITE_CLARITY_ID=
```

### VPS — exemplo conceitual

Arquivo fora do Git, por exemplo `/etc/carro-chefe/carro-chefe.env`:

```env
DATABASE_URL=file:/srv/carro-chefe/data/carro-chefe.db
TRUST_PROXY=true
PRODUCTION_AUTH_READY=false
VITE_GA4_ID=G-XXXXXXXXXX
VITE_CLARITY_ID=XXXXXXXXXX
```

Os valores `VITE_*` são públicos por natureza e entram no bundle durante `npm run build`; alterá-los exige novo build. Segredos reais nunca devem usar prefixo `VITE_`.

---

## 8. Procedimento de migração para VPS

Esta é a sequência proposta; **não foi executada nesta branch**.

### Preparação única

1. provisionar uma VPS de instância única;
2. criar usuário de serviço `carrochefe` sem login privilegiado;
3. instalar Node compatível com `engines`, Nginx e ferramentas de TLS/backup;
4. criar `/srv/carro-chefe/current` e `/srv/carro-chefe/data`;
5. criar `/etc/carro-chefe/carro-chefe.env` com permissão restrita;
6. configurar DNS `A/AAAA` apenas quando o proprietário autorizar;
7. emitir certificado para `carrochefe.com` e `www.carrochefe.com`;
8. ativar o template Nginx após o certificado existir.

### Cada release

```bash
npm ci
npm run check
npm test
npm run build

# backup consistente ANTES de migration em base existente
npm run db:deploy

sudo systemctl restart carro-chefe
sudo systemctl is-active carro-chefe
```

Depois executar smoke tests via HTTPS.

### Persistência

SQLite permanece aceitável somente enquanto houver uma instância/processo gravador e volume local persistente. O banco não deve ficar dentro de diretório efêmero de release.

Caminho recomendado:

```text
/srv/carro-chefe/data/carro-chefe.db
```

Backup deve ser consistente e copiado para fora do host. Antes de múltiplas réplicas, containers sem volume local estável ou arquitetura distribuída, migrar para PostgreSQL gerenciado.

---

## 9. Segurança e abuso

Controles presentes no código/P0:

- validação Zod;
- normalização server-side;
- índice único para telefone;
- rate limit global + limites específicos;
- honeypot;
- headers de segurança no Fastify e template Nginx;
- `TRUST_PROXY` opt-in;
- APIs internas bloqueadas no Nginx;
- aplicação ouvindo somente loopback;
- sem segredo no frontend/repositório;
- sem checkout/cartão;
- sem PII na taxonomia analítica;
- `cc_*` com allowlist de caracteres;
- query string não é enviada como `path` de analytics.

Evoluções somente se abuso justificar:

- Turnstile/desafio adaptativo;
- denylist/velocity rules adicionais;
- WAF/CDN;
- PostgreSQL quando houver necessidade de escala horizontal.

---

## 10. Testes adicionados e validação exigida

Foi adicionado `apps/api/src/modules/prelaunch/service.test.ts`, cobrindo:

- normalização dos três formatos de telefone do handoff;
- rejeição de números obviamente inválidos;
- limpeza do nome opcional;
- sanitização de atribuição;
- limites de confiança de `firstSeenAt`.

Antes de integrar, a definição de pronto exige executar na raiz:

```bash
npm run check
npm test
npm run build
```

Além disso, homologar manualmente:

### Cadastro

- número válido → persistido;
- mesmo número em formatos diferentes → duplicata;
- consentimento desmarcado → não envia;
- erro de rede → telefone preservado;
- double click → uma submissão ativa;
- sucesso só depois da persistência.

### Analytics

- recusar → nenhuma chamada a Google/Clarity/event endpoint;
- aceitar → eventos aparecem uma vez por etapa esperada;
- revogar → reload e ausência de coleta posterior;
- payload de evento sem telefone/nome;
- formulário mascarado no Clarity.

### QR físico

- Android;
- iPhone;
- rede móvel;
- distância real do banner;
- iluminação noturna;
- HTTPS sem alerta;
- `cc_*` preservado no lead;
- ID impresso registrado.

### Acessibilidade/UI

- teclado completo;
- foco visível;
- leitor de tela básico no formulário;
- 320 px e celulares comuns;
- desktop;
- sem scroll horizontal;
- `prefers-reduced-motion`;
- contraste e legibilidade em tela externa/noturna.

### Performance

Coletar Lighthouse/lab antes do deploy e, após volume real, acompanhar p75:

```text
LCP ≤ 2,5 s
INP ≤ 200 ms
CLS ≤ 0,1
```

---

## 11. Critérios do handoff e situação

| Requisito P0 | Implementação |
|---|---|
| estado de pré-inauguração | implementado |
| CTA dominante Lista dos Primeiros | implementado |
| formulário inline / 1 coluna | implementado |
| WhatsApp único PII obrigatório | implementado |
| consentimento explícito não marcado | implementado |
| normalização + dedupe | implementado |
| `cc_*` first-touch | implementado |
| sucesso depois da persistência | implementado |
| duplicata sem inflação de lead | implementado |
| erro recuperável preserva telefone | implementado |
| analytics sem PII | implementado |
| recusa não bloqueia cadastro | implementado |
| GA4 configurável após opt-in | implementado |
| Clarity configurável após opt-in | implementado |
| replay/input mascarado | implementado no markup; homologar no painel |
| privacidade acessível | implementado como aviso operacional |
| Instagram secundário | implementado |
| sem escassez/prova social falsa | implementado |
| rate limit + honeypot | implementado |
| mobile-first/reduced motion | implementado |
| VPS/reverse proxy | templates e procedimento implementados |
| dashboard completo C.O. | fora do P0 conforme handoff |
| benefício específico | bloqueado por decisão de Finanças/Operações |
| política jurídica definitiva | bloqueada por revisão jurídica |
| foto real de produto | aguardando ativo aprovado; P0 não bloqueado |
| QR final impresso | precisa confirmação humana |
| teste Android/iPhone/banner físico | precisa homologação física |

---

## 12. Decisões deliberadamente não tomadas

Não foram inventados nem configurados:

- data de inauguração;
- percentual/valor do benefício;
- cupom específico;
- contador de pessoas;
- escassez;
- prova social;
- preços/cardápio transacional;
- foto artificial de comida;
- credenciais GA4/Clarity;
- DNS;
- certificado TLS;
- texto jurídico definitivo;
- liberação da Central Operacional na Internet.

Esses pontos dependem de decisão humana ou de outros agentes especializados.

---

## 13. Rollback

A entrega está isolada em branch. Antes de merge, rollback é simplesmente não integrar.

Depois de uma eventual integração/deploy:

1. reverter o commit de aplicação para a release anterior;
2. manter as tabelas novas, pois são aditivas e não interferem nos modelos existentes;
3. não apagar leads coletados como parte de rollback técnico;
4. se houver necessidade real de descarte de dados, tratar como operação de privacidade governada, não como rollback de código.

A migration não altera tabelas operacionais existentes; somente adiciona modelos/índices de pré-lançamento.

---

## 14. Próximos gates antes de produção

1. CI verde (`check`, `test`, `build`);
2. revisão do diff por outro agente/desenvolvedor;
3. aprovação do texto operacional/jurídico adequado à coleta real;
4. definir IDs reais de GA4/Clarity ou manter fornecedores desligados;
5. confirmar `cc_qr` impresso;
6. smoke test local e em staging/VPS;
7. teste físico Android/iPhone no banner;
8. autorização explícita do proprietário para DNS/deploy/publicação.

Somente depois desses gates a branch deve seguir para PR de integração e publicação.
