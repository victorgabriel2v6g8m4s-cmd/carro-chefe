# CookLily WhatsApp Template Studio

- status: merged; latest OTP simulator correction integrated, second deploy pending
- owner: AG-DEV
- branch: `cooklily/canonical`
- base_branch: `cooklily/canonical`
- base_sha_verified: `0735248da518642803177e2b9d0c183d15b0f07e`
- head_sha_verified: `da70226e10a2b6599af8ef613a368805b4238cba` (squash merge PR #241)
- pull_requests: [#239](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/239) studio; [#240](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/240) authentication builder; [#241](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/241) generated OTP local preview
- last_verified_at: 2026-10-29 04:56 UTC
- interruption_state: none

## Entrega

Painel `/lilyacai/painel/whatsapp` cria, edita e organiza templates Meta com componentes comuns e JSON avançado, exporta JSON para cadastro manual no WhatsApp Manager e simula conversa em chat local. O simulador não conecta ao WhatsApp nem envia mensagens. Modo AUTHENTICATION gera estrutura BODY/FOOTER/BUTTONS com OTP, aviso de segurança opcional e validade; a resposta local usa código fictício 123456.

## Integrado e validado

- PR #239 incorporou o estúdio; PR #240 separou corretamente o editor de autenticação e removeu campos comuns inválidos; PR #241 faz o simulador exibir o código OTP fictício mesmo sem o aviso opcional. Todas as três PRs estão merged por squash.
- Migration aditiva Lily `20261029120000_lily_whatsapp_template_components` já aplicada no deploy anterior.
- Teste focal: 4/4; `npm run check`: PASS; `npm run build`: PASS.
- Após a alteração de autenticação, budget foi ajustado em +2 KiB JS bruto; build mede 722.68/724 KiB JS bruto e 225.82/230 KiB gzip combinado. Vite ainda emite aviso genérico de chunk >500 kB.
- CI PR #240 run 40818599689: 7/7 PASS. CI canonical run 40818950724: 7/7 PASS. CI PR #241 run 40820187199: 7/7 PASS. CI canonical posterior à PR #241, run 40820539528, estava em execução na última consulta.

## Deploys e QA

- VPS `root@2.25.182.185`, verificada com SSH `StrictHostKeyChecking=yes`, host `srv1979989`.
- Deploy release `0735248da518642803177e2b9d0c183d15b0f07e`, anterior `b9888658ddf9f43a9d0ee29be32974eb0d54fae8`, concluiu com `npm test` 70 arquivos/367 testes, build e Tool Health, backups core/Lily verificados, migration sem pendências no banco ativo, Nginx válido, readiness attempt 6 e smoke HTTPS OK. Log `/srv/carro-chefe/data/deploy-logs/deploy-20261029-044653-0735248da518.log`; evidência `/srv/carro-chefe/data/deploy-logs/deploy-20261029-044653-0735248da518.evidence`.
- QA somente no IAB do Codex: desktop 1440×900 e mobile 390×844 da primeira versão passaram simulação Utility sem persistir; biblioteca permaneceu em 0. O QA subsequente confirmou os novos campos OTP e validade em 10 minutos, mas identificou que sem o aviso de segurança a simulação não mostrava o OTP; PR #241 corrige e aguarda novo deploy/homologação.
- Rascunhos de QA nunca foram salvos; após reload a página mostrou formulário limpo e biblioteca 0.

## Próxima ação exata

Confirmar CI canonical 40820539528 verde; publicar este checkpoint atualizado sozinho via `pwsh -File tools/recovery/push-cooklily-checkpoint.ps1 -Checkpoint docs/execution-checkpoints/cooklily-whatsapp-template-studio.md`; aguardar o CI do checkpoint; executar `sudo cc deploy canonical` no host verificado; homologar em desktop 1440×900 e mobile 390×844 (OTP sem/ com aviso, validade, seletor one-tap, JSON, chat e modo Utility), sem salvar dados; atualizar checkpoint com SHA, gates, logs e QA finais. Se houver regressão, registrar, corrigir e repetir merge/deploy/QA.
