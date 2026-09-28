# Entrega 11G — ETA de rota e mapas

**Data:** 28/09/2026  
**Base funcional:** Entrega 11F integrada em `cooklily/canonical` pelo PR #94.  
**Status:** implementação candidata; CI/CodeQL e homologação com chave real ainda pendentes.

## Objetivo

Adicionar distância, duração estimada, previsão de chegada após a saída da coleta e abertura de rota em mapa sem introduzir rastreamento GPS contínuo nem tornar um serviço externo requisito para concluir pedidos.

## Provedor escolhido

Primeira implementação: **OpenRouteService / HeiGIT**, consumida exclusivamente pelo backend.

Motivos:

- geocodificação e directions no mesmo ecossistema;
- cobertura baseada em OpenStreetMap;
- faixa gratuita adequada para a fase atual;
- possibilidade futura de trocar por instância própria/adapter alternativo;
- chave não precisa aparecer no bundle do navegador.

Em 28/09/2026 o host legado `api.openrouteservice.org` chegou ao fim do período de migração. A implementação usa como padrão:

`https://api.heigit.org/openrouteservice`

Endpoints usados:

- `GET /geocode/search`;
- `POST /v2/directions/driving-car`.

A chave é enviada no header `Authorization`.

## Configuração

Variável necessária para ativar:

`COOKLILY_ORS_API_KEY`

Variáveis opcionais:

- `COOKLILY_ORS_BASE_URL` — default `https://api.heigit.org/openrouteservice`;
- `COOKLILY_ROUTING_TIMEOUT_MS` — default 6000 ms, limitado entre 1000 e 15000 ms.

Nenhuma variável usa prefixo `VITE_`.

Ausência da chave **não falha o deploy e não bloqueia entregas**. O endpoint retorna `available: false, reason: not_configured`.

## Persistência/cache

Novo modelo:

`LilyDeliveryRouteEstimate`

Campos:

- `orderId` — chave 1:1 com o pedido;
- provider;
- hash da origem + destino;
- coordenadas de origem/destino;
- distância em metros;
- duração em segundos;
- instante do cálculo.

A rota é recalculada somente quando não existe cache válido para o par de endereços. Polling de cliente/courier não consulta o provedor externo.

Migration:

`packages/lily-database/prisma/migrations/20260928150000_lily_delivery_route_estimate/migration.sql`

## Privacidade

### Não implementado nesta tranche

- GPS ao vivo do courier;
- coleta de latitude/longitude do aparelho;
- histórico de posição;
- transmissão da posição do courier ao cliente.

### Cliente/guest recebe

- distância;
- duração;
- horário estimado quando aplicável;
- `isLive: false`.

Cliente/guest **não recebe** coordenadas da rota nem link de mapa.

### Courier responsável recebe

Além do ETA:

- coordenadas origem/destino;
- link de navegação OpenStreetMap.

A fila pública de couriers continua sem expor a localização exata do destino antes do aceite.

## ETA

O cálculo do provedor representa duração de rota.

A CookLily só transforma isso em horário de chegada quando existe evento `left_pickup`:

`estimatedArrivalAt = leftPickupAt + durationSeconds`

Antes da saída da coleta:

- exibe distância e tempo de rota;
- não promete horário de chegada.

Depois de `delivered`:

- o horário estimado deixa de ser tratado como ETA ativo.

A interface deixa explícito que não é rastreamento GPS ao vivo.

## API

### Courier

`GET /api/v1/lily/courier/deliveries/:id/route`

Regras:

- exige sessão courier/admin já autorizada;
- exige que o pedido esteja atribuído ao ator;
- rate limit dedicado;
- cria cache na primeira consulta;
- falha aberto para a operação: indisponibilidade do mapa não altera etapa/status/courier.

Respostas de indisponibilidade:

- `not_configured`;
- `address_incomplete`;
- `provider_unavailable`.

### Tracking customer/guest

Os serializers de pedido passam a incluir somente o resumo seguro de `routeEstimate`.

A Entrega 11F continua impedindo vazamento de endereço/coordenadas na superfície guest.

## Frontend

### Courier

Na entrega atribuída:

- tentativa automática única de aquecer o cache;
- botão manual de retry;
- distância e minutos de rota;
- ETA após saída da coleta;
- aviso “não é GPS ao vivo”;
- botão **Abrir rota no mapa**.

O mapa é aberto apenas por ação do courier. Não há tile/mapa externo carregado silenciosamente dentro da CookLily.

### Cliente autenticado

No detalhe do pedido:

- distância;
- tempo estimado;
- horário de chegada após saída.

### Guest

Na rota `/acompanhar/:id`:

- mesmo resumo de ETA;
- nenhuma coordenada;
- nenhum endereço adicional;
- nenhum mapa externo embutido.

## Resiliência

O provider nunca participa das transações de:

- aceitar entrega;
- desistir;
- reatribuir;
- confirmar coleta;
- confirmar entrega.

Assim, timeout/429/5xx de geocoding/directions não compromete a cadeia de custódia.

## Testes adicionados

`routing.test.ts`:

- sem chave => integração desabilitada;
- host padrão é o novo HeiGIT;
- geocoding + directions são server-side;
- API key fica no header e não na URL;
- parser valida coordenadas/distância/duração;
- ETA só nasce após `left_pickup`;
- resposta pública não recebe mapa/coordenadas;
- link OpenStreetMap não contém API key.

`logistics.test.ts`:

- provider não configurado retorna indisponível sem retirar o courier do pedido nem mudar a etapa.

## Homologação necessária

Antes de ativar em produção:

1. criar chave HeiGIT/OpenRouteService;
2. gravar somente em `/etc/carro-chefe/carro-chefe.env`;
3. configurar o endereço de retirada real;
4. deploy/restart;
5. aceitar pedido de homologação;
6. conferir geocodificação da loja;
7. conferir geocodificação de pelo menos 5 endereços reais representativos;
8. comparar distância/duração com navegação conhecida;
9. testar 429/timeout com entrega continuando normalmente;
10. confirmar que chave não aparece em HTML, JS, analytics ou logs.

## Limitações conhecidas

- ETA é estático por rota e não incorpora trânsito ao vivo;
- não detecta deslocamento real do courier;
- o geocoder pode errar endereços incompletos;
- a rota deve ser tratada como auxílio operacional, não garantia de horário;
- OpenStreetMap é aberto em nova aba para navegação; mapa embutido fica fora desta tranche para minimizar chamadas e exposição.

## Próximas entregas

### 11H — WhatsApp por etapa

- outbox persistente;
- eventos idempotentes;
- templates;
- consentimento/base legal;
- retry com backoff;
- auditoria sem PII desnecessária.

### 11I — conciliação automática do Pix próprio

- adapter bancário/PSP;
- ingestão idempotente;
- matching por txid + valor;
- divergências;
- confirmação financeira autoritativa.
