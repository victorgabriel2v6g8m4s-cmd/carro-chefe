# Entrega 06 — carrinho, endereço, entrega/retirada e criação de pedido

**Status:** implementação técnica concluída e validada; deploy e homologação funcional pendentes  
**Data da validação:** 25/09/2026  
**Branch de desenvolvimento:** `feat/lily-entrega-06-pedidos`  
**Base funcional:** `lily-acai` em `26cb6511500775a91549cd18454aa315be631983`  
**SHA técnico validado:** `da166683ab2d0e27acae23d9714ec8e824a02ac4`

## Objetivo

Transformar o catálogo administrável da Entrega 05 em um fluxo de compra capaz de:

- montar carrinho a partir de configurações validadas do catálogo;
- recalcular preço e disponibilidade no servidor;
- suportar compra guest e conta autenticada;
- coletar telefone obrigatório;
- suportar retirada e entrega;
- configurar horários, taxa, pedido mínimo e regiões sem hardcode;
- persistir pedidos com snapshots comerciais;
- evitar duplicação de pedido em retries;
- disponibilizar histórico e endereços para clientes autenticados;
- deixar o pedido pronto para a Entrega 07, sem simular pagamento.

A Entrega 06 não aprova nem reconcilia pagamento. Pedidos novos nascem em `awaiting_payment`.

## Revisão contra branches atuais

### `lily-acai`

Na revisão de 25/09/2026, a branch desta entrega estava:

- 41 commits à frente de `lily-acai`;
- 0 commits atrás;
- merge-base exatamente em `26cb6511500775a91549cd18454aa315be631983`.

Portanto, a Entrega 06 contém integralmente a linha CookLily documentada até o fechamento da Entrega 05.

### `main`

Na mesma revisão, a branch estava 3 commits atrás da `main` atual. Esses commits posteriores ao merge-base CookLily alteram:

- ações do CodeQL;
- dependências do projeto principal;
- documentação/marketing;
- workbook e snapshot financeiro.

Eles não contêm implementação CookLily da Entrega 06. Não foram incorporados nesta branch para não alterar o conjunto técnico que já passou por CI/CodeQL e, consequentemente, invalidar o SHA aprovado sem necessidade operacional imediata.

A CookLily continua temporária e isolada. Esta branch não deve ser mergeada integralmente na `main`.

## Banco de dados

Migration:

`packages/lily-database/prisma/migrations/20260925100000_lily_orders/migration.sql`

Modelos adicionados:

- `LilyAddress`;
- `LilyOperationalSettings`;
- `LilyDeliveryZone`;
- `LilyOrder`;
- `LilyOrderItem`;
- `LilyOrderItemAddon`;
- `LilyOrderStatusEvent`.

### Defaults seguros

A migration cria a configuração operacional com:

- `ordersEnabled = false`;
- `pickupEnabled = false`;
- `deliveryEnabled = false`;
- pedido mínimo R$ 0,00;
- taxa fixa R$ 0,00;
- horário vazio;
- timezone `America/Campo_Grande`.

Aplicar a migration não abre pedidos automaticamente. A equipe precisa configurar e habilitar a operação conscientemente no painel.

## Autoridade de preço e configuração

A Entrega 06 não confia no total calculado no navegador.

Antes de criar o pedido o backend reexecuta a configuração do item usando a mesma autoridade da Entrega 05:

- produto e variante;
- disponibilidade;
- tamanho;
- sabores;
- matriz de compatibilidade;
- LilyMix;
- adicionais e limites;
- oferta vigente;
- combo e regras;
- quantidade.

O cliente envia `configurationHash` e `expectedUnitPriceCents` como expectativas. O servidor compara com o cálculo atual.

Se a configuração mudou:

`LILY_CONFIGURATION_CHANGED`

Se o preço mudou:

`LILY_PRICE_CHANGED`

O pedido só é persistido depois da revalidação.

## Carrinho

Frontend:

`apps/lily_acai/src/features/cart/`

O carrinho:

- recebe produto configurado pelo catálogo;
- suporta produto e combo;
- persiste no `localStorage`;
- guarda a configuração necessária para recotação;
- permite quantidade;
- permite observação;
- exibe subtotal de snapshot somente como referência;
- é recalculado no servidor no checkout.

Rota:

`/lilyacai/carrinho`

## Checkout

Frontend:

`apps/lily_acai/src/features/checkout/CheckoutPage.tsx`

Rota:

`/lilyacai/checkout`

Suporta:

