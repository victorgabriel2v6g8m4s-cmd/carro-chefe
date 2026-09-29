# Entrega 11F — tracking seguro de pedidos guest

**Data:** 28/09/2026  
**Base funcional:** Entrega 11E validada e integrada em `cooklily/canonical` pelo PR #92.  
**Status:** tecnicamente validada e integrada pelo PR #94. Candidate SHA `0d4f8a6f60821dfa09d9a94a2470e5f2ffb22af1`; CI `36414636227` e CodeQL `36414636183`: success. QA real de navegador/mobile permanece pendente.

## Objetivo

Permitir que um pedido feito sem conta seja acompanhado pelo cliente sem transformar telefone, número do pedido ou URL em credencial.

A Entrega 07 já criava um token guest aleatório de 32 bytes, devolvia o valor somente ao navegador e persistia apenas o SHA-256. A 11F reutiliza essa capability e cria uma superfície de tracking somente leitura.

## Contrato de segurança

### Capability token

- token aleatório de 32 bytes em base64url;
- banco armazena somente SHA-256;
- tracking exige `X-Lily-Order-Token`;
- token não é colocado em query string;
- o frontend guarda a capability em `sessionStorage`, como já fazia para o pagamento guest;
- a capability não é enviada a analytics.

### Anti-enumeração

O endpoint responde o mesmo `404 LILY_GUEST_ORDER_NOT_FOUND` para:

- ID inexistente;
- token ausente;
- token fora do formato esperado;
- token incorreto;
- pedido que pertence a uma conta autenticada.

A comparação do hash usa `crypto.timingSafeEqual`.

### Cache e indexação

A resposta usa:

- `Cache-Control: private, no-store, max-age=0`;
- `Pragma: no-cache`;
- `Referrer-Policy: no-referrer`;
- `X-Robots-Tag: noindex, nofollow`.

O endpoint também possui rate limit dedicado.

## Endpoint

`GET /api/v1/lily/public/orders/:id/tracking`

Header obrigatório:

`X-Lily-Order-Token: <capability>`

## Minimização da resposta

A API retorna somente o necessário para o acompanhamento:

- ID e número do pedido;
- tipo de fulfillment;
- estado financeiro;
- estado operacional;
- estado logístico;
- timestamps;
- total;
- itens com nomes/quantidades;
- timeline sem atores/notas;
- código de entrega somente quando a etapa permitir.

A API **não retorna**:

- telefone;
- endereço;
- CEP;
- referência;
- observação do cliente;
- observações internas;
- ator de evento;
- motivo de desistência/reatribuição;
- attribution/campanha;
- configuration hash;
- IDs internos de adicionais/sabores;
- dados do courier.

## Correção adicional de segurança

Antes da 11F, o endpoint autenticado de detalhe já escondia o código de entrega no frontend até a rota/chegada, mas o backend podia calculá-lo quando `includeDeliveryCode=true`.

A regra foi movida para o servidor. Agora o código só é serializado em:

- `picked_up`;
- `left_pickup`;
- `courier_arrived_delivery`.

Em `delivered` e `left_delivery`, ele deixa de ser retornado.

Isso vale tanto para o detalhe autenticado quanto para o guest.

## Frontend

Nova rota:

`/lilyacai/acompanhar/:id`

Comportamento:

- lê a capability do storage da própria sessão do navegador;
- nunca coloca o token na URL;
- polling a cada 10 segundos;
- timeline financeira + cozinha + entrega;
- código de entrega somente quando recebido pela API;
- resumo de itens e total;
- CTA para voltar ao pagamento enquanto `awaiting_payment`;
- depois de pagamento aprovado, a tela de pagamento guest direciona para o tracking.

Se a capability não estiver disponível, a página não oferece busca por telefone/nome/número do pedido. Isso evita transformar dados pessoais fáceis de obter em mecanismo de autenticação.

## Arquivos principais

Backend:

- `apps/api/src/modules/lily/orders.ts`;
- `apps/api/src/modules/lily/orders.test.ts`.

Frontend:

- `apps/lily_acai/src/features/orders/guest-token.ts`;
- `apps/lily_acai/src/features/orders/api.ts`;
- `apps/lily_acai/src/features/orders/GuestOrderTrackingPage.tsx`;
- `apps/lily_acai/src/features/checkout/CheckoutPage.tsx`;
- `apps/lily_acai/src/features/payments/PaymentPage.tsx`;
- `apps/lily_acai/src/main.tsx`;
- `apps/lily_acai/src/styles.css`.

## Cobertura adicionada

Teste backend valida:

- criação retorna capability guest;
- ausência do token não abre o pedido;
- token errado não abre o pedido;
- ID inexistente tem resposta equivalente;
- token correto abre;
- headers `no-store`/`no-referrer`;
- ausência de rua, CEP, telefone, campanha, actor, note e configurationHash;
- código ausente antes da rota;
- código presente em `picked_up`;
- código removido depois de `delivered`.

## Limitação consciente

Nesta tranche, a capability é de sessão do navegador. Fechar/limpar a sessão pode remover a chave local e, por segurança, não existe recuperação por telefone puro.

Recuperação segura futura deve usar um canal de verificação aprovado (por exemplo OTP via WhatsApp/SMS) e não faz parte da 11F.

## Validação necessária

Antes de considerar pronta:

- CI Node 20/24;
- migration/static checks herdados da 11E;
- testes;
- builds;
- Tool Health;
- CodeQL;
- smoke real guest: checkout -> pagamento -> tracking;
- reload da página;
- teste mobile;
- confirmar ausência do token em URL/logs/analytics.

## Próxima tranche

11G — ETA/mapas, mantendo:

- localização minimizada;
- provider de baixo custo/gratuito;
- timeout/cache;
- fallback quando mapas estiverem indisponíveis;
- nenhuma dependência de mapa para concluir uma entrega.

Depois:

- 11H — WhatsApp por etapa;
- 11I — conciliação automática do Pix próprio.
