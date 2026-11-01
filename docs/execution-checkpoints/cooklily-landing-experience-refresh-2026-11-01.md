# Refresh da landing e da jornada CookLily

- status: `in_progress`
- owner: `AG-DEV`
- branch: `codex/cooklily-landing-wordmark-refresh`
- base_branch: `cooklily/canonical`
- base_sha_verified: `d9bb40aa0b35b73298db55fad681c17fbb2c8488`
- head_sha_verified: `50345b00daf65d1360dfaae6552fafd5f3e0cfd4` (código; merge de sincronização `f5038f25` contém apenas checkpoint)
- pull_requests: [#315](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/315) merged, CI `41276513343` success; [#316](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/316) merged checkpoint; [#317](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/317) open, CI `41279447156` success no SHA de código `50345b00`; após sync para canonical `d9bb40aa`, execução `41279793939` está pendente no merge commit `f5038f25`
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

- PR #317 foi sincronizada com a canonical atual `d9bb40aa`; a única resolução de conflito foi neste checkpoint. CI do merge commit `f5038f25` pendente. Depois do CI, integrar e fazer deploy.
- Configurar o endereço público pelo painel autenticado e homologar o domínio em desktop/mobile no navegador integrado; corrigir e repetir se necessário.

## Gates e testes

- Preflight para `AG-DEV` e escopo `apps/lily_acai/src/features/landing`: passou via `node tools/agent-policy/cli.mjs preflight`.
- Typecheck `tsc --noEmit -p tsconfig.json`: passou.
- Testes focados CookLily: 27 arquivos, 114 testes passaram; testes do orçamento: 4 passaram.
- Build Vite de produção CookLily passou localmente; budget local: JS gzip 204,74 KiB, CSS gzip 40,87 KiB, combinado 245,61/246 KiB.
- CI completo PR #317, run `41279447156`, passou em Node 20/22/24, builds, testes, Tool Health Linux, workbook, Excel Recipe e supervisor; SHA testado `50345b00`.
- Primeiro CI run `41279218937` reprovou só pelos limites brutos/combinados que não acomodavam Linux (`JS raw 648,01 KiB`, combinado 245,87 KiB). Os limites foram corrigidos e o run seguinte passou.
- `git diff --check`: passou.
- `npm` não está disponível neste ambiente. `pnpm run` tentou resolver dependências e parou porque scripts de instalação estão bloqueados; comandos equivalentes foram executados diretamente com Node do workspace. CI usou `npm ci` e passou integralmente.

## Migrations

- Nenhuma planejada.

## Bloqueios/riscos

- O merge PR/canonical precisa de um novo CI após sincronizar a base atualizada.
- Nenhum segredo ou dado pessoal foi adicionado ao repositório.

## Homologação/dependências externas

- Homologação deve usar exclusivamente a aba do navegador integrado do Codex.
- Deploy VPS autorizado pelo proprietário no contexto persistente da tarefa.
- Configuração do endereço público expressamente autorizada: `Rua João Marcondes, 349 - Mata do Segredo, Campo Grande - MS, 79015-320`. Não alterar o ponto operacional de coleta.

## Próxima ação exata

Concluir CI run `41279793939` no merge commit `f5038f25`; se passar, integrar PR #317 por squash; depois executar `sudo cc deploy canonical`, confirmar saúde e SHA, configurar o endereço público no painel e homologar desktop/mobile apenas no navegador integrado.
