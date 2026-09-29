# Entrega 11I — conciliação automática do Pix próprio — 29/09/2026

## Objetivo

Automatizar a confirmação financeira do provider `cooklily_pix` sem transformar um gateway em fonte de verdade e sem aprovar pedidos por heurística.

A geração do Pix já é própria: o backend gera BR Code estático, valor fechado e `txid` único. Esta entrega adiciona a leitura autoritativa dos Pix recebidos, ledger de liquidações, matching, idempotência, divergências, cursor persistente e worker.

## Estado da entrega

**Candidato técnico em validação.**

Implementado no branch `feat/lily-entrega-11i-pix-auto-reconciliation`:

- ledger `LilyPixSettlement`;
- cursor/estado `LilyPixReconciliationState`;
- migration `20260929173000_lily_pix_auto_reconciliation`;
- adapter de consulta compatível com a semântica da API Pix v2 para `GET /pix`;
- OAuth client-credentials + mTLS parametrizáveis;
- consulta por janela com overlap para tolerar atrasos/repetições;
- paginação estrita e fail-closed;
- deduplicação por `source:endToEndId`;
- matching por `txid` contra `providerPaymentId`/referência do pagamento;
- aprovação automática somente para `txid` único + valor exato + pagamento/pedido ainda pendentes;
- divergências, pagamentos repetidos, atrasados ou sem correspondência preservados para revisão;
- audit trail financeiro;
- notificação WhatsApp de pagamento confirmado quando o pedido possui opt-in;
- endpoints administrativos de saúde, settlements e execução manual;
- worker periódico no processo da API;
- fallback manual existente preservado;
- testes automatizados dos invariantes críticos.

## Fonte de verdade

O Banco Central define a especificação funcional da API Pix, incluindo consulta de Pix recebidos e paginação. Os detalhes de autenticação/segurança e o acesso à conta são fornecidos pelo PSP/instituição recebedora.

Consequência arquitetural:

- o código não escolhe arbitrariamente Banco Inter, Efí, Itaú, Nubank, Sicredi, Santander ou outro PSP;
- `COOKLILY_PIX_RECONCILIATION_PROVIDER` permanece `disabled` até existir contrato/documentação/credencial da conta realmente usada;
- a homologação deve confirmar os detalhes reais de OAuth, mTLS, scopes, URLs e certificados do PSP;
- incompatibilidades específicas do PSP devem ser tratadas por adapter/configuração, sem enfraquecer os invariantes de matching.

Referência normativa: repositório oficial `bacen/pix-api`, release corrente consultada em 29/09/2026.

## Fluxo

```text
Pagamento cooklily_pix pendente
        |
        | BR Code com valor + txid
        v
Cliente paga na instituição dele
        |
        v
Conta recebedora CookLily / PSP
        |
        | API Pix: Pix recebidos
        v
Worker de reconciliação
        |
        +--> valida resposta/paginação
        |
        +--> normaliza somente E2EID, txid, valor e horário
        |
        +--> ledger LilyPixSettlement
        |
        +--> txid inexistente/ambíguo? --------> revisão
        |
        +--> valor divergente? ----------------> discrepant + revisão
        |
        +--> já pago/estado incompatível? -----> duplicate/late + revisão
        |
        +--> txid único + valor exato + pending
                    |
                    v
             transação atômica
                    |
                    +--> LilyPayment = approved
                    +--> LilyPaymentEvent
                    +--> LilyPaymentReconciliation = matched
                    +--> LilyOrder = paid
                    +--> LilyOrderStatusEvent
                    +--> WhatsApp payment_confirmed, se opt-in
                    +--> settlement = matched
```

## Idempotência e concorrência

A chave autoritativa de ingestão é `providerEventId = <source>:<endToEndId>`.

- `providerEventId` é UNIQUE;
- replay do mesmo Pix retorna o settlement existente;
- a atualização de pagamento usa condição `status = pending`;
- corrida perdida não cria segunda aprovação;
- um segundo Pix diferente para o mesmo `txid` após aprovação vira `duplicate_payment`;
- a janela do poller possui overlap, portanto a deduplicação é obrigatória por design.

## Fail-closed financeiro

O pedido **não** é pago automaticamente quando:

- não há `txid`;
- `txid` não encontra pagamento;
- mais de um pagamento corresponde ao `txid`;
- valor recebido difere do valor esperado;
- pagamento/pedido já está em estado incompatível;
- uma linha financeira da API é inválida;
- a paginação é inválida, inconsistente ou excede o limite seguro;
- a consulta não termina integralmente;
- autenticação, mTLS, timeout ou parsing falham.

O cursor `lastSuccessfulAt` só avança depois que a janela inteira foi lida e processada sem erro.

## Privacidade

