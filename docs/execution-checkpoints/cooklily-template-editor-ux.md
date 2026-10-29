# CookLily template editor and phone input UX

- status: in_progress
- owner: AG-DEV
- branch: `codex/cooklily-template-editor`
- base_branch: `cooklily/canonical`
- base_sha_verified: `8824db709c962a6005ef28d10da059f7172ad893`
- head_sha_verified: `8824db709c962a6005ef28d10da059f7172ad893` (candidate changes remain uncommitted)
- pull_requests: none
- last_verified_at: 2026-10-29 15:10 UTC
- interruption_state: none

## Entrega

Corrigir o campo de nome que perde o foco durante a digitação; corrigir o cursor/formatação no telefone; criar variáveis nomeadas e atômicas com inserção por clique/arraste, seleção/cópia/recorte/colagem e suporte a formatação WhatsApp no editor de componentes; informar recomendação atual sobre Coexistence sem ativá-la.

## Concluído e persistido

- Branch de trabalho criada a partir da canonical atual. Nenhuma alteração de aplicação commitada até agora.
- Construtor e simulador agora usam uma sessão estável; não remonta a cada caractere do nome.
- Formatador de telefone calcula e restaura posição do caret a partir dos dígitos anteriores ao cursor.
- Implementado editor de conteúdo com variáveis numeradas exibidas como chips atômicos, arraste/tap para inserção, suporte de cópia/recorte e botões para negrito, itálico, tachado, monospace, código, listas e citação.
- Variáveis nomeadas persistidas no contrato/API e em migration aditiva; compatibilidade preserva templates existentes com placeholders numerados.
- Simulador ampliado: escolhe templates salvos, renderiza formatação WhatsApp, cabeçalho/corpo/rodapé/mídia/links/botões e ramifica em vários destinos por resposta de texto, botão ou qualquer resposta.
- Árvore de fluxo e tabela de preços/câmbio agora têm salvamento explícito e persistência no banco Lily; cada mensagem considera categoria, janela 24h e franquia configurável de serviço.
- Componentes e CSS do simulador separados por carregamento sob demanda; build atual preserva os limites gzip configurados.

## Em andamento

- Persistência server-side está implementada por API e migrations; requer merge/deploy para homologação no domínio.
- Validação por teclado/toque/clipboard/arraste e QA visual desktop/mobile ainda precisam ser concluídos no domínio real.

## Gates e testes

- `npm run check`: PASS em 2026-10-29.
- `npm run test:lily-ui`: 20 arquivos/89 testes PASS.
- Teste API `whatsapp-template-studio.test.ts`: 2/2 PASS contra `.runtime/test-suite-template-editor.db` migrado.
- Testes focados de editor/cotação/fluxo/telefone: 18/18 PASS.
- `npm run test:lily-budget`: 4/4 PASS; limite ajustado em 1 KiB para acomodar editor/fluxo, teto CSS preservado.
- `npm run build`: PASS; CookLily JS gzip 207.52/208 KiB, CSS 155.34/155.50 KiB, combinado gzip 238.04/239 KiB. Aviso existente de chunk principal >500 KiB permanece.
- `npm test` com banco Lily descartável migrado: 72/73 arquivos, 371 aprovados, 9 ignorados; única falha `apps/api/src/workers/policy-context.test.ts` porque manifesto de agentes está desatualizado. Conforme instrução explícita do proprietário, não alterar Central Operacional nem preflight/política neste escopo.

## Migrations

- Migration aditiva criada localmente `20261029130000_lily_whatsapp_template_variable_names`, com coluna `variableNamesJson` default `[]`; aplicada apenas no banco descartável de teste, ainda não commitada.

## Bloqueios/riscos

- Editor rico precisa manter edição por teclado e toque, marcadores Meta corretos e chips de variáveis atômicos.
- Implementar persistência auditável dos fluxos de automação e da configuração de tarifas, com migração aditiva isolada e testes API; não alterar templates reais durante QA.
- A política de teste falha por manifesto `AGENTS.md` fora do escopo. O deployer oficial executa gates completos e não permite ignorar a falha; não publicar até decisão de escopo ou gate resolvido.
- Confirmar os valores padrão da cotação diretamente no rate card Meta: página de desenvolvedor exige login; valores padrão brasileiros são referência pública, não tarifa confirmada da conta/WABA.

## Homologação/dependências externas

- Aba IAB autenticada aberta como admin (`https://carrochefe.com/lilyacai/painel/whatsapp`, tab 5); interação por `getTab` continua falhando, mas `createBrowserTab` funciona e herda sessão.
- Acesso SSH read-only à VPS confirmado via `ssh-agent` para `root@2.25.182.185`; deployer `/usr/local/sbin/carro-chefe-deploy` instalado.
- Após merge/deploy autorizado, verificar no navegador integrado do Codex no domínio real, desktop e móvel; usar apenas dados descartáveis e não enviar nada à Meta.
- Coexistence é informativo neste pedido; não iniciar Embedded Signup ou alterar WABA/número.

## Próxima ação exata

Próxima ação exata: revisar `git diff --check`, commitar candidato, rebasear em `origin/cooklily/canonical` (atual `efc8588`), revalidar e abrir PR rascunho; antes do deploy, resolver a falha obrigatória de `policy-context.test.ts` sem ampliar o escopo sem orientação do proprietário. Depois do gate verde, usar deployer por SHA e concluir QA desktop/mobile no domínio real.
