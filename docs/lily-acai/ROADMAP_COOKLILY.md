# Roadmap oficial — CookLily

**Nome público definitivo:** CookLily  
**Wordmark oficial:** cookLily  
**Linha de gelato:** LilyShake / LilyShakes  
**Base histórica:** `lily-acai`  
**Branch canônica de integração:** `cooklily/canonical`  
**Namespaces técnicos preservados:** /lilyacai/, /api/v1/lily/, lily-acai.db.

## Estado atual — 08/10/2026

- **Fase ativa:** finalizar a UI pública da CookLily. O foco imediato é consistência visual, hierarquia de compra, responsividade, acessibilidade e estados de interface.
- **QR Pix próprio — etapa homologada:** o proprietário escaneou o QR em outro celular, abriu a cobrança no aplicativo bancário e confirmou que o valor apresentado correspondia ao pedido. Registro: [Homologação do QR Pix](entregas/HOMOLOGACAO_QR_PIX_2026-10-08.md).
- **Limite da homologação:** nenhum pagamento foi concluído. Liquidação/recebimento, confirmação financeira, atualização do pedido para pago e liberação operacional continuam pendentes para uma etapa posterior de teste financeiro.
- **Princípio de sequência:** finalizar a experiência visual agora; não usar a leitura do QR como prova de que o fluxo financeiro ponta a ponta foi homologado.

## Próxima fase prioritária — UI definitiva do site público

O escopo principal desta fase é a experiência do cliente. A implementação deve seguir o [kit de marca](marca/KIT_DE_MARCA.md), o cardápio canônico e as decisões do ADR-002. Os painéis operacionais continuam em sua trilha própria.

### U1 — estrutura visual compartilhada

- [ ] revisar header, navegação desktop/mobile, drawer, conta, carrinho, rodapé e largura máxima do conteúdo;
- [ ] aplicar tokens CookLily e hierarquia tipográfica consistente, sem misturar a estética do Carro Chefe;
- [ ] garantir que os ativos reais aprovados sejam usados corretamente e que placeholders não dominem o catálogo;
- [ ] revisar feedbacks discretos e estados de foco/hover/pressed, sem reload global desnecessário.

### U2 — landing e descoberta do catálogo

- [ ] revisar a primeira dobra e a ordem busca → destaque compacto → produto/grade → combos;
- [ ] harmonizar cards, selos de oferta, preço, disponibilidade e fotografia;
- [ ] validar busca, filtros, contador, rolagem incremental, carrossel de combos e deep-link;
- [ ] garantir que produtos esgotados permaneçam visíveis com estado inequívoco.

### U3 — produto, opções e carrinho

- [ ] finalizar modal/página de produto, seleção de 300/500 ml, LilyMix, compatibilidade de sabores e adicionais;
- [ ] tornar preço, quantidade, observações e subtotal claros antes de adicionar ao carrinho;
- [ ] revisar carrinho vazio, item indisponível, alteração de quantidade, remoção e recotação;
- [ ] manter regras e preços derivados do backend; a UI não pode ser fonte autoritativa do valor.

### U4 — checkout e apresentação do pagamento

- [ ] harmonizar endereço, entrega/retirada, taxa, mínimo, prazo e resumo final do pedido;
- [ ] finalizar visual da tela Pix: QR em destaque, valor, Copia e Cola legível, botão de copiar e confirmação discreta de cópia;
- [ ] revisar carregamento, pendência, expiração, falha e retorno ao pedido, sem simular aprovação;
- [ ] refletir somente os métodos realmente habilitados no backend. A arquitetura-alvo do ADR-002 continua sendo Pix próprio + crédito/débito Mercado Pago; métodos ainda não prontos não devem parecer disponíveis para pagamento real;
- [ ] preservar a homologação já feita do QR, sem reabrir o teste de liquidação nesta fase visual.

### U5 — conta, pedido e acompanhamento do cliente

- [ ] harmonizar login/cadastro, perfil e histórico com a identidade visual;
- [ ] revisar a confirmação do pedido e a timeline guest/autenticada em desktop e mobile;
- [ ] garantir que cada estado financeiro/operacional tenha texto claro e que não prometa pagamento aprovado antes da confirmação autoritativa;
- [ ] manter recuperação de senha bloqueada até existir um canal seguro de verificação aprovado.

