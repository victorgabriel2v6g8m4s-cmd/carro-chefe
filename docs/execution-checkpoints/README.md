# Checkpoints de execução

Este diretório registra o estado persistente de tarefas longas ou interrompíveis.

## Regra de retomada

Ao retomar uma execução:

1. localizar o checkpoint da tarefa;
2. consultar o estado autoritativo do Git/GitHub;
3. comparar branch, base, HEAD, commits, arquivos, migrations, PRs e gates;
4. corrigir o checkpoint se ele estiver desatualizado;
5. repetir somente passos cujo efeito persistente não esteja comprovado;
6. continuar pela **próxima ação exata** registrada.

A última mensagem do chat nunca substitui essa verificação.

## Publicação emergencial de um checkpoint CookLily

O script envia somente o arquivo solicitado para `cooklily/canonical`, em um worktree temporário isolado. Exemplo para esta entrega:

```powershell
pwsh -File tools/recovery/push-cooklily-checkpoint.ps1 -Checkpoint docs/execution-checkpoints/cooklily-survey-admin-ux-2026-10-25.md
```

O caminho precisa estar dentro de `docs/execution-checkpoints/`; o script confere que o commit contém exclusivamente esse arquivo e rebaseia se a canonical avançar durante a tentativa.

## Quando atualizar

Atualize após cada marco durável:
- commit relevante;
- alteração de schema/migration;
- abertura ou mudança de PR;
- testes locais relevantes;
- CI/CodeQL/gates;
- merge;
- deploy/homologação;
- bloqueio novo;
- antes de operações longas sujeitas a timeout.

## Campos mínimos

```md
# <tarefa>

- status:
- owner:
- branch:
- base_branch:
- base_sha_verified:
- head_sha_verified:
- pull_requests:
- last_verified_at:
- interruption_state:

## Concluído e persistido
...

## Em andamento
...

## Gates e testes
...

## Migrations
...

## Bloqueios/riscos
...

## Homologação/dependências externas
...

## Próxima ação exata
...
```

## Estados recomendados

- `planned`
- `in_progress`
- `interrupted/unknown`
- `candidate`
- `validated`
- `merged`
- `completed`
- `blocked`

Nunca marque como concluído algo que não esteja comprovadamente persistido.
