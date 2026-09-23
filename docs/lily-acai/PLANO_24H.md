# Plano de execução em 24h — Lily Gourmet

> **Nota de sequência (23/09/2026):** este documento preserva o plano técnico P0 original. A ordem das Entregas 03 em diante foi substituída por `ROADMAP_LILY_GOURMET.md`: marca → landing/WhatsApp/deploy → catálogo/admin/publicação. O conteúdo técnico posterior continua como referência.

## 1. Objetivo

Entregar uma operação temporária de venda de açaí em `carrochefe.com/lilyacai/`, completamente separada da identidade e da operação Carro Chefe, reaproveitando apenas a infraestrutura já paga.

O P0 deve permitir:

- navegação mobile-first;
- catálogo digital;
- produto com tamanho/variação e adicionais;
- carrinho;
- login/cadastro Lily;
- endereço de entrega reutilizável;
- checkout;
- integração de pagamento;
- pedido com retirada/balcão ou entrega;
- painel interno de pedidos;
- CRUD simples de catálogo e mídia;
- histórico de compras por cliente;
- consentimentos de marketing/compartilhamento;
- tracking first-party por QR/campanha/variante;
- troca rápida de conteúdo demonstrativo por conteúdo real.

## 2. Não objetivos

Nesta fase não transformar Lily Gourmet em linha de negócio permanente do Carro Chefe, não inserir Lily na documentação da `main`, não reutilizar branding do Carro Chefe, não compartilhar banco de usuários e não construir ERP/fiscal/estoque completo.

Também não inventar sabores, preços, taxas, raio de entrega, promoções ou disponibilidade. Conteúdo provisório deve ser marcado como demonstração e permanecer não publicável até aprovação operacional.

## 3. Arquitetura recomendada

### 3.1 Fronteiras

```text
Internet
  |
Nginx/TLS carrochefe.com
  |
  +-- /                     -> site Carro Chefe existente
  +-- /api/v1/public/...    -> APIs públicas Carro Chefe existentes
  |
  +-- /lilyacai/*           -> build Vite Lily
  +-- /api/v1/lily/*        -> domínio Lily na API
                             |
                             +-- Lily DB separado
                             +-- Mercado Pago
                             +-- mídia Lily
```

### 3.2 Código

Criar na branch `lily-acai`:

```text
apps/lily_acai/
  AGENTS.md
  README.md
  index.html
  vite.config.ts
  src/
    app/
    routes/
    components/
    features/
      auth/
      catalog/
      cart/
      checkout/
      account/
      tracking/
      admin/
    services/
    styles/
    analytics/

apps/api/src/modules/lily/
  routes/
  auth/
  catalog/
  customers/
  addresses/
  orders/
  payments/
  tracking/
  admin/
  media/

packages/lily-database/
  prisma/
    schema.prisma
    migrations/
  src/

docs/lily-acai/
  README.md
  PLANO_24H.md
  ARQUITETURA.md
  MODELO_DADOS.md
  SEGURANCA_PRIVACIDADE.md
  DEPLOY.md
  TESTES.md
  DECISOES_PENDENCIAS.md
```

Não colocar tabelas Lily em `packages/database`, porque esse pacote é a fonte da Central Operacional do Carro Chefe.

### 3.3 Persistência

Usar um banco SQLite dedicado enquanto houver uma única instância gravadora:

```env
LILY_DATABASE_URL=file:/srv/carro-chefe/data/lily-acai.db
```

Backups independentes do banco `carro-chefe.db`.

Separar também uploads:

```text
/srv/carro-chefe/data/lily-acai/
/srv/carro-chefe/data/lily-acai/uploads/
/srv/carro-chefe/data/lily-acai/backups/
```

Isso simplifica remoção futura da operação e reduz risco de mistura de clientes/histórico.

## 4. Rotas

### 4.1 Públicas

- `/lilyacai/`
- `/lilyacai/cardapio`
- `/lilyacai/produto/:slug`
- `/lilyacai/carrinho`
- `/lilyacai/checkout`
- `/lilyacai/entrar`
- `/lilyacai/cadastro`
- `/lilyacai/privacidade`
- `/lilyacai/termos`

### 4.2 Cliente autenticado

- `/lilyacai/minha-conta`
- `/lilyacai/enderecos`
- `/lilyacai/pedidos`
- `/lilyacai/pedidos/:id`

### 4.3 Painel interno

