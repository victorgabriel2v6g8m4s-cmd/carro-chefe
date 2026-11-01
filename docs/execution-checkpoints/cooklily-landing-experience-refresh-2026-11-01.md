# Refresh da landing e da jornada CookLily

- status: `in_progress`
- owner: `AG-DEV`
- branch: `codex/cooklily-landing-experience-refresh`
- base_branch: `cooklily/canonical`
- base_sha_verified: `0689a3cedd64663ac8e563623e0188dee0f61796`
- head_sha_verified: `63aa5b89` (commit local; checkpoint atualizado após persistência)
- pull_requests: nenhum
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
- Roadmap recebeu o escopo aprovado desta atualização e seus dois bugs de homologação.

## Em andamento

- Abrir e revisar PR para integração com a `cooklily/canonical`.
- Registrar endereço público autorizado pelo usuário, homologar domínio no navegador integrado e corrigir defeitos.

## Gates e testes

- Preflight de política executado para `AG-DEV`, escopo `apps/lily_acai/src/features/landing`; passou.
- `npm test`: 86 arquivos, 446 passaram e 3 foram ignorados (executado antes das últimas alterações visuais; testes dirigidos executados depois).
- Vitest focado (API de perfil, header visitante, recorte, estrutura/UX): 4 arquivos, 49 testes passaram.
- `npm run check`: passou.
- `npm run build`: passou; budget CookLily: JS gzip 203,87/204 KiB; JS+CSS gzip 244,45/245 KiB.
- `git diff --check`: passou.
- Merge, CI, deploy e homologação desktop/mobile pendentes.

## Migrations

- Nenhuma planejada.

## Bloqueios/riscos

- `npm` global não foi encontrado no PowerShell no último levantamento; o runtime Node empacotado pelo Codex tem ABI incompatível com o binário local `better-sqlite3`. Verificar runtime Node LTS disponível e escolher os gates locais suportados sem reinstalar dependências desnecessariamente.

## Homologação/dependências externas

- Homologação deve usar exclusivamente a aba do navegador integrado do Codex.
- Deploy VPS autorizado pelo proprietário no contexto persistente da tarefa.
- Configuração do endereço público expressamente autorizada; texto confirmado: `Rua João Marcondes, 349 - Mata do Segredo, Campo Grande - MS, 79015-320`.

## Próxima ação exata

Commit `63aa5b89` persistido localmente; criar PR draft para `cooklily/canonical`, registrar CI e seguir merge, deploy VPS e homologação no browser Codex integrado.
