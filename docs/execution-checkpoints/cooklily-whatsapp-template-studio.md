# CookLily WhatsApp Template Studio

- status: in_progress
- owner: AG-DEV
- branch: feat/cooklily-whatsapp-template-studio
- base_branch: cooklily/canonical
- base_sha_verified: 5e11ded59e1781b13ae209e5360102e1d791d0a5
- head_sha_verified: 5e11ded59e1781b13ae209e5360102e1d791d0a5
- pull_requests: nenhum
- last_verified_at: 2026-10-29 America/Sao_Paulo
- interruption_state: none

## Objetivo

Criar no painel administrativo da CookLily um estúdio intuitivo para todos os tipos de templates da Meta WhatsApp Business, com edição de componentes, prévia, simulação local de conversa e exportação para cadastro manual no WhatsApp Manager. Integrar à branch canonical, publicar na VPS e homologar o domínio real em desktop e mobile exclusivamente pelo navegador integrado do Codex, iterando até aceite.

## Concluído e persistido

- Branch de trabalho criada a partir de `origin/cooklily/canonical` em `5e11ded59e1781b13ae209e5360102e1d791d0a5`.
- `npm run policy:preflight -- --agent AG-DEV --scope apps/admin` executado; passou e carregou as políticas de `apps/` e da região Lily.
- Checkpoint anterior `cooklily-surveys-and-canonical-integration.md` preservado; uma stash de segurança mantém a cópia anterior não rastreada.

## Em andamento

- Mapear o atual CRUD de templates e o contrato existente na canonical.
- Instalar dependências para iniciar a API da Central e registrar/assumir execução.

## Gates e testes

- Policy preflight: PASSOU (scope reportado `apps`).
- Central `/api/v1/bootstrap`: indisponível em portas 3000, 4000, 4100 e 4173.
- `npm run dev`: falhou antes de iniciar, `tsx` ausente.
- `npm test`, `npm run check`, `npm run build`: pendentes.
- CI/CodeQL/PR: pendentes.

## Migrations

- Nenhuma migration criada.

## Bloqueios/riscos

- API da Central não iniciou por ausência das dependências Node (`tsx`); verificar recuperação com `npm ci`.
- Deploy e homologação ainda dependem de conta/sessão acessível no navegador integrado e da saúde dos gates da VPS.

## Homologação/dependências externas

- Deploy autorizado pelo proprietário; seguir `sudo cc deploy canonical` depois do merge e CI.
- Homologação somente no navegador integrado do Codex, desktop e viewport mobile; guardar evidências e registrar cada iteração.

## Próxima ação exata

Executar `npm ci`; iniciar a API local e consultar bootstrap/task/dependencies; então implementar em branch isolada sem misturar com o checkpoint de pesquisas.
