# Refresh da landing e da jornada CookLily

- status: `in_progress`
- owner: `AG-DEV`
- branch: `codex/cooklily-landing-refresh-checkpoint` (registro; implementação integrada)
- base_branch: `cooklily/canonical`
- base_sha_verified: `0689a3cedd64663ac8e563623e0188dee0f61796`
- head_sha_verified: `530aacd140786b4d97786d81bfac6d9ebe757361`
- pull_requests: [#315](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/315) merged para `cooklily/canonical`; CI `41276513343` success
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
- Roadmap recebeu o escopo aprovado desta atualização e seus dois bugs de homologação.

## Em andamento

- Deploy de `530aacd140786b4d97786d81bfac6d9ebe757361` pendente.
- Registrar o endereço público autorizado e homologar domínio em desktop/mobile no navegador integrado; corrigir e repetir se necessário.

## Gates e testes

- Preflight de política executado para `AG-DEV`, escopo `apps/lily_acai/src/features/landing`; passou.
- `npm test`: 86 arquivos, 446 passaram e 3 foram ignorados; alterações finais verificadas com Vitest focado: 4 arquivos, 49 testes passaram.
- CI do PR #315: run `41276513343` success (Node 20/22/24, checks, workbook e supervisor).
- `npm run check`: passou.
- `npm run build`: passou; budget CookLily: JS gzip 203,87/204 KiB; JS+CSS gzip 244,45/245 KiB.
- `git diff --check`: passou.
- Merge e CI concluídos. Deploy e homologação desktop/mobile pendentes.

## Migrations

- Nenhuma planejada.

## Bloqueios/riscos

- Nenhum bloqueio local de runtime: Node LTS e npm encontrados em `C:\Program Files\nodejs`.

## Homologação/dependências externas

- Homologação deve usar exclusivamente a aba do navegador integrado do Codex.
- Deploy VPS autorizado pelo proprietário no contexto persistente da tarefa.
- Configuração do endereço público expressamente autorizada; texto confirmado: `Rua João Marcondes, 349 - Mata do Segredo, Campo Grande - MS, 79015-320`.

## Próxima ação exata

Executar `sudo cc deploy canonical` na VPS; confirmar SHA e saúde do serviço; configurar o endereço público pelo painel autenticado; homologar desktop/mobile exclusivamente no navegador integrado e atualizar este checkpoint com evidências.