- `/lilyacai/painel`
- `/lilyacai/painel/pedidos`
- `/lilyacai/painel/cardapio`
- `/lilyacai/painel/adicionais`
- `/lilyacai/painel/midias`
- `/lilyacai/painel/clientes`
- `/lilyacai/painel/tracking`
- `/lilyacai/painel/configuracoes`

## 5. API

Prefixo exclusivo: `/api/v1/lily`.

### 5.1 Catálogo

```text
GET  /public/catalog
GET  /public/products/:slug
```

### 5.2 Autenticação Lily

```text
POST /auth/register
POST /auth/login
POST /auth/logout
GET  /auth/me
POST /auth/password/change
```

P0 recomendado: telefone normalizado + senha. Senha sempre com KDF forte; sessão por cookie `HttpOnly`, `Secure`, `SameSite=Lax`, expiração e rotação.

Recuperação automática por WhatsApp não entra no P0 sem API/credencial de mensageria. O painel deve permitir processo administrativo seguro de recuperação até existir fluxo automático aprovado.

### 5.3 Endereços

```text
GET    /customer/addresses
POST   /customer/addresses
PATCH  /customer/addresses/:id
DELETE /customer/addresses/:id
```

Campos: CEP, logradouro, número, complemento opcional, bairro, cidade, UF, referência opcional e label opcional.

ViaCEP pode apenas auxiliar preenchimento de CEP em consultas pontuais; o cliente confirma o endereço. Não usar o serviço para validação massiva.

### 5.4 Pedidos

```text
POST /orders/quote
POST /orders
GET  /customer/orders
GET  /customer/orders/:id
```

O backend recalcula preços e adicionais com o catálogo vigente; nunca aceitar total calculado pelo frontend como verdade.

### 5.5 Pagamentos

```text
POST /payments/mercadopago/preferences
POST /webhooks/mercadopago
GET  /customer/orders/:id/payment
```

Criar pedido antes de iniciar o pagamento. O navegador nunca marca pedido como pago.

O pedido muda para `paid` somente por evento validado do provedor e, quando necessário, conferência server-to-server.

Usar `external_reference`/metadata equivalente para carregar `order_id` sem PII.

### 5.6 Admin

CRUD protegido por papel `staff`:

```text
/admin/categories
/admin/products
/admin/variants
/admin/addon-groups
/admin/addons
/admin/media
/admin/orders
/admin/customers
/admin/tracking
/admin/settings
```

## 6. Modelo de dados P0

### Usuários e privacidade

```text
User
- id
- phone_normalized (unique)
- password_hash
- display_name?
- status
- created_at
- updated_at

Session
- id
- user_id
- token_hash
- expires_at
- created_at
- revoked_at?

ConsentRecord
- id
- user_id?
- session_id?
- purpose
- version
- granted
- granted_at
- revoked_at?
- source
```

Finalidades separadas:

- `terms_required`;
- `lily_marketing`;
- `share_with_carro_chefe`;
- `analytics_optional`.

`share_with_carro_chefe` não pode ser obrigatório para comprar.

### Endereço

```text
Address
- id
- user_id
- label?
- postal_code
- street
- number
- complement?
- neighborhood
- city
- state
- reference?
- is_default
- created_at
- updated_at
```

### Catálogo

```text
Category
Product
ProductVariant
AddonGroup
Addon
ProductAddonGroup
MediaAsset
```

`Product`:

- id estável;
- slug;
- nome;
- descrição;
- status: draft/published/paused/archived;
- ordem;
- capa;
- flags de destaque.

`ProductVariant`:

- tamanho/variante;
- preço;
- status;
- ordem.

`AddonGroup`:

- nome;
- min/max;
- obrigatório;
- seleção única/múltipla.

`Addon`:

- nome;
- preço;
- disponibilidade.

Toda mídia deve guardar origem, tipo, alt text e indicador `is_placeholder`.

### Pedidos

```text
Order
- id
- user_id?
- fulfillment_type
- status
- subtotal
- delivery_fee
- discount_total
- grand_total
- address_snapshot_json?
- customer_note?
- created_at
- paid_at?
- completed_at?

OrderItem
- id
- order_id
- product_id
- variant_id
- product_name_snapshot
- variant_name_snapshot
- unit_price_snapshot
- quantity

OrderItemAddon
- id
- order_item_id
- addon_id
- addon_name_snapshot
- unit_price_snapshot
- quantity

OrderStatusEvent
- id
- order_id
- from_status?
- to_status
- actor
- created_at
```

