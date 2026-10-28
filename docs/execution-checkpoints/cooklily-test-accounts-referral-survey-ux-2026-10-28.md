# CookLily: contas de teste, indicação e entrada em pesquisas

- status: in_progress
- owner: AG-DEV
- branch: codex/cooklily-ranking-staff-exclusion (merged)
- base_branch: cooklily/canonical
- base_sha_verified: bf9fab69085b38d8f9e375bb7519ede7823bc0c6
- head_sha_verified: 1cb9741c1a97e97700eeacccfa6143a90145864e
- pull_requests: #211 merged — https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/211; #213 merged — https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/213; checkpoint follow-up pending
- deploy_sha: bf9fab69085b38d8f9e375bb7519ede7823bc0c6
- tests/gates: focused profile API tests PASS (9/9); full `npm test` PASS (64 files, 346 passed/3 skipped); `npm run check` PASS; `npm run build` and CookLily bundle budget PASS; `git diff --check` PASS. All tests used a disposable Lily DB with 30 migrations.
- migrations: `20261028180000_lily_test_accounts_survey_tokens` committed; all Lily migrations applied to fresh disposable SQLite and exercised by API suite
- blockers: deploy of #213 and live ranking recheck pending
- last_verified_at: 2026-10-28 America/Sao_Paulo
- next_action: deploy canonical at `1cb9741c1a97e97700eeacccfa6143a90145864e`; verify anonymous ranking excludes staff/admin, test-account ranking retains dense ties, and profile labels rank scope correctly.

## Objetivo

Fechar os itens que ficaram sem homologação na execução de links/VIP/cupons, estabelecer recompensa de indicação de 2.000 pontos, implementar `conta de teste` para validação admin/staff sem exposição no ranking e localizar/implementar a UX originalmente solicitada para visitante vindo por link de pesquisa. Registrar próximas entregas MCP administrativo e API de automação e explicitar que a próxima execução de integração será WhatsApp Cloud API oficial.

## Roteiro e checkpoints

1. [x] Encontrar a direção original de UX: pesquisa exige conta; a publicação/notificação deve destacar pontos e tempo estimado. A nova solicitação especifica exibir os benefícios da pesquisa no portão de login/cadastro.
2. [x] Revisar implementação atual de referral, coupon redemption, survey completion/points, test-account permissions, leaderboard e migrations.
3. [x] Critérios definidos: links públicos sem IDs de banco, telefone, nome ou credenciais; referral token aleatório de 256 bits, uso único, cadastro elegível e sem autorreferência; pesquisa com token opaco separado do ID interno, prévia mínima e indisponibilidade ao pausar/cancelar; produto usa slug público estável; query strings de atribuição não são encaminhadas a analytics. Revogação/expiração manual de convites foi explicitamente registrada como fora do modelo atual.
4. [x] Recompensa de indicação configurável e idempotente implementada; produção configurada para 2.000 pontos e confirmada no perfil da conta teste.
5. [x] Flag de conta de teste alterável por admin em cliente, role promotion remove a flag; ranking público oculta e ranking interno inclui teste com posições densas. Testes API PASS.
6. [x] Link da pesquisa mostra preview público com resumo/pontos/duração, CTA login/cadastro e destino preservado; lista/start aceitam token público; API não expõe ID/perguntas na prévia. Testes API PASS.
7. [x] `npm test` (64 arquivos, 346 pass/3 skip), `npm run check`, `npm run build`, migration em banco SQLite descartável e `git diff --check` PASS.
8. [x] PR #211 foi integrado e implantado em `bf9fab69085b38d8f9e375bb7519ede7823bc0c6`; migration, 349 testes de deploy, build, readiness e HTTPS smoke passaram.
9. [x] Homologação ao vivo: indicador de conta teste, recompensa de indicação 2.000, link de indicação reconhecido, gate de pesquisa desktop/mobile, resgate de benefício VIP e notificações de cupom. A conta teste já havia respondido a pesquisa; nova resposta e novo cadastro não foram submetidos para evitar publicar dados de teste no ambiente real.
10. [x] PR #213 squash-merged em `1cb9741c1a97e97700eeacccfa6143a90145864e`; CI verde, incluindo Node 20/24, tool health, Excel, Windows Supervisor e Workbook Snapshot.
11. [ ] Implantar o SHA em canonical e validar ranking público, visão da conta teste e escopo do rótulo do perfil no domínio real.
12. [ ] Fechar este checkpoint e publicar o relatório de execução com as capturas após a validação final.

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

## Homologação de produção e correção complementar

- PR #211 foi squash-merged em `bf9fab69085b38d8f9e375bb7519ede7823bc0c6`. Deploy `sudo cc deploy canonical` concluiu com backup dos dois bancos, migration `20261028180000_lily_test_accounts_survey_tokens`, 64 arquivos/349 testes, `npm run check`, build, readiness local e smoke HTTPS verdes. Evidência no VPS: `/srv/carro-chefe/data/deploy-logs/deploy-20261028-122138-bf9fab69085b.evidence`; log: `/srv/carro-chefe/data/deploy-logs/deploy-20261028-122138-bf9fab69085b.log`.
- Capturas: `C:\Users\valdi\Pictures\CookLily-2026-10-28\survey-gate-desktop.png`, `survey-gate-mobile.png`, `referral-signup-gate.png`, `public-ranking-anonymous.png`, `test-account-ranking.png`, `test-account-profile.png`, `coupon-redeemed-test-account.png` e `test-account-notifications.png`.
- Achado ao vivo: o ranking anônimo omitia a conta `Conta de Testes`, mas mostrava `Chat GPT Codex Agent`, uma conta administrativa. Também o perfil da conta teste chamava sua posição relativa interna de “posição pública”.
- Correção implementada em PR #213 (`1cb9741c1a97e97700eeacccfa6143a90145864e`): filtrar rankings para `role=customer`, mesmo na visão admin/teste, e retornar `rankScope` para o perfil diferenciar posição pública da interna. Cobertura dedicada passou 9/9; suíte completa passou 346/346 (3 skipped), check e build passaram usando banco descartável. CI verde.
- Limitação homologada: o link da pesquisa foi testado até a autenticação; a conta teste já havia respondido, portanto a aplicação corretamente bloqueou segunda resposta. Créditos de pesquisa, gate público/token, filtro VIP e atribuição têm cobertura API, sem uma nova submissão pública ao vivo.
