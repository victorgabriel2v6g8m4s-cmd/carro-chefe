# CookLily template editor and phone input UX

- status: candidate
- owner: AG-DEV
- branch: `codex/cooklily-template-editor`
- base_branch: `cooklily/canonical`
- base_sha_verified: `efc8588` (canonical docs commits #244/#245 included)
- head_sha_verified: `7ef2ccc8f7c605e0fb24bdda9471fb888d969750`
- pull_requests: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/247 (draft, open)
- last_verified_at: 2026-10-29 15:18 UTC
- interruption_state: none

## Entrega

Corrigir campo de nome e caret do telefone; construir editor de variáveis nomeadas, atômicas e manipuláveis, com formatação WhatsApp; ampliar simulador com seleção/renderização de template, árvore ramificada, e cotação de mensagens configurável conforme janela de 24 horas, categoria, franquia e câmbio USD/BRL.

## Concluído e persistido

- PR rascunho #247 aberto e anexado ao chat; branch rebaseada sobre `cooklily/canonical` incluindo `efc8588`.
- Commit de código `7ef2ccc8f7c605e0fb24bdda9471fb888d969750`.
- Corrigida perda de foco ao digitar nome interno e deslocamento do cursor ao editar telefone.
- Editor com variáveis nomeadas, chips atômicos, inserir por toque/arraste e formatação WhatsApp.
- Simulador local com escolha de templates e prévia de cabeçalho, corpo, rodapé, mídia, botões, URLs e respostas ramificadas.
- Persistência administrativa auditável de fluxos e preços via API e banco Lily com migrations aditivas.
- Cotação configurável por categoria, janela 24h, mensagens de serviço gratuitas configuráveis e câmbio USD/BRL.

## Gates e testes

- `npm run check`: PASS após rebase.
- `npm run test:lily-ui`: 20 arquivos, 89 testes PASS após rebase.
- `npm run build:lily`: PASS após rebase; budget JS gzip 207.52/208 KiB, CSS gzip 30.53/31 KiB e combinado 238.04/239 KiB. Aviso existente de chunk acima de 500 KiB permanece.
- `npm test` com banco Lily descartável: 72/73 arquivos, 371 aprovados, 9 ignorados; falha única `apps/api/src/workers/policy-context.test.ts` (manifesto de política desatualizado) está fora do escopo solicitado.
- CI do PR no SHA `7ef2ccc8f7c605e0fb24bdda9471fb888d969750`: checks em andamento na última consulta: Quality Node 20/24, Workbook Snapshot, Excel Recipe Linux/Windows, Windows Supervisor e Tool Health Linux.

## Migrations

- `20261029130000_lily_whatsapp_template_variable_names` (coluna de nomes de variáveis).
- `20261029190000_lily_whatsapp_simulator` (configuração do simulador/fluxos).
- Testadas contra banco descartável; ainda dependem do deploy oficial para produção.

## Bloqueios/riscos

- O deployer oficial roda a suíte completa e não oferece bypass. O usuário pediu para ignorar central operacional/preflight; por isso não alterar manifesto/policy-context. Não fazer deploy enquanto o gate obrigatório falhar.
- QA de domínio real desktop/mobile depende do deploy do SHA aprovado.
- Defaults de tarifas são referência de mercado editável, não cotação confirmada da conta/WABA; rate card oficial da Meta exige login.

## Homologação/dependências externas

- Acesso admin do navegador integrado confirmado; aba em `https://carrochefe.com/lilyacai/painel/whatsapp` estava na versão atualmente implantada, sem candidato.
- SSH via agente para `root@2.25.182.185` e deployer oficial `/usr/local/sbin/carro-chefe-deploy` confirmados por leitura.
- Não enviado template ou mensagem à Meta.
- Coexistence não foi ativado. Recomendação condicional: ativar se CookLily precisar manter atendimento manual pelo WhatsApp Business App no mesmo número; caso contrário, aguardar. Mensagens via API continuam tarifadas; mensagens originadas pelo app permanecem sem tarifa da plataforma segundo documentação de parceiro consultada. Elegibilidade e custo de eventual BSP precisam confirmação na conta.

## Próxima ação exata

Aguardar conclusão da CI do PR #247 e verificar checks até resultado final. Se aprovado, revisar/meter merge autorizado; depois avaliar deployer oficial. Se a política continua impedindo deploy, comunicar o bloqueio sem contornar o deployer; solicitar direcionamento sobre resolver o manifesto fora do escopo. Quando houver deploy aprovado, realizar QA desktop e mobile apenas no navegador integrado do Codex, registrar falhas, corrigir e repetir ciclo.