- guest;
- cliente autenticado;
- telefone obrigatório;
- retirada;
- entrega;
- endereço manual;
- endereço salvo quando autenticado;
- observação geral;
- recotação antes da criação;
- exibição de taxa, subtotal e total retornados pelo servidor.

Após criação, a interface informa explicitamente que o pedido aguarda pagamento e que pagamento pertence à Entrega 07.

## API de pedidos

Rotas:

```text
POST /api/v1/lily/orders/quote
POST /api/v1/lily/orders

GET  /api/v1/lily/customer/orders
GET  /api/v1/lily/customer/orders/:id
```

### Guest

A criação de pedido não exige conta.

O telefone é normalizado e obrigatório.

### Usuário autenticado

Quando há sessão Lily válida:

- o pedido recebe `userId`;
- mutação exige CSRF;
- o histórico filtra por `userId`;
- acesso direto ao ID de pedido de outro cliente retorna 404.

## Idempotência

`POST /api/v1/lily/orders` exige `Idempotency-Key`.

O backend grava:

- a chave;
- fingerprint canônico do pedido.

Retry da mesma requisição retorna o pedido existente.

Reuso da mesma chave com conteúdo diferente retorna conflito.

A implementação também trata corrida de unicidade no banco e recupera o pedido criado pela requisição concorrente quando o fingerprint coincide.

## Snapshots comerciais

O pedido persiste snapshots para preservar o que foi efetivamente contratado, mesmo que o catálogo mude depois.

Inclui:

- nome do produto;
- nome da variante;
- tamanho;
- configuração;
- sabores;
- adicionais;
- preço unitário;
- quantidade;
- total da linha;
- endereço de entrega;
- atribuição `la*`;
- eventos de status.

Alterar preço ou texto no catálogo depois não reescreve pedidos anteriores.

## Endereços

Rotas autenticadas:

```text
GET    /api/v1/lily/customer/addresses
POST   /api/v1/lily/customer/addresses
PATCH  /api/v1/lily/customer/addresses/:id
DELETE /api/v1/lily/customer/addresses/:id
```

Mutações exigem sessão + CSRF.

Toda busca/edição/remoção inclui o `userId` do titular para impedir acesso a endereço de outra conta.

A primeira inclusão vira endereço padrão; ao remover o padrão, outro endereço existente pode assumir automaticamente.

## Entrega e retirada

Backend:

`apps/api/src/modules/lily/fulfillment.ts`

Rota pública:

`GET /api/v1/lily/public/fulfillment`

Admin:

```text
GET   /api/v1/lily/admin/fulfillment
PATCH /api/v1/lily/admin/fulfillment
POST  /api/v1/lily/admin/delivery-zones
PATCH /api/v1/lily/admin/delivery-zones/:id
```

Configurações:

- pedidos online ligados/desligados;
- retirada ligada/desligada;
- entrega ligada/desligada;
- pedido mínimo global;
- estratégia de entrega;
- taxa fixa;
- endereço de retirada;
- instruções;
- horários;
- timezone.

### Estratégias

`flat`

Usa taxa fixa configurada.

`zone`

Resolve uma região ativa por bairro e/ou prefixo de CEP e aplica:

- taxa da região;
- maior pedido mínimo entre global e região.

Endereço não coberto é rejeitado pelo servidor.

## Horários

Os pedidos são aceitos somente dentro dos horários configurados.

Timezone operacional fixado em:

`America/Campo_Grande`

Não existe horário comercial inventado no código ou na documentação. A operação deve cadastrar seus horários no painel antes de habilitar pedidos.

## Painel operacional

Nova rota:

`/lilyacai/painel/entrega`

Permite administrar:

- abertura/fechamento dos pedidos;
- retirada;
- entrega;
- pedido mínimo;
- estratégia de entrega;
- taxa fixa;
- endereço/instruções de retirada;
- horários;
- regiões;
- taxa e mínimo por região;
- bairros e prefixos de CEP.

Alterações exigem staff/admin e CSRF e são auditadas em `LilyAdminAudit`.

## Rotas de conta no frontend

```text
/lilyacai/enderecos
/lilyacai/pedidos
/lilyacai/pedidos/:id
```

Cliente autenticado pode:

- listar endereços;
- cadastrar/remover endereços;
- visualizar seus pedidos;
- abrir detalhe de pedido próprio.

## Nginx

Além dos namespaces da Entrega 05, o template autoriza explicitamente antes do bloqueio genérico de `/api/`:

```text
/api/v1/lily/orders
/api/v1/lily/orders/*
/api/v1/lily/customer/*
```

