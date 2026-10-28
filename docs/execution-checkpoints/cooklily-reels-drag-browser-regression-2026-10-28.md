# CookLily Reels — gestos e controles

- status: completed
- owner: AG-DEV
- branch: cooklily/canonical
- base_branch: cooklily/canonical
- base_sha_verified: c2b0615f31fa4a341f56256d8de4ae4701b88366
- head_sha_verified: df0ca1eea01d02b00d55275dcfbd8023444282b3
- pull_requests: #230, #231, #232 e #233 merged; PR #233 reorganizou os controles na ordem solicitada
- deployed_sha: df0ca1eea01d02b00d55275dcfbd8023444282b3
- deployment_evidence: /srv/carro-chefe/data/deploy-logs/deploy-20261028-181745-df0ca1eea01d.evidence
- tests/gates: PR #233 CI verde (7 checks). Deploy canônico concluído: testes completos passaram, build passou com orçamento CookLily em 216.95/217 KiB, tool health passou, backups dos bancos verificados, migrações sem pendências, readiness e smoke externo passaram.
- browser_homologation: domínio real via navegador integrado do Codex, 2026-10-28. Captura confirmou vídeo em tela cheia e controles icon-only na sequência Curtir → Adicionar ao carrinho → Comentar → Compartilhar → Salvar. Tecla Down avançou de Morango para Morango Nutt; scroll/arraste vertical retornou ao produto anterior sem sair de /lilyacai/reels. Comentários abriram com estado vazio esperado. Não foi testado adicionar ao carrinho nesta homologação.
- migrations: nenhuma
- blockers: nenhum para esta entrega.
- known_local_test_db_incident: uma execução local inicial de `npm test` usou `.runtime/lily-acai.db`, cujo schema antigo não contém `loyaltyRoundingMode`; falhou e a suíte removeu dados de teste dessa base runtime local. Um snapshot pós-execução foi preservado em `.runtime/lily-acai-preserved-20261028-1442.db`; o estado anterior original não pode ser estabelecido pelo repositório. As execuções posteriores usaram `.runtime/lily-acai-check.db` isolado. O banco da VPS foi separado e teve backup verificado durante o deploy.
- last_verified_at: 2026-10-28 America/Sao_Paulo
- next_action: nenhuma para esta entrega; a implementação está integrada, publicada e homologada nos comportamentos listados.
