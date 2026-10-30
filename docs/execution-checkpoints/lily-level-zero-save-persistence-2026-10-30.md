# Persistência do nível inicial sem pontos

- status: completed
- owner: AG-DEV
- branch: codex/lily-level-zero-save-persistence
- base_branch: cooklily/canonical
- base_sha_verified: 8cd055da2a18255c451af3dc9497f2a75ef62c05
- head_sha_verified: b0608fc07e12b5a838148f06e044ed4d5fc1c02d
- deployed_sha: b0608fc07e12b5a838148f06e044ed4d5fc1c02d
- pull_requests: [#276](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/276), merged
- last_verified_at: 2026-10-30 14:06 UTC
- interruption_state: none

## Entrega

Permitir inserir “Sem Nível” com 0 pontos no início de uma curva já configurada, preservando IDs e todos os níveis existentes. A causa confirmada foi conflito de chave primária na API ao inserir a nova última posição durante a reordenação.

## Concluído e persistido

- Inspeção no navegador integrado após recarregar `/lilyacai/painel/fidelidade`: a tela volta à curva salva sem o rascunho “Sem Nível”; os limiares existentes estão distintos, portanto não era empate.
- Implementação local: deslocar temporariamente ordens existentes, atualizar por ID estável, criar só novos IDs, excluir IDs removidos e comparar bônus por ID/limiar.
- Adicionado teste HTTP que coloca um nível de 0 no início de uma curva existente e verifica IDs e contagem preservados; teste também valida o endpoint original de limiar 0.
- PR #276 passou todos os checks do CI e foi integrada por squash na `cooklily/canonical` como `b0608fc07e12b5a838148f06e044ed4d5fc1c02d`.
- Deploy da VPS concluído em 30/10/2026, modo incremental; release `b0608fc07e12b5a838148f06e044ed4d5fc1c02d`, log `/srv/carro-chefe/data/deploy-logs/deploy-20261030-140333-b0608fc07e12.log`, evidence `/srv/carro-chefe/data/deploy-logs/deploy-20261030-140333-b0608fc07e12.evidence`.
- Validação do deploy: migrations preflight, `npm run check`, suite completa de testes, build e smoke externo passaram; budget CookLily JS+CSS gzip 215.84/220 KiB.
- Homologação no navegador integrado em viewport móvel: adicionou-se `Sem Nível` com 0 pontos, salvou como versão 15, recarregou a página e confirmou-se o nível em primeiro lugar com 0 pontos, seguido pelos 21 níveis preexistentes sem perda de IDs/nomes/pontos.
- Nenhuma migration de produto foi adicionada pela correção; o deploy aplicou somente migrations já existentes do SHA aprovado.

## Em andamento

- Implementação, teste, integração, deploy e homologação móvel concluídos.

## Gates e testes

- `npm run test:lily-ui`: passou, 24 arquivos e 105 testes.
- Teste API `apps/api/src/modules/lily/loyalty.test.ts`: passou, 7 testes.
- `npm run check`: passou.
- `npm run build`: passou, budget CookLily 215.65 KiB gzip combinado / 220 KiB; CSS 33.98 / 34.00 KiB.
- `git diff --check`: passou.
- CI PR #276: todos verdes (Node 20, Node 24, Tool Health Linux, Excel Recipe Linux/Windows, Windows Supervisor, Workbook Snapshot).
- Deploy SHA `b0608fc07e12b5a838148f06e044ed4d5fc1c02d`: concluído; validação completa e smoke externo passaram.
- Navegador integrado CookLily `/lilyacai/painel/fidelidade`: salvamento v15 e persistência após reload confirmados em viewport móvel. A viewport desktop não foi testada nesta execução.

## Migrations

- Nenhuma.

## Bloqueios/riscos

- A integração no navegador de produção deve adicionar o nível pretendido uma única vez e confirmar que o sucesso permanece após recarga; evitar salvar alterações não solicitadas nos demais campos.

## Homologação/dependências externas

- Tab IAB ativo em `https://carrochefe.com/lilyacai/painel/fidelidade`, autenticado como admin. Usar apenas navegador integrado; não mexer em Chrome/Edge externos.
- VPS autorizada: `root@2.25.182.185`, porta 22, chave `C:\Users\valdi\.ssh\hostinger_cooklily_ed25519`.
- Deploy apenas do SHA completo integrado na `cooklily/canonical`.

## Próxima ação exata

Nenhuma. Entrega concluída. Checkpoint precisa ser publicado na canonical pelo procedimento documental `tools/recovery/push-cooklily-checkpoint.ps1`.