As proteções de sessão/CSRF continuam no Fastify; o Nginx apenas expõe os namespaces necessários.

## Testes adicionados

`apps/api/src/modules/lily/orders.test.ts`

11 testes específicos cobrem:

1. pedidos permanecem fechados até configuração explícita;
2. configuração operacional exige staff + CSRF;
3. preço, mínimo e taxa fixa são recalculados no servidor;
4. guest cria pedido com snapshots e replay idempotente;
5. chave idempotente não pode ser reutilizada com outro pedido;
6. preço stale entre cotação e criação é rejeitado;
7. entrega por região calcula taxa e rejeita endereço não atendido;
8. combo permanente é cotado/criado pelo servidor;
9. produto fora da regra do combo é rejeitado;
10. endereços são isolados entre clientes e mutações exigem CSRF;
11. pedido autenticado é vinculado ao dono e histórico impede IDOR.

## Evidências de validação

### SHA técnico

`da166683ab2d0e27acae23d9714ec8e824a02ac4`

### CI

Run: `36124932957`

Resultado: **success**.

Incluiu:

- Quality / Node 20: success;
- Quality / Node 24: success;
- migration `20260925100000_lily_orders`: aplicada em banco limpo;
- 21 arquivos de teste aprovados;
- **105 testes aprovados**;
- build CookLily: success;
- Workbook Snapshot: success;
- Excel Recipe Linux: success;
- Excel Recipe Windows: success;
- Tool Health Linux: success;
- Windows Supervisor: success.

### CodeQL

Run: `36124933082`

Resultado: **success**.

### PR temporário

PR #65 — `chore(lily): valida Entrega 06 — carrinho e pedidos`

Foi fechado sem merge. Serviu somente para disparar CI/CodeQL. Não autoriza merge integral CookLily -> `main`.

## Revisão manual de código

Na revisão antes do fechamento documental foram confirmados:

- preço/configuração revalidados no servidor;
- guest permitido sem abrir histórico público;
- histórico autenticado filtrado por `userId`;
- endereços filtrados por titular;
- CSRF em mutações autenticadas;
- idempotência com fingerprint;
- default operacional fechado;
- horários/taxas/regiões configuráveis;
- Nginx com namespaces explícitos;
- ausência de pagamento fingido na Entrega 06.

Não foi encontrada condição que exigisse alterar o SHA técnico já validado.

## Não executado

A validação técnica não significa homologação operacional.

Ainda pendentes:

- aplicar migration 06 no banco real da VPS;
- publicar o SHA técnico;
- atualizar/revisar Nginx real;
- configurar endereço de retirada;
- definir horários reais;
- definir pedido mínimo real;
- definir taxa fixa ou zonas reais;
- habilitar retirada/entrega;
- habilitar pedidos;
- criar pedido guest real de homologação;
- criar pedido autenticado real;
- testar persistência após restart;
- QA visual mobile/desktop;
- homologação conjunta das Entregas 05 e 06 pelo proprietário.

## Gate de publicação

Publicar por SHA imutável:

`da166683ab2d0e27acae23d9714ec8e824a02ac4`

Procedimento:

1. registrar SHA atual da VPS para rollback;
2. confirmar checkout limpo;
3. backup do banco core e `lily-acai.db`;
4. checkout detached do SHA acima;
5. instalar dependências;
6. executar preflight isolado como no CI;
7. parar o serviço antes da migration SQLite se houver lock;
8. executar `npm run db:deploy:core`;
9. executar `npm run db:deploy:lily`;
10. revisar/aplicar as novas rotas Nginx;
11. `nginx -t`;
12. reiniciar/recarregar serviços;
13. health checks;
14. validar painel de entrega;
15. configurar operação real ainda com `ordersEnabled=false`;
16. habilitar pedidos somente quando horários/retirada ou entrega estiverem corretos;
17. smoke guest e autenticado;
18. homologação visual.

## Rollback

Rollback de aplicação pode retornar ao SHA anterior.

A migration cria tabelas novas e não deve ser revertida apagando tabelas manualmente durante incidente. Se for necessária restauração de banco, usar o backup consistente criado antes da migration conforme o runbook de VPS.

## Próxima entrega

**Entrega 07 — pagamento e reconciliação.**

Ela deve consumir pedidos em `awaiting_payment`, integrar um provedor aprovado e atualizar estado financeiro somente a partir de confirmação confiável do provedor. Número de cartão/CVV não deve ser persistido pela aplicação.
