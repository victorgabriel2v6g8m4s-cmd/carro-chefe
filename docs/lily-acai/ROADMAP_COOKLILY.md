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

**Status:** fluxo base implementado e expandido pelas Entregas 11F, 11G e 11H; QA real de navegador/mobile permanece pendente.

- [x] página de pedidos e detalhe autenticado;
- [x] polling do detalhe a cada 10 segundos;
- [x] timeline combinando eventos financeiros e de produção;
- [x] timeline preparada para eventos de entrega;
- [x] status legível por etapa;
- [x] código de entrega derivado e exibido somente quando a entrega já está em rota/chegada;
- [x] guest tracking por capability token seguro fora da sessão — 11F;
- [x] ETA/mapa de rota sem expor coordenadas ao cliente — 11G;
- [x] notificações operacionais por WhatsApp com opt-in/opt-out — 11H;
- [ ] SSE/WebSocket somente se polling de 10 s deixar de ser suficiente;
- [ ] push notification, sem prioridade enquanto tracking + WhatsApp cobrirem a operação;
- [ ] QA real de navegador/mobile.

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
- [x] recusa de oferta sem remover a entrega da fila global — 11E integrada/validada;
- [x] desistência antes da coleta e retorno seguro à fila — 11E integrada/validada;
- [x] reatribuição admin protegida contra concorrência e bloqueada após coleta — 11E integrada/validada;
- [x] histórico persistente de atribuições courier/admin — 11E integrada/validada.

### 11E — recusa, desistência, reatribuição e histórico

**Status:** tecnicamente validada e integrada em `cooklily/canonical` pelo PR #92. Runtime validado `ddda7af8648bf9bf69ab80f3ee2224e5a7d6dd77`; CI `36413414854` e CodeQL `36413414990`: success. QA real multiusuário permanece pendente.

- [x] novo `LilyDeliveryAssignment` com backfill;
- [x] índice parcial garantindo no máximo um vínculo ativo por pedido;
- [x] recusa de oferta por courier;
- [x] exclusão da mesma oferta para quem recusou/desistiu, sem afetar os demais;
- [x] desistência permitida somente antes de `picked_up`;
- [x] retorno transacional para `waiting_courier`;
- [x] reatribuição/devolução à fila por admin;
- [x] bloqueio de no-op e de reatribuição após coleta;
- [x] histórico paginado do courier;
- [x] histórico paginado/filtrável do admin;
- [x] minimização de endereço no histórico;
- [x] painel admin `/painel/entregas`;
- [x] UX de recusa/desistência no painel `/entregas`;
- [x] gate CI/CodeQL: CI `36413414854`, CodeQL `36413414990`;
- [ ] QA real multiusuário.

Documento: `docs/lily-acai/entregas/ENTREGA_11E_REATRIBUICAO_HISTORICO_2026-09-28.md`.

### 11F — tracking seguro de pedidos guest

**Status:** tecnicamente validada e integrada em `cooklily/canonical` pelo PR #94. Runtime validado `0d4f8a6f60821dfa09d9a94a2470e5f2ffb22af1`; CI `36414636227` e CodeQL `36414636183`: success. QA real de navegador/mobile permanece pendente.

- [x] endpoint de tracking protegido pelo token opaco já emitido no checkout;
- [x] token somente em header, nunca em query;
- [x] comparação de hash em tempo constante;
- [x] resposta uniforme contra enumeração;
- [x] `no-store`, `no-referrer` e `noindex`;
- [x] resposta minimizada sem telefone/endereço/notas internas/atores;
- [x] código de entrega somente nas etapas permitidas, validado no backend;
- [x] página guest com polling de 10 s;
- [x] CTA pagamento -> acompanhamento;
- [x] teste automatizado de capability e minimização;
- [x] gate CI/CodeQL: CI `36414636227`, CodeQL `36414636183`;
- [ ] QA real de navegador/mobile.

Documento: `docs/lily-acai/entregas/ENTREGA_11F_TRACKING_GUEST_2026-09-28.md`.

### 11G — ETA/mapas

**Status:** tecnicamente validada e integrada em `cooklily/canonical` pelo PR #97. Candidate SHA `58759148c410fe08584f9ff9895fd64cbeb02ca3`; CI `36602067779` e CodeQL `36602067812`: success. Homologação com chave/endereço reais permanece pendente.

