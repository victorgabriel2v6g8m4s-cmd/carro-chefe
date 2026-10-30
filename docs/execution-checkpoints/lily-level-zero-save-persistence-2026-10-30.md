# Persistência do nível inicial sem pontos

- status: candidate
- owner: AG-DEV
- branch: codex/lily-level-zero-save-persistence
- base_branch: cooklily/canonical
- base_sha_verified: 8cd055da2a18255c451af3dc9497f2a75ef62c05
- head_sha_verified: 8cd055da2a18255c451af3dc9497f2a75ef62c05 (mudanças locais ainda não commitadas)
- pull_requests: pending
- last_verified_at: 2026-10-30
- interruption_state: none

## Entrega

Permitir inserir “Sem Nível” com 0 pontos no início de uma curva já configurada, preservando IDs e todos os níveis existentes. A causa confirmada foi conflito de chave primária na API ao inserir a nova última posição durante a reordenação.

## Concluído e persistido

- Inspeção no navegador integrado após recarregar `/lilyacai/painel/fidelidade`: a tela volta à curva salva sem o rascunho “Sem Nível”; os limiares existentes estão distintos, portanto não era empate.
- Implementação local: deslocar temporariamente ordens existentes, atualizar por ID estável, criar só novos IDs, excluir IDs removidos e comparar bônus por ID/limiar.
- Adicionado teste HTTP que coloca um nível de 0 no início de uma curva existente e verifica IDs e contagem preservados; teste também valida o endpoint original de limiar 0.
- Nenhuma mudança de dados em produção realizada nesta execução.

## Em andamento

- Código e teste commitados em branch de entrega após aprovação dos gates; abrir PR, aguardar CI, integrar e implantar.
- Depois do deploy, concluir homologação integrada desktop/mobile e reproduzir o salvamento de “Sem Nível” em produção, preservando a sessão do proprietário.

## Gates e testes

- `npm run test:lily-ui`: passou, 24 arquivos e 105 testes.
- Teste API `apps/api/src/modules/lily/loyalty.test.ts`: passou, 7 testes.
- `npm run check`: passou.
- `npm run build`: passou, budget CookLily 215.65 KiB gzip combinado / 220 KiB; CSS 33.98 / 34.00 KiB.
- `git diff --check`: passou.
- CI, deploy e teste visual pós-deploy: pending.

## Migrations

- Nenhuma.

## Bloqueios/riscos

- A integração no navegador de produção deve adicionar o nível pretendido uma única vez e confirmar que o sucesso permanece após recarga; evitar salvar alterações não solicitadas nos demais campos.

## Homologação/dependências externas

- Tab IAB ativo em `https://carrochefe.com/lilyacai/painel/fidelidade`, autenticado como admin. Usar apenas navegador integrado; não mexer em Chrome/Edge externos.
- VPS autorizada: `root@2.25.182.185`, porta 22, chave `C:\Users\valdi\.ssh\hostinger_cooklily_ed25519`.
- Deploy apenas do SHA completo integrado na `cooklily/canonical`.

## Próxima ação exata

Commitar o código/testes/checkpoint, abrir PR para a canonical, verificar todos os checks, fazer merge/deploy e homologar no IAB.
