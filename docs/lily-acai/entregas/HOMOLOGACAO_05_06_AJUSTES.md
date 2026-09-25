# Patch de homologação — Entregas 05 e 06

**Branch:** `feat/lily-homologacao-05-06`  
**Origem:** feedback de homologação do catálogo, carrinho e pedidos  
**Status:** implementação técnica concluída e validada; deploy/QA visual final pendentes  
**SHA técnico validado:** `10872e686c6c71c228ff8aef0e507a48deaaf912`

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


## Evidências do gate técnico

A árvore do SHA técnico `10872e686c6c71c228ff8aef0e507a48deaaf912` foi validada em um commit de gate com árvore Git idêntica, necessário apenas porque a linha CookLily diverge intencionalmente da `main`.

- CI run: `36150024665` — **success**;
- CodeQL run: `36150024735` — **success**;
- Node 20: 22 arquivos / **111 testes** — success;
- Node 24: 22 arquivos / **111 testes** — success;
- migration nova aplicada em banco SQLite limpo — success;
- TypeScript/static checks — success;
- build CookLily e demais builds de produção — success;
- Tool Health — success;
- Workbook Snapshot — success;
- Excel Recipe Linux/Windows — success;
- Windows Supervisor — success.

PRs de validação são técnicos e devem permanecer sem merge na `main`.

## Limite da validação

Os gates acima validam schema, contratos, testes e build. A responsividade foi corrigida estruturalmente no CSS, mas a validação visual final em aparelhos/tamanhos reais continua sendo uma etapa de QA após deploy; não é declarada como concluída pelo CI.


## Segunda rodada de homologação mobile e segurança

Após QA em aparelho real, foram identificados conflitos de especificidade no CSS antigo do header. O patch foi ampliado para:

- remover o seletor genérico `.topbar nav` que fazia a navegação desktop sobreviver no mobile;
- manter no header mobile apenas marca, carrinho, perfil e hambúrguer;
- substituir o avatar “C” de guest por ícone neutro de pessoa;
- transformar o menu mobile em drawer vertical;
- adicionar backdrop e fechamento ao clicar fora;
- fechar com `Escape`;
- mover foco para o menu quando aberto;
- manter alvos de toque em 44 px;
- mostrar `Painel administrativo` para `staff/admin`;
- adicionar logout explícito;
- preservar `?next=/painel...` ao autenticar para retornar ao destino administrativo;
- compactar o hero do cardápio no mobile;
- transformar combos em carrossel horizontal com scroll-snap, em vez de três cards empilhados;
- manter o grid de produtos em duas colunas.

### Senha

Novos cadastros de clientes exigem no mínimo **8 caracteres** e no máximo 128.

Contas existentes continuam autenticando com suas credenciais atuais.

O cadastro pede confirmação da senha no frontend.

A página `/lilyacai/perfil` ganhou troca autenticada de senha:

- exige senha atual;
- para `customer`, nova senha exige 8–128 caracteres; para `staff/admin`, 12–128 caracteres;
- impede reutilizar exatamente a senha atual;
- usa o mesmo scrypt já adotado pela autenticação;
- revoga outras sessões ativas da conta;
- mantém somente a sessão que realizou a troca.

Recuperação de senha e MFA não foram improvisados: exigem um canal de verificação confiável e permanecem pendentes, principalmente antes de ampliar o uso de contas staff.

## Promoção de usuário em um comando

Novo utilitário:

`deploy/scripts/lily-promote-user`

Depois de instalado na VPS:

```bash
lily-promote-user 67999999999
```

promove a conta para `staff`.

Para `admin`:

```bash
lily-promote-user 67999999999 admin
```

O utilitário:

- normaliza telefone brasileiro;
- usa `LILY_DATABASE_URL` do ambiente de produção;
- exige usuário existente e ativo;
- não cria conta nem altera senha;
- não permite downgrade;
- permite `customer -> staff`, `customer -> admin` e `staff -> admin`;
- grava `LilyAdminAudit`;
- confirma o papel final;
- não exige restart.

O deployer instala/atualiza `/usr/local/sbin/lily-promote-user` somente depois de um deploy saudável.


## Gate final da segunda rodada

**SHA de release validado:** `b84298447ece5d06c61be189bacb8b9ec80d24d1`

A árvore desse SHA foi validada pelo commit técnico de gate `821e232cc9b685c3d3a061455f69a83d0027673b`.

- CI run `36157665405`: **success**;
- CodeQL run `36157665409`: **success**;
- Node 20: 23 arquivos / **114 testes**;
- Node 24: 23 arquivos / **114 testes**;
- migration em banco limpo: success;
- TypeScript/static checks: success;
- builds de produção: success;
- Tool Health: success;
- Workbook Snapshot: success;
- Excel Recipe Linux/Windows: success;
- Windows Supervisor: success;
- sintaxe Bash de `carro-chefe-deploy`, `lily-promote-user` e helper Nginx: success.

