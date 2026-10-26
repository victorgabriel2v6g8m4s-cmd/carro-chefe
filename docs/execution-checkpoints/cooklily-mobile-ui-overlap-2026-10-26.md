# Ajustes mobile de UI/UX CookLily

- status: candidate
- owner: AG-DEV
- branch: `codex/cooklily-mobile-ux-fixes`
- base_branch: `cooklily/canonical`
- base_sha_verified: `e070c3fc5dcf70787479c9445910421f96af689d`
- head_sha_verified: `e070c3fc5dcf70787479c9445910421f96af689d`
- pull_requests: pending
- last_verified_at: 2026-10-26
- interruption_state: none

## Entrega

Corrigir contraste do preço selecionado, sobreposição de ações pelo footer fixo no mobile, navegação inferior duplicada do perfil e remover temporariamente avisos de alergênicos das superfícies de cliente. Preservar alertas na operação de cozinha/impressão.

## Concluído e persistido

- [x] Confirmado que a branch `cooklily/canonical` já contém o PR #195 integrado no commit `e070c3fc5dcf70787479c9445910421f96af689d`.
- [x] Preflight `npm run policy:preflight -- --agent AG-DEV --scope apps/lily_acai` passou.
- [x] Revisão dirigida encontrou footer fixo mobile em z-index 80, modal fixo em z-index 80 e ações do modal sem reserva inferior para a navegação; observada também navegação com perfil duplicado e catálogo ausente.
- [x] Navegação: o item final do footer agora leva ao cardápio; perfil continua no header.
- [x] Contraste: preço selecionado em opção vinho agora usa texto branco e preços promocionais mantêm o preço anterior legível.
- [x] Sobreposição: modal fica acima do footer e oculta a navegação inferior enquanto está aberto; consentimento de analytics sobe acima da navegação considerando safe area.
- [x] Aviso de alergênicos removido temporariamente do catálogo, carrinho, checkout e histórico/rastreamento do cliente; cozinha e impressão continuam exibindo a informação.

## Em andamento

- Corrigir estilos dos preços e ações de modal, navegação inferior e avisos de alergênicos ao cliente.
- Aguardar CI no PR e integrar por squash após todos os gates passarem.

## Gates e testes

- `npm run test:lily-ui`: passou, 13 arquivos/62 testes.
- `npm run check`: passou.
- `npm run build:lily`: passou; build gzip combinado 185,93 KiB dentro do limite.
- `npm run build`: passou para Gestão, Site, QR, CookLily e API.
- Playwright com dados mockados: iPhone 15 (393×659) confirmou consentimento separado do footer (9 px), navegação oculta no modal, preço `R$ 22,00` branco, ações pós-adicionar com limites inferiores 604/650 dentro da viewport de 659 px e zero avisos de alergênicos no modal. Em 1440×900, footer mobile fica oculto e ações permanecem no viewport.
- `npm test` local: falhou em 78 testes de API porque o `.runtime/lily-acai.db` existente não tem migrations já presentes na canonical (`couponDiscountCents` e tabelas métricas de pesquisas ausentes). A tentativa de preparar um SQLite temporário com Prisma falhou no schema engine no Windows. Os testes de CI serão a validação da suíte completa; não alteramos os bancos existentes.
- `git diff --check`: passou.

## Migrations

- Nenhuma.

## Bloqueios/riscos

- Não remover os avisos de alergênicos das telas da cozinha e impressão; são informativos para a operação.

## Homologação/dependências externas

- PR/CI pendentes; homologação na VPS depende de deploy posterior pelo proprietário. O servidor local de frontend não tinha a API em `127.0.0.1:4173`; o Playwright usou respostas de catálogo/configuração mockadas para validar a geometria da UI.

## Próxima ação exata

- Revisar o diff, commitar somente os arquivos desta tarefa, abrir PR para `cooklily/canonical`, aguardar CI, corrigir falhas e integrar por squash conforme autorização prévia; atualizar este checkpoint com o SHA integrado.
