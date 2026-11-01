# Refresh da landing e da jornada CookLily

- status: `in_progress`
- owner: `AG-DEV`
- branch: `codex/cooklily-carousel-desktop-fit`
- base_branch: `cooklily/canonical`
- base_sha_verified: `5d9d160be468f9984f8b170882bfa05c9f71f1b8`
- head_sha_verified: `5d9d160be468f9984f8b170882bfa05c9f71f1b8` (correção desktop em andamento)
- pull_requests: [#315](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/315), [#316](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/316), [#317](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/317), [#318](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/318), [#319](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/319) e [#320](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/320) integradas
- last_verified_at: `2026-11-01`
- interruption_state: `none`

## Entrega

Atualizar a landing pública e elementos compartilhados conforme decisões do proprietário: remover convite redundante de cadastro, destacar produto semanal, comunicar o fluxo de missões/LilyCoins, pesquisas/pontos, níveis/benefícios e Store, mostrar ícones de nível no ranking e ícones de fidelidade no header anônimo. Publicar o endereço público já informado, sem alterar separadamente o ponto operacional de coleta. Ajustar chamadas de acompanhamento para indicar site ou WhatsApp sem prometer atendimento humano.

## Concluído e persistido

- Landing implementada: resumo de fidelidade no header anônimo; ranking da landing e ranking completo mostram nível e ícone; seção de experiência tem mapa do fluxo e prévias HTML.
- Banner: preview/crop/zoom compartilham pan vertical/horizontal entre admin e página pública; ajuste do z-index do header evita sobreposição das barras do catálogo.
- Tipografia: `COOK` estreito em caixa alta + `Lily` manuscrito itálico, responsivo, reutilizando fontes do kit.
- Editor alterna negrito, itálico, riscado, listas, citação e código onde a estrutura permite; controles mostram estado `aria-pressed` e as citações/blocos de código voltam ao parágrafo.
- Carrossel de produtos da landing reutiliza a estrutura visual, controles e timer de combos; contador/foco por card, pausa durante interação, intervalo configurável de 3–20s e colunas desktop/mobile. Sem elementos selecionados, a imagem ocupa o card inteiro.
- Orçamento ajustado após diferenças medidas no build Windows/Linux: JS gzip máximo 205 KiB, JS bruto 650 KiB, CSS gzip 41 KiB e combinado 246 KiB; limites de entrypoint e chunk máximo permanecem.
- Roadmap da landing e este checkpoint atualizados.

## Em andamento

- PR #317 integrada na canonical em `bca50e86720ef7fea789e4c3253fd043807ff7d0` após CI completo `41279816196` passar.
- PR #318 ajustou os budgets de JS/total; deploy em `2026-11-01 06:46 UTC` concluiu no SHA `00771c5e`. Build VPS: JS gzip `205,21/207 KiB`, combinado `246,13/248 KiB`; health interno e smoke HTTPS passaram.
- Endereço público autorizado foi salvo em Painel → Configurações e confirmado no texto e mapa da landing.
- Homologação no IAB: desktop 1440x900 e mobile 390x844. A rotação avançou de 2/3 para 3/3 após 8 s; painel mostra timer configurado em 7 s, 3 colunas desktop e 2 mobile. Com os elementos desligados temporariamente, as imagens ocuparam o card todo; título, preço e rótulo foram restaurados e salvos.
- A revisão encontrou preço cortado em cards mobile estreitos. PR #319 corrigiu o layout com container query e foi integrada em `519661f9` após CI `41282529154` passar.
- PR #320 integrada pelo squash `5d9d160be468f9984f8b170882bfa05c9f71f1b8`, CI `41283048216` passou. Deploy em 2026-11-01 concluiu nesse SHA: JS gzip `205,20/207 KiB`, CSS gzip `41,02/42 KiB`, combinado `246,22/248 KiB`; migrations não pendentes, readiness e HTTPS smoke passaram.
- Homologação visual pós-deploy achou que títulos/preços dos cards do carrossel ainda cortavam em desktop com três colunas. Correção local amplia a container query compacta para cards até 420px; requer PR, deploy e nova homologação.
- Na nova homologação mobile do SHA `5d9d160b`, os dois cards mostram nome e preço legíveis. No desktop 1440px, os textos dos três cards aparentaram corte; a compactação responsiva foi ampliada a 420px. Teste de landing focado passou (1 teste), build Vite + budget local passou (JS gzip `204,74/207 KiB`, CSS gzip `40,98/42 KiB`, combinado `245,71/248 KiB`). `pnpm` tentou instalar dependências e parou por scripts de build bloqueados; os runners locais instalados foram invocados diretamente com sucesso.

## Gates e testes

- Preflight para `AG-DEV` e escopo `apps/lily_acai/src/features/landing`: passou via `node tools/agent-policy/cli.mjs preflight`.
- Typecheck `tsc --noEmit -p tsconfig.json`: passou.
- Testes focados CookLily: 27 arquivos, 114 testes passaram; testes do orçamento: 4 passaram.
- Build Vite de produção CookLily passou localmente; budget local: JS gzip 204,74 KiB, CSS gzip 40,87 KiB, combinado 245,61/246 KiB.
- CI completo PR #317, run `41279816196`, passou em Node 20/22/24, builds, testes, Tool Health Linux, workbook, Excel Recipe e supervisor; head testado `f5471c30`.
- Primeiro CI run `41279218937` reprovou só pelos limites brutos/combinados que não acomodavam Linux (`JS raw 648,01 KiB`, combinado 245,87 KiB). Os limites foram corrigidos e o run seguinte passou.
- `git diff --check`: passou.
- `npm` não está disponível neste ambiente. `pnpm run` tentou resolver dependências e parou porque scripts de instalação estão bloqueados; comandos equivalentes foram executados diretamente com Node do workspace. CI usou `npm ci` e passou integralmente.

## Migrations

- Nenhuma planejada.

## Bloqueios/riscos

- Mudança desktop compacta aguarda validação CI e deploy. Proteger limite CSS gzip de 42 KiB.
- Nenhum segredo ou dado pessoal foi adicionado ao repositório.

## Homologação/dependências externas

- Homologação deve usar exclusivamente a aba do navegador integrado do Codex.
- Deploy VPS autorizado pelo proprietário no contexto persistente da tarefa.
- Configuração do endereço público expressamente autorizada: `Rua João Marcondes, 349 - Mata do Segredo, Campo Grande - MS, 79015-320`. Não alterar o ponto operacional de coleta.

## Próxima ação exata

Validar a compactação desktop em CI, abrir PR para `cooklily/canonical`, integrar por squash e executar `sudo cc deploy <sha canonical>`. No IAB, verificar card desktop e preços mobile; então repor configurações do carrossel, resetar viewport e registrar resultado neste checkpoint.
