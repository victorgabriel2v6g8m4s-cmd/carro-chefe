# Revisão da jornada VIP CookLily

- status: in_progress
- owner: AG-DEV
- branch: `codex/cooklily-vip-ux`
- base_branch: `cooklily/canonical`
- base_sha_verified: `ca26efdbec22d1b67ae5a24f90cdbc79df16a18f`
- head_sha_verified: `ca26efdbec22d1b67ae5a24f90cdbc79df16a18f` (antes das alterações locais)
- pull_requests: pending
- last_verified_at: 2026-10-26
- interruption_state: none

## Objetivo e fluxo avaliado

Revisar a navegação e o fluxo de clientes VIP em mobile: abrir termos, entrar, consentir, retornar ao convite, inscrever-se, fechar/reabrir diálogos e recuperar falhas de carregamento. A API de produção/VPS não foi usada; os fluxos interativos foram exercitados com respostas HTTP simuladas pelo Playwright.

## Problemas encontrados e correções em andamento

1. `vip-consented=1` permanecia na URL do perfil; após concluir a inscrição, uma atualização de estado podia reabrir o popup de convite. Criado helper para consumir o marcador uma vez e exibir a celebração apenas a quem ainda está convidado com consentimento vigente.
2. Popup de convite não tinha botão visível de fechar, tratamento de Escape nem ciclo de foco. Adicionados controles acessíveis, foco inicial/contido, bloqueio de rolagem do fundo e retorno do foco.
3. Termos dependiam de carregamento simultâneo de sessão e VIP e podiam ficar indefinidamente desabilitados para visitantes ou em falha de API. Separados estados de carregamento/erro e opções contextuais para login, nova tentativa ou retorno ao perfil.

## Evidências já coletadas

- Preflight `npm run policy:preflight -- --agent AG-DEV --scope apps/lily_acai`: PASS.
- Playwright mobile (360×732), jornada simulada de convite → consentimento → popup → Escape → inscrição: PASS; foco começa dentro do diálogo, a URL fica limpa, popup não reaparece após ativação e mensagem de sucesso aparece.
- Playwright mobile anônimo: termos permanecem legíveis e há link de entrada com retorno para `/vip/termos`.
- Modal mobile observado com 320×544 px, sem sobreposição da navegação fixa, rolagem de fundo bloqueada e Tab/Shift+Tab retidos no diálogo.
- Screenshot de revisão local: `.playwright-cli/vip-dialog-mobile.png` e `.playwright-cli/vip-terms-mobile.png` (artefatos ignorados, não entram no Git).
- `npm run test:lily-ui`: PASS — 14 arquivos, 65 testes.
- `npm run check`: PASS.

## Pendências de validação

- Rodar `npm test`, `npm run build`, `npm run policy:check` e `git diff --check` após revisão final.
- Testar estados desktop e erro/retentativa da API no Playwright.
- Atualizar este checkpoint após gates, commit, PR e CI.
- Deploy e homologação com sessão/banco reais continuam separados.

## Próxima ação exata

Concluir os testes do fluxo mobile/desktop e rodar `npm test`, `npm run build`, `npm run policy:check` e `git diff --check`; corrigir regressões antes de abrir PR para `cooklily/canonical`.