- [x] provider OpenRouteService/HeiGIT com chave somente no backend;
- [x] geocodificação e directions server-side;
- [x] cache persistente 1:1 por pedido/endereço;
- [x] ETA iniciado somente após `left_pickup`;
- [x] cliente/guest recebe distância/duração/ETA sem coordenadas;
- [x] courier responsável recebe link de navegação OpenStreetMap;
- [x] sem GPS contínuo nem rastreamento de localização do aparelho;
- [x] falha do provider não bloqueia aceite/coleta/entrega;
- [x] testes unitários de adapter, privacidade e fail-open;
- [x] gate CI/CodeQL: CI `36602067779`, CodeQL `36602067812`;
- [ ] homologação com chave real e endereços reais.

Documento: `docs/lily-acai/entregas/ENTREGA_11G_ETA_MAPAS_2026-09-28.md`.

### 11H — WhatsApp por etapa

**Status:** tecnicamente validada e integrada em `cooklily/canonical` pelo PR #99. Candidate SHA `24913c695acabed46125166683f7ddb2c2fe89a9`; CI `36604181215` e CodeQL `36604181245`: success. Merge SHA `1dcb08036c4e25b3bf29c5a45c8130f65fb1a761`. Homologação Meta real permanece pendente.

- [x] opt-in operacional por pedido, desmarcado por padrão e separado de marketing;
- [x] opt-out seguro para conta e guest;
- [x] outbox persistente com unique pedido+etapa;
- [x] Meta Cloud API direta via backend;
- [x] template parametrizado por número do pedido + etapa;
- [x] retry exponencial, recuperação de claim stale e dead-letter lógico;
- [x] falha do provider nunca bloqueia fluxo operacional;
- [x] etapas financeiras/cozinha/logística conectadas;
- [x] endpoints admin de saúde/fila/retry;
- [x] testes de idempotência, segredo, retry e integrações;
- [x] gate CI/CodeQL;
- [ ] homologação com WABA, número, template e token reais.

Documento: `docs/lily-acai/entregas/ENTREGA_11H_WHATSAPP_ETAPAS_2026-09-29.md`.

### 11I — conciliação automática do Pix próprio

**Status:** tecnicamente validada e integrada em `cooklily/canonical` pelo PR #102. Candidate SHA `5758eaf634988bb8cb86b5c37fdf8be6aa3fd402`; CI `36622443247` e CodeQL `36622443193`: success. Merge SHA `41cdb60877ad660fad505a219cc695af7f0b9537`. Homologação bancária real permanece pendente.

- [x] provider `cooklily_pix` gera BR Code estático sem gateway;
- [x] txid próprio por pagamento;
- [x] ledger de pagamentos/eventos/reconciliação;
- [x] confirmação/reconciliação manual auditada como fallback;
- [x] ledger de Pix recebidos por `endToEndId`;
- [x] cursor persistente do poller com janela sobreposta;
- [x] adapter de ingestão compatível com API Pix v2 `GET /pix`;
- [x] paginação e parsing fail-closed para não avançar cursor com janela incompleta;
- [x] matching autoritativo por txid + valor;
- [x] idempotência de eventos bancários;
- [x] divergências/duplicidades/atrasos preservados para revisão;
- [x] aprovação automática somente após confirmação financeira exata;
- [x] audit trail + integração com WhatsApp operacional;
- [x] endpoints admin e worker periódico;
- [x] testes automatizados dos invariantes financeiros críticos;
- [x] gate CI/CodeQL do SHA final;
- [x] integração em `cooklily/canonical`;
- [ ] definir/homologar banco/PSP recebedor real e credenciais;
- [ ] confirmar detalhes específicos de OAuth/mTLS/scopes da instituição;
- [ ] smoke financeiro real/sandbox e tabela de tarifas da conta.

A especificação do Banco Central padroniza a API funcional de Pix recebidos, mas o acesso/autenticação é fornecido pela instituição onde a CookLily mantém a conta. Por isso, o provider permanece `disabled` até a instituição real ser definida; não será escolhido um PSP apenas para “fechar” a implementação.

Documento: `docs/lily-acai/entregas/ENTREGA_11I_CONCILIACAO_PIX_AUTOMATICA_2026-09-29.md`.

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
