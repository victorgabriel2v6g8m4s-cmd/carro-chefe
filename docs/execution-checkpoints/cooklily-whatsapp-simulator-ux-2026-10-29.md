# CookLily WhatsApp simulator UX fixes

- status: in_progress
- owner: AG-DEV
- branch: `codex/cooklily-whatsapp-simulator-ux`
- base_branch: `cooklily/canonical`
- base_sha_verified: `8bbd57869d171bea3928a3e60b134101f6fc7df8`
- head_sha_verified: pending commit
- pull_requests: none
- last_verified_at: 2026-10-29 13:08 America/Sao_Paulo
- interruption_state: none

## Entrega

Corrigir o cadastro de variável para não submeter o template em edição; preservar histórico e orçamento ao trocar quem iniciou a conversa; aproximar botões da prévia do padrão WhatsApp; limitar o chat a uma área rolável.

## Concluído e persistido

- Reproduzida a submissão inadvertida causada por formulário de variável aninhado no formulário de edição.
- Removido o formulário interno: Enter no nome adiciona a variável e interrompe propagação; o formulário de template e a validação nativa permanecem.
- Troca de origem agora altera somente a premissa de cobrança/janela e mantém conversa, IDs e nó ativo; a cotação recalcula sobre as mensagens mantidas.
- Prévia de botões separada do conteúdo da mensagem, em opções empilhadas de largura total; scroll do chat limitado e segue a nova mensagem.
- Budget bruto CSS ampliado em 1 KiB para acomodar estilos da prévia; gzip continua sob os mesmos limites.

## Gates e testes

- `npm run check`: PASS.
- `npm run test:lily-ui`: 20 arquivos, 89 testes PASS.
- `npm run test:lily-budget`: 4 testes PASS.
- `npm run build:lily`: PASS; 156.12 KiB CSS raw / 156.50 KiB, 30.78 KiB gzip / 31.00 KiB; o aviso existente de JS chunk >500 KiB permanece.
- `git diff --check`: PASS.
- `npm test`: não validado neste worktree; os testes de API precisam bancos SQLite migrados. Tentativa com banco temporário via Prisma falhou no Schema Engine; as tabelas não foram criadas. CI e deploy gate ainda pendentes.

## Migrations

- Nenhuma.

## Bloqueios/riscos

- Precisa aguardar CI e gate de deploy em ambiente com bancos de teste configurados.
- Homologação do visual e persistência no domínio real ainda pendente após deploy.

## Homologação/dependências externas

- Sessão admin disponível no navegador integrado Codex, URL alvo `https://carrochefe.com/lilyacai/painel/whatsapp`.
- Deploy autorizado anteriormente pelo usuário; usar o deployer oficial.

## Próxima ação exata

Executar os testes rápidos finais, commitar alterações e este checkpoint, abrir PR draft para `cooklily/canonical`, aguardar checks. Após integração, executar deploy oficial e homologar adicionar variável durante edição, alternar origem preservando chat/orçamento, conferir botões e rolagem em desktop e celular pelo navegador integrado Codex; registrar correções e resultados.
