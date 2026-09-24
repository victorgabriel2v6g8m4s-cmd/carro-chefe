# App CookLily

Frontend independente da operação temporária CookLily.

## Compatibilidade técnica

- pasta: `apps/lily_acai`;
- base: `/lilyacai/`;
- API: `/api/v1/lily/*`.

## Rotas

- `/lilyacai/` — landing de leads/WhatsApp;
- `/lilyacai/cardapio` — cardápio/estado atual;
- `/lilyacai/cadastro` — conta CookLily já existente;
- `/lilyacai/entrar`;
- `/lilyacai/privacidade`.

## Entrega 04

A landing permite entrar na lista promocional somente com telefone + opt-in; não cria senha.

Atribuição da URL é normalizada e preservada temporariamente em `sessionStorage`. No envio, o backend aplica novamente a normalização antes da persistência.

O acompanhamento P0 abre o WhatsApp oficial para atendimento humano.

## Identidade

Tema CookLily usa tokens `--cl-*`, logo oficial derivada e Summer / Amsterdam Four quando disponíveis, com fallbacks enquanto os binários licenciados estiverem adiados.
