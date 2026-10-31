# Landing CookLily: identidade, conteúdo e personalização

- status: in_progress
- owner: AG-DEV
- branch: codex/cooklily-landing-identity
- base_branch: cooklily/canonical
- base_sha_verified: b0fa6b1d23836b29ba3bd54347abb2861d36c83e
- head_sha_verified: a50d235b8d1b35b8209638f843da448eadb8b6a7
- pull_requests: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/311 (draft, CI queued)
- last_verified_at: 2026-10-31
- interruption_state: none

## Objetivo

Transformar a landing da CookLily em uma experiência de marca configurável e orientada ao catálogo/comunidade: banner responsivo configurável, identidade textual editável com o editor/renderizador WhatsApp compartilhado, produto da semana ou carrossel, conteúdo editorial, Reels e localização opcionais e ranking progressivo com acesso à página completa. Dar caminho de login/cadastro a clientes existentes sem obrigá-los a fornecer WhatsApp para ver a página.

## Evidência local commitada

- Base canonical verificada no SHA indicado; PR #310 está integrado e deploy final anterior confirmou este SHA.
- Roadmap consultado: UI pública continua prioridade; o item 5 do roadmap marca landing/UI como aberto.
- Regras de marca CookLily consultadas em `docs/lily-acai/marca/KIT_DE_MARCA.md`.
- Commit `a50d235b` publicado na branch `codex/cooklily-landing-identity`: contrato Zod/DB, editor em `/painel/landing`, componentes públicos, ranking por offset e migration `20261031130000_lily_landing_page`.
- Migration aplicada com sucesso ao banco isolado `.runtime/lily-acai.db` da suíte local. API pública omite IDs internos de mídia e somente usa `publicAddressText` para o mapa.
- Testes focais: `landing-page.test.ts` e `profile.test.ts`, 13 aprovados.
- Comparação do build base sem alterações: budget passou em JS gzip 193.04/193.50 KiB, CSS gzip 35.38/36 KiB e combinado 228.42/229 KiB.
- Build Lily após a implementação passa com limites atualizados e restritos: JS 639.15/648 KiB raw e 202.68/204 KiB gzip; CSS 192.80/200 KiB raw e 39.44/41 KiB gzip; combinado 242.13/245 KiB. Em relação ao build base local, o JS gzip aumentou 9.64 KiB, o CSS gzip 4.06 KiB e o combinado 13.71 KiB; JS inicial gzip passou de 52.36 para 57.13 KiB e o maior chunk reduziu de 71.97 para 68.94 KiB. Limites de bundle foram elevados somente para comportar esses módulos; a comparação fica explícita.

## Em andamento

- PR draft #311 aberto contra `cooklily/canonical`; CI está queued.
- Build integral `npm run build`: passou.

## Gates e testes

- `policy:preflight` executado para frontend CookLily, API CookLily, banco CookLily, contratos e documentação.
- `npm run check`: passou após implementação.
- `npm run build`: passou; o budget atualizado passou no build CookLily.
- `npm test`: 85 arquivos, 444 testes passaram, 3 ignorados; inclui suíte focal da landing e ranking (13 testes entre os dois arquivos).
- `npm run policy:check` e `git diff --check`: passaram.
- CI do PR, merge, deploy e navegador: pendentes.

## Migrations

- Criada `20261031130000_lily_landing_page`, aplicada ao banco local isolado de teste; deploy/migrate production pendente.

## Bloqueios/riscos

- Nenhuma arte de banner fornecida ainda; o editor permitirá upload e mostrará fallback de marca até a arte ser configurada.
- Texto inicial usará apenas fatos e recursos existentes, sem prometer economia, promoção, prazo ou localização não verificados.

## Homologação/dependências externas

- Deploy canônico na VPS e homologação na aba do navegador integrado do Codex, em desktop e mobile, fazem parte do escopo autorizado.

## Próxima ação exata

- Aguardar e verificar CI do PR #311; corrigir falhas se houver. Com CI verde, fazer squash merge, implantar o canonical e homologar `/lilyacai/` e `/lilyacai/painel/landing` em desktop e celular no navegador integrado. Registrar falhas, corrigir, reimplantar e repetir.