Guardar snapshots comerciais no pedido para preservar histórico mesmo se o produto mudar.

### Pagamento

```text
Payment
- id
- order_id
- provider
- provider_payment_id?
- provider_order_id?
- status
- amount
- idempotency_key
- created_at
- updated_at
```

Nunca guardar número de cartão, CVV ou payload sensível desnecessário.

### Tracking QR

A Lily reaproveita a lógica first-party, mas não o namespace comercial do Carro Chefe.

Parâmetros planejados:

- `la_qr`;
- `la_campaign`;
- `la_variant`.

IDs: `LILY-QR-...`.

```text
QrManifest
- qr_id
- campaign?
- variant?
- destination
- surface
- status
- activated_at
- retired_at?

JourneySession
- session_id
- user_id?
- started_at
- last_seen_at
- acquisition_source
- qr_id?

JourneyEvent
- event_id
- session_id
- order_id?
- qr_id?
- event_name
- event_at
- metadata_sem_pii

OrderAttribution
- order_id
- acquisition_source
- conversion_surface
- qr_id?
- campaign?
- variant?
- attributed_at
```

Eventos mínimos:

`qr_scan`, `menu_view`, `product_view`, `add_to_cart`, `checkout_start`, `address_saved`, `payment_start`, `payment_approved`, `order_created`, `order_ready`, `order_delivered`, `instagram_click`, `whatsapp_click`.

Nenhum evento de analytics externo recebe nome, telefone ou endereço.

## 7. Painel de pedidos

Interface em duas filas principais:

### Retirada/balcão

```text
pago -> aceito -> preparando -> pronto -> concluído
```

### Entrega

```text
pago -> aceito -> preparando -> pronto -> saiu para entrega -> entregue
```

Estados adicionais: `awaiting_payment`, `cancelled`, `refunded`, `payment_failed`.

Cada card mostra somente o necessário para produção. Endereço completo aparece apenas em pedidos de entrega e em contexto autorizado.

P0: atualização por polling curto ou SSE do próprio app. Se a integração SSE existente for reaproveitada, usar canal Lily isolado.

## 8. Ferramenta de catálogo

A prioridade é conseguir trocar conteúdo provisório sem editar código.

O painel deve permitir:

1. criar categoria;
2. criar produto;
3. editar nome/descrição;
4. subir capa e galeria;
5. marcar mídia provisória;
6. criar tamanhos/variantes;
7. definir preço;
8. criar grupos de adicionais;
9. limitar quantidade de adicionais;
10. pausar item;
11. ordenar categorias/produtos;
12. pré-visualizar;
13. publicar somente quando os campos obrigatórios estiverem completos.

Validação de publicação:

- nome;
- descrição mínima;
- pelo menos uma variante;
- preço aprovado;
- capa;
- status;
- disponibilidade;
- grupos de adicionais válidos.

## 9. Conteúdo provisório e imagens

Enquanto não houver fotos reais:

- usar imagens geradas especificamente para a Lily ou banco licenciado;
- marcar `is_placeholder=true`;
- deixar claro no admin que devem ser substituídas;
- evitar copiar imagens de concorrentes;
- não apresentar composição/sabor não aprovado como produto efetivamente vendido.

A home pode usar linguagem genérica: açaí cremoso, combinações personalizáveis, escolha de adicionais e entrega/retirada conforme disponibilidade real.

## 10. Identidade e UX

Direção visual própria:

- rosa e violeta como cores primárias;
- branco/creme claro como base;
- formas arredondadas e orgânicas;
- fotografia de açaí como foco;
- navegação mobile-first;
- botões grandes;
- carrinho fixo/visível;
- resumo de preço sempre claro.

Proibido reaproveitar:

- logo Carro Chefe;
- preto/obsidiana dominante;
- bronze/ouro;
- madeira/pergaminho;
- ornamentos coloniais;
- linguagem `Sabor que lidera`;
- componentes visuais que façam Lily parecer uma submarca.

A parceria aparece apenas como informação de transparência.

## 11. Consentimento e compartilhamento

Cadastro/checkout deve separar claramente:

1. aceite dos termos/privacidade necessários ao serviço;
2. marketing Lily opcional;
3. compartilhamento com Carro Chefe opcional;
4. analytics não essencial opcional.

Texto de compartilhamento precisa informar categorias e finalidade, não usar autorização genérica.

Arquiteturalmente, mesmo com consentimento, o dado permanece no Lily DB no P0. Quando o Carro Chefe precisar usar os dados consentidos, criar export/bridge controlado que filtre apenas registros com consentimento vigente. Não fazer JOIN direto nem copiar toda a base.

