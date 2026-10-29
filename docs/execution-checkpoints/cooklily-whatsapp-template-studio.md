# CookLily WhatsApp Template Studio

- status: merged; deploy authorized and in progress
- owner: AG-DEV
- branch: feat/cooklily-whatsapp-template-studio (merged; remote feature branch deleted by GitHub)
- base_branch: cooklily/canonical
- base_sha_verified: 5e11ded59e1781b13ae209e5360102e1d791d0a5
- head_sha_verified: 075536437c2d404b808006cbd5b7da502fea5cdd (squash merge on canonical)
- pull_requests: [#239](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/239), merged at 2026-10-29T03:32:55Z
- ci: PR run 40812417549 PASS 7/7; canonical feature merge run 40812756484 PASS 7/7; current canonical SHA b834a8b CI run 40813254791 PASS
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
- SSH verificado com `StrictHostKeyChecking=yes` para o destino fornecido pelo proprietário `root@2.25.182.185`; hostname remoto `srv1979989`; checkout de produção em `b93445996dfd47ee2386644bbdba120cd0cc33d2`.

## Testes e gates

- Testes focalizados: 12/12 PASS.
- `npm run check`: PASS.
- `npm run build`: PASS; orçamento CookLily ajustado após comparação contra baseline canonical e passou.
- `npm test`: PASS em CI para Node 20 e Node 24 na PR e na canonical (runs 40812417549 e 40812756484).
- PR #239 CI run 40812417549: 7/7 PASS.
- Canonical atual antes do deploy: `b834a8b2bd4d87121097d7d4bec0f9c26039e44b`; CI run 40813254791 PASS.
- O primeiro CI falhou no teste de fixture do build budget após aumento de limite; fixture corrigida e suíte repetida com sucesso.
- Aviso Vite de chunk acima de 500 kB permanece existente; budget explícito passou.

## QA no domínio real

- Navegador utilizado: somente IAB do Codex.
- Desktop em `https://carrochefe.com/lilyacai/painel/whatsapp`: autenticação staff funcionou e página carregou, mas mostrou o formulário antigo. A versão mergeada ainda não foi publicada.
- Captura de tela em arquivo: não foi salva; estado foi lido da árvore de acessibilidade do IAB.
- QA mobile: pendente de publicação; viewport anterior não foi tratado como aceite do novo recurso.
- Sessão admin confirmada; chave provisionada já constava em checkpoint anterior (fingerprint omitida aqui).

## Deploy

- O deploy documentado é `sudo cc deploy canonical` na VPS.
- Deploy ainda pendente; executar `sudo cc deploy canonical` após CI verde do checkpoint.
- Host foi fornecido explicitamente pelo proprietário e a chave de host já correspondeu ao `known_hosts`; não foi aceita fingerprint nova.
- O procedimento precisa registrar backup dos bancos, migration, readiness e smoke HTTPS.

## Próxima ação exata

Executar `sudo cc deploy canonical` no host verificado `root@2.25.182.185`; aguardar backups/migrations/readiness/smoke e então testar o estúdio autenticado em desktop e mobile pelo IAB do Codex, corrigindo e repetindo o ciclo até aprovação.
