# App CookLily

Frontend independente da operação CookLily.

## Compatibilidade técnica

- pasta: `apps/lily_acai`;
- base: `/lilyacai/`;
- API: `/api/v1/lily/*`.

## Rotas públicas

- `/lilyacai/` — landing de leads/WhatsApp + carrossel de destaques;
- `/lilyacai/cardapio` — catálogo CookLily;
- `/lilyacai/cadastro`;
- `/lilyacai/entrar`;
- `/lilyacai/privacidade`.

## Rotas de compra/conta

- `/lilyacai/carrinho`;
- `/lilyacai/checkout`;
- `/lilyacai/enderecos`;
- `/lilyacai/pedidos`;
- `/lilyacai/pedidos/:id`.

## Rotas staff

- `/lilyacai/painel`;
- `/lilyacai/painel/cardapio`;
- `/lilyacai/painel/midias`;
- `/lilyacai/painel/entrega`;
- `/lilyacai/painel/configuracoes`;
- `/lilyacai/painel/pagamentos`;
- `/lilyacai/painel/equipe` — admin.

O backend continua sendo a autoridade de autorização; esconder uma rota no frontend não substitui sessão/role/CSRF.

## Landing

A landing permite entrar na lista promocional somente com telefone + opt-in; não cria senha.

Não mostra o cardápio inteiro. O carrossel automático consome destaques/ofertas do catálogo e possui controles manuais.

## Cardápio

Implementado na Entrega 05:

- imagem como foco principal;
- nome próprio + descritor;
- busca tolerante a acentos;
- filtros;
- paginação/rolagem incremental;
- combos;
- ofertas;
- produto esgotado visível;
- placeholder;
- mídia fullscreen;
- modal/configurador;
- LilyMix até 3 sabores;
- adicionais específicos por produto.

O configurador envia a escolha ao backend para validar compatibilidade, limites e preço.

## Painel

Permite alterar sem rebuild:

- produtos;
- categorias;
- status/disponibilidade;
- textos;
- ordem;
- Destaque da Semana;
- variantes e preços;
- sabores por produto;
- adicionais por produto;
- tiers LilyMix;
- matriz de compatibilidade;
- combos;
- ofertas;
- mídia.

## Carrinho e checkout

Entrega 06 adiciona:

- carrinho persistido em `localStorage`;
- produto e combo;
- quantidade e observação;
- cotação server-side;
- compra guest;
- telefone obrigatório;
- retirada/entrega;
- endereços salvos para conta autenticada;
- Idempotency-Key;
- histórico de pedidos do titular.

O subtotal armazenado no carrinho é apenas snapshot de interface. O checkout recota no servidor imediatamente antes de criar o pedido.

A tela de sucesso informa `awaiting_payment`; não existe confirmação de pagamento na Entrega 06.

## Painel de entrega

`/lilyacai/painel/entrega` configura somente fulfillment: abertura de pedidos, retirada, entrega, horário, pedido mínimo, taxa e regiões.

`/lilyacai/painel/configuracoes` concentra Instagram, WhatsApp, endereço público e regras de fidelidade.

A operação nasce desligada e só deve ser aberta depois de preencher dados reais.

## Identidade

Tema CookLily usa tokens `--cl-*`, logo oficial derivada e Summer / Amsterdam Four quando disponíveis, com fallbacks enquanto os binários licenciados estiverem adiados.

## Status

Entrega 05: publicada na VPS para homologação.

Entrega 06 tecnicamente validada no SHA `da166683ab2d0e27acae23d9714ec8e824a02ac4`, com 105 testes, build e CodeQL aprovados.

Deploy e homologação conjunta 05/06 permanecem separados da conclusão técnica.


## P0 mobile e segurança — 27/09/2026

A linha canônica removeu o mascaramento global de overflow e o alargamento artificial do carrossel. Testes estruturais protegem header mobile, drawer, ordem de catálogo, scroll-snap e logout.

Contas `staff/admin` agora exigem MFA TOTP. O fluxo de login envia a conta privilegiada para `/perfil` quando é necessário configurar ou verificar o segundo fator e preserva `?next=/painel...` para continuar ao destino após a confirmação.

Runtime validado: `0f3e894f4993eea1c07aed881bad4ea4525e1674` — 131 testes em Node 20/24, CI e CodeQL aprovados.


## Patch P1/P2 — 27/09/2026

- drawer mobile possui focus trap;
- alvos críticos de toque usam pelo menos 44 px;
- perfil lista sessões da conta e permite encerrar as demais;
- Configurações da loja foram separadas de entrega/retirada;
- links de produto usam `/cardapio?produto=<slug>` e abrem o modal correto mesmo fora da primeira página;
- busca e filtros permanecem na URL quando o produto é aberto/fechado.

Runtime validado: `a1176a444d6ab184ab75bdc30b5b0ee8449e05f0` — 136 testes em Node 20/24, CI e CodeQL aprovados.
