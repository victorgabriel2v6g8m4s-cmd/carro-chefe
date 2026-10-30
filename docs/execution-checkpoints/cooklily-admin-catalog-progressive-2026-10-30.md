# CookLily: editor progressivo do catálogo administrativo

- status: blocked
- owner: AG-DEV
- branch: `codex/cooklily-admin-catalog-homologation`
- base_branch: `cooklily/canonical`
- base_sha_verified: `7d6fa3d36b8b74f6dc0529b5279d407d7aadb3dd`
- head_sha_verified: `7d6fa3d36b8b74f6dc0529b5279d407d7aadb3dd` (antes deste checkpoint)
- pull_requests: PR #284 merged (`cc61c25d99ae48b8d38d42265ef65db5489f0e88`); PR #285 merged (`7d6fa3d36b8b74f6dc0529b5279d407d7aadb3dd`)
- last_verified_at: 2026-10-30 16:52 America/Sao_Paulo
- interruption_state: visual homologation blocked; integrated browser API failed before tab control

## Entrega

Implementar o próximo item do roadmap CookLily sem dependência das configurações Meta/OpenAI: lista resumida de produtos no painel e editor modal que carrega os detalhes apenas quando um produto é aberto.

## Concluído e persistido

- A lista administrativa usa cards alinhados ao padrão visual do catálogo público.
- O editor abre em modal e busca dados completos somente para o produto selecionado; mantém carregamento, erro e retry.
- O índice resumido não carrega sabores, adicionais ou mídias completas.
- Roadmap atualizado em PR #284 para marcar a edição progressiva como concluída.
- PR #284 integrado na canonical em `cc61c25d99ae48b8d38d42265ef65db5489f0e88`.
- PR #285 corrigiu o limite de bundle observado no primeiro deploy e integrou em `7d6fa3d36b8b74f6dc0529b5279d407d7aadb3dd`.
- Deploy completo na VPS concluído em 2026-10-30; release `20261030-194345`, SHA `7d6fa3d36b8b74f6dc0529b5279d407d7aadb3dd`.
- Logs: `/srv/carro-chefe/data/deploy-logs/deploy-20261030-194345-7d6fa3d36b8b.log`; evidência: `/srv/carro-chefe/data/deploy-logs/deploy-20261030-194345-7d6fa3d36b8b.evidence`.
- Build Linux aprovado: JS gzip 188.98/189 KiB; JS inicial 51.89/110 KiB; JS+CSS gzip 224.33/225 KiB; CSS bruto 178.99/179 KiB.
- Migrações sem pendências: core 12 e Lily 40. Nenhuma migration nova necessária.

## Em andamento

- Homologação visual no domínio real, em desktop e mobile, permanece pendente porque a ferramenta do navegador integrado não conseguiu controlar a aba.
- Nenhum produto foi editado ou salvo durante esta execução.

## Gates e testes

- Preflight AG-DEV passou; hash `24d8c85aea46ed391826fb0e89daad9df54cce974cadfd30f1bc6008f8d1e7a5`.
- `npm run test:lily-ui`: 24 arquivos, 107 testes aprovados.
- `npm run check`: aprovado.
- `npm test -- --maxWorkers=1`: local, 80 arquivos, 419 aprovados e 3 ignorados; na VPS, 80 arquivos e 422 testes aprovados.
- `npm run build`: aprovado local e na VPS, com os budgets Linux acima.
- CI do PR #284 passou no run `41114715751`; PR #285 passou no run `41116929041`.
- Smoke tests de serviços na VPS passaram.
- A tentativa inicial de deploy após PR #284 excedeu o budget Linux (JS gzip 189.16/189.00 KiB) e fez rollback automático para `97f1dfb6953168f5de4feb399f28ff2268df1324`. A correção entrou no PR #285; o deploy posterior do SHA `7d6fa3d` concluiu com sucesso.
- `git diff --check` aprovado antes da integração.
- Homologação: `cua.getState()` mostra aba integrada ID `24` em `/lilyacai/painel/cardapio`. Tentativas de selecionar/controlar a aba falharam imediatamente com `browser.user is unavailable`; não foi possível validar desktop nem mobile. Chrome/Edge não foram usados.

## Migrations

- Nenhuma. Os endpoints existentes de índice e detalhe atendem a implementação.

## Bloqueios/riscos

- Bloqueio atual: ferramenta de automação não disponibilizou `browser.user`, impedindo interação com a aba integrada. A homologação real exigida ainda precisa ser feita exclusivamente no navegador integrado do Codex.
- Não alterar/salvar produtos durante homologação; verificar apenas listagem, abertura/carregamento do modal, fechamento, layout e scroll em desktop/mobile.

## Homologação/dependências externas

- URL: `https://carrochefe.com/lilyacai/painel/cardapio`.
- O navegador integrado reportou uma aba existente no URL correto, mas a API de controle retornou `browser.user is unavailable`.
- Após o usuário restaurar/disponibilizar a sessão do navegador integrado, repetir desktop e mobile; anotar defeitos e corrigir/reimplantar/retestar se necessário.

## Próxima ação exata

Restaurar o controle da aba integrada Codex e homologar `/lilyacai/painel/cardapio` em viewport desktop e mobile; então corrigir e repetir o ciclo caso surjam falhas. Manter estado bloqueado até obter evidência dessa homologação.
