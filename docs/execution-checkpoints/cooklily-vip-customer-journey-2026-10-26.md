# Revisão da jornada VIP CookLily

- status: candidate
- owner: AG-DEV
- branch: `codex/cooklily-vip-ux`
- base_branch: `cooklily/canonical`
- base_sha_verified: `ca26efdbec22d1b67ae5a24f90cdbc79df16a18f`
- head_sha_verified: `e1f7f2a03d61d6356bcee304c2a32f50bb82b83d` (HEAD antes do commit de implementação)
- pull_requests: pending
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

## Limites

- API, banco e sessão foram simulados na navegação; testes de integração da API existente não foram alterados.
- Deploy e homologação com conta real na VPS permanecem pendentes.
- O chunk principal ainda gera aviso genérico de 500 KiB; a página de termos agora é separada e carregada sob demanda.

## Próxima ação exata

Criar o commit da implementação, abrir PR contra `cooklily/canonical`, acompanhar os gates remotos e corrigir qualquer falha antes de integrar. Depois registrar o SHA do commit/merge. Não executar deploy nesta tarefa.
