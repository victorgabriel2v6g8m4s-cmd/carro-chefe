# Adicionais reutilizáveis e regras por produto CookLily

- status: candidate
- owner: AG-DEV
- branch: feat/cooklily-product-addons
- base_branch: cooklily/canonical
- base_sha_verified: e1af3e21e07e3c39459f6fe34a5e536833e8150e
- head_sha_verified: af172de76cadf8855f7aebfa874dc3274bb511d8
- pull_requests: nenhum
- last_verified_at: 2026-10-23 America/Sao_Paulo
- interruption_state: none

## Concluído e persistido
- Reconciliado GitHub: branch existe e PR #173 está integrado na base.
- Lidas as regras globais, README de checkpoints e instruções locais API, Lily e banco.
- Preflight AG-DEV executado com sucesso para apps/Lily, API/Lily e banco dedicado; manifesto regenerado por requisito da policy.
- Branch de entrega criada a partir de `cooklily/canonical`.
- Schema e migration aditiva preparados com defaults compatíveis (mínimo 0, máximo 4), sem reescrever snapshots dos pedidos.
- Quote server-side aplica mínimo, máximo total, limite individual e override de preço já persistidos no vínculo produto-adicional.
- UI de produto mostra a mensagem explícita do mínimo e impede adicionar ao carrinho enquanto não for atendido; painel permite configurar mínimo/máximo e preço/limite por produto.
- Testes de regressão adicionados para mínimo, máximo total, limite por adicional, preço por produto e reutilização do mesmo adicional em dois produtos.
- Implementação, migration, testes e checkpoint commitados em `af172de76cadf8855f7aebfa874dc3274bb511d8`.

## Em andamento
- Rever UX de combo e executar gates locais, corrigindo falhas encontradas.

## Gates e testes
- `npm run policy:preflight ...`: passou.
- `npm test`: passou em 2026-10-23; 53 arquivos, 294 passaram e 3 foram ignorados.
- `npm run check`: passou em 2026-10-23 após os ajustes finais.
- `npm run build`: passou; todos os pacotes, incluindo Lily, foram compilados e o budget do bundle ficou dentro do limite.
- `npm run db:deploy:lily`: migration testada somente no banco local ignorado `.runtime/lily-acai.db`.
- CI/CodeQL: aguardando abertura do PR.
- CI/CodeQL: pendentes de PR.

## Migrations
- `20261023120000_lily_product_addon_limits`: SQL aditivo para duas colunas com defaults; sem execução em banco de produção.

## Bloqueios/riscos
- O build exibe aviso de chunk Lily acima de 500 kB antes de gzip; budgets de raw/gzip continuam aprovados.

## Homologação/dependências externas
- Sem deploy e sem acesso a VPS/produção; migrations apenas versionadas para aplicação pelo fluxo normal.

## Próxima ação exata
- Commitar as alterações validadas, enviar a branch e abrir PR para `cooklily/canonical`; aguardar CI/CodeQL verdes antes do squash merge.