Esse SHA substitui `10872e686c6c71c228ff8aef0e507a48deaaf912` como release recomendado do patch de homologação.


## Correção de requisito — senha de cliente

A política correta para contas padrão é:

- `customer`: mínimo **8** caracteres, máximo 128;
- `staff/admin`: ao definir uma nova senha, mínimo **12** caracteres, máximo 128.

O cadastro público sempre cria `customer`, portanto aceita senha a partir de 8 caracteres.

Importante: uma conta promovida de `customer` para `staff` mantém a credencial já existente, pois o hash não revela o comprimento original. A exigência de 12 caracteres é aplicada nas próximas trocas de senha da conta privilegiada. Um mecanismo futuro de upgrade obrigatório de credencial/MFA pode tornar essa política estritamente obrigatória imediatamente após promoção.


## Ajuste de header autenticado

Após nova homologação visual em desktop, o header autenticado foi simplificado:

- removido o texto `Minha conta` do header;
- removido `Sair` do header e do menu hambúrguer;
- conta autenticada é representada somente pelo avatar;
- clicar no avatar abre `/lilyacai/perfil`;
- `Sair da conta` existe somente dentro da página de perfil;
- carrinho e avatar ficam agrupados no bloco de ações;
- o header passou a usar o mesmo container de 1160 px do conteúdo, evitando o carrinho isolado no extremo da viewport;
- visitante desktop continua vendo `Entrar` e `Criar conta`;
- visitante mobile usa ícone neutro de perfil;
- staff/admin continua vendo `Painel` na navegação e `Painel administrativo` no menu mobile.


## Gate do ajuste de header

**SHA de release:** `1fed457bfcd7f95007fb8ae026eb799cf2f038d0`

- CI run `36167054603`: success;
- CodeQL run `36167054499`: success;
- Node 20: 23 arquivos / 114 testes;
- Node 24: success;
- builds de produção: success;
- Tool Health e gates auxiliares: success.

O PR técnico #73 foi usado apenas como gate e deve permanecer fechado sem merge.

## Carrossel e modos de combo

A vitrine de combos foi transformada em um slider comercial de um item por vez.

### Slider

- exibe um combo principal por vez;
- mostra apenas uma pequena borda do slide anterior/próximo quando eles existem;
- transição suave por scroll-snap;
- autoplay a cada ~6,5 s;
- pausa no hover do mouse;
- pausa enquanto o usuário mantém o dedo/pointer pressionado;
- pausa enquanto controles internos estão em foco;
- retoma preservando o tempo restante;
- barra de tempo fina e discreta esvai-se até a próxima troca;
- setas permitem navegação manual;
- CTA usa animação leve de respiração/shimmer;
- `prefers-reduced-motion` desativa animações não essenciais.

Cada slide usa uma foto de capa proveniente de um produto do combo. O painel pode indicar explicitamente qual produto deve fornecer a capa; sem configuração, usa um produto do próprio preset que tenha imagem.

### Modos de combo

O modo padrão atual é **`preset` / Sabores selecionados**.

Neste modo:

- produtos, tamanhos e sabores são definidos pela CookLily;
- cliente visualiza a composição, mas não altera os itens;
- servidor bloqueia qualquer tentativa de adulterar as seleções;
- disponibilidade e preço são recotados antes de adicionar ao carrinho e novamente no pedido.

O modo **`builder` / Cliente monta** não foi removido.

No painel `Cardápio administrável > Ofertas e combos`, cada combo permite escolher:

- modo `Sabores selecionados`;
- modo `Cliente monta`;
- quantidade de itens;
- produto usado como capa;
- até cinco slots de produtos predefinidos;
- tamanho e sabores de cada slot;
- categoria, subtipo, tamanho e quantidade de sabores das regras do modo builder.

Combos legados sem `mode` explícito são interpretados como `preset` e recebem uma composição determinística baseada nas regras antigas até que o staff salve uma composição específica no painel.

Um combo preset inválido é omitido da vitrine pública em vez de derrubar todo o cardápio, mas continua visível no painel para correção.

## Gate do slider e modos de combo

**SHA de release validado:** `ee0089b5e1992a29d6b253ee2dafd6701eb1674b`

- CI run `36169566033`: success;
- CodeQL run `36169566016`: success;
- Node 20: 23 arquivos / 115 testes;
- Node 24: success;
- builds de produção: success;
- Tool Health e gates auxiliares: success.

O primeiro gate desta rodada detectou dois testes antigos que assumiam combo builder por padrão. Eles foram corrigidos para ativar explicitamente `mode=builder`, preservando `preset` como comportamento padrão da vitrine.

