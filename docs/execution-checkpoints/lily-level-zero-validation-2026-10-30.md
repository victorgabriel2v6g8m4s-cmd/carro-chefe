# Validação do nível inicial sem pontos

- status: in_progress
- owner: AG-DEV
- branch: codex/lily-level-zero-validation
- base_branch: cooklily/canonical
- base_sha_verified: bf841d39982b3ad0cb048ceaa97ce3eebf1603d5
- head_sha_verified: bf841d39982b3ad0cb048ceaa97ce3eebf1603d5 (mudanças locais ainda não commitadas)
- pull_requests: pending
- last_verified_at: 2026-10-30
- interruption_state: none

## Entrega

Corrigir a explicação e validação ao salvar níveis com limiar 0. O primeiro nível pode ser “Sem Nível” com 0; limiares duplicados ou decrescentes devem ser apontados antes do envio e a API deve responder com nomes dos níveis envolvidos.

## Concluído e persistido

- Diagnóstico: regra de negócio requer limites estritamente crescentes; empate entre “Sem Nível” e “Bronze I” retorna 400.
- Implementação local da validação reutilizável na UI e mensagem específica na API.
- Corrigida comparação de alterações de LilyCoins para preservar IDs estáveis quando níveis são reordenados.

## Em andamento

- Testes locais e gates passando; preparar PR, CI, merge e deploy.

## Gates e testes

- `npm run test:lily-ui`: 24 arquivos, 105 testes passaram.
- `npm run check`: passou.
- `npm run build:lily`: passou, 215.65 KiB combinado / 220 KiB, CSS gzip 33.98 / 34.00 KiB.
- Teste HTTP de gravação de níveis na API: pending.
- CI e deploy: pending.

## Migrations

- Nenhuma.

## Bloqueios/riscos

- Nenhum bloqueio conhecido.

## Homologação/dependências externas

- Requer homologação visual na URL CookLily; preferir navegador integrado do Codex se disponível.
- Deploy VPS autorizado pelo usuário previamente; usar o SHA integrado completo.

## Próxima ação exata

Adicionar teste de integração HTTP para POST/PUT de níveis com nível inicial 0 e validações de limiar, rodar gates completos, abrir PR e acompanhar CI.
