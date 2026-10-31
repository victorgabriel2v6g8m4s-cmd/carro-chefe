# CookLily landing: homologação e consistência de localização

- status: completed
- owner: AG-DEV
- branch: `codex/fix-landing-public-location` (code); `codex/cooklily-landing-deploy-checkpoint` (checkpoint update)
- base_branch: `cooklily/canonical`
- base_sha_verified: `7e174f310d6d130991e959c5623b34d95d441db3`
- head_sha_verified: `fc96a845083abce33964a5d273e3aa0b107b4769`
- pull_requests: [#312](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/312) merged as `7e174f310d6d130991e959c5623b34d95d441db3`; [#313](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/313) checkpoint merged as `fc96a845083abce33964a5d273e3aa0b107b4769`
- last_verified_at: 2026-10-31
- interruption_state: none

## Objetivo

Fechar o ciclo da landing CookLily já integrada: homologar a página pública e o editor em desktop/mobile, corrigir discrepância entre endereço público e endereço de retirada e repetir CI, merge, deploy e homologação.

## Marcos confirmados

- A entrega principal foi integrada pelo PR #311 e publicada inicialmente em `126f070d653d6a142f75aa524afba5168aa8c055`.
- O acompanhamento foi integrado pelo PR #312, squash SHA `7e174f310d6d130991e959c5623b34d95d441db3`. CI run `41243831603` passou em todos os 8 jobs (Node 20/22/24, Windows Supervisor, Tool Health, Workbook Snapshot e Excel Recipe Linux/Windows).
- O checkpoint foi integrado pelo PR #313; CI run `41244216515` passou nos 8 jobs. Canonical e VPS agora estão em `fc96a845083abce33964a5d273e3aa0b107b4769`.
- Deploy final registrado em `/srv/carro-chefe/data/deploy-logs/deploy-20261031-213708-fc96a845083a.log`; evidência em `/srv/carro-chefe/data/deploy-logs/deploy-20261031-213708-fc96a845083a.evidence`. `sudo cc status` confirmou SHA ativo/canonical iguais, serviço ativo, Nginx saudável, health checks internos/externos OK e sem migrations pendentes. Os gates do deploy passaram: 82 arquivos, 440 testes e orçamento do bundle (242.35 KiB JS+CSS gzip de 245 KiB).
- Landing pública revalidada após a conclusão do deploy no navegador integrado Codex em desktop `1280×720` e mobile `390×844`. No mobile, `innerWidth=390` e `scrollWidth=390`, sem overflow horizontal. Console sem erros. Conferidos produto da semana, história, ranking carregado, Reels, navegação e CTAs de login/cadastro para clientes existentes e novos.
- Depois de um reload pós-deploy, `/api/v1/lily/public/config` retornou `store.address: null`; landing exibiu “Endereço público ainda não configurado” e o rodapé deixou de mostrar o endereço de retirada. A leitura anterior feita enquanto o deploy ainda reiniciava refletia a versão antiga e foi descartada.
- Editor `/lilyacai/painel/landing` autenticado pela chave de agente administrativa, examinado em desktop e mobile. Banner, editor Markdown compartilhado, seleção de produto semanal/carrossel, colunas por dispositivo e toggles de ranking/Reels/localização foram conferidos sem salvar alterações.
- Falha corrigida no PR #312: o endpoint público geral usava `publicAddressText ?? pickupAddressText` e mostrava o endereço de retirada no rodapé. A correção eliminou o fallback; após deploy e reload, a API e a landing retornam endereço público vazio.

## Correção entregue

- Alterar a configuração pública geral para usar somente `publicAddressText`, assim como o endpoint de landing, e atualizar a mensagem vazia da localização para informar que o endereço público ainda não foi configurado.
- Teste de regressão compara o endereço da landing com a configuração pública da loja.
- O endereço de retirada não deve ser promovido/publicado automaticamente. A localização e o mapa aparecem quando a pessoa administradora cadastrar o valor no campo **Endereço público**.

## Gates e testes

- `policy:preflight` para `apps/api/src/modules/lily`: passou antes da edição.
- `npm run check`: passou após a correção.
- `npx vitest run --config vitest.config.ts apps/api/src/modules/lily/landing-page.test.ts`: 1 arquivo, 3 testes passaram após a correção.
- Build passou; o orçamento final no deploy foi 242.35 KiB JS+CSS gzip (limite 245 KiB).
- Deploy final: 82 arquivos e 440 testes aprovados, sem migrations pendentes.
- `npm run policy:check` e `git diff --check`: passaram.
- Commit `3614695199f50d72f941fa4db8a38d262f3eb29a` publicado na branch; PR draft #312 aberto e anexado a esta tarefa.
- PR #312 e PR #313 integrados; deploy e homologação desktop/mobile concluídos.

## Migrations

- Nenhuma migration nesta correção. A migration da landing foi aplicada no deploy principal.

## Bloqueios e riscos

- O endereço público continua vazio. Não usar o endereço interno de retirada como fallback público. A seção informa “Endereço público ainda não configurado” até a configuração ser preenchida.
- A confirmação para cadastrar um endereço público ainda está pendente; a homologação não alterou configurações administrativas.
- Nenhuma configuração administrativa foi salva durante a homologação.

## Próxima ação exata

Se o proprietário confirmar um endereço público, cadastrá-lo pelo painel e validar endereço/mapa sem usar o campo de retirada. Em seguida concluir U1–U6 da especificação detalhada da landing e repetir homologação desktop/mobile.
