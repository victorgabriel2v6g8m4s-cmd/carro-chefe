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

## Rotas staff

- `/lilyacai/painel`;
- `/lilyacai/painel/cardapio`;
- `/lilyacai/painel/midias`.

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

## Identidade

Tema CookLily usa tokens `--cl-*`, logo oficial derivada e Summer / Amsterdam Four quando disponíveis, com fallbacks enquanto os binários licenciados estiverem adiados.

## Status

Entrega 05 tecnicamente validada no SHA `9e9c2e194076aa5a8dd3262e73528ac3689c8896`.

Deploy real e QA visual permanecem separados da conclusão técnica.
