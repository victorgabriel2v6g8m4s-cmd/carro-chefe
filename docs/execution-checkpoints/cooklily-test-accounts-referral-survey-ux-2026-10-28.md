# CookLily: contas de teste, indicação e entrada em pesquisas

- status: in_progress
- owner: AG-DEV
- branch: codex/cooklily-test-accounts-referral-survey-ux
- base_branch: cooklily/canonical
- base_sha_verified: b7232966ca560e31266b38d694006e0204e9ca0d
- head_sha_verified: b7232966ca560e31266b38d694006e0204e9ca0d
- pull_requests: none
- deploy_sha: 2d4f5a603632f9969d599447d1ee318845fd1fb2 (existing production release)
- tests/gates: policy preflight PASS; focused API 28/28 PASS; full suite 64 files, 345 passed/3 skipped PASS; check PASS; build PASS after +1.5 KiB JS budget adjustment
- migrations: schema and `20261028180000_lily_test_accounts_survey_tokens` added; all Lily migrations applied to disposable SQLite and exercised by API suite
- blockers: none
- last_verified_at: 2026-10-28 America/Sao_Paulo
- next_action: document share-link criteria, commit/push branch, open PR against `cooklily/canonical`, pass CI/CodeQL, merge, deploy authorized VPS release, set production referral reward to 2,000, and run live desktop/mobile journeys with screenshots.

## Objetivo

Fechar os itens que ficaram sem homologação na execução de links/VIP/cupons, estabelecer recompensa de indicação de 2.000 pontos, implementar `conta de teste` para validação admin/staff sem exposição no ranking e localizar/implementar a UX originalmente solicitada para visitante vindo por link de pesquisa. Registrar próximas entregas MCP administrativo e API de automação e explicitar que a próxima execução de integração será WhatsApp Cloud API oficial.

## Roteiro e checkpoints

1. [x] Encontrar a direção original de UX: pesquisa exige conta; a publicação/notificação deve destacar pontos e tempo estimado. A nova solicitação especifica exibir os benefícios da pesquisa no portão de login/cadastro.
2. [ ] Revisar implementação atual de referral, coupon redemption, survey completion/points, test-account permissions, leaderboard e migrations.
3. [x] Critérios: links públicos nunca carregam IDs de banco, telefone, nome ou credenciais; convite/referral usa token aleatório ≥128 bits, uso único e pode ser revogado/limitado; pesquisa usa token opaco separado do ID interno, metadados públicos mínimos e permite pausar/cancelar; produto usa slug público estável; query strings de atribuição não são encaminhadas a analytics.
4. [ ] Implementar/ajustar reward de indicação de 2.000 pontos, idempotência, elegibilidade e atribuição; testar sem duplicidade.
5. [ ] Implementar flag/capability de conta de teste atribuível só por admin; excluí-la do ranking público/interações de clientes; incluí-la no ranking em contexto admin/teste com posição densa e empates sem lacunas.
6. [ ] Implementar UX da pesquisa para anônimos conforme requisito encontrado (mostrar resumo, pontos/recompensa e CTA login/cadastro mantendo destino/atribuição) com API pública minimizada.
7. [ ] Rodar suites, check/build, migration em DB descartável, revisão de segurança e testes de ranking/conta/indicação/survey.
8. [ ] Deploy autorizado em VPS, testar domínio real em desktop/mobile e registrar capturas, falhas, correções e retestes.
9. [ ] Criar conta(s) descartável(is), resgatar cupom VIP e público, responder pesquisa, revisar créditos/notificações/ranking; a autorização permanente do proprietário permite aceitar os termos somente para a conta de testes.
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
