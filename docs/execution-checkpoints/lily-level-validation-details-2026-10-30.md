# Diagnóstico detalhado ao salvar níveis CookLily

- status: causa-raiz confirmada; correção implementada localmente; integração, deploy e reteste pendentes.
- owner: AG-DEV.
- implementation_branch: `codex/lily-level-validation-evidence`.
- base_branch: `cooklily/canonical`.
- base_sha_verified: `7d95339f6e4eb12f42234b12bbff0341ac126227`.
- head_sha_verified: `cf12526ce2c77abc99ae394bed0193da59b47d36` (correção implementada e enviada à PR; checkpoint ainda pendente de nova revisão após este registro).
- canonical_deploy_sha: `f974ad26d9db9f1435e3c21e7c102dcf6bb04b55` (build anterior, contém o diagnóstico mas ainda permite timestamps no payload).
- pull_requests: PR #270, squash merge concluído; PR #271 aberto para evidências e correção da causa-raiz.
- migrations: nenhuma.
- deploy: concluído em 2026-10-30; evidence `/srv/carro-chefe/data/deploy-logs/deploy-20261030-055243-f974ad26d9db.evidence`; log `/srv/carro-chefe/data/deploy-logs/deploy-20261030-055243-f974ad26d9db.log`.
- última verificação: 2026-10-30, America/Sao_Paulo.

## Entrega

- O salvamento de níveis preserva detalhes de validação do backend e exibe o caminho do campo e a regra que falhou, sem ecoar valores enviados. Limita a exibição a cinco itens e mantém erros sem estrutura no texto original.
- Causa-raiz confirmada no navegador integrado: o GET administrativo retornava `createdAt` e `updatedAt` por espalhar a linha completa do Prisma; o frontend reenviava essas chaves ao salvar. O schema estrito rejeitava os metadados em cada nível, mesmo sem edição do administrador.
- Correção local: o frontend monta DTO com allowlist de campos editáveis e a consulta GET do backend seleciona apenas os campos do contrato da tela, removendo timestamps da resposta.
- O SVG `cooklily-level-badge-upload (3).svg` foi validado com `sanitizeLilySvg`: 465.241 bytes, aceito, sem filtros/metadados bloqueantes.

## Gates

- Preflight AG-DEV para `apps/lily_acai/src/features/admin`: PASS.
- Testes da interface Lily: 23 arquivos / 100 testes PASS, incluindo `loyalty-level-payload.test.ts` para garantir que metadados e URL de exibição não entrem no payload de gravação.
- `npm run check`: PASS.
- `npm run build`: PASS; orçamento CookLily 214,99 KiB gzip combinado / 220 KiB.
- `git diff --check`: PASS.
- CI run `41010555997`: concluído com sucesso; todos os jobs verdes.
- Deploy canônico: migrations existentes confirmadas, 77 arquivos/407 testes PASS, build PASS (215,14 KiB gzip combinado), tool health PASS, Nginx syntax PASS, health e external smoke PASS.

## Homologação e riscos

- A aba autenticada do Codex IAB foi lida com sucesso e exibiu os 21 erros `createdAt`/`updatedAt`, confirmando a causa sem reenviar o PUT. Falta homologar o salvamento após a correção implantada.
- Nenhum dado administrativo de produção foi alterado.

## Próxima ação exata

1. Fazer commit e push da correção, aguardar CI e integrar PR #271 em `cooklily/canonical`.
2. Implantar o SHA canônico verificado e confirmar health checks.
3. Recarregar `/lilyacai/painel/fidelidade` na aba autenticada do Codex IAB, salvar níveis e verificar sucesso sem alteração de dados de nível; atualizar este checkpoint com o resultado.
