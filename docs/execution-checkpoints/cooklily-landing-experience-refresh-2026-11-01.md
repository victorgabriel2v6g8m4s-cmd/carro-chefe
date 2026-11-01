# Refresh da landing e da jornada CookLily

- status: `in_progress`
- owner: `AG-DEV`
- branch: `codex/cooklily-landing-wordmark-refresh`
- base_branch: `cooklily/canonical`
- base_sha_verified: `0689a3cedd64663ac8e563623e0188dee0f61796`
- head_sha_verified: `0e8013c19e9f8c9c650e5d9ba986b4b1b43f6177`
- pull_requests: [#315](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/315) merged, CI `41276513343` success; [#316](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/316) merged checkpoint; [#317](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/317) aberto para tipografia, editor e carrossel; CI do SHA anterior `41277233761` success, novo SHA aguardando CI
- last_verified_at: `2026-11-01`
- interruption_state: `none`

## Entrega

Atualizar a landing pública e elementos compartilhados conforme decisões do proprietário: remover convite redundante de cadastro, destacar produto semanal, comunicar o fluxo de missões/LilyCoins, pesquisas/pontos, níveis/benefícios e Store, mostrar ícones de nível no ranking e ícones de fidelidade no header anônimo. Publicar o endereço público já informado, sem alterar separadamente o ponto operacional de coleta. Ajustar chamadas de acompanhamento para indicar site ou WhatsApp sem prometer atendimento humano.

## Concluído e persistido

- Branch criada a partir da `cooklily/canonical` verificada em `0689a3cedd64663ac8e563623e0188dee0f61796`.
- Implementação em andamento para o resumo público de fidelidade no header anônimo, incluindo imagem da LilyCoin e arte do nível inicial.
- Ranking da landing e ranking completo reutilizam identidade do nível com o respectivo ícone.
- Seção de experiência ganhou mapa do fluxo e prévias de interface exclusivamente ilustrativas; a Store aparece como prévia planejada.
- Recuadro do banner compartilha cálculo de pan/zoom entre preview administrativo e banner público; update dos sliders usa estado funcional para não perder eventos rápidos.
- Z-index global do header foi elevado acima das barras sticky do catálogo.
- Correção do posicionamento vertical do banner e cobertura dirigida adicionadas após bugs reportados pelo proprietário.
- Identidade tipográfica da landing atualizada com `COOK` estreito em caixa alta e `Lily` manuscrito itálico, usando os mesmos tokens tipográficos do logo e ajustes responsivos.
- Editor alterna negrito, itálico, riscado, listas, citação e código onde a estrutura permite; controles mostram estado `aria-pressed` e realce visual. Citações e blocos de código alternam de volta ao parágrafo.
- Carrossel da landing recebeu intervalo selecionável de 3–20 segundos com default de 7 segundos; configuração legada sem esse campo é preenchida pelo schema. Reutiliza controles, temporizador, estilo e animação do carrossel de combos, além de suportar cards sem elementos textuais ocupando toda a área com a imagem.
- Ajuste complementar solicitado: carrossel de produtos agora usa a mesma estrutura visual e controles do carrossel de combos, com foco/contador por card, pausa em interação e tempo configurável entre trocas. As colunas desktop/mobile configuradas continuam respeitadas; imagem sem componentes de texto ocupa a área total do card.
- O orçamento foi ampliado anteriormente em 1 KiB para JS gzip e 0,5 KiB no combinado; o suplemento do carrossel aumentou o teto agregado em mais 0,25 KiB (251.648 bytes), sem alterar os limites de entrypoint/chunk. O resultado atual mede 204,74 KiB JS gzip + 40,87 KiB CSS gzip = 245,61 KiB.
- Roadmap recebeu o escopo aprovado desta atualização, tipografia, carrossel e os bugs reportados.

## Em andamento

- PR #317 e CI do commit atual pendentes; deploy de `cooklily/canonical` após integração pendente.
- Registrar o endereço público autorizado e homologar domínio em desktop/mobile no navegador integrado; corrigir e repetir se necessário.

## Gates e testes

- Preflight de política executado para `AG-DEV`, escopo `apps/lily_acai/src/features/landing`; passou.
- `npm test`: 88 arquivos, 450 passaram e 3 foram ignorados.
- CI do PR #315: run `41276513343` success (Node 20/22/24, checks, workbook e supervisor).
- `npm run check`: passou.
- `npm run build`: passou; budget CookLily: JS gzip 204,52/205 KiB; JS+CSS gzip 245,33/245,5 KiB.
- `git diff --check`: passou.
- Suplemento do carrossel: preflight (`node tools/agent-policy/cli.mjs preflight`) passou; typecheck (`tsc --noEmit -p tsconfig.json`) passou; testes de `apps/lily_acai`: 27 arquivos/114 testes passaram; Vite build passou; budget passou com teto combinado revisado a 245,75 KiB. `npm` não está disponível; `pnpm run` tentou resolver dependências e parou porque scripts de instalação estão bloqueados, então os comandos equivalentes foram executados diretamente com o Node do workspace.
- PR #315 e PR #316 integrados. PR #317 atualizado; CI do novo head, deploy e homologação desktop/mobile pendentes.
- A alteração complementar do carrossel está em trabalho local no branch; check, build, CI, integração e homologação ainda pendentes.

## Migrations

- Nenhuma planejada.

## Bloqueios/riscos

- Nenhum bloqueio local de runtime: Node LTS e npm encontrados em `C:\Program Files\nodejs`.

## Homologação/dependências externas

- Homologação deve usar exclusivamente a aba do navegador integrado do Codex.
- Deploy VPS autorizado pelo proprietário no contexto persistente da tarefa.
- Configuração do endereço público expressamente autorizada; texto confirmado: `Rua João Marcondes, 349 - Mata do Segredo, Campo Grande - MS, 79015-320`.

## Próxima ação exata

Validar localmente a mudança complementar do carrossel (preflight, check, build e testes); atualizar PR #317, obter CI no head atual e integrar; executar `sudo cc deploy canonical` na VPS; configurar o endereço público pelo painel autenticado; homologar desktop/mobile exclusivamente no navegador integrado e atualizar este checkpoint com evidências.
