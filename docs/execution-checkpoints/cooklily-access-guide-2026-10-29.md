# Guia de acessos CookLily

- status: in_progress
- owner: AG-DEV
- branch: docs/cooklily-access-guide
- base_branch: cooklily/canonical
- base_sha_verified: 8824db709c962a6005ef28d10da059f7172ad893
- head_sha_verified: working tree
- pull_requests: none
- last_verified_at: 2026-10-29 America/Sao_Paulo
- interruption_state: none

## Concluído e persistido

- Nenhuma mudança commitada ainda.
- Confirmados scripts existentes `tools/lily-agent-auth.mjs`, `deploy/scripts/lily-agent-key`, `deploy/scripts/lily-promote-user` e controle de conta de teste em Painel → Equipe.
- Preflight AG-DEV para `apps/lily_acai` passou na branch de trabalho original.

## Em andamento

- Guia seguro de acesso VPS, painel, contas de teste, papéis e identidades LLM/agente.
- Inclusão dos links na documentação inicial da raiz e da CookLily.
- Replicação da documentação em `main` após validar na canonical.

## Gates e testes

- Pendentes: validar links, auditoria de segredos, `policy:preflight` de documentação e diffs nas duas branches.
- Sem alterações em código ou schema previstas; não foram identificadas variáveis ausentes para esses fluxos.

## Migrations

- Nenhuma.

## Bloqueios/riscos

- Os fluxos existentes requerem deploy que contenha scripts e migrações correspondentes; o guia não publica nem altera VPS.
- Não inserir host/IP, usuários, chaves, senhas ou dados pessoais reais no documento.

## Homologação/dependências externas

- Não aplicável; tarefa documental. Verificar README e links por branch.

## Próxima ação exata

Validar o conteúdo e links; executar preflight; commit na branch de documentação; aplicar o mesmo conjunto documental na branch `main` e publicar as alterações autorizadas.
