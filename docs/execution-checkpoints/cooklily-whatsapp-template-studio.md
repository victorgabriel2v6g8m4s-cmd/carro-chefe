# CookLily WhatsApp Template Studio

- status: merged; correction validated, canonical CI running, deploy pending
- owner: AG-DEV
- branch: `cooklily/canonical`
- base_branch: `cooklily/canonical`
- base_sha_verified: `b9888658ddf9f43a9d0ee29be32974eb0d54fae8`
- head_sha_verified: `d6123e6f3b440f1109e439f950490ace7b7c89d1` (squash merge PR #240)
- pull_requests: [#239](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/239) initial studio; [#240](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/240) authentication correction, merged 2026-10-29T04:39:12Z
- last_verified_at: 2026-10-29 04:39 UTC
- interruption_state: none

## Entrega

Estúdio administrativo em `/lilyacai/painel/whatsapp` para criar, editar, salvar como rascunho e exportar templates da Meta, com componentes padrão/avançados, biblioteca e simulador de conversa local. A simulação não usa WhatsApp nem envia mensagens. A correção da autenticação fornece editor OTP especializado e payload BODY/FOOTER/BUTTONS sem texto livre ou botão comum.

## Persistido e integrado

- Feature inicial implementada na PR #239 e integrada por squash em `075536437c2d404b808006cbd5b7da502fea5cdd`.
- Correção de autenticação integrada pela PR #240 em `d6123e6f3b440f1109e439f950490ace7b7c89d1`.
- Migration Lily `20261029120000_lily_whatsapp_template_components` é aditiva e já foi aplicada no deploy anterior da feature.
- Deploy anterior da feature confirmou backups dos bancos, migration, readiness e smoke HTTPS; release `b9888658ddf9f43a9d0ee29be32974eb0d54fae8`.
- VPS verificada por SSH com `StrictHostKeyChecking=yes`, host `root@2.25.182.185`, remoto `srv1979989`.

## Correção encontrada no QA e resultado

- QA do estúdio encontrou modo de autenticação com campos comuns e botão OTP incompleto. A PR #240 substituiu esse modo por aviso de segurança, validade opcional (1–90 minutos), OTP COPY_CODE/ONE_TAP/ZERO_TAP e texto/código fictícios na simulação local.
- Teste focal local: 4/4 PASS.
- `npm run check`: PASS.
- `npm run build`: PASS. Budget atual medido: JS bruto 722.57/724 KiB; JS+CSS gzip 225.80/230 KiB. Aviso geral Vite de chunk >500 kB persiste.
- CI da PR #240 run 40818599689: 7/7 PASS, incluindo Node 20 e 24.
- CI canonical após merge, run 40818950724: em andamento na última verificação; aguardar conclusão antes de publicar checkpoint e deploy.

## QA no domínio real

- Navegador usado exclusivamente: IAB do Codex, URL `https://carrochefe.com/lilyacai/painel/whatsapp`.
- Antes da correção: fluxo local de utility passou em viewport desktop 1440×900 e mobile 390×844, sem overflow horizontal; simulador respondeu sem persistir rascunhos. A captura visual mostrou editor e chat em duas colunas no desktop e layout estreito no celular.
- Correção de autenticação ainda precisa homologação no domínio depois do novo deploy, em desktop e mobile. Verificar trocar categoria/voltar, campos OTP, validade, export JSON e resposta do chat; confirmar biblioteca sem salvar dados de QA.
- Não salvar templates de teste em produção.

## Em andamento / bloqueios

- Nenhum bloqueio técnico conhecido. Deploy autorizado pelo proprietário.
- Deploy de `cooklily/canonical` está pendente do CI run 40818950724 verde e de atualizar este checkpoint em commit apenas documental.

## Próxima ação exata

Confirmar run 40818950724 verde; publicar este checkpoint atualizado sozinho via `pwsh -File tools/recovery/push-cooklily-checkpoint.ps1 -Checkpoint docs/execution-checkpoints/cooklily-whatsapp-template-studio.md`; aguardar CI do novo HEAD; executar `sudo cc deploy canonical` por SSH no host verificado; então homologar autenticação + utilidade em desktop/mobile pelo IAB, corrigir/repetir se necessário e atualizar o checkpoint com release, evidências e SHA finais.