## Produto da semana e produto destaque

A hierarquia promocional foi separada em duas posições distintas e administráveis pelos campos já existentes do produto.

### Produto da semana

- `weeklyHighlight=true` representa uma posição exclusiva;
- ao ativar outro produto, o anterior é desmarcado automaticamente no backend;
- aparece como banner promocional no topo da landing page;
- aparece como banner promocional no topo do cardápio;
- o banner usa capa, nome, nome descritivo, oferta/preço atual e CTA;
- no mobile o banner é compacto para não consumir a primeira dobra;
- produto esgotado continua identificável, mas o CTA comercial é substituído pelo estado de indisponibilidade.

### Produto destaque

- `featured=true` também representa uma posição exclusiva;
- ao escolher um novo destaque, o anterior é desmarcado automaticamente;
- recebe uma vitrine editorial própria, separada da grade comum;
- a vitrine é usada tanto na landing quanto no cardápio;
- apresenta capa grande, nome, descrição, sabores, preço e CTA;
- o produto continua existindo na grade comum para manter busca, filtros e navegação consistentes.

### API e filtros

`weeklyProduct` e `featuredProduct` passaram a ser campos de primeiro nível do payload público do catálogo. Eles são calculados sobre o catálogo completo e não sobre a página filtrada, portanto uma busca/filtro não faz as posições promocionais desaparecerem.

### Painel

Os toggles agora são apresentados como:

- `Produto destaque · posição exclusiva`;
- `Produto da semana · banner exclusivo`.

O estado local dos toggles é sincronizado após refresh do painel para que a troca de posição seja refletida imediatamente na interface.

## Gate do banner semanal e vitrine do destaque

**SHA de release validado:** `73bd29f8801d095354a05f2191a8d652e57bcf75`

- CI run `36170721847`: success;
- CodeQL run `36170721740`: success;
- Node 20: 23 arquivos / 116 testes;
- Node 24: success;
- builds de produção: success;
- Tool Health e gates auxiliares: success.

O PR técnico #76 foi usado apenas como gate e permanece fechado sem merge.

## Hierarquia final do catálogo — homologação visual

Esta seção substitui a decisão anterior de expor o `featured` em uma vitrine editorial.

### Busca e filtros

- a searchbar passa a ser o primeiro bloco do cardápio, logo abaixo do header;
- permanece sticky durante a rolagem, abaixo do header sticky;
- o painel de filtros continua recolhível;
- busca e filtros são persistidos na URL (`q`, categoria, subcategoria, sabor, tamanho, disponibilidade e oferta);
- refresh e links compartilhados preservam o estado do catálogo;
- navegação do histórico do navegador volta a refletir os parâmetros da URL;
- parâmetros de atribuição/campanha já existentes na URL são preservados.

### Escolha da semana

- o banner semanal continua existindo na landing e no cardápio;
- no cardápio ele aparece depois do hero, no estilo horizontal compacto aprovado na homologação;
- usa imagem circular à esquerda, fundo vinho/rosa, título `ESCOLHA DA SEMANA`, nome, preço e CTA;
- no mobile mantém proporção compacta para não consumir a primeira dobra.

### Mais pedido

- o antigo bloco especial `FeaturedProductSpotlight` foi removido da landing e do cardápio;
- o campo `featured` passa a controlar somente a etiqueta `Mais pedido` no canto da capa do produto dentro da grade;
- o painel apresenta essa opção como `Mais pedido · etiqueta na grade`;
- a etiqueta não remove o produto da grade nem altera busca/filtros.

### Landing

- a landing não expõe mais o produto `featured` em uma seção própria;
- ganhou um CTA exclusivo `Ver cardápio completo`;
- o CTA reutiliza a mesma animação leve de respiração/shimmer dos botões do carrossel de combos.

### Ordem do cardápio

1. header;
2. searchbar/filtros sticky;
3. hero do cardápio;
4. banner `Escolha da semana`;
5. contador + grade de produtos;
6. carregamento incremental;
7. carrossel de combos;
8. footer.

### Navegação

- links internos principais usam estado ativo visual via `NavLink`;
- o usuário consegue identificar Cardápio, Ranking ou Painel como seção atual sem depender apenas do conteúdo da página.

## Gate da hierarquia final do catálogo

**SHA de release validado:** `675a3004b2980d18f013081e37dd3b70e2099675`

- CI run `36178229554`: success;
- CodeQL run `36178229558`: success;
- Node 20: 23 arquivos / 116 testes;
- Node 24: 23 arquivos / 116 testes;
- builds de produção: success;
- Tool Health, Workbook Snapshot, Excel Recipe Linux/Windows e Windows Supervisor: success.

O PR técnico #77 foi utilizado somente para validar uma árvore Git idêntica e permanece fechado sem merge.
