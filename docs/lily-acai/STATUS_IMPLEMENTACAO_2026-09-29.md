# CookLily — auditoria de implementação após Entrega 11F

**Data da revisão:** 29/09/2026  
**Fonte de verdade:** código, migrations, testes, documentação e estado dos PRs/branches no repositório Carro Chefe.

## Pedido original confrontado

Sequência solicitada:

1. recusa/desistência e reatribuição segura de entregas;
2. histórico de entregas courier/admin;
3. tracking seguro de pedidos guest;
4. ETA/mapas;
5. WhatsApp por etapa;
6. conciliação automática do Pix próprio.

## Estado real

### 1. Recusa/desistência e reatribuição segura — IMPLEMENTADO E VALIDADO

Entrega 11E, integrada pelo PR #92.

Inclui:

- recusa de oferta pelo courier sem retirar o pedido da fila global;
- courier que recusou/desistiu deixa de receber a mesma oferta;
- desistência somente antes da confirmação de coleta;
- retorno transacional à fila;
- reatribuição/devolução à fila por admin;
- bloqueio de reatribuição após `picked_up`;
- controle otimista por `deliveryUpdatedAt`;
- índice parcial garantindo apenas um vínculo ativo por pedido;
- auditoria das operações.

Evidência técnica:

- candidate SHA: `ddda7af8648bf9bf69ab80f3ee2224e5a7d6dd77`;
- CI: `36413414854` — success;
- CodeQL: `36413414990` — success.

Pendente somente QA real multiusuário.

### 2. Histórico courier/admin — IMPLEMENTADO E VALIDADO

Também faz parte da 11E.

Modelo persistente:

`LilyDeliveryAssignment`

Mantém cadeia de custódia mesmo quando o responsável muda.

Courier:

- histórico paginado;
- estados active/completed/abandoned/reassigned/cancelled;
- endereço histórico minimizado.

Admin:

- histórico paginado/filtrável;
- courier responsável;
- auditoria;
- sem manter exposição desnecessária de endereço histórico.

### 3. Tracking seguro guest — IMPLEMENTADO E VALIDADO

Entrega 11F, integrada pelo PR #94.

Inclui:

- capability token de alta entropia;
- somente hash persistido;
- token em header, nunca query string;
- comparação timing-safe;
- resposta uniforme contra enumeração;
- rate limit;
- `Cache-Control: no-store`;
- `Referrer-Policy: no-referrer`;
- `X-Robots-Tag: noindex`;
- resposta sem telefone/endereço/notas/atores;
- código de entrega liberado pelo servidor somente nas etapas necessárias;
- página `/lilyacai/acompanhar/:id`;
- polling;
- integração pagamento guest -> acompanhamento.

Evidência técnica:

- candidate SHA: `0d4f8a6f60821dfa09d9a94a2470e5f2ffb22af1`;
- CI: `36414636227` — success;
- CodeQL: `36414636183` — success.

Pendente QA real em navegador/mobile.

### 4. ETA/mapas — IMPLEMENTADO, VALIDADO E INTEGRADO

Entrega 11G integrada pelo PR #97.

Evidência técnica:

- candidate SHA: `58759148c410fe08584f9ff9895fd64cbeb02ca3`;
- CI: `36602067779` — success;
- CodeQL: `36602067812` — success.

A branch anterior estava baseada no SHA pré-squash da 11F e foi descartada como base de integração. A v2 foi recriada diretamente sobre a `cooklily/canonical` atual.

Implementado:

- adapter server-side OpenRouteService/HeiGIT;
- host padrão `https://api.heigit.org/openrouteservice`;
- geocodificação server-side;
- directions server-side;
- chave somente em `COOKLILY_ORS_API_KEY`;
- timeout configurável;
- cache persistente por pedido;
- distância e duração;
- ETA iniciado em `left_pickup`;
- cliente e guest sem coordenadas;
- courier responsável com link OpenStreetMap;
- sem GPS contínuo;
- provider indisponível não muda status nem bloqueia entrega;
- testes de adapter/privacidade/fallback.

