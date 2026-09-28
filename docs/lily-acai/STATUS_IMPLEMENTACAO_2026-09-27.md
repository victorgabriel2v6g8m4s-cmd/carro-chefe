# CookLily — estado consolidado da implementação

**Data:** 27/09/2026  
**Branch canônica:** `cooklily/canonical`  
**Último runtime tecnicamente validado antes desta nova fase:** `7bb6a5e14763875fca7628e0cc0f3c820d689567`

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
- pedido só muda para `paid` se o valor confirmado for exatamente o esperado.

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
- MFA TOTP obrigatório;
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

## 10. Pendências relevantes

- recuperação segura de senha;
- fotos reais restantes;
- alergênicos;
- homologação Mercado Pago após deploy do CSRF corrigido;
- configuração real de operação;
- painel operacional completo de pedidos;
- tracking completo;
- observabilidade/hardening;
- nova fase: Pix próprio CookLily;
- nova fase: painel do cliente;
- nova fase: painel da cozinha;
- nova fase: fluxo do entregador.

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