Registrar versão, timestamp e revogação.

## 12. Pagamento

Recomendação P0: Mercado Pago Checkout Pro.

Motivo operacional:

- checkout hospedado pelo provedor;
- reduz escopo de segurança/PCI;
- integra com backend por criação de preferência/order;
- retorno ao site;
- Webhooks HTTPS para atualização de pagamento;
- suporte a testes antes de produção.

A documentação atual do Mercado Pago recomenda Webhooks e permite validar autenticidade por assinatura secreta em integrações aplicáveis.

Dependências humanas antes da produção:

- conta de vendedor;
- aplicação Mercado Pago;
- public key quando necessária;
- access token no servidor;
- webhook secret;
- métodos de pagamento aprovados pela operação.

Segredos ficam somente em `/etc/carro-chefe/carro-chefe.env` ou arquivo equivalente fora do Git.

## 13. Entrega

Como área/taxa não foram definidas, implementar configuração em painel:

```text
DeliveryZone
- id
- label
- rule_type
- rule_value
- fee
- active
```

P0 pode começar por bairros/CEPs aprovados manualmente. O checkout bloqueia entrega fora das zonas ativas.

Não inventar taxa padrão.

Retirada/balcão permanece uma modalidade separada e configurável.

## 14. Nginx e deploy

Adicionar blocos específicos antes do bloqueio genérico de `/api/`:

```text
/lilyacai/*
/api/v1/lily/public/*
/api/v1/lily/auth/*
/api/v1/lily/customer/*
/api/v1/lily/orders/*
/api/v1/lily/payments/*
/api/v1/lily/webhooks/mercadopago
/api/v1/lily/admin/*
```

A autorização real continua no Fastify; Nginx não substitui RBAC.

O servidor Fastify precisa registrar a rota `/lilyacai/*` antes do catch-all do site Carro Chefe e servir `apps/lily_acai/dist`.

Vite:

```text
base = "/lilyacai/"
BrowserRouter basename = "/lilyacai"
```

## 15. Segurança mínima

- HTTPS obrigatório;
- senha com KDF forte;
- cookie HttpOnly/Secure;
- CSRF em mutações autenticadas;
- rate limit por rota;
- validação Zod;
- autorização server-side;
- RBAC `customer` / `staff`;
- sessão rotacionável/revogável;
- upload com MIME/extensão/tamanho allowlist;
- nomes de arquivos aleatórios;
- sem execução de upload;
- logs sem senha/token/endereço completo;
- idempotência de criação de pedido/pagamento/webhook;
- webhook assinado;
- backups;
- endpoint de saúde Lily;
- trilha de mudança de status do pedido;
- proteção contra total de carrinho adulterado;
- CSP/headers revisados;
- nenhum segredo `VITE_*`.

## 16. Analytics e ofertas futuras

P0 deve armazenar histórico necessário para segmentação própria:

- frequência;
- último pedido;
- produtos comprados;
- ticket;
- adicionais escolhidos;
- origem/campanha;
- consentimento de marketing.

Não criar automaticamente perfil publicitário externo.

Painel pode oferecer filtros do tipo:

- clientes com 2+ pedidos;
- sem pedido há X dias;
- compradores de determinado produto;
- ticket acima de faixa configurada;
- origem por QR/campanha.

Qualquer envio de oferta depende de consentimento vigente e canal aprovado.

## 17. Ordem de execução — 24h

### H0–H1 — fundação

- branch `lily-acai`;
- documentação;
- `AGENTS.md` local;
- preflight de política;
- definição de IDs e configs;
- confirmar credenciais do Mercado Pago e política de entrega como bloqueios críticos.

### H1–H4 — scaffold + DB + autenticação

- app Vite;
- rota base;
- Lily DB/migrations;
- cadastro/login/logout;
- sessão/RBAC;
- consentimentos;
- páginas legais operacionais.

### H4–H7 — catálogo + mídia + admin

- schema catálogo;
- CRUD;
- upload;
- status draft/published;
- conteúdo demonstrativo;
- preview.

### H7–H10 — carrinho + endereço + checkout

- carrinho;
- adicionais;
- quote server-side;
- ViaCEP assistivo;
- endereço salvo;
- retirada/entrega;
- criação idempotente de pedido.

### H10–H13 — pagamento

