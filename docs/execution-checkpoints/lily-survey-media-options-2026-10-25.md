# CookLily — opções de resposta com mídia

- Tarefa: permitir opções de seleção simples e múltipla compostas de texto, mídia ou ambos.
- Responsável: AG-DEV.
- Estado: `validated`.
- Branch: `codex/lily-survey-rich-options`.
- Base branch: `cooklily/canonical`.
- Base SHA verificado: `e437aa2da0250ee37238840f4c51b291b49a8248`.
- HEAD verificado: alterações locais sem commit, baseado em `e437aa2da0250ee37238840f4c51b291b49a8248`.
- PRs: nenhum.
- Última verificação: 2026-10-25.
- Estado de interrupção: não interrompido.

## Escopo

- Opções com texto, imagem/vídeo ou ambos em seleção simples e múltipla.
- Upload protegido para staff, arquivos limitados e storage persistente Lily, com leitura autenticada para clientes.
- Renderização acessível no cliente e prévia admin; IDs estáveis da opção para respostas, condições e métricas.
- Preservar compatibilidade com respostas e opções antigas em string.

## Etapas

1. `[done]` Expandir o contrato com compatibilidade de opções legadas, mídia e identificadores estáveis.
2. `[done]` Implementar upload restrito a staff, validação de assinatura e leitura autenticada.
3. `[done]` Atualizar editor, prévia do cliente, resposta, regras condicionais e rótulos de analytics.
4. `[done]` Testes direcionados: contratos/analytics 12/12; interface Lily 56/56.
5. `[done]` `npm run check` e `npm run build` passaram; `git diff --check` sem erros.
6. `[pending]` `npm test` executou suites anteriores com sucesso, mas o Vitest global não começou a coletar testes no ambiente; PR/CI remoto ainda pendentes.

## Gates e testes

- Preflight AG-DEV: PASS para API surveys, frontend surveys e checkpoints.
- `npm run check`: PASS.
- `npm run build`: PASS; orçamento CookLily PASS. Vite sinaliza chunk acima de 500 kB, mantendo budget aprovado.
- `npm run test:lily-ui -- --maxWorkers=1`: PASS, 11 arquivos/56 testes.
- Vitest direcionado dos contratos e analytics: PASS, 2 arquivos/12 testes.
- `npm test`: suítes legacy/tool-health/deploy-validation/lily-budget passaram; Vitest agregado ficou sem coletar resultados após ~20 s e foi interrompido. Ainda pendente investigar runner global/CI.
- `git diff --check`: PASS.

## Migrations

- Nenhuma prevista: a opção e seu ID ficam no JSON da definição; o arquivo é armazenado no diretório de uploads Lily já configurado.

## Bloqueios/riscos

- Teste de integração do endpoint de upload ainda não foi criado/executado; a validação de esquema e assinatura está coberta pela implementação e testes de contrato, e CI remoto deve validar o restante.

## Homologação/dependências externas

- Após deploy, publicar opções somente com texto, somente com mídia e texto+mídia e responder em celular.

## Próxima ação exata

1. Rever diff e commits locais, executar/verificar CI em PR draft; só então integrar em `cooklily/canonical`.
