# CookLily landing: homologação e consistência de localização

- status: in_progress
- owner: AG-DEV
- branch: `codex/fix-landing-public-location` (code); `codex/cooklily-landing-deploy-checkpoint` (checkpoint update)
- base_branch: `cooklily/canonical`
- base_sha_verified: `126f070d653d6a142f75aa524afba5168aa8c055`
- head_sha_verified: `22d0e83dc784363d5c2ad9fcf251675cde8fda4a` (PR head; code already merged)
- pull_requests: [#312](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/312) merged as `7e174f310d6d130991e959c5623b34d95d441db3`; checkpoint update PR pending
- last_verified_at: 2026-10-31
- interruption_state: none

## Objetivo

Fechar o ciclo da landing CookLily já integrada: homologar a página pública e o editor em desktop/mobile, corrigir discrepância entre endereço público e endereço de retirada e repetir CI, merge, deploy e homologação.

## Marcos confirmados

- A entrega principal foi integrada pelo PR #311 e publicada na VPS em `126f070d653d6a142f75aa524afba5168aa8c055`.
- O acompanhamento foi integrado pelo PR #312, squash SHA `7e174f310d6d130991e959c5623b34d95d441db3`. CI run `41243831603` passou em todos os 8 jobs (Node 20/22/24, Windows Supervisor, Tool Health, Workbook Snapshot e Excel Recipe Linux/Windows).
- `sudo cc status` confirmou `current_sha` e `canonical_sha` iguais a `126f070d653d6a142f75aa524afba5168aa8c055`, serviço ativo, Nginx saudável e gates de build, preflight, static checks e testes aprovados. Log: `/srv/carro-chefe/data/deploy-logs/deploy-20261031-211233-126f070d653d.log`.
- Landing pública examinada no navegador integrado Codex: desktop `1280×720` e mobile `390×844`; sem overflow horizontal em mobile (`innerWidth=390`, `scrollWidth=390`). Não houve erro de console. Produto da semana, história, ranking lazy-loaded, Reels, login/cadastro sem pedir WhatsApp e localização foram conferidos.
- Editor `/lilyacai/painel/landing` autenticado pela chave de agente administrativa, examinado em desktop e mobile. Banner, editor Markdown compartilhado, seleção de produto semanal/carrossel, colunas por dispositivo e toggles de ranking/Reels/localização foram conferidos sem salvar alterações.
- Falha encontrada: o endpoint público geral usava `publicAddressText ?? pickupAddressText` e mostrava o endereço de retirada no rodapé, enquanto a landing corretamente restringia o mapa a `publicAddressText`. O campo “Endereço público” no painel está vazio.

## Correção em andamento

- Alterar a configuração pública geral para usar somente `publicAddressText`, assim como o endpoint de landing, e atualizar a mensagem vazia da localização para informar que o endereço público ainda não foi configurado.
- Teste de regressão compara o endereço da landing com a configuração pública da loja.
- O endereço de retirada não deve ser promovido/publicado automaticamente. A localização e o mapa aparecem quando a pessoa administradora cadastrar o valor no campo **Endereço público**.

## Gates e testes

- `policy:preflight` para `apps/api/src/modules/lily`: passou antes da edição.
- `npm run check`: passou após a correção.
- `npx vitest run --config vitest.config.ts apps/api/src/modules/lily/landing-page.test.ts`: 1 arquivo, 3 testes passaram após a correção.
- `npm run build`: passou após a correção; bundle CookLily dentro do budget (`242.09 KiB` JS+CSS gzip, limite `245 KiB`).
- Suíte completa anterior à correção: 85 arquivos, 444 testes passaram, 3 ignorados. CI do PR de acompanhamento deve validar novamente o estado final.
- `npm run policy:check` e `git diff --check`: passaram.
- Commit `3614695199f50d72f941fa4db8a38d262f3eb29a` publicado na branch; PR draft #312 aberto e anexado a esta tarefa.
- CI e merge do acompanhamento passaram; deploy do SHA `7e174f310d6d130991e959c5623b34d95d441db3` e homologação final pendentes.

## Migrations

- Nenhuma migration nesta correção. A migration da landing foi aplicada no deploy principal.

## Bloqueios e riscos

- O endereço público está vazio. Não usar o endereço interno de retirada como fallback público. A seção informa “Endereço público ainda não configurado” até a configuração ser preenchida.
- Foi solicitada confirmação ao proprietário para decidir se o endereço informado anteriormente deve ser cadastrado no campo público ou se outro deve ser usado; a resposta ainda está pendente.
- Nenhuma configuração administrativa foi salva durante a homologação.

## Próxima ação exata

Publicar o canonical com PR #312 (`7e174f310d6d130991e959c5623b34d95d441db3`) e repetir a homologação da landing pública em desktop/mobile, incluindo a mensagem correta de endereço vazio. Se o proprietário confirmar endereço público, cadastrá-lo pelo painel e validar endereço/mapa sem usar o campo de retirada.
