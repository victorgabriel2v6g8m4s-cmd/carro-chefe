# Editor, simulador e jornada completa de pedidos no WhatsApp CookLily

- status: completed
- owner: AG-DEV
- branch: codex/cooklily-whatsapp-variable-formatting-checkpoint
- base_branch: cooklily/canonical
- base_sha_verified: b0ca836318c1efc62882d1cf44a565611e2e8881
- head_sha_verified: 0cf2d359f9abd020c7c068e87b9c89f8903870ea
- pull_requests: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/254 (merged); https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/255 (merged)
- last_verified_at: 2026-10-29 16:15 America/Sao_Paulo
- interruption_state: none

## Concluído e persistido

- PR #254 integrou a correção de formatação de variáveis no editor e no balão; merge SHA `b0ca836318c1efc62882d1cf44a565611e2e8881`.
- PR #255 integrou gatilhos da jornada do pedido e controles locais para simular cardápio aberto, pedido criado e alterado, acompanhamento aberto, em preparo, pronto, saiu para entrega e entregue; merge SHA `0cf2d359f9abd020c7c068e87b9c89f8903870ea`.
- Deploy do merge SHA `0cf2d359f9abd020c7c068e87b9c89f8903870ea` passou na VPS. Evidência: `/srv/carro-chefe/data/deploy-logs/deploy-20261029-183700-0cf2d359f9ab.evidence`; log: `/srv/carro-chefe/data/deploy-logs/deploy-20261029-183700-0cf2d359f9ab.log`.
- CI do PR #255 passou em Node 20/24, Excel Recipe Linux/Windows, Workbook Snapshot, Windows Supervisor e Tool Health (run `40931966910`, HEAD `5ca9a36038eb0a8c87cb9dbb97b3c324fe2b95f7`).
- Suíte completa no deploy: 73 arquivos / 382 testes passaram; build, tool-health, readiness e smoke externo passaram.
- QA no domínio real `https://carrochefe.com/lilyacai/painel/whatsapp` pelo navegador integrado Codex: desktop 1440×1000 e mobile 390×844.
- Jornada simulada nos dois tamanhos: cliente chega pelo WhatsApp, abre cardápio, faz pedido, modifica, acompanha, e recebe os eventos em preparo, pronto, saiu para entrega e entregue. A árvore configurada respondeu em cada gatilho e o orçamento simulou nove mensagens Utility (US$ 0.0612 / R$ 0.3288).
- Verificado no desktop que uma variável de template com negrito e itálico é renderizada dentro dos estilos no balão, sem delimitadores Markdown literais.
- Mobile: largura do documento 375 px em viewport 390 px; chat com rolagem interna. Conversa e rascunho de QA não foram salvos; controles de sessão foram limpos ao final.
- Nenhum envio real ao WhatsApp/Meta, navegação ao site ou pedido real foi efetuado.

## Em andamento

- Nenhum.

## Gates e testes

- `npm run check`: passed.
- `npm run test:lily-ui -- --run`: passed, 20 arquivos / 91 testes.
- `npm run build:lily`: passed; budget passou dentro dos limites ajustados.
- `npm test`: 73 arquivos / 382 testes passed na execução de deploy.
- Build geral, tool-health, health readiness e smoke externo: passed no deploy.
- CI PR #255: passed, run `40931966910`.
- QA manual Codex integrado: desktop e mobile passed para fluxo completo e renderização de variável formatada.

## Migrations

- Nenhuma migration necessária.

## Bloqueios/riscos

- Sem bloqueios conhecidos. Testes permaneceram totalmente locais no simulador; não validam envio/aprovação de template pela Meta.

## Homologação/dependências externas

- Hospedagem verificada na VPS e no domínio real após deploy do SHA canonical `0cf2d359f9abd020c7c068e87b9c89f8903870ea`.
- Aba integrada Codex 11 mantida aberta; viewport restaurado após QA.

## Próxima ação exata

- Nenhuma. Entrega concluída e homologada.
