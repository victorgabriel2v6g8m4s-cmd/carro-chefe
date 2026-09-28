# Roadmap oficial — CookLily

**Nome público definitivo:** CookLily  
**Wordmark oficial:** cookLily  
**Linha de gelato:** LilyShake / LilyShakes  
**Base histórica:** `lily-acai`  
**Branch canônica de integração:** `cooklily/canonical`  
**Namespaces técnicos preservados:** /lilyacai/, /api/v1/lily/, lily-acai.db.

## Entrega 03 — marca e rebranding

- logo e acervo inicial catalogados;
- nome CookLily definitivo;
- tokens de cor aprovados;
- tema web centralizado;
- frontend migrado;
- aliases de tracking documentados/testados;
- QA visual manual ainda separado.

## Entrega 04 — landing, leads, WhatsApp e primeira publicação

- landing mobile-first;
- telefone para cupons/promoções;
- consentimento explícito;
- entrada aceita la_* e legado cc_*;
- persistência canônica la*;
- CTA/acompanhamento P0 via WhatsApp;
- deploy controlado por SHA;
- publicação real ainda depende de autorização/deploy.

## Marco comercial fechado — cardápio inicial

Fonte: docs/lily-acai/produtos/CARDAPIO_INICIAL_DEFINITIVO.md

Fechado em 24/09/2026:

- Batidas de Açaí;
- LilyShakes;
- Doces em breve;
- sabores/componentes da inauguração;
- preços 300/500;
- LilyMix até 3 sabores;
- adicionais e limites;
- combos;
- Produto Destaque semanal;
- política de margem mínima;
- busca/filtros;
- regras de mídia;
- landing com carrossel de destaques;
- disponibilidade/esgotado;
- tracking;
- regras de conta/telefone.

## Entrega 05 — catálogo/admin

**Status:** implementação técnica concluída e validada; publicada na VPS para homologação conjunta com a Entrega 06; QA visual/funcional final pendente.

Implementado fielmente ao cardápio canônico:

- categorias/subcategorias;
- produtos/variantes;
- LilyFlavorComponent e matriz de compatibilidade;
- LilyMix sem explosão de SKUs;
- adicionais por produto;
- preço regular/oferta;
- guardrail de margem >=10%;
- mídia/placeholder/galeria;
- busca e filtros;
- rolagem incremental;
- esgotado visível;
- Destaque da Semana;
- admin completo.

Validação técnica da Entrega 05: SHA `9e9c2e194076aa5a8dd3262e73528ac3689c8896`, CI Node 20/24 e CodeQL aprovados.

## Entrega 06 — carrinho, endereço e pedido

**Status:** implementação técnica concluída e validada; deploy/homologação pendentes.

Implementado:

- carrinho persistido no navegador;
- observações por item;
- telefone obrigatório;
- compra sem conta;
- pedido associado à conta quando autenticado;
- endereços salvos para clientes autenticados;
- entrega e retirada;
- horários, regiões, pedido mínimo e taxa configuráveis;
- taxa fixa ou por região;
- recotação server-side antes de criar pedido;
- proteção contra preço/configuração stale;
- Idempotency-Key + fingerprint para evitar duplicidade;
- snapshots comerciais de pedido;
- histórico autenticado com isolamento por usuário;
- painel de fulfillment;
- pedidos criados em `awaiting_payment`, sem fingir pagamento.

Validação técnica da Entrega 06: SHA `da166683ab2d0e27acae23d9714ec8e824a02ac4`, CI Node 20/24 com 105 testes e CodeQL aprovados.

Relatório: `docs/lily-acai/entregas/ENTREGA_06_CARRINHO_PEDIDOS.md`.

## Entrega 07 — checkout/pagamento

**Status:** domínio financeiro e adapter automático Mercado Pago implementados na linha canônica; pagamentos continuam fail-closed e deploy/homologação operacional dependem de gate do SHA exato e credenciais reais.

Implementado:

- checkout/pagamento sobre pedidos `awaiting_payment`;
- contrato `LilyPaymentProvider`;
- Pix manual reconciliável como fallback;
- adapter `mercado_pago` sobre Orders API;
- Pix automático com QR Code/Copia e Cola;
- cartão tokenizado via Card Payment Brick, sem PAN/CVV no backend;
- webhook assinado com refetch autoritativo;
- cancelamento e estorno via provider;
- idempotência de pagamento;
- acesso guest por token seguro;
- painel financeiro;
- reconciliação de bruto/taxa/líquido e divergências;
- cancelamento e estorno parcial/integral;
- transição transacional de pedido para `paid`;
- separação real `staff`/`admin`;
- gestão de equipe;
- upgrade obrigatório de senha para contas privilegiadas.