### U6 — acessibilidade, responsividade e aceite visual

- [ ] revisar em 320, 360, 390, 430, 768 px e desktop: sem overflow horizontal, cortes ou sobreposição;
- [ ] testar teclado, foco, Escape, leitor de tela, contraste, alvos de toque e reduced motion;
- [ ] implementar a sanfona de alergênicos fechada por padrão, exibindo o aviso/conteúdo somente após abertura, conforme ADR-002;
- [ ] conferir estados loading, vazio, erro, sucesso, desabilitado e indisponível em cada tela;
- [ ] fazer uma passada visual ponta a ponta e registrar pendências restantes antes de chamar a UI de definitiva.

### U7 — Reels de produtos e descoberta imersiva

- [ ] auditar e reutilizar a janela de produto, adicionais, carrinho e modelo de mídia existentes;
- [ ] implementar carrossel horizontal de mídias por produto, com a capa como primeiro item;
- [ ] implementar navegação vertical entre produtos e gestos horizontais de saída somente nos limites definidos;
- [ ] implementar pausa/retomada, controle de som e pressão na borda superior para reprodução 2× em vídeo;
- [ ] implementar os modos relacionados, ordem atual dos filtros e aleatório com ícones e mensagem temporária;
- [ ] integrar salvar, curtir, comentários, compartilhamento e botão de carrinho com feedback visual de 250 ms;
- [ ] definir autenticação/moderação para comentários e regras de salvar/curtir antes de ativar essas ações;
- [ ] definir contrato de analytics/atribuição para usuários autenticados e visitantes, com minimização de dados;
- [ ] validar fallback de mídia, ciclo de vida de vídeos, acessibilidade e gestos em aparelhos reais.

### U8 — navegação mobile, Dashboard e repetição de pedidos

- [ ] organizar as cinco abas na ordem Cardápio, Ranking, Reels (centro), Dashboard e Perfil;
- [ ] preservar contexto e carrinho ao trocar de aba ou voltar dos Reels;
- [ ] implementar os estados do Dashboard para pedido ativo, último pedido dentro de sete dias e ausência de pedido recente;
- [ ] omitir completamente o bloco de status quando não houver pedido aplicável;
- [ ] criar carrossel de histórico de pedidos e ação “Pedir novamente” com últimas escolhas pré-preenchidas;
- [ ] recotar preço/disponibilidade no servidor e tratar adicionais removidos sem usar valores antigos;
- [ ] preparar histórico de pontos, gráficos, metas, missões e reivindicações;
- [ ] implementar a barra de progressão vertical de baixo para cima, com marcas e recompensas por nível, adaptada ao mobile.

### U9 — fidelidade configurável: pontos, ranks, missões e recompensas

- [ ] fechar a semântica e a tabela completa dos 21 níveis antes de codificar a progressão;
- [ ] preservar os valores iniciais fornecidos: 200 pontos Bronze I → II, fator 1,66 para progressão subsequente conforme regra aprovada, e 10.000.000 Mestre → Elite;
- [ ] manter 990 pontos = R$ 1 como referência interna não pública, sem expor a equivalência ao cliente;
- [ ] separar saldo disponível, pontos acumulados de progressão, custo do próximo avanço e rank atual;
- [ ] definir regras de ganho, estorno, idempotência e auditoria de pontos;
- [ ] desbloquear missões especiais/personalizadas e pontuação melhor conforme o rank, por configuração;
- [ ] suportar recompensas em cupons, cashback ou produtos, com elegibilidade, validade e prevenção de resgates duplicados;
- [ ] criar página administrativa para configurar pontos, ranks, limiares, missões, recompensas, permissões e versionamento;
- [ ] decidir como mudanças de configuração afetam usuários existentes e como tratar reembolsos/estornos;
- [ ] homologar o fluxo de progressão e resgate com evidência antes de declarar fidelidade pronta.

Especificação detalhada: [UX, Reels, Dashboard e fidelidade](UX_REELS_DASHBOARD_FIDELIDADE_2026-10-09.md). Os itens U7–U9 são planejamento novo; não representam funcionalidades já implementadas.

