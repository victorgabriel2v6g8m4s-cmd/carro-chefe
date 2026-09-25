# Patch de homologação — Entregas 05 e 06

**Branch:** `feat/lily-homologacao-05-06`  
**Origem:** feedback de homologação do catálogo, carrinho e pedidos  
**Status:** implementação em validação técnica; deploy pendente

## Objetivo

Corrigir problemas observados na homologação real das Entregas 05 e 06 antes de iniciar pagamento.

Este patch permanece fora da Entrega 07. Não implementa provedor de pagamento nem reconciliação.

## Alterações de catálogo e mobile

- filtros do catálogo ficam recolhidos atrás de um botão `Filtros`;
- busca permanece sempre visível;
- contador mostra quantos filtros estão ativos;
- catálogo mobile passa a duas colunas;
- cards mobile foram compactados para privilegiar capa, nome e preço e permitir aproximadamente quatro itens em uma tela típica;
- removido overflow horizontal deliberado do catálogo/combos;
- regras globais limitam conteúdo a 100% da viewport;
- header mobile usa:
  - avatar/perfil;
  - ícone de carrinho com badge;
  - menu hambúrguer;
- texto “Carrinho” foi removido do header em favor do ícone;
- desktop mostra explicitamente `Entrar` e `Criar conta` para visitante;
- áreas privadas também oferecem as duas ações.

QA visual em aparelhos físicos continua sendo homologação manual e não deve ser confundido com teste automatizado.

## Popup de produto

O modal foi reorganizado para:

- não rolar como uma peça única;
- manter botão fechar acessível;
- manter total + CTA no rodapé fixo;
- permitir scroll apenas na área de montagem;
- recalcular configuração automaticamente ao mudar tamanho, sabores ou adicionais;
- remover o passo manual “Calcular configuração”;
- bloquear o CTA enquanto a configuração estiver inválida/em cálculo;
- depois de adicionar, mostrar:
  - `Ir para o carrinho`;
  - `Continuar comprando`.

A autoridade continua sendo o backend.

## Combos

O frontend deixou de decidir sozinho quais produtos podem participar do combo.

Nova rota:

`GET /api/v1/lily/public/combos/:id/builder`

O servidor resolve opções elegíveis usando regras do combo:

- categoria;
- subtipo;
- tamanho;
- quantidade de sabores;
- disponibilidade;
- tipo de configuração.

O montador:

- carrega essas opções;
- permite escolher cada slot;
- permite adicionais por item;
- recota automaticamente no servidor;
- usa `configure-combo` como validação final;
- mostra total atualizado;
- permite ir direto ao carrinho depois de adicionar.

O checkout continua recalculando novamente antes de persistir o pedido.

## Dados internos removidos da API pública

O serializer público não envia mais:

- `projectedMarginBps`;
- `preparationLeadMinutes`;
- porções de produção de sabores;
- modificadores internos de preço por sabor;
- porções de adicionais;
- vínculo interno de adicional com flavor.

Esses dados permanecem disponíveis no domínio administrativo/banco quando necessários à operação.

## Perfil

Nova rota web:

`/lilyacai/perfil`

O cliente autenticado pode:

- alterar nome;
- enviar foto/avatar;
- optar ou não por aparecer no ranking;
- ver seus pontos;
- ver quantidade de pedidos que pontuaram;
- ver sua posição pública quando opt-in;
- navegar para pedidos/endereço/ranking.

Avatar aceita JPEG/PNG/WebP de até 2 MB.

## Ranking de clientes

Nova rota web:

`/lilyacai/ranking`

API pública:

`GET /api/v1/lily/public/loyalty/ranking`

Privacidade:

- ninguém aparece por padrão;
- participação exige `rankingOptIn=true`;
- para participar é necessário nome público;
- ranking expõe somente nome escolhido, avatar, pontos e agregados.

### Regra de pontos

Compras só contam quando o pedido está em:

- `paid`;
- `completed`.

Pedidos `awaiting_payment` não geram pontos.

Pontos por compra:

`floor(grandTotalCents / loyaltyOrderCentsPerPoint)`

Campanhas:

- campanhas distintas identificadas por `laCampaign` em pedidos pagos/concluídos recebem bônus configurável.

Eventos adicionais:

- `LilyLoyaltyEvent` funciona como ledger idempotente para bônus externos, incluindo uso validado de cupom quando o módulo de cupons existir.

O valor `loyaltyCouponBonusPoints` já é configurável, mas **não existe ainda um fluxo de resgate de cupom confiável neste patch**. Portanto, o sistema não inventa pontuação por um “cupom” fornecido pelo navegador. A futura implementação de cupons deverá registrar o evento somente depois de validar/resgatar o cupom.

## Canais e endereço configuráveis

Os seguintes dados deixaram de ser constantes do frontend:

- Instagram;
- WhatsApp;
- endereço público.

Defaults da migration:

- Instagram: `acai._lily`;
- WhatsApp: número CookLily já utilizado.

Eles são editáveis em:

`/lilyacai/painel/entrega`

A API `/api/v1/lily/public/config` alimenta header, menu, landing e rodapé.

O mesmo painel configura:

- centavos por ponto de compra;
- bônus por campanha;
- bônus por cupom.

## Sessão no header

Foi criado:

`GET /api/v1/lily/auth/status`

Ele informa se existe sessão e retorna o usuário público **sem rotacionar CSRF**.

Isso evita que o header invalide silenciosamente o token CSRF que checkout/perfil/painel estão usando.

## Banco

Migration:

`20260925170000_lily_homologacao_05_06`

Adiciona:

- avatar e opt-in de ranking em `LilyUser`;
- canais/endereço e parâmetros de fidelidade em `LilyOperationalSettings`;
- `LilyLoyaltyEvent`.

## Testes adicionados

A validação automatizada cobre:

- catálogo público não expõe dados internos de produção;
- builder do combo recebe opções elegíveis do servidor;
- status de autenticação funciona para guest e conta;
- Instagram/WhatsApp/endereço vêm do banco;
- edição de perfil exige CSRF;
- ranking exige nome para opt-in;
- pedido não pago não pontua;
- pedido pago pontua pelo valor;
- campanha rastreada pontua;
- ledger de fidelidade soma bônus;
- ranking público retorna usuário opt-in.

## Deploy

Não há namespace novo de Nginx. As rotas novas reutilizam:

- `/api/v1/lily/public/*`;
- `/api/v1/lily/auth/*`;
- `/api/v1/lily/customer/*`;
- `/api/v1/lily/admin/*`.

Depois de CI/CodeQL aprovados, este patch pode usar o automatizador existente:

```bash
carro-chefe-deploy <SHA_VALIDADO>
```

O script deve aplicar automaticamente a nova migration, backups, gates, restart e readiness.