O primeiro gate `gate/lily-entrega-07-v1` falhou em TypeScript porque `serializeOrder` foi passado diretamente a `Array.map`, fazendo o índice do map conflitar com o segundo parâmetro opcional do serializer. O mesmo erro fez o Tool Health reportar falha no `app-api`. A correção foi aplicada em `cooklily/canonical` e revalidada com sucesso: CI `36330633129`, CodeQL `36330633098`, 25 arquivos de teste / 122 testes em Node 20 e Node 24, builds e Tool Health aprovados.

Ainda pendente:

- criar/aprovar conta e aplicação Mercado Pago;
- configurar Public Key, Access Token, chave Pix e Webhook Secret;
- conferir taxas contratuais;
- smoke real de Pix/cartão;
- deploy/homologação da linha canônica.

**Gate de lançamento comercial digital:** Entregas 05–07 prontas, publicadas e homologadas.

## Entrega 08 — painel de pedidos

**Status:** parcial.

Já existe configuração de fulfillment e base operacional de pedidos. Ainda falta fechar a entrega como domínio operacional completo:

- fila operacional;
- gestão explícita de status;
- acompanhamento site/WhatsApp;
- rotinas de operação;
- integração posterior com ERP.

## Entrega 09 — tracking e analytics first-party

**Status:** parcial.

Já existe atribuição `la_*`/legado `cc_*` e persistência canônica sem PII em URL. Falta consolidar analytics first-party completo:

- manter QR físico atual;
- produto, variante, combinação, adicionais, campanha, origem, superfície e pedido;
- funis e eventos de navegação/compra;
- relatórios operacionais e de marketing.

## Entrega 10 — QA, observabilidade e hardening

**Status:** em aberto, com backlog formalizado.

- acessibilidade;
- observabilidade;
- segurança;
- backup/restore;
- performance;
- QA operacional e mobile;
- MFA de staff/admin: **implementada tecnicamente; enrollment/deploy pendentes**;
- recuperação segura de senha: pendente por falta de canal de verificação aprovado;
- overflows mascarados: **correção estrutural implementada; QA visual pendente**;
- focus trap e alvos de toque críticos: **implementados tecnicamente; QA real pendente**;
- controle explícito de outras sessões: **implementado tecnicamente**;
- Configurações da loja separada de fulfillment: **implementada tecnicamente**;
- deep-link de produto por slug: **implementado tecnicamente; QA real pendente**;
- revalidação dos 40 achados de UX/segurança/admin em `PENDENCIAS_UX_SEGURANCA_2026-09-27.md`.

## Entrega 11 — Pix próprio e operação ponta a ponta

**Status:** em desenvolvimento incremental.

Objetivos:

- Pix próprio CookLily sem taxa de gateway;
- acompanhamento do pedido pelo cliente;
- fila da cozinha;
- estados operacionais separados do estado financeiro;
- painel mobile do entregador;
- códigos de coleta e entrega;
- eventos auditáveis;
- automações/integrações bancárias posteriores.

### 11A — Pix próprio CookLily

Implementado no candidato atual:

- gerador interno de BR Code estático;
- CRC16 conforme BR Code;
- valor fixado no payload;
- `txid` único por pagamento;
- adapter `cooklily_pix` no contrato `PaymentProvider`;
- provider sem chamada a gateway externo;
- Pix Copia e Cola devolvido pelo backend;
- configuração fail-closed por variáveis da VPS;
- painel financeiro preparado para selecionar Pix CookLily;
- confirmação manual/reconciliação no primeiro estágio;
- testes do payload incluindo reprodução do exemplo oficial do Banco Central.

Configuração necessária na VPS, sem versionar valores:

- `COOKLILY_PIX_KEY`;
- `COOKLILY_PIX_MERCHANT_NAME`;
- `COOKLILY_PIX_MERCHANT_CITY`.

Limitação consciente da primeira fase:

- geração não tem taxa de gateway;
- tarifa de recebimento depende do banco/conta;
- confirmação automática ainda depende de API bancária/PSP recebedor;
- QR visual será integrado em subfase própria; o Pix Copia e Cola já é suficiente para validar o payload.

### 11B — domínio operacional

**Status:** primeira versão implementada e validada tecnicamente no runtime `8a9dbb2147f5bdee70e1a981cf2c03e0b183f9b9` (CI `36371053349`, CodeQL `36371053318`, 164 testes Node 20/24).