### Etapa financeira posterior — fora do escopo desta fase

- [ ] realizar um pagamento controlado, depois da fase visual;
- [ ] verificar recebimento/PSP e evento autoritativo de confirmação;
- [ ] confirmar pagamento aprovado → pedido pago → liberação correta da cozinha;
- [ ] verificar tracking/timeline, idempotência e tratamento de evento duplicado/divergente.

A UI pode ser finalizada sem fingir que essa etapa financeira já passou. O aceite do QR e o aceite do pagamento ponta a ponta são portões diferentes.


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

**Status:** domínio financeiro e integrações de pagamento estão implementados na linha canônica. Em 08/10/2026 foi homologada a apresentação/leitura do QR Pix próprio e conferido o valor da cobrança em outro celular. O pagamento não foi concluído; recebimento, confirmação financeira, transição do pedido para pago e liberação operacional continuam sem homologação ponta a ponta.

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

Ainda pendente / atualizado pelo ADR-002 de 30/09/2026:

- criar/aprovar conta e aplicação Mercado Pago;
- configurar Public Key, Access Token e Webhook Secret;
- implementar **cartão de débito** via Mercado Pago;
- refatorar o roteamento para permitir **Pix próprio CookLily + crédito/débito Mercado Pago simultaneamente**;
- retirar Mercado Pago Pix da matriz pública necessária, preservando-o apenas se houver motivo de compatibilidade/homologação;
- conferir taxas contratuais;
- smoke real de Pix próprio + crédito + débito;
- deploy/homologação da linha canônica.

**Gate de lançamento comercial digital:** Entregas 05–07 prontas, publicadas e homologadas.

## Entrega 08 — painel de pedidos

**Status:** tecnicamente validada e integrada em `cooklily/canonical` pelo PR #108. Candidate SHA `62b0c6eca315c718c512b35a6274ba01f701c270`; CI `36635632700` e CodeQL `36635632701`: success. QA real permanece pendente.

Implementado:

- torre de controle unificada para financeiro, cozinha e logística;
- filtros por estado, modalidade e número do pedido;
- alertas objetivos de pagamento/cozinha/SLA/logística;
- próxima ação roteada ao domínio responsável;
- sem endpoint genérico de edição/forçamento de status;
- conclusão auditável de retirada presencial paga e pronta;
- MFA + CSRF + concorrência otimista na retirada;
- minimização de PII no overview;
- painel responsivo `/painel/pedidos`;
- testes de RBAC, privacidade, SLA, filtros e transição de retirada.

Documento: `docs/lily-acai/entregas/ENTREGA_08_TORRE_CONTROLE_PEDIDOS_2026-09-29.md`.

## Entrega 09 — tracking e analytics first-party

**Status:** tecnicamente validada e integrada em `cooklily/canonical` pelo PR #110. Candidate SHA `c52a0fcda0d016f282ad513b4b91b0098fc0a75c`; CI `36637864661` e CodeQL `36637864655`: success. QA real permanece pendente.

Implementado:

- analytics first-party próprio, sem dependência de GA4/Clarity;
- consentimento explícito, recusa sem perda de funcionalidade e fila pré-consentimento apenas em memória;
- sessão/evento pseudônimos por UUID;
- ingestão strict sem telefone, nome, endereço, notas, tokens ou query string;
- atribuição canônica `la_*` com entrada legada `cc_*`;
- eventos de landing, catálogo, produto, combo, carrinho, checkout, pagamento e canais;
- funil por sessão;
- métricas de produto;
- painel staff `/painel/analytics`;
- pedidos e receita calculados de `LilyOrder` como fonte autoritativa;
- pedidos de homologação excluídos das métricas comerciais por padrão;
- testes backend/frontend de privacidade, consentimento, idempotência e agregação.

Pendente:

- QA real do aviso/preferências e dashboard;
- definir retenção jurídica definitiva antes da operação comercial plena.

Documento: `docs/lily-acai/entregas/ENTREGA_09_ANALYTICS_FIRST_PARTY_2026-09-29.md`.

## Entrega 10 — QA, observabilidade e hardening

