# CookLily: contas de teste, indicação e entrada em pesquisas

- status: in_progress
- owner: AG-DEV
- branch: codex/cooklily-test-accounts-referral-survey-ux
- base_branch: cooklily/canonical
- base_sha_verified: b7232966ca560e31266b38d694006e0204e9ca0d
- head_sha_verified: b06edf30879dca8c29d92ab794b6622dcd92b0c8
- pull_requests: none
- deploy_sha: 2d4f5a603632f9969d599447d1ee318845fd1fb2 (existing production release)
- tests/gates: policy preflight PASS; `npm test` PASS (64 files, 346 passed/3 skipped); `npm run check` PASS; `npm run build` PASS (CookLily bundle budgets PASS after +1.5 KiB JS allowance); `git diff --check` PASS
- migrations: `20261028180000_lily_test_accounts_survey_tokens` committed; all Lily migrations applied to fresh disposable SQLite and exercised by API suite
- blockers: none
- last_verified_at: 2026-10-28 America/Sao_Paulo
- next_action: push `b06edf30879dca8c29d92ab794b6622dcd92b0c8`, open PR against `cooklily/canonical`, pass CI/CodeQL, merge, deploy authorized VPS release, set production referral reward to 2,000, and run live desktop/mobile journeys with screenshots.

## Objetivo

Fechar os itens que ficaram sem homologação na execução de links/VIP/cupons, estabelecer recompensa de indicação de 2.000 pontos, implementar `conta de teste` para validação admin/staff sem exposição no ranking e localizar/implementar a UX originalmente solicitada para visitante vindo por link de pesquisa. Registrar próximas entregas MCP administrativo e API de automação e explicitar que a próxima execução de integração será WhatsApp Cloud API oficial.

## Roteiro e checkpoints

1. [x] Encontrar a direção original de UX: pesquisa exige conta; a publicação/notificação deve destacar pontos e tempo estimado. A nova solicitação especifica exibir os benefícios da pesquisa no portão de login/cadastro.
2. [x] Revisar implementação atual de referral, coupon redemption, survey completion/points, test-account permissions, leaderboard e migrations.
3. [x] Critérios definidos: links públicos sem IDs de banco, telefone, nome ou credenciais; referral token aleatório de 256 bits, uso único, cadastro elegível e sem autorreferência; pesquisa com token opaco separado do ID interno, prévia mínima e indisponibilidade ao pausar/cancelar; produto usa slug público estável; query strings de atribuição não são encaminhadas a analytics. Revogação/expiração manual de convites foi explicitamente registrada como fora do modelo atual.
4. [x] Recompensa de indicação configurável e idempotente implementada; teste API com 2.000 pontos, uso único e rejeição de reutilização PASS. Aplicar 2.000 à configuração operacional de produção permanece pendente do painel após deploy.
5. [x] Flag de conta de teste alterável por admin em cliente, role promotion remove a flag; ranking público oculta e ranking interno inclui teste com posições densas. Testes API PASS.
6. [x] Link da pesquisa mostra preview público com resumo/pontos/duração, CTA login/cadastro e destino preservado; lista/start aceitam token público; API não expõe ID/perguntas na prévia. Testes API PASS.
7. [x] `npm test` (64 arquivos, 346 pass/3 skip), `npm run check`, `npm run build`, migration em banco SQLite descartável e `git diff --check` PASS.
8. [ ] Deploy autorizado em VPS, testar domínio real em desktop/mobile e registrar capturas, falhas, correções e retestes.
9. [ ] Em produção, marcar a conta de teste existente, criar contas descartáveis autorizadas, resgatar cupom VIP e público, responder pesquisa, revisar créditos/notificações/ranking; autorização permanente permite aceite de termos somente para contas designadas de teste.
10. [ ] Publicar checkpoint atualizado na canonical após gates verdes.

## Próximas entregas adicionadas ao roadmap

- MCP administrativo CookLily para LLMs autorizados executarem tarefas de admin/staff em catálogo, cupons, pesquisas, diagnóstico e correção via prompt, com permissões por ferramenta, confirmação para ações sensíveis, auditoria, idempotência e dados minimizados.
- API de automação para scripts realizarem as mesmas operações de painel, com autenticação de máquina, escopos mínimos, rate limits, idempotência, trilha de auditoria e sem expor sessão humana.
- Após concluir este trabalho, a próxima entrega de implementação será a integração ao WhatsApp pela API oficial (WhatsApp Cloud API), precedida da documentação e credenciais operacionais necessárias; não migrar para integração não oficial.

## Estado validado até agora

- Flags de conta de teste existem no schema/API/admin; API aceita toggle apenas para clientes e ranking público exclui test accounts. Ranking admin/teste inclui test accounts e usa posições densas por pontos.
- Cadastro por indicação é one-shot e credita o evento em transação idempotente; tokens novos usam 256 bits; código já reivindicado é rejeitado. Valor de produção 2.000 pontos ainda depende de gravar a configuração no painel após deploy.
- Links de pesquisa usam token público opaco, prévia anônima limitada a título/subtítulo/descrição/duração/contagem/pontos, e login/cadastro preserva o destino. ID interno e conteúdo de respostas não são expostos pela prévia.
- Critérios definidos nesta entrega: produto usa slug público; pesquisa usa token aleatório separado do ID e só compartilha resumo mínimo, ficando indisponível ao pausar/cancelar; indicação usa token aleatório, vale para um novo cadastro elegível, não aceita autorreferência, conta inativa/equipe ou reutilização, e atribuição não inclui PII. Recompensa e autenticação do convite persistem server-side; parâmetros de atribuição não devem seguir para analytics.
- Regras de expiração/revogação manual dos convites e expiração das pesquisas não existem no modelo atual; ficam fora dos critérios operacionais desta entrega, salvo o desligamento pela pausa/cancelamento da pesquisa.