- [x] separar financeiro de produção/logística;
- [x] adicionar `operationStatus` ao pedido;
- [x] adicionar eventos operacionais próprios;
- [x] API de fila da cozinha em namespace administrativo existente;
- [x] RBAC staff/admin + MFA + CSRF;
- [x] impedir montagem antes de pagamento confirmado;
- [x] avanço otimista com proteção contra conflito concorrente;
- [x] painel `/painel/cozinha` em quatro colunas;
- [x] polling operacional a cada 5 segundos;
- [x] omitir telefone/endereço da API da cozinha;
- [ ] QA real em tablet/celular;
- [ ] SLA/alertas de atraso;
- [ ] impressão;
- [x] integração inicial com a etapa logística: ao ficar pronto para despacho, pedido de entrega entra em `waiting_courier`;
- [ ] QA real em operação de cozinha + entregador.

### 11C — cliente

**Status:** primeira versão implementada; nova integração logística em gate.

- [x] página de pedidos e detalhe autenticado;
- [x] polling do detalhe a cada 10 segundos;
- [x] timeline combinando eventos financeiros e de produção;
- [x] timeline preparada para eventos de entrega;
- [x] status legível por etapa;
- [x] código de entrega derivado e exibido somente quando a entrega já está em rota/chegada;
- [ ] guest tracking por token fora da sessão;
- [ ] SSE/WebSocket se polling deixar de ser suficiente;
- [ ] ETA/mapa;
- [ ] notificações WhatsApp/push.

### 11D — entregador

**Status:** primeira versão tecnicamente validada no runtime `0941ede6142c3e63fe90ff1d0b1dcbb7b5651322` — CI `36409871119`, CodeQL `36409871166`, 172 testes Node 20/24.

- [x] papel mínimo `courier`, separado de staff/admin;
- [x] senha privilegiada + MFA obrigatório + sessão privilegiada;
- [x] gestão de courier pelo painel e por `lily-promote-user`;
- [x] namespace `/api/v1/lily/courier/*`;
- [x] fila com somente pedidos pagos e liberados pela cozinha;
- [x] endereço reduzido antes do aceite;
- [x] endereço completo somente para o entregador responsável;
- [x] aceite atômico, impedindo dois entregadores no mesmo pedido;
- [x] “cheguei na coleta”;
- [x] confirmação do código de coleta;
- [x] “saí do local de coleta”;
- [x] “cheguei no local de entrega”;
- [x] confirmação do código de entrega;
- [x] “saí do local de entrega”;
- [x] códigos de 6 dígitos derivados por HMAC, sem plaintext persistido;
- [x] tentativas inválidas auditadas e limitadas;
- [x] painel mobile `/entregas`;
- [x] eventos logísticos separados do financeiro e da cozinha;
- [x] helper Nginx da Entrega 11D;
- [x] deploy fail-closed sem `COOKLILY_LOGISTICS_CODE_KEY`;
- [x] gate CI/CodeQL do runtime `0941ede6142c3e63fe90ff1d0b1dcbb7b5651322`;
- [ ] QA real em dois celulares/contas simultâneas;
- [ ] cancelamento/reatribuição operacional controlada;
- [ ] histórico completo de entregas para courier/admin.

Documento detalhado:

`docs/lily-acai/PIX_OPERACAO_PEDIDOS_ROADMAP_2026-09-27.md`

## Sincronizações paralelas

Antes do lançamento comercial completo:

- sincronizar workbook financeiro com cardápio definitivo;
- criar configuração de alergênicos;
- produzir fotos progressivamente;
- manter placeholder para o que ainda não tiver foto;
- configurar dados operacionais no sistema, não na documentação.

Cada deploy exige gates completos, backup/rollback e autorização explícita para o SHA exato.


## Patch P0 — 27/09/2026

Runtime `0f3e894f4993eea1c07aed881bad4ea4525e1674` validado com CI/CodeQL verdes, 131 testes em Node 20/24.

Entregue:

- correção estrutural do overflow mobile;
- carrossel sem alargamento artificial da viewport;
- guardas automatizadas de header/menu/hierarquia/logout;
- MFA TOTP obrigatório para staff/admin;
- segredo TOTP cifrado com AES-256-GCM;
- recovery codes de uso único armazenados como hash;
- deploy fail-closed sem chave MFA de produção.

Documento: `entregas/P0_UX_SEGURANCA_2026-09-27.md`.


## Patch P1/P2 — 27/09/2026

Runtime `a1176a444d6ab184ab75bdc30b5b0ee8449e05f0` validado com CI/CodeQL verdes e 136 testes em Node 20/24.

Entregue:

- focus trap do menu mobile;
- alvos críticos de toque >=44 px;
- página Configurações da loja e API dedicada;
- sessões visíveis para o titular e revogação explícita das demais;
- deep-link de produto `?produto=<slug>`.

Documento: `entregas/P1_UX_CONTA_ADMIN_2026-09-27.md`.