**Status:** parte técnica automatizável validada e integrada. 10A integrada pelo PR #112; 10B integrada pelo PR #116. QA real e decisões externas continuam pendentes.

### 10A — observabilidade e backup/restore

Candidate SHA `3ba8c615c64b736692d7e925d51d9659225f876d`; CI `36639472270` e CodeQL `36639472287`: success. Merge `632ad25a2e72954e301093259c28535993ef7d05`.

Implementado:

- `X-Request-Id` para correlação de incidentes;
- redaction de Authorization, cookies, CSRF, guest token, agent key e assinaturas;
- painel staff `/painel/saude` com agregados sem PII;
- `Cache-Control: no-store` no resumo operacional;
- verificador isolado de backup SQLite;
- `integrity_check` + `foreign_key_check` + leitura de migrations;
- SHA-256 dos backups nas evidências;
- deploy fail-closed antes de stop/migrations se backup recém-criado não validar;
- helper de verificação instalado somente após deploy saudável;
- runbook de restauração manual e drill isolado;
- testes de privacidade, logger e deploy.

Documento: `docs/lily-acai/entregas/ENTREGA_10A_OBSERVABILIDADE_BACKUP_2026-09-29.md`.

### 10B — acessibilidade e performance em CI

Candidate SHA `d895e51ba764382238b4227e27e2e5c8816be34e`; CI `36640536487` e CodeQL `36640536577`: success. Merge `930f9d3aa635af099e7a1b9b0de928bb54bdd80f`.

Implementado:

- skip link e destino de foco no conteúdo principal;
- foco visível ampliado para controles interativos;
- regressões de idioma/viewport/reduced-motion;
- regressões preservando focus trap, touch targets, navegação ativa e ausência de overflow mascarado;
- budget de bundle integrado ao `build:lily`;
- testes do medidor/budget integrados ao `npm test`;
- build validado em 468,27 KiB JS raw / 121,81 KiB gzip e 89,05 KiB CSS raw / 16,46 KiB gzip.

Documento: `docs/lily-acai/entregas/ENTREGA_10B_A11Y_PERFORMANCE_2026-09-29.md`.

Ainda pendente na Entrega 10:

- QA operacional e mobile real em 320/360/390/430/768 px;
- teclado completo/leitor de tela/contraste final em navegador real;
- Lighthouse/Core Web Vitals após publicação;
- enrollment real de MFA na VPS;
- recuperação segura de senha: bloqueada até definição de canal confiável de verificação;
- retenção de PII/logs/analytics/backups: depende de política final;
- drill real de backup/restore e cópia externa criptografada;
- revalidação dos achados marcados QA REAL PENDENTE em `PENDENCIAS_UX_SEGURANCA_2026-09-27.md`.

## Entrega 11 — Pix próprio e operação ponta a ponta

**Status:** subfases 11A–11K tecnicamente implementadas/integradas; permanecem homologações reais, credenciais externas e QA operacional.

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

**Homologação parcial em 08/10/2026:** QR personalizado lido em outro celular e valor da cobrança conferido. Isso homologa geração visual/leitura/valor, não liquidação nem atualização do estado do pedido. Ver [relatório de homologação](entregas/HOMOLOGACAO_QR_PIX_2026-10-08.md).

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

Estado após a Entrega 11I:

- geração continua sem taxa de gateway;
- tarifa de recebimento depende do banco/conta;
- conciliação automática já existe tecnicamente via adapter API Pix v2, mas permanece desabilitada até banco/conta/credenciais reais serem homologados;
- BR Code/Pix Copia e Cola já fazem parte do fluxo técnico.

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
- [x] SLA configurável da etapa de montagem + alertas visuais — 11J integrada/validada;
- [x] impressão via comanda dedicada do navegador — 11K integrada/validada;
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

### 11J — SLA e alertas operacionais da cozinha

**Status:** tecnicamente validada e integrada em `cooklily/canonical` pelo PR #104. Candidate SHA `b5413d4bc9d0c6cd63f9661f285968f10dc22747`; CI `36626787032` e CodeQL `36626787547`: success. Merge SHA `16097e4ed3dda019d981d8d1da3f1be6dd00794c`. Definição do SLA real e QA em tablet/celular permanecem pendentes.