Ainda falta homologação com chave real e conferência de geocodificação/rota em endereços reais.

### 5. WhatsApp por etapa — VALIDADA E INTEGRADA

PR #99 integrado em `cooklily/canonical`.

Evidências técnicas:

- candidate SHA `24913c695acabed46125166683f7ddb2c2fe89a9`;
- CI `36604181215`: success;
- CodeQL `36604181245`: success;
- merge SHA `1dcb08036c4e25b3bf29c5a45c8130f65fb1a761`.

Implementado:

- opt-in operacional por pedido separado de marketing;
- opt-out conta/guest;
- outbox persistente e idempotente;
- Meta Cloud API direta;
- template parametrizado;
- retry/backoff e recuperação de claims interrompidos;
- etapas de pagamento/cozinha/logística;
- endpoints admin de saúde/fila/retry;
- falha do provider não bloqueia operação;
- testes de integração.

Ainda falta apenas a dependência operacional externa:

- WABA/número/template/token reais;
- homologação Meta em produção/controlada.

### 6. Conciliação automática do Pix próprio — CANDIDATO EM VALIDAÇÃO

O estado real avançou além do roadmap anterior.

Já existe e permanece preservado:

- provider `cooklily_pix`;
- BR Code Pix estático;
- valor fechado;
- txid próprio por pagamento;
- CRC16;
- integração ao domínio `LilyPaymentProvider`;
- ledger de pagamento/eventos;
- reconciliação manual administrativa como fallback.

Implementado na 11I:

- `LilyPixSettlement` para ledger autoritativo de Pix recebidos;
- `LilyPixReconciliationState` para cursor/saúde do poller;
- migration `20260929173000_lily_pix_auto_reconciliation`;
- adapter compatível com consulta de Pix recebidos da API Pix v2;
- mTLS + OAuth client-credentials configuráveis;
- janela com overlap + deduplicação por `source:endToEndId`;
- paginação estrita, com falha fechada antes de avançar cursor se a janela estiver incompleta ou malformada;
- minimização de dados bancários: sem nome/documento/`infoPagador`;
- matching por txid contra `providerPaymentId`/referência;
- aprovação somente com txid único, valor exato e estados pendentes;
- discrepância de valor mantém pagamento/pedido pendentes e gera reconciliação + evento auditável;
- Pix sem txid, desconhecido, ambíguo, duplicado, tardio ou corrida perdida entra em revisão;
- worker periódico + execução manual administrativa;
- contadores de revisão e último erro persistente;
- WhatsApp `payment_confirmed` quando houver opt-in;
- checkout anuncia confirmação automática somente quando o adapter bancário está realmente pronto;
- testes automatizados dos invariantes financeiros.

Ainda falta para sair de candidato:

- CI/CodeQL do SHA final;
- definir qual instituição realmente recebe o Pix CookLily;
- confirmar compatibilidade de OAuth/mTLS/scopes/URLs/certificado;
- credenciais reais;
- smoke financeiro real/sandbox;
- conferência das tarifas da conta recebedora.

A escolha da instituição não é uma pendência de arquitetura que justifique selecionar arbitrariamente um PSP. O código permanece `disabled` por padrão e só deve ser ligado à API da conta efetivamente usada.

## Ordem de execução atualizada

1. concluir gate técnico da 11I;
2. homologar 11G/11H quando chaves/contas externas estiverem disponíveis;
3. definir a instituição recebedora do Pix e homologar a 11I com a API real;
4. QA operacional ponta a ponta;
5. deploy somente por SHA validado.

## Regra de status

- **implementado**: código + testes/documentação existem;
- **validado tecnicamente**: CI + CodeQL aprovados;
- **integrado**: merge na `cooklily/canonical`;
- **homologado**: testado com serviços/contas/aparelhos reais;
- **pronto comercialmente**: homologação + deploy + operação real aprovados.

Esses termos não devem ser tratados como equivalentes.
