# CookLily WhatsApp Template Studio

- status: merged; latest corrections integrated, final deploy/QA pending
- owner: AG-DEV
- branch: `cooklily/canonical`
- base_branch: `cooklily/canonical`
- base_sha_verified: `076e7cdf1af742ba459c109842feebd6b3a6fe12`
- head_sha_verified: `f988b09a2e6e1ace9fdb0312aec41ba3e894bc9e` (squash PR #242)
- pull_requests: [#239](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/239) studio; [#240](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/240) authentication editor; [#241](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/241) generated OTP preview; [#242](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/242) ZERO_TAP label
- last_verified_at: 2026-10-29 05:12 UTC
- interruption_state: none

## Entrega

Painel `/lilyacai/painel/whatsapp` cria, edita e organiza templates Meta, exporta JSON para cadastro manual no WhatsApp Manager e simula conversas em chat local, sem enviar mensagens pelo WhatsApp. Inclui templates Utility, Marketing e Authentication; componentes comuns e JSON avançado; biblioteca; modalidade OTP COPY_CODE/ONE_TAP/ZERO_TAP.

## Implementação e gates

- Migration aditiva `20261029120000_lily_whatsapp_template_components` no banco Lily.
- PR #239, #240, #241 e #242 integradas por squash. Correções de QA: editor próprio de Authentication; simulador sempre mostra código fictício `123456`; rótulos distinguem Copiar código, Preencher código e Verificação sem toque.
- Teste focal: 4/4; `npm run check`: PASS; `npm run build`: PASS.
- Último budget: JS bruto 722.74/724 KiB; JS+CSS gzip 225.84/230 KiB. Aviso Vite genérico de chunk >500 kB permanece.
- CI PR #240 `40818599689`, canonical `40818950724`, PR #241 `40820187199`, canonical `40820539528`, PR #242 `40821799558`: todos 7/7 PASS. Canonical após #242 `40822074704`: em andamento na última leitura.

## Deploy e QA comprovados

- VPS verificada por SSH com `StrictHostKeyChecking=yes`, destino `root@2.25.182.185`, host remoto `srv1979989`.
- Último deploy concluído: SHA `076e7cdf1af742ba459c109842feebd6b3a6fe12`, anterior `0735248da518642803177e2b9d0c183d15b0f07e`. `npm test`: 70 arquivos/367 testes; build/budget e Tool Health passaram; backups core/Lily verificados; nenhuma migration pendente no banco ativo; Nginx válido; readiness attempt 6 e smoke HTTPS OK. Evidência `/srv/carro-chefe/data/deploy-logs/deploy-20261029-050408-076e7cdf1af7.evidence`.
- QA IAB Codex real em `https://carrochefe.com/lilyacai/painel/whatsapp`: desktop 1440×900, sem overflow horizontal (documento 1425 px); AUTHENTICATION gera chat local `123456 é seu código de verificação. [Copiar código]`; JSON copiado/visualizado é `AUTHENTICATION` com BODY, BUTTONS/OTP COPY_CODE, sem texto livre, cabeçalho ou texto de botão. Biblioteca permaneceu 0. Rascunho não foi salvo.
- Desktop anterior, 1440×900, e mobile 390×844 passaram fluxo Utility/simulador local; o QA mobile precisa ser repetido na última build após deploy.
- Nenhum rascunho de QA foi salvo no banco.

## Próxima ação exata

Confirmar CI canonical `40822074704` verde; publicar este checkpoint atualizado somente pelo script `pwsh -File tools/recovery/push-cooklily-checkpoint.ps1 -Checkpoint docs/execution-checkpoints/cooklily-whatsapp-template-studio.md`; aguardar CI do checkpoint; executar `sudo cc deploy canonical` no VPS; testar em IAB Codex desktop 1440×900 e mobile 390×844: Utility simulação, Authentication com aviso/validade e cada um dos três OTP, JSON e troca entre categorias; confirmar zero overflow e biblioteca em 0 sem salvar. Corrigir e repetir qualquer falha e fechar checkpoint com SHA, gates, deploy e QA finais.
