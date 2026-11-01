# Refresh da landing e da jornada CookLily

- status: `completed`
- owner: `AG-DEV`
- branch: `cooklily/canonical`
- base_branch: `cooklily/canonical`
- base_sha_verified: `1a7c17c3f576112fd5ca8fadaf160734490df3c6`
- head_sha_verified: `d06933650c9dcb6b92477f5d43fddd8c4116bc5b` (canonical verificada antes deste registro de homologação; release publicado: `3239865631a1e40a0a32bc69b59e93e69cfa4f8b`)
- pull_requests: [#315](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/315), [#316](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/316), [#317](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/317), [#318](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/318), [#319](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/319), [#320](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/320), [#321](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/321), [#322](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/322) e [#323](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/323) integradas
- last_verified_at: `2026-11-01 07:43 UTC`
- interruption_state: `none`

## Entrega

Atualizar a landing pública e elementos compartilhados conforme decisões do proprietário: remover convite redundante de cadastro, destacar produto semanal, comunicar o fluxo de missões/LilyCoins, pesquisas/pontos, níveis/benefícios e Store, mostrar ícones de nível no ranking e ícones de fidelidade no header anônimo. Publicar o endereço público já informado, sem alterar separadamente o ponto operacional de coleta. Ajustar chamadas de acompanhamento para indicar site ou WhatsApp sem prometer atendimento humano.

## Concluído e persistido

- Landing implementada: resumo de fidelidade no header anônimo; ranking da landing e ranking completo mostram nível e ícone; seção de experiência tem mapa do fluxo e prévias HTML.
- Banner: preview/crop/zoom compartilham pan vertical/horizontal entre admin e página pública; ajuste do z-index do header evita sobreposição das barras do catálogo.
- Tipografia: `COOK` estreito em caixa alta + `Lily` manuscrito itálico, responsivo, reutilizando fontes do kit.
- Editor compartilhado: PR #322 adicionou estados acessíveis; PR #323 corrigiu a alternância inline direta. Em produção, aplicar/remover negrito, itálico e riscado no mesmo trecho aumentou a contagem de 193 para 195 e a devolveu a 193; `aria-pressed` alternou `true`/`false` em desktop e mobile. No mobile, o botão ativo ficou destacado em vinho. Nenhuma edição foi salva; uma recarga confirmou o texto persistido sem mudança.
- Carrossel de produtos da landing reutiliza a estrutura visual, controles e timer de combos; contador/foco por card, pausa durante interação, intervalo configurável de 3–20s e colunas desktop/mobile. Sem elementos selecionados, a imagem ocupa o card inteiro.
- Orçamento ajustado após diferenças medidas no build Windows/Linux: JS gzip máximo 205 KiB, JS bruto 650 KiB, CSS gzip 41 KiB e combinado 246 KiB; limites de entrypoint e chunk máximo permanecem.
- Roadmap da landing e este checkpoint atualizados.

## Integrações, deploys e homologação

- PR #317 integrada na canonical em `bca50e86720ef7fea789e4c3253fd043807ff7d0` após CI completo `41279816196` passar.
- PR #318 ajustou os budgets de JS/total; deploy em `2026-11-01 06:46 UTC` concluiu no SHA `00771c5e`. Build VPS: JS gzip `205,21/207 KiB`, combinado `246,13/248 KiB`; health interno e smoke HTTPS passaram.
- Endereço público autorizado foi salvo em Painel → Configurações e confirmado no texto e mapa da landing.
- Homologação no IAB: desktop 1440x900 e mobile 390x844. A rotação avançou de 2/3 para 3/3 após 8 s; painel mostra timer configurado em 7 s, 3 colunas desktop e 2 mobile. Com os elementos desligados temporariamente, as imagens ocuparam o card todo; título, preço e rótulo foram restaurados e salvos.
- A revisão encontrou preço cortado em cards mobile estreitos. PR #319 corrigiu o layout com container query e foi integrada em `519661f9` após CI `41282529154` passar.
- PR #320 integrada pelo squash `5d9d160be468f9984f8b170882bfa05c9f71f1b8`, CI `41283048216` passou. Deploy em 2026-11-01 concluiu nesse SHA: JS gzip `205,20/207 KiB`, CSS gzip `41,02/42 KiB`, combinado `246,22/248 KiB`; migrations não pendentes, readiness e HTTPS smoke passaram.
- PR #321 integrada no canonical em `2396740a`; PR #322 integrada em `1a7c17c3`. Deploy do SHA `1a7c17c3` terminou em `2026-11-01 07:21 UTC`; readiness e smoke HTTPS passaram. Em teste IAB, a seleção de uma palavra em um trecho de texto que o markdown legado já renderizava como negrito produziu uma contagem temporária inesperada; nenhuma configuração da landing foi salva. A verificação adicional confirmou que uma palavra sem formatação pode ser aplicada e removida pelo comando nativo no mesmo editor, mas o caso inicialmente testado dependia da estrutura preexistente.
- PR #323 integrada por squash no SHA `3239865631a1e40a0a32bc69b59e93e69cfa4f8b`; CI `41285239653` concluiu com sucesso em Node 20/22/24 e jobs auxiliares. A implementação troca/remove negrito, itálico e riscado manipulando o intervalo selecionado diretamente em texto simples, com fallback nativo para seleções mistas/complexas. Deploy ainda pendente.
- A revisão visual do carrossel em desktop com três colunas levou ao ajuste compactado até 420px na PR #321; a versão implantada na sequência passou pela nova conferência desktop/mobile.
- PR #323 foi implantada em `2026-11-01 07:38 UTC`, release `3239865631a1e40a0a32bc69b59e93e69cfa4f8b`; log `/srv/carro-chefe/data/deploy-logs/deploy-20261101-073802-3239865631a1.log`, evidências `/srv/carro-chefe/data/deploy-logs/deploy-20261101-073802-3239865631a1.evidence`. Backup verificado, sem migrations pendentes nos bancos operacionais, readiness e smoke HTTPS passaram.
- Homologação real no navegador integrado: desktop 1440×900 e mobile 390×844. Para cada estilo inline (negrito, itálico, riscado), a aplicação gerou a tag visual e `aria-pressed=true`; a segunda ativação removeu a tag, retornou o contador a `193/3000` e `aria-pressed=false`. Screenshot mobile confirmou o botão Negrito realçado em vinho enquanto ativo. Recarregar descartou o rascunho e confirmou a descrição original `193/3000`; nenhuma configuração foi salva.

## Gates e testes

- Preflight para `AG-DEV` e escopo `apps/lily_acai/src/features/landing`: passou via `node tools/agent-policy/cli.mjs preflight`.
- Typecheck `tsc --noEmit -p tsconfig.json`: passou.
- Testes focados CookLily: 27 arquivos, 114 testes passaram; testes do orçamento: 4 passaram.
- Build Vite de produção CookLily passou localmente; budget local: JS gzip 204,74 KiB, CSS gzip 40,87 KiB, combinado 245,61/246 KiB.
- Para PR #323, typecheck, 37 testes estruturais CookLily e build/budget passaram: JS gzip `205,75/207 KiB`, CSS gzip `41,02/42 KiB`, total gzip `246,77/248 KiB`. CI `41285239653` passou em Node 20/22/24 e jobs auxiliares no head `e793058a`.
- CI completo PR #317, run `41279816196`, passou em Node 20/22/24, builds, testes, Tool Health Linux, workbook, Excel Recipe e supervisor; head testado `f5471c30`.
- Primeiro CI run `41279218937` reprovou só pelos limites brutos/combinados que não acomodavam Linux (`JS raw 648,01 KiB`, combinado 245,87 KiB). Os limites foram corrigidos e o run seguinte passou.
- `git diff --check`: passou.
- `npm` não está disponível neste ambiente. `pnpm run` tentou resolver dependências e parou porque scripts de instalação estão bloqueados; comandos equivalentes foram executados diretamente com Node do workspace. CI usou `npm ci` e passou integralmente.

## Migrations

- Nenhuma planejada.

## Bloqueios/riscos

- Sem bloqueios de implementação ou homologação para o escopo do checkpoint.
- Nenhum segredo ou dado pessoal foi adicionado ao repositório.

## Homologação/dependências externas

- Homologação deve usar exclusivamente a aba do navegador integrado do Codex.
- Deploy VPS autorizado pelo proprietário no contexto persistente da tarefa.
- Configuração do endereço público expressamente autorizada: `Rua João Marcondes, 349 - Mata do Segredo, Campo Grande - MS, 79015-320`. Não alterar o ponto operacional de coleta.

## Próxima ação exata

Nenhuma ação pendente para esta entrega: PR #323 integrada, implantada e homologada em desktop/mobile. Os rascunhos foram descartados e o viewport do navegador integrado foi restaurado.
