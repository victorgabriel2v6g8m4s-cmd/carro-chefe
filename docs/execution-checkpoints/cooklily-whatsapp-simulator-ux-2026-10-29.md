# CookLily WhatsApp simulator UX fixes

- status: completed
- owner: AG-DEV
- branch: `codex/cooklily-whatsapp-simulator-ux` with follow-up fixes in dedicated branches
- base_branch: `cooklily/canonical`
- base_sha_verified: `8bbd57869d171bea3928a3e60b134101f6fc7df8`
- head_sha_verified: `52f5c239253734306d599c17613a9800b9db09ae`
- pull_requests: PR #250 merged (`4ae17c36f3ad59257d910352d9453d9b38db7687`); PR #251 closed and replaced before merge; PR #252 merged then superseded by PR #253; PR #253 merged (`52f5c239253734306d599c17613a9800b9db09ae`)
- last_verified_at: 2026-10-29 13:48 America/Sao_Paulo
- interruption_state: none

## Entrega

Corrigir a criação de variáveis dentro do editor, preservar chat e orçamento ao alternar a origem da conversa, aproximar a renderização dos botões do WhatsApp e habilitar rolagem real do histórico em desktop e celular.

## Concluído e persistido

- Removido o formulário interno que submetia o template ao adicionar variável; Enter/click adiciona variável sem desmontar o rascunho em edição.
- Alternar “Quem iniciou a conversa” mantém mensagens, IDs e nó do fluxo; a estimativa é recalculada a partir da conversa preservada.
- Botões do template são renderizados em cartões empilhados, separados da bolha do conteúdo.
- Histórico do chat limitado a 380 px, alinhado no início e com cartões sem encolhimento; o auto-scroll acompanha a mensagem mais recente. Investigação do domínio identificou que `justify-content:flex-end` escondia mensagens excedentes sem criar scroll range; alterado para `flex-start`.

## Gates e testes

- `npm run check`: PASS local.
- `npm run test:lily-ui`: 20 arquivos, 89 testes PASS local.
- `npm run test:lily-budget`: 4 testes PASS local e no deploy.
- `npm run build:lily`: PASS; CSS raw 156.20 KiB / 156.50 KiB e gzip 30.80 KiB / 31.00 KiB. Aviso existente de JS chunk acima de 500 KiB permanece.
- Deploy oficial executou `npm test`: 73 arquivos, 380 testes PASS; build completo PASS; Tool Health PASS; CI PR #253 PASS em Node 20/24, Tool Health Linux, Windows Supervisor, Workbook Snapshot e Excel Recipe Linux/Windows.
- Sem migrations pendentes; nenhuma migration nova nesta tarefa.

## Deploy

- SHA publicado: `52f5c239253734306d599c17613a9800b9db09ae`.
- Serviço `carro-chefe` ativo, readiness passou na tentativa 6, health CookLily e smoke HTTPS PASS.
- Evidência: `/srv/carro-chefe/data/deploy-logs/deploy-20261029-164331-52f5c2392537.evidence`.
- Log: `/srv/carro-chefe/data/deploy-logs/deploy-20261029-164331-52f5c2392537.log`.
- Backups core e Lily verificados antes do restart; hashes e tamanhos registrados no log do deploy.

## Homologação no navegador integrado Codex

URL: `https://carrochefe.com/lilyacai/painel/whatsapp?` (sessão autenticada pelo proprietário).

- Desktop 1280×900: histórico com `scrollHeight=890`, `clientHeight=380`, `scrollTop=510`, `overflow-y:auto`, distância ao fim 0.
- Celular 390×844: histórico com `scrollHeight=911`, `clientHeight=380`, `scrollTop=531`, `overflow-y:auto`, distância ao fim 0, largura 325 px.
- Botões renderizados como opções empilhadas no desktop e celular; barra interna do chat visível e conteúdo recente no fim da conversa.
- Cadastro de variável durante edição manteve o rascunho e os campos; alternar origem manteve as mensagens e a estimativa observada em `US$ 0.0068 / R$ 0.0365` antes de adicionar mensagens de verificação.
- Mensagens adicionais de QA foram apenas simuladas no navegador; nenhum envio ocorreu à Meta nem houve alteração persistida do template.

## Bloqueios/riscos

- Nenhum bloqueio de entrega. Permanecem limitações previamente documentadas do simulador: tarifas são estimativas simplificadas, prévias de mídia são demonstrativas e enviar para Meta continua sendo uma operação manual no WhatsApp Manager.

## Próxima ação exata

Nenhuma para este escopo. Para novo defeito do editor/simulador, reabrir a tarefa com reprodução atual no domínio.