Da resposta bancária são persistidos somente os campos necessários à conciliação:

- `endToEndId`;
- `txid`;
- valor;
- horário;
- hash do payload financeiro normalizado.

Nome, CPF/CNPJ do pagador e `infoPagador` não são persistidos pelo adapter desta entrega.

## Estados de settlement

- `matched`: correspondência exata e aprovação realizada;
- `no_txid`: Pix sem txid;
- `unmatched`: txid sem pagamento CookLily correspondente;
- `ambiguous`: mais de um pagamento candidato;
- `discrepant`: txid corresponde, valor diverge;
- `duplicate_payment`: pagamento já aprovado e outro Pix chegou;
- `late_payment`: pagamento/pedido em estado incompatível;
- `race_lost`: outra execução venceu a atualização concorrente.

Todos os estados diferentes de `matched` entram no indicador administrativo `reviewRequired`.

## Configuração

A reconciliação nasce desligada.

Obrigatórias para ativar o adapter atual:

```env
COOKLILY_PIX_RECONCILIATION_PROVIDER=pix_api_v2
COOKLILY_PIX_API_BASE_URL=https://<api-do-psp>
COOKLILY_PIX_API_OAUTH_URL=https://<oauth-do-psp>
COOKLILY_PIX_API_CLIENT_ID=<secret>
COOKLILY_PIX_API_CLIENT_SECRET=<secret>
COOKLILY_PIX_API_PFX_PATH=/etc/carro-chefe/secrets/<certificado>.pfx
```

Opcionais:

```env
COOKLILY_PIX_API_PFX_PASSPHRASE=<secret>
COOKLILY_PIX_API_RECEIVED_PATH=/v2/pix
COOKLILY_PIX_API_OAUTH_BODY_FORMAT=form
COOKLILY_PIX_API_OAUTH_SCOPE=<scope-exigido-pelo-psp>
COOKLILY_PIX_RECONCILIATION_POLL_INTERVAL_MS=60000
COOKLILY_PIX_API_TIMEOUT_MS=10000
COOKLILY_PIX_RECONCILIATION_LOOKBACK_MINUTES=60
```

`COOKLILY_PIX_API_OAUTH_BODY_FORMAT` aceita `form` ou `json`. O valor padrão do formato é `form`; `scope` não possui valor presumido e só é enviado quando configurado. A configuração real deve seguir a documentação da instituição recebedora.

Nenhum segredo/certificado deve ser versionado.

## Endpoints administrativos

- `GET /api/v1/lily/admin/pix-reconciliation/settings`: configuração sanitizada, cursor, erros e contagens;
- `GET /api/v1/lily/admin/pix-reconciliation/settlements`: ledger para revisão;
- `POST /api/v1/lily/admin/pix-reconciliation/run`: execução manual auditada, somente admin com CSRF/MFA conforme políticas existentes.

## Observabilidade

O estado persistente registra:

- última tentativa;
- última execução bem-sucedida;
- código/mensagem sanitizada do último erro.

O worker registra apenas contagens agregadas:

- recebidos;
- matched;
- discrepant;
- unmatched;
- reviewRequired.

Tokens, secrets, certificado, telefone e PII do pagador não entram nesses logs.

## Testes implementados

A suíte cobre:

- reconciliação desabilitada sem credenciais completas;
- normalização sem PII;
- rejeição de linha financeira inválida;
- rejeição de paginação acima do limite seguro;
- aprovação exata e idempotente;
- divergência de valor sem aprovação + evento auditável;
- txid desconhecido;
- Pix sem txid;
- matching por `providerPaymentId` mesmo sem `providerReference`;
- segundo Pix para pagamento já aprovado sem nova aprovação.

## Homologação pendente

A parte que depende de terceiro não pode ser considerada homologada até:

1. definir qual banco/PSP recebe o Pix da CookLily;
2. confirmar que a conta possui API Pix/consulta de recebidos;
3. obter credenciais, certificado e scopes;
4. adaptar detalhes específicos de autenticação se divergirem do adapter genérico;
5. executar consulta real/sandbox com Pix controlado;
6. validar `txid`, E2EID, valor e horário reais;
7. testar replay;
8. testar valor divergente;
9. testar indisponibilidade/timeout;
10. confirmar que o cursor não perde eventos;
11. conferir tarifas da conta recebedora — “sem gateway” não significa necessariamente “sem tarifa bancária”.

## Critério para integração

Esta entrega só entra em `cooklily/canonical` após:

- documentação atualizada;
- migration consistente;
- testes Node suportados;
- check/build;
- CI completo verde;
- CodeQL verde;
- checkpoint de execução atualizado.

A homologação bancária real pode permanecer pendente após a integração técnica, desde que o provider continue fail-closed/desabilitado até as credenciais corretas existirem.
