# CookLily — estado consolidado da implementação

**Data:** 27/09/2026  
**Branch canônica:** `cooklily/canonical`  
**Último runtime tecnicamente validado:** `8a9dbb2147f5bdee70e1a981cf2c03e0b183f9b9` — cozinha/estado operacional, CI `36371053349`, CodeQL `36371053318`, 164 testes Node 20/24.  
**Entrega 11D:** implementação de logística/entregador em candidato posterior, ainda aguardando novo gate completo.

Este documento consolida o que já foi feito, o que já foi configurado pelo operador e o que continua pendente. Não contém segredos, tokens, chaves privadas ou credenciais.

## 1. Identidade e escopo

- nome público: **CookLily**;
- wordmark: **cookLily**;
- operação temporária e separada do Carro Chefe;
- URL pública: `/lilyacai/*`;
- API: `/api/v1/lily/*`;
- banco: `lily-acai.db`;
- Instagram: `@acai._lily`;
- WhatsApp: `+55 67 99928-9187`.

## 2. Marca, landing e catálogo

Entregas 03–05 concluídas tecnicamente:

- kit de marca e rebranding;
- landing de pré-lançamento;
- captação de WhatsApp com consentimento;
- catálogo administrável;
- categorias Batidas de Açaí, LilyShakes e Doces;
- variantes 300/500 ml;
- LilyMix com até 3 sabores;
- adicionais, combos e ofertas;
- destaque semanal;
- busca, filtros, mídia e esgotado visível;
- guardrail de margem mínima de 10%.

## 3. Carrinho, endereço e pedido

Entrega 06 concluída tecnicamente:

- carrinho persistido no navegador;
- compra autenticada e guest;
- telefone obrigatório;
- endereços salvos;
- retirada e entrega;
- horários, zonas, taxa, pedido mínimo e endereço de retirada configuráveis;
- recotação server-side;
- proteção contra preço/configuração stale;
- `Idempotency-Key` + fingerprint;
- snapshots comerciais no pedido;
- histórico por conta;
- pedidos nascem em `awaiting_payment`.

## 4. Pagamentos

A CookLily possui um domínio financeiro próprio e desacoplado dos processadores:

```text
Checkout CookLily
  -> /api/v1/lily/payments
     -> PaymentProvider
        -> manual
        -> mercado_pago
        -> novos adapters
```

Já implementado:

- tabela de pagamentos;
- eventos financeiros;
- reconciliação;
- idempotência;
- acesso guest por token;
- painel financeiro;
- Pix manual;
- adapter Mercado Pago via Orders API;
- Pix automático Mercado Pago;
- Card Payment Brick para crédito;
- PAN/CVV não passam pelo backend CookLily;
- webhook HMAC;
- refetch autoritativo da Order;
- deduplicação por `providerEventId`;
- bloqueio de aprovação manual para provider automático;
- cancelamento;
- estorno parcial/integral;
- pedido só muda para `paid` se o valor confirmado for exatamente o esperado;
- provider próprio `cooklily_pix` para BR Code estático/Pix Copia e Cola sem gateway;
- `txid`, valor e CRC16 gerados internamente;
- confirmação do Pix próprio continua operacional até existir uma integração bancária autoritativa.

## 5. Mercado Pago — estado operacional atual

Configuração informada pelo operador:

- aplicação criada em modo de testes;
- solução escolhida: **Checkout Transparente**;
- API escolhida: **Orders API**;
- checkout de teste já foi preenchido com dados de teste do Mercado Pago;
- credenciais reais não são documentadas no Git;
- a homologação encontrou um erro interno de CSRF antes da finalização do teste.

O erro `LILY_CSRF_INVALID` foi corrigido no runtime:

`7bb6a5e14763875fca7628e0cc0f3c820d689567`

Causa: `GET /api/v1/lily/auth/me` rotacionava o CSRF a cada consulta e chamadas concorrentes invalidavam o token umas das outras.

Correção:

- CSRF determinístico por sessão;
- leituras concorrentes retornam o mesmo token;
- sessões antigas são reparadas na primeira leitura;
- mutações continuam protegidas por `X-Lily-CSRF`.

Validação:

- CI `36367847621`: success;
- CodeQL `36367847412`: success;
- Node 20: 153/153 testes;
- Node 24: 153/153 testes.

## 6. MFA e segurança de equipe

Implementado:

- staff/admin separados de customer;
- papel `courier` implementado no candidato da Entrega 11D com acesso mínimo à logística;
- MFA TOTP obrigatório para staff/admin e também para courier no candidato 11D;
- segredo TOTP cifrado com AES-256-GCM;
- recovery codes de uso único;
- segundo fator por nova sessão privilegiada;
- upgrade de senha obrigatório ao promover conta;
- gestão de equipe;
- sessões visíveis ao titular;
- revogação de outras sessões;
- CSRF;
- RBAC;
- auditoria administrativa.

