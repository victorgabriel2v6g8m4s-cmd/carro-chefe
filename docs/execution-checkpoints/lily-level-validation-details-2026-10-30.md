# Diagnóstico ao salvar níveis CookLily

- status: completed.
- owner: AG-DEV.
- implementation_branch: `codex/lily-level-save-homologation`.
- base_branch: `cooklily/canonical`.
- base_sha_verified: `29068464bb6327a030417bf1d74a10c0a601ee1e`.
- head_sha_verified: `29068464bb6327a030417bf1d74a10c0a601ee1e` (base desta atualização do checkpoint).
- canonical_deploy_sha: `29068464bb6327a030417bf1d74a10c0a601ee1e`.
- pull_requests: PR #270 e PR #271 integradas por squash.
- migrations: nenhuma pendente; deploy confirmou as 39 migrations Lily aplicadas.
- deploy: concluído em 2026-10-30; evidence `/srv/carro-chefe/data/deploy-logs/deploy-20261030-061410-29068464bb63.evidence`; log `/srv/carro-chefe/data/deploy-logs/deploy-20261030-061410-29068464bb63.log`.
- última verificação: 2026-10-30, America/Sao_Paulo.

## Causa e correção

- O `GET /api/v1/lily/admin/loyalty` espalhava a linha Prisma no DTO e incluía `createdAt` e `updatedAt`. A tela reenviava esses metadados no `PUT`; o schema estrito rejeitava ambos para cada nível, embora o administrador não os tivesse editado.
- O backend agora seleciona somente os campos permitidos da curva. O frontend serializa uma allowlist dos campos editáveis e omite metadados e `iconUrl`.
- O tratamento de erro introduzido na PR #270 mantém os detalhes de validação visíveis no painel.

## Gates

- Testes Lily UI: 23 arquivos / 100 testes PASS, incluindo regressão para o DTO de salvamento.
- `npm run check`: PASS.
- `npm run build`: PASS; orçamento local CookLily 214,99 KiB gzip combinado / 220 KiB.
- `git diff --check`: PASS.
- CI PR #271, run `41012499965`: todos os jobs PASS.
- Deploy canônico `29068464bb6327a030417bf1d74a10c0a601ee1e`: 78 arquivos de teste PASS, build PASS (215,17 KiB gzip combinado), Tool Health PASS, Nginx syntax PASS, readiness e external smoke PASS.

## Homologação

- Na aba autenticada do Codex IAB, o estado anterior mostrava 21 erros de validação, um por nível; cada erro apontava as duas chaves extras (`createdAt` e `updatedAt`), 42 campos indevidos no total.
- Após o deploy, a página `/lilyacai/painel/fidelidade` carregou sem erro. Salvar sem editar campos mostrou “Níveis salvos na versão 10” e “Alteração salva com sucesso.”
- Os valores dos 21 níveis permaneceram iguais. A curva foi republicada como versão 10 pelo próprio salvamento de verificação; nenhuma LilyCoin foi reemitida por haver valores inalterados.
- Captura visual do Codex IAB mostrou a tela em viewport estreito (~403 px). Não foi feita uma verificação separada em viewport desktop, pois a correção afeta o contrato de dados e o salvamento; o layout desktop da mensagem não foi homologado nesta execução.
- Nenhum navegador externo foi usado.

## Próxima ação exata

1. Integrar esta atualização documental do checkpoint para registrar no Git o resultado do deploy e da homologação.