- [x] threshold `kitchenPreparationSlaMinutes` nullable e sem valor padrão;
- [x] migration aditiva;
- [x] configuração staff no painel de fulfillment;
- [x] validação server-side de 1–720 minutos ou `null`;
- [x] cálculo server-side a partir de `operationUpdatedAt`;
- [x] SLA somente em `preparing`;
- [x] DTO por pedido com prazo/restante/atraso;
- [x] resumo de pedidos atrasados na fila atual;
- [x] alerta visual no card da cozinha;
- [x] atraso não muda status nem executa automação;
- [x] testes unitários e de integração;
- [x] gate CI/CodeQL;
- [x] integração em `cooklily/canonical`;
- [ ] definir SLA real com a operação;
- [ ] QA real em tablet/celular.

Documento: `docs/lily-acai/entregas/ENTREGA_11J_SLA_ALERTAS_COZINHA_2026-09-29.md`.

### 11K — impressão da cozinha

**Status:** tecnicamente validada e integrada em `cooklily/canonical` pelo PR #106. Candidate SHA `80da3aa2e9321b106f44a99bfed3236344a7dd77`; CI `36628488151` e CodeQL `36628488179`: success. Merge SHA `56a4884abd491df66a14e9db96772b9dd0da7a03`. QA de impressão real permanece pendente.

- [x] contrato de comanda separado/minimizado;
- [x] endpoint staff `/api/v1/lily/admin/kitchen/orders/:id/print`;
- [x] bloqueio antes de pagamento + liberação para produção;
- [x] ausência de telefone/endereço/códigos logísticos;
- [x] sabores reduzidos somente a nomes;
- [x] página dedicada `/painel/cozinha/imprimir/:id`;
- [x] botão de impressão somente nos estados aptos;
- [x] impressão nativa do navegador/sistema operacional;
- [x] CSS `@media print` sem impor largura/modelo de papel;
- [x] impressão não altera status nem gera evento operacional;
- [x] testes de autorização, privacidade e readiness;
- [x] gate CI/CodeQL;
- [x] integração em `cooklily/canonical`;
- [ ] QA em PDF e impressora real;
- [ ] integração de hardware específica somente se o equipamento futuro exigir.

Documento: `docs/lily-acai/entregas/ENTREGA_11K_IMPRESSAO_COZINHA_2026-09-29.md`.

## Entrega 12 — alergênicos do catálogo e do pedido

**Status:** tecnicamente validada e integrada em `cooklily/canonical` pelo PR #117. Candidate SHA `da643f2d5e3fc07a3764ebfb8eb2d08f3e7a1e0a`; CI `36745374077` e CodeQL `36745374191`: success. Revisão dos dados reais e QA permanecem pendentes.

Implementado:

- vocabulário controlado de alergênicos;
- produto, sabor e adicional começam como `unreviewed`;
- editor administrativo de revisão, CONTÉM e PODE CONTER;
- API pública normalizada;
- agregação autoritativa no backend;
- `CONTÉM` prevalece sobre `PODE CONTER`;
- produto fixo não permite retirar sabores da composição para alterar a informação;
- combos unem os resumos dos componentes;
- carrinhos antigos ficam explicitamente incompletos;
- checkout recota antes de criar o pedido;
- snapshot imutável por item em `LilyOrderItem.allergenSnapshotJson`;
- cliente autenticado, guest tracking, cozinha e comanda usam o snapshot histórico;
- testes de domínio, catálogo, pedidos, cozinha e interface.

Pendente:

- preenchimento/revisão operacional do catálogo real;
- política de contato cruzado;
- implementar a apresentação em **sanfona fechada por padrão**, com aviso exibido somente ao abrir, conforme ADR-002;
- QA real em mobile/desktop e impressão.

Documento: `docs/lily-acai/entregas/ENTREGA_12_ALERGENICOS_2026-09-30.md`.

## Sincronizações paralelas

Antes do lançamento comercial completo:

- sincronizar workbook financeiro com cardápio definitivo;
- revisar e homologar os dados reais de alergênicos e contato cruzado;
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
