# Revisão da jornada VIP CookLily

- status: merged; aguardando deploy e homologação real
- owner: AG-DEV
- implementation_branch: `codex/cooklily-vip-ux`
- base_branch: `cooklily/canonical`
- base_sha_verified: `ca26efdbec22d1b67ae5a24f90cdbc79df16a18f`
- implementation_head_sha: `9371a66a408cbad41d36543713c10331b98b3413`
- pull_requests: [PR #199](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/199) (merged)
- merge_commit_sha: `80bdec8c3b3d182ea1d913738b49f7eb8671323f`
- ci_run: `40409517779` (#798), todos os 7 jobs concluíram com sucesso
- last_verified_at: 2026-10-26
- interruption_state: none

## Objetivo e fluxo avaliado

Revisar a navegação e o fluxo de clientes VIP em mobile e desktop: abrir termos, autenticar, consentir, retornar ao convite, inscrever-se, fechar/reabrir diálogos e recuperar falhas de carregamento. Os fluxos interativos foram exercitados no Playwright com respostas de API simuladas; nenhuma conta ou dado real foi usado.

## Problemas corrigidos

1. `vip-consented=1` permanecia na URL do perfil; após ativar a inscrição, atualizações podiam reabrir o popup. O marcador agora é consumido uma vez, com popup somente para convite pendente e consentimento válido.
2. O convite não tinha controle de fechar nem comportamento de teclado acessível. Agora usa `<dialog>` nativo, Escape, ciclo de foco do navegador, bloqueio de rolagem de fundo, retorno do foco e botão de fechar.
3. A tela de termos podia ficar sem saída visível se sessão/API falhasse. Agora informa carregamento, erro com nova tentativa e caminhos distintos para login, resgate/solicitação pelo perfil e cancelamento.
4. A rota de termos era agrupada junto com a implementação do perfil. Componentes separados permitem carregamento sob demanda e removem o aviso de importação dinâmica ineficaz.
5. Removido estado de `sessionStorage` de consentimento que não era consultado pelo fluxo e simplificada a animação para terminar em dois segundos.

## Evidências

- Preflight `npm run policy:preflight -- --agent AG-DEV --scope apps/lily_acai`: PASS.
- Playwright mobile 360×732, fluxo convidado → termos → consentimento → popup → Escape → inscrição: PASS. O popup mediu 320×544 px, ficou acima do rodapé fixo, focou dentro do diálogo, bloqueou a rolagem de fundo, desapareceu ao fechar e não reapareceu após inscrição.
- Playwright visitante anônimo: termos permanecem acessíveis e o link de entrada preserva retorno a `/vip/termos`.
- Playwright desktop 1440 px: conteúdo sem overflow horizontal, navegação móvel oculta e CTA de consentimento visível para convite autenticado.
- Capturas locais ignoradas pelo Git: `.playwright-cli/vip-dialog-mobile-final.png`, `.playwright-cli/vip-terms-mobile.png`.
- `npm run test:lily-ui`: PASS — 14 arquivos, 65 testes.
- `npm test`: PASS — 62 arquivos, 330 testes aprovados, 3 ignorados.
- `npm run check`: PASS.
- `npm run build`: PASS; bundle CookLily: JS 635.73 KiB raw / 168.53 KiB gzip; combinado gzip 193.62 KiB, dentro do budget. Limite raw elevado em 2 KiB para 652.000 bytes após adicionar o chunk de termos sob demanda. Vite mantém aviso de chunk principal acima de 500 KiB.
- `npm run policy:check`: PASS.
- `git diff --check`: PASS.
- GitHub Actions #798 (`40409517779`): os 7 jobs passaram, incluindo Quality Node 20 e 24.
- Merge squash para `cooklily/canonical`: `80bdec8c3b3d182ea1d913738b49f7eb8671323f`.

## Limites

- API, banco e sessão foram simulados na navegação; testes de integração da API existente passaram, mas a jornada ainda precisa ser homologada com uma conta real após deploy.
- Deploy na VPS não foi executado nesta tarefa.
- O chunk principal ainda gera aviso genérico de 500 KiB; a página de termos agora é separada e carregada sob demanda.

## Próxima ação exata

Após deploy na VPS, homologar com conta de teste: entrar, validar convite/código, ler termos, consentir, inscrever-se, confirmar selo/coroa e cancelar; conferir logs/requisições da jornada e registrar o resultado. Não convidar participantes VIP reais antes da homologação e da validação final dos termos de privacidade.
