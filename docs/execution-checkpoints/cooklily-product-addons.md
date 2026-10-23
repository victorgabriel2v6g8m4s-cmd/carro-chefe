# Adicionais reutilizáveis e regras por produto CookLily

- status: validated
- owner: AG-DEV
- branch: feat/cooklily-product-addons
- base_branch: cooklily/canonical
- base_sha_verified: e1af3e21e07e3c39459f6fe34a5e536833e8150e
- head_sha_verified: c5d84cec7d1d663a5121299d1f12f114d1927803 (pré-correção do manifesto; novo commit pendente)
- pull_requests: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/174 (ready for review)
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
- `npm test`: passou após a correção do manifesto; 53 arquivos, 294 passaram e 3 foram ignorados.
- `npm run check`: passou após a correção do manifesto.
- `npm run build`: passou após a correção do manifesto; budgets do bundle aprovados.
- CI PR #174, execução 40028179103: jobs Excel, snapshot e Windows Supervisor passaram; Quality Node 20/24 falharam em `policy:check` antes dos demais gates porque hashes do manifesto variavam com finais de linha.
- Normalização LF/CRLF adicionada ao gerador e check do manifesto e ao verificador usado pelo worker; regressão dedicada passou.
- Manifesto regenerado com hash canônico `10f90a07329472f6b8a451d6e7b825fbfb264eb78450a3e9f87bf3a489aa7dec`.
- `policy:check` e preflight AG-DEV para `apps/api/src/workers` e `tools/agent-policy`: passaram.
- CI do novo SHA: pendente.
- `npm run db:deploy:lily`: migration testada somente no banco local ignorado `.runtime/lily-acai.db`.
- CI/CodeQL: pendente para o novo SHA; CodeQL não está configurado para PRs contra `cooklily/canonical` no workflow atual.

## Migrations
- `20261023120000_lily_product_addon_limits`: SQL aditivo para duas colunas com defaults; sem execução em banco de produção.

## Bloqueios/riscos
- O build exibe aviso de chunk Lily acima de 500 kB antes de gzip; budgets de raw/gzip continuam aprovados.

## Homologação/dependências externas
- Sem deploy e sem acesso a VPS/produção; migrations apenas versionadas para aplicação pelo fluxo normal.

## Próxima ação exata
- Commitar e enviar a correção do manifesto, atualizar o checkpoint com o novo SHA e confirmar CI antes de integrar o PR.