- integração Mercado Pago em teste;
- retorno;
- webhook;
- reconciliação;
- estados de falha;
- teste de duplicidade.

### H13–H16 — painel de pedidos

- filas retirada/entrega;
- transições;
- detalhes;
- histórico;
- proteção staff.

### H16–H18 — tracking

- `la_*`;
- manifesto;
- sessão first-party;
- eventos;
- atribuição até order/payment;
- relatórios básicos.

### H18–H20 — identidade/UX

- tema Lily;
- responsividade;
- acessibilidade;
- estados vazios/loading/erro;
- Instagram/WhatsApp;
- aviso discreto da parceria.

### H20–H22 — qualidade

- `npm run policy:preflight`;
- Prisma validate/generate;
- testes unitários;
- testes de API;
- testes de auth/RBAC;
- testes de webhook/idempotência;
- `npm run check`;
- `npm test`;
- `npm run build`;
- `npm run tools:status`.

### H22–H24 — homologação/deploy

- backup pré-migração;
- deploy da branch/commit aprovado;
- migrations Lily;
- Nginx;
- restart;
- health checks;
- fluxo real mobile;
- pedido teste;
- webhook teste;
- rollback testado/documentado.

## 18. Testes críticos

1. usuário Lily não autentica na Central/Carro Chefe;
2. sessão Carro Chefe não autentica Lily;
3. consentimento de compartilhamento recusado não impede compra;
4. revogação permanece auditável;
5. produto draft não aparece publicamente;
6. total adulterado no frontend é rejeitado/recalculado;
7. adicional acima do máximo é rejeitado;
8. pedido duplicado por double-click não duplica cobrança;
9. webhook repetido é idempotente;
10. retorno do navegador sem webhook não marca `paid`;
11. staff acessa painel; customer recebe 403;
12. endereço de um cliente não é acessível por outro;
13. QR preserva origem até pedido;
14. analytics não contém PII;
15. pagamento não grava dados de cartão;
16. pedido de retirada não expõe endereço;
17. pedido de entrega exige endereço válido;
18. conteúdo demonstrativo não pode ser publicado sem revisão;
19. `/gestao` continua bloqueado externamente;
20. site Carro Chefe continua funcionando após Lily deploy.

## 19. Rollback

A Lily precisa ser removível sem desmontar o Carro Chefe:

1. retirar blocos Nginx Lily;
2. voltar commit/release anterior;
3. preservar `lily-acai.db` e uploads em backup;
4. reiniciar serviço;
5. smoke test do site Carro Chefe;
6. manter branch e documentação para auditoria.

Nunca apagar banco Lily durante rollback operacional.

## 20. Ferramentas selecionadas

### Repositório

- GitHub connector: branch, leitura/escrita documental, PR, revisão e CI;
- `agent-policy`: preflight obrigatório;
- `tool-health`: inventário/saúde;
- Vitest: testes;
- Prisma/SQLite: persistência;
- Fastify: API;
- React/Vite: frontend;
- QR Lab: referência técnica e possível evolução para preset Lily.

### Capacidades de IA

- pesquisa web: documentação atual de pagamento/LGPD;
- geração de imagens: fotos provisórias próprias, identificadas como sugestivas;
- Canva: apoio a identidade/ativos Lily se necessário;
- análise visual: QA de mobile e consistência.

Não instalar plugin novo sem necessidade concreta.

## 21. Dependências que podem bloquear produção

- credenciais de pagamento;
- definição de quem é o controlador da Lily para texto jurídico;
- termos/política operacionais aprovados;
- produtos reais;
- preços;
- adicionais;
- disponibilidade;
- taxa/área de entrega;
- método de retirada;
- conta staff inicial;
- confirmação do canal de suporte.

O software pode ficar pronto com essas informações configuráveis, mas o checkout público não deve inventá-las.

## 22. Critério de pronto P0

- Lily funciona em `/lilyacai/`;
- nenhuma regressão no site Carro Chefe;
- identidade Lily sem reutilização visual do Carro Chefe;
- parceria comunicada com transparência;
- login e sessões independentes;
- DB independente;
- catálogo administrável;
- imagens substituíveis;
- adicionais configuráveis;
- endereço reutilizável;
- retirada/entrega separadas;
- pagamento confirmado por webhook;
- painel staff protegido;
- pedidos ordenados por status;
- histórico disponível;
- consentimentos versionados;
- QR/campanha atribuíveis a pedido;
- nenhum PII em analytics externo;
- testes/check/build passando;
- backup e rollback documentados.