## 7. Modo de homologação

Implementado para permitir testes sem abrir a loja ao público:

- staff/admin com MFA validado pode ativar **Modo de homologação**;
- funciona com `ordersEnabled=false`;
- funciona fora do horário;
- funciona com `paymentsEnabled=false`;
- pedidos ficam marcados como `isHomologation=true`;
- backend exige `X-Lily-Homologation: 1` + sessão privilegiada + MFA;
- clientes e guests não conseguem forjar esse modo;
- checkout segue para `/pagamento/:id?homologacao=1`.

Runtime validado antes da correção CSRF: `f502b9cd8fcfaf8ada73131fcd7d0c1a517d6cf6`.

## 8. Deploy e Nginx

O deployer foi reforçado para:

- receber SHA imutável;
- validar o próprio deployer contra a versão do SHA alvo;
- reexecutar a versão do release quando necessário;
- preservar lock;
- rodar testes com `NODE_ENV=test`;
- manter migrations/build/checks com ambiente de produção;
- fazer backup antes de migration;
- falhar fechado.

Incidentes documentados:

- falha de preflight MFA por ambiente de produção;
- deployer instalado antigo;
- ausência de `LILY_MFA_ENCRYPTION_KEY`;
- Nginx sem namespace de pagamentos.

Foi criado helper idempotente para Nginx da Entrega 07:

`deploy/scripts/enable-lily-entrega07-nginx`

Namespaces exigidos:

```text
/api/v1/lily/payments
/api/v1/lily/payments/*
```

## 9. UX e conta

Já implementado tecnicamente:

- menu mobile estruturado;
- sem mascarar overflow global;
- carrossel de combos;
- produtos antes de combos;
- logout;
- focus trap;
- Escape/click-away;
- alvos >=44 px;
- Configurações da loja;
- gestão de equipe;
- confirmação de senha no cadastro;
- troca de senha;
- sessões;
- deep-link de produto.

Ainda depende de QA real em aparelhos/navegadores.

## 9.1. Operação de pedidos — atualização 28/09/2026

Validado no runtime `8a9dbb2147f5bdee70e1a981cf2c03e0b183f9b9`:

- estado de produção separado do estado financeiro;
- eventos imutáveis da cozinha;
- fila em recebido / aguardando pagamento / montar / despachar;
- montagem bloqueada sem pagamento;
- painel da cozinha com polling e conflito otimista;
- API da cozinha sem telefone/endereço do cliente.

Candidato da Entrega 11D, ainda sem SHA final validado:

- estado logístico separado;
- fila de entregas somente depois de pagamento + liberação da cozinha;
- papel `courier`;
- aceite atômico;
- endereço reduzido antes do aceite e completo somente ao responsável;
- cheguei na coleta → código de coleta → saí da coleta;
- cheguei no destino → código de entrega → saí do destino;
- códigos de 6 dígitos derivados por HMAC e não persistidos;
- tentativas inválidas auditadas e limitadas;
- cliente recebe eventos logísticos na timeline;
- cozinha recebe o código de coleta;
- cliente recebe o código de entrega;
- painel mobile `/lilyacai/entregas`;
- novo namespace Nginx `/api/v1/lily/courier/*`;
- helper `enable-lily-entrega11-nginx`;
- deploy fail-closed sem `COOKLILY_LOGISTICS_CODE_KEY`.

## 10. Pendências relevantes

- recuperação segura de senha;
- fotos reais restantes;
- alergênicos;
- homologação Mercado Pago após deploy do CSRF corrigido;
- configuração real de operação;
- recuperação segura de pedido guest no tracking;
- conciliação automática do Pix próprio via banco/PSP;
- homologação real da chave Pix;
- QA real do painel cliente/cozinha/entregador;
- reatribuição/cancelamento seguro de entregas;
- ETA/mapa/notificações;
- observabilidade/hardening.

## 11. Regra daqui em diante

A partir desta fase, toda entrega operacional nova deve:

1. atualizar `ROADMAP_COOKLILY.md`;
2. atualizar `DECISOES_PENDENCIAS.md`;
3. documentar arquitetura/decisões;
4. manter fail-closed;
5. não ativar venda real automaticamente;
6. não versionar segredo;
7. separar estado financeiro, estado de produção e estado de entrega;
8. preservar rastreabilidade por eventos;
9. passar CI + CodeQL antes de virar SHA recomendado para deploy.
