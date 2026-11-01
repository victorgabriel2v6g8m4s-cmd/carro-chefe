# Refresh da landing e da jornada CookLily

- status: `in_progress`
- owner: `AG-DEV`
- branch: `codex/cooklily-landing-refresh-checkpoint` (registro; implementação integrada)
- base_branch: `cooklily/canonical`
- base_sha_verified: `0689a3cedd64663ac8e563623e0188dee0f61796`
- head_sha_verified: `d233927ef8e6449cf4b55f70f71f867d9e04f86c`
- pull_requests: [#315](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/315) merged para `cooklily/canonical`, CI `41276513343` success; [#316](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/316) merged (checkpoint); [#317](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/317) aberto para ajuste tipográfico, CI `41277233761` em andamento
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
- Roadmap recebeu o escopo aprovado desta atualização e seus dois bugs de homologação.

## Em andamento

- Deploy de `cooklily/canonical` após integração do PR #317 pendente.
- Registrar o endereço público autorizado e homologar domínio em desktop/mobile no navegador integrado; corrigir e repetir se necessário.

## Gates e testes

- Preflight de política executado para `AG-DEV`, escopo `apps/lily_acai/src/features/landing`; passou.
- `npm test`: 87 arquivos, 448 passaram e 3 foram ignorados.
- CI do PR #315: run `41276513343` success (Node 20/22/24, checks, workbook e supervisor).
- `npm run check`: passou.
- `npm run build`: passou; budget CookLily: JS gzip 203,91/204 KiB; JS+CSS gzip 244,75/245 KiB.
- `git diff --check`: passou.
- PR #315 e PR #316 integrados. PR #317 e seu CI estão em andamento; deploy e homologação desktop/mobile pendentes.

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
