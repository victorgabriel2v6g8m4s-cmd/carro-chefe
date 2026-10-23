# Adicionais reutilizáveis e regras por produto CookLily

- status: merged
- owner: AG-DEV
- branch: feat/cooklily-product-addons
- base_branch: cooklily/canonical
- base_sha_verified: e1af3e21e07e3c39459f6fe34a5e536833e8150e
- head_sha_verified: ddc236d8a52f5229bea6c8bbcce69b33ecb1eb07
- merge_commit: 124454dc4b30812bd06b9b77018f25e04f4c15f5
- pull_requests: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/174 (merged)
- last_verified_at: 2026-10-23 America/Sao_Paulo
- interruption_state: none

## Concluído e persistido
- Reconciliado GitHub: PR #173 já estava integrado; entrega #174 foi criada a partir de `cooklily/canonical` e integrada por squash.
- Lidas as regras globais, README de checkpoints e instruções locais API, Lily e banco.
- Preflight AG-DEV executado com sucesso para apps/Lily, API/Lily e banco dedicado; manifesto regenerado por requisito da policy.
- Schema e migration aditiva preparados com defaults compatíveis (mínimo 0, máximo 4), sem reescrever snapshots dos pedidos.
- Quote server-side aplica mínimo, máximo total, limite individual e override de preço já persistidos no vínculo produto-adicional.
- UI de produto mostra a mensagem explícita do mínimo e impede adicionar ao carrinho enquanto não for atendido; painel permite configurar mínimo/máximo e preço/limite por produto.
- Testes de regressão adicionados para mínimo, máximo total, limite por adicional, preço por produto e reutilização do mesmo adicional em dois produtos.
- Implementação entregue no PR #174; merge squash confirmado em `124454dc4b30812bd06b9b77018f25e04f4c15f5`.

## Revisão e gates
- `npm run policy:preflight ...`: passou.
- `npm test`: passou; 53 arquivos, 294 passaram e 3 foram ignorados.
- `npm run check`: passou.
- `npm run build`: passou; budgets do bundle aprovados (aviso de chunk Lily acima de 500 kB antes de gzip).
- `policy:check`: passou após normalização LF/CRLF, com hash canônico `10f90a07329472f6b8a451d6e7b825fbfb264eb78450a3e9f87bf3a489aa7dec`.
- CI PR #174, execução 40029231216, SHA `ddc236d8a52f5229bea6c8bbcce69b33ecb1eb07`: todos os 7 jobs passaram (Quality Node 20/24, Tool Health Linux, Excel Recipe Ubuntu/Windows, Workbook Snapshot e Windows Supervisor).
- CodeQL não está configurado para PRs contra `cooklily/canonical` no workflow atual.
- `npm run db:deploy:lily`: migration testada somente no banco local ignorado `.runtime/lily-acai.db`.

## Migrations
- `20261023120000_lily_product_addon_limits`: SQL aditivo para duas colunas com defaults; sem execução em banco de produção.

## Homologação/dependências externas
- Sem deploy e sem acesso a VPS/produção; migrations apenas versionadas para aplicação pelo fluxo normal.

## Próxima ação exata
- O proprietário pode executar `sudo cc deploy canonical` quando desejar.
