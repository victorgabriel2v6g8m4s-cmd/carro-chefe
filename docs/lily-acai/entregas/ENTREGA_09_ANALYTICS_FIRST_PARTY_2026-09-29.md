# Entrega 09 — analytics first-party CookLily

**Data:** 29/09/2026  
**Branch:** `feat/lily-entrega-09-analytics-first-party`  
**Base:** `cooklily/canonical` em `3e4f4bdb6f8dc123a3174fa320b141c73bd764ed`

## Objetivo

Fechar a Entrega 09 com analytics first-party próprio, sem depender de GA4/Clarity para o núcleo de medição e sem misturar eventos de navegador com a fonte de verdade de pedidos/pagamentos.

## Privacidade e consentimento

Analytics é opcional.

Enquanto a pessoa ainda não decidiu:

- eventos ficam somente em memória;
- nada é enviado ao servidor;
- a fila é limitada a 100 eventos e desaparece ao fechar/recarregar a aplicação.

Se a pessoa recusar:

- a fila é descartada;
- novos eventos não são enviados;
- loja, catálogo, conta, carrinho, checkout e pagamento continuam funcionando.

Se permitir:

- a fila em memória é enviada;
- `occurredAt` preserva quando cada evento aconteceu;
- `createdAt` registra quando o servidor recebeu;
- a preferência pode ser revista pelo rodapé.

A criação de conta sincroniza a escolha explícita do checkbox de analytics com a preferência local do dispositivo.

## Minimização

O endpoint não aceita metadata arbitrária.

Campos aceitos:

- superfície;
- slug de produto;
- slug de combo;
- tamanho;
- quantidade de adicionais;
- quantidade de itens;
- modalidade retirada/entrega;
- método de pagamento.

Não são aceitos:

- telefone;
- nome;
- e-mail;
- endereço;
- observação livre;
- token de sessão/pedido;
- PAN/CVV;
- query string;
- fragmento de URL.

O path precisa pertencer a `/lilyacai`.

A sessão analítica é um UUID aleatório persistido apenas em `sessionStorage`. O `eventId` também é UUID e deduplica retries.

Atribuição aceita entrada `la_*`/legado `cc_*`, normaliza para campos canônicos e restringe o conjunto de caracteres persistido pelo domínio analítico.

## Banco

Migration:

`packages/lily-database/prisma/migrations/20260929223000_lily_first_party_analytics/migration.sql`

Modelo:

`LilyAnalyticsEvent`

Índices por:

- evento/ocorrência;
- sessão/ocorrência;
- campanha/variante/ocorrência;
- QR/ocorrência;
- produto/evento/ocorrência.

Nenhum relacionamento com usuário, pedido ou pagamento é persistido no evento analítico.

## Eventos

Allowlist inicial:

- page_view;
- catalog_view;
- product_view;
- product_configured;
- combo_view;
- combo_configured;
- add_to_cart;
- cart_view;
- checkout_start;
- order_created;
- payment_start;
- payment_confirmed;
- instagram_click;
- whatsapp_click;
- privacy_open;
- lead_submit;
- lead_success;
- lead_error;
- analytics_consent_granted.

## API

### Ingestão pública

`POST /api/v1/lily/public/analytics/events`

Características:

- rate limit 90/minuto por política Fastify;
- schema strict;
- consentVersion obrigatório;
- eventId idempotente;
- timestamp do cliente limitado a uma janela segura: no máximo 24 h no passado e 5 min no futuro; fora disso usa relógio do servidor;
- nenhuma falha de analytics bloqueia a aplicação cliente.

### Relatório staff

`GET /api/v1/lily/admin/analytics/summary`

Exige staff/admin + MFA.

Filtros:

- 1–90 dias;
- campanha;
- inclusão opcional de pedidos de homologação.

Retorna:

- contagem de eventos;
- eventos por superfície;
- funil por sessões únicas;
- campanha/QR/variante;
- produto view → carrinho;
- pedidos criados;
- pedidos pagos;
- valor bruto criado;
- valor bruto pago;
- atribuição comercial autoritativa por campanha/QR/variante.

## Fonte autoritativa de negócio

`order_created` e `payment_confirmed` do navegador servem ao funil consentido, mas não são usados como fonte financeira.

Pedido, pagamento e valor bruto no dashboard são calculados de `LilyOrder`.

Pedidos de homologação ficam excluídos por padrão.

Isso evita que bloqueadores, consentimento recusado, perda de rede ou manipulação do navegador alterem o número financeiro real.

## Frontend

Novo cliente:

`apps/lily_acai/src/analytics.ts`

Novo controle de consentimento:

`apps/lily_acai/src/features/analytics/AnalyticsConsent.tsx`

Novo painel:

`/lilyacai/painel/analytics`

O aviso de privacidade da própria aplicação foi atualizado para explicar o analytics first-party.

## Instrumentação

Coberto:

- landing/lista de novidades;
- visualização do cardápio;
- abertura de produto;
- configuração de produto;
- abertura/configuração de combo;
- adição ao carrinho;
- carrinho;
- início do checkout;
- criação de pedido;
- início do pagamento;
- confirmação de pagamento;
- Instagram;
- WhatsApp;
- página de privacidade.

## Testes

Backend:

- ingestão minimizada;
- alias legado -> atribuição canônica;
- retry idempotente;
- rejeição de metadata extra/PII;
- rejeição de query no path;
- consentVersion obrigatório;
- customer sem acesso ao relatório;
- funil por sessão;
- pedidos reais como fonte comercial;
- homologação excluída por padrão;
- normalização de timestamps fora da janela.

Frontend:

- nenhum request antes do opt-in;
- fila enviada somente após opt-in;
- recusa descarta fila e bloqueia novos envios;
- envelope sem query string/PII livre.

## Pendências deliberadas

- definir prazo jurídico definitivo de retenção antes da operação comercial plena;
- QA real do banner/preferências em navegadores e mobile;
- validar números do dashboard durante o ciclo de homologação;
- integrações externas de analytics continuam opcionais e fora do núcleo first-party.
