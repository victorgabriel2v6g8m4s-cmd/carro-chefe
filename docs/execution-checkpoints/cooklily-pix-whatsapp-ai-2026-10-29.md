# Pix Sicredi, templates de atendimento e plano de IA CookLily

- status: in_progress
- owner: AG-DEV
- branch: codex/cooklily-pix-whatsapp-ai-plan
- base_branch: cooklily/canonical
- base_sha_verified: 29962ae5
- head_sha_verified: 29962ae6f52fd4a6dbcc9af6ec2146de0666b83a (working tree changes pending commit)
- pull_requests: none
- last_verified_at: 2026-10-29 America/Sao_Paulo
- interruption_state: none

## Concluído e persistido

- PR #268 integrada após CI 7/7 PASS; canonical avançou até `29962ae`.
- As duas frentes anteriores continuam parciais: redução gzip agregado abaixo do alvo de 20% e catálogo progressivo aguardando homologação mobile pelo Codex IAB.
- Branch específica criada a partir de `origin/cooklily/canonical` em `29962ae`.
- Inventariados provider Pix BR Code atual, roteamento Pix, formulário admin de formas de pagamento, estúdio de templates e fila WhatsApp; nenhum dado/configuração de produção alterado.
- Meta Business Messaging Policy e OpenAI API data controls/pricing consultados em fontes oficiais; plano/custos serão documentados com data e hipóteses.

## Em andamento

- Implementar cadastro cifrado do segundo recebedor Pix Sicredi, prioridade selecionável e geração de BR Code/QR, mantendo CookLily atual como padrão.
- Criar no painel um pacote de templates apenas como rascunhos/exportação manual, cobrindo criação/OTP, boas-vindas e ciclo do pedido.
- Documentar arquitetura futura da IA conversacional, custos, controles, funil de compra completo e lacunas verificadas.

## Gates e testes

- `npx vitest run --config vitest.config.ts apps/api/src/modules/lily/payment-choice.test.ts apps/api/src/modules/lily/whatsapp-template-studio.test.ts`: 2 arquivos, 8 testes PASS.
- `npm run db:generate:lily`: PASS; `npm run db:validate:lily`: PASS.
- `npm run check`: PASS.
- `npm run build`: PASS; orçamento CookLily: JS gzip 180.65/185 KiB, CSS gzip 33.88/34 KiB, combinado 214.53/220 KiB.
- `npm test`: gates anteriores PASS, mas a fase Vitest raiz permaneceu sem saída até interrupção; registrar como inconclusivo, não PASS.
- `git diff --check`: PASS.
- Nenhuma operação Pix ou envio WhatsApp de produção executado.
- Nenhum merge/deploy desta entrega.

## Migrations

- `20261030020000_lily_sicredi_pix_receiver`: adiciona provider Pix selecionável e campos cifrados de configuração Sicredi.

## Bloqueios/riscos

- Antes de persistir a chave de produção, confirmar que `LILY_MFA_ENCRYPTION_KEY` existe na VPS sem revelar valor. Dados Pix fornecidos pelo proprietário não devem aparecer em Git/logs.
- O Pix BR Code estático não comprova liquidação. Confirmação, reconciliação e liberação de preparo continuam dependentes de fonte autenticada e homologação financeira.
- Templates serão preparados como rascunhos para cadastro/revisão manual no WhatsApp Manager; aprovação da Meta, credenciais WABA e opt-in continuam requisitos antes do envio.
- O teste mobile real de UI só será declarado se o Codex IAB fornecer viewport estreito; não trocar por navegador externo.

## Homologação/dependências externas

- Produção exige a chave `LILY_MFA_ENCRYPTION_KEY` para cifrar configuração Pix; confirmar presença na VPS sem revelar seu valor antes de persistir dado sensível.
- Aprovação e classificação dos templates dependem do WhatsApp Manager da CookLily.
- Ativação do envio real depende de credenciais Meta e opt-in dos destinatários.

## Próxima ação exata

1. Revisar escopo, criar commit, push da branch e PR draft.
2. Aguardar CI e corrigir falhas; executar/repetir teste geral isolando o hang Vitest.
3. Integrar por squash após gates verdes, atualizar checkpoint e implantar o SHA canônico autorizado.
4. Verificar configuração de cifragem VPS; cadastrar Pix alternativo de forma inativa sem trocar o meio ativo.
5. Testar produção no Codex IAB desktop e mobile; registrar limitações e retestes.
