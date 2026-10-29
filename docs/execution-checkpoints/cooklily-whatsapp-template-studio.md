# CookLily WhatsApp Template Studio

- status: merged; deployment blocked by unverified VPS connection
- owner: AG-DEV
- branch: feat/cooklily-whatsapp-template-studio (merged; remote feature branch deleted by GitHub)
- base_branch: cooklily/canonical
- base_sha_verified: 5e11ded59e1781b13ae209e5360102e1d791d0a5
- head_sha_verified: 075536437c2d404b808006cbd5b7da502fea5cdd (squash merge on canonical)
- pull_requests: [#239](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/239), merged at 2026-10-29T03:32:55Z
- ci: PR run 40812417549 PASS 7/7; canonical push run 40812756484 PASS 7/7; checkpoint-only push run 40813142095 queued/in progress (6 jobs PASS; Node 20/24 in progress at last check)
- last_verified_at: 2026-10-29 America/Sao_Paulo
- interruption_state: none

## Entrega

Estúdio no painel `/lilyacai/painel/whatsapp` com criação, edição, biblioteca, prévia e chat de simulação React local, JSON exportável para WhatsApp Manager, componentes padrão/avançados Meta, migration aditiva no banco Lily e proteções para manter mensagens incompatíveis fora do fluxo operacional de pedidos. O simulador não chama API nem WhatsApp.

## Concluído e persistido

- Migration `20261029120000_lily_whatsapp_template_components` adiciona `componentsJson` com default `[]` no banco exclusivo Lily.
- A API valida tipo/estrutura/tamanho de componentes e impede ativação operacional de marketing, autenticação e componentes incompatíveis.
- Documentação de uso em `docs/lily-acai/WHATSAPP_TEMPLATE_STUDIO.md`.
- Merge squash da PR #239 para `cooklily/canonical` em `075536437c2d404b808006cbd5b7da502fea5cdd`.
- Autenticação staff/admin de agente efetuada pelo relay Codex; painel real acessível.

## Testes e gates

- Testes focalizados: 12/12 PASS.
- `npm run check`: PASS.
- `npm run build`: PASS; orçamento CookLily ajustado após comparação contra baseline canonical e passou.
- `npm test`: PASS em CI para Node 20 e Node 24 na PR e na canonical (runs 40812417549 e 40812756484).
- PR #239 CI run 40812417549: 7/7 PASS.
- O primeiro CI falhou no teste de fixture do build budget após aumento de limite; fixture corrigida e suíte repetida com sucesso.
- Aviso Vite de chunk acima de 500 kB permanece existente; budget explícito passou.

## QA no domínio real

- Navegador utilizado: somente IAB do Codex.
- Desktop em `https://carrochefe.com/lilyacai/painel/whatsapp`: autenticação staff funcionou e página carregou, mas mostrou o formulário antigo. A versão mergeada ainda não foi publicada.
- Captura de tela em arquivo: não foi salva; estado foi lido da árvore de acessibilidade do IAB.
- QA mobile: pendente de publicação; viewport anterior não foi tratado como aceite do novo recurso.
- Sessão admin confirmada; chave provisionada já constava em checkpoint anterior (fingerprint omitida aqui).

## Bloqueio de deploy

- O deploy documentado é `sudo cc deploy canonical` na VPS.
- Este ambiente não tem alias SSH, host/porta configurados, MCP Hostinger, ou sessão hPanel utilizável. Há chaves no agente SSH, mas sem host identificado/verificado não é seguro abrir conexão ou executar publicação. `docs/pre-lancamento/PLANO_HOSTINGER_VPS.md` exige identidade/fingerprint confirmada e inventário, e afirma que não há conexão autenticada previamente verificada.
- Não inferir IP/host por DNS nem aceitar fingerprint nova automaticamente.
- A implementação foi integrada em canonical; falta publicar e homologar o estúdio real após conexão SSH confiável. Não usar ferramenta Sites, que não corresponde à infraestrutura VPS do projeto.

## Próxima ação exata

Configurar/confirmar alias SSH de produção com host, porta e fingerprint do servidor por fonte confiável (ou disponibilizar sessão hPanel Hostinger no navegador integrado). Em seguida executar o procedimento canonical, conferir backups/migrations/readiness/smoke, retornar ao IAB, verificar tela autenticada em desktop e mobile e iterar correções até aprovação visual.
