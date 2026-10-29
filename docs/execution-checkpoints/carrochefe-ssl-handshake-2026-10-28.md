# Incidente — falhas intermitentes de handshake TLS

- Estado: `mitigated_monitoring`; mitigação implantada, causa raiz específica dos clientes ainda não confirmada; janela de captura continua ativa.
- Responsável: `AG-DEV`.
- Branch: `codex/fix-intermittent-tls-mtu`.
- Base branch: `cooklily/canonical`.
- Base SHA: `9f962d34895a228ac0114b89af0ccf84c9f8b33f`.
- HEAD canônico verificado após merge: `b93445996dfd47ee2386644bbdba120cd0cc33d2`.
- PR #236: merged por squash; merge SHA `b93445996dfd47ee2386644bbdba120cd0cc33d2`.
- Deploy VPS: concluído em 29/10/2026 00:01 UTC, release `b93445996dfd47ee2386644bbdba120cd0cc33d2`; log `/srv/carro-chefe/data/deploy-logs/deploy-20261029-000132-b93445996dfd.log`, evidência `/srv/carro-chefe/data/deploy-logs/deploy-20261029-000132-b93445996dfd.evidence`.
- Janela reportada: captura do celular mostra 19:13 local; o VPS usa UTC, então a janela pesquisada foi aproximadamente 22:00–23:00 UTC de 28/10. O arquivo foi enviado pouco depois.
- Última verificação: 29/10/2026 00:05 UTC.

## Sintoma e evidência

- Vários usuários relatam `ERR_SSL_PROTOCOL_ERROR` ao abrir `carrochefe.com/lilyacai/...`; a falha acontece antes de uma requisição HTTP ser processada.
- Na janela histórica, Nginx e Certbot não registraram reload, renovação nem erro. O `error_log` original não declarava nível e operava no padrão `error`, que não registrou uma tentativa sintética de protocolo recusada.
- Certificado `carrochefe.com` válido até 2026-12-13, SAN cobre raiz e `www`; A público em 1.1.1.1/8.8.8.8 é `2.25.182.185`, sem AAAA; Nginx ativo, `nginx -t` OK.
- Testes externos: 80 handshakes pré/pós-mitigação (40 TLS 1.2 e 40 TLS 1.3) passaram; após a última instalação, outros 10/10 TLS 1.2 e 10/10 TLS 1.3 passaram. Os handshakes modernos negociaram HTTP/2; 12 requisições HTTP/2 passaram. TLS 1.0 permanece recusado.
- Teste DF no Windows ligado por Wi‑Fi: o gateway `192.168.100.1` respondeu “precisa ser fragmentado” para payload ICMP de 1465 bytes (pacote IPv4 de 1493 bytes) e também para 1472 bytes; tamanhos menores não tiveram resposta do destino, então o limite exato não foi determinado. Isto demonstra um MTU abaixo de 1500 neste caminho local, não necessariamente nos clientes afetados.
- Captura breve de cabeçalhos TCP no VPS: 305 pacotes, zero descartados pelo kernel; SYNs observados incluíram MSS 1412 (MSS é negociado por conexão). A amostra não identifica a rede dos clientes reclamantes.
- Teste sintético TLS 1.0 confirmou a falta de visibilidade: o error log anterior não registrava a falha em nível `info`; com a nova instrumentação, o tráfego inválido chegou ao Nginx e foi registrado. O teste nesta VPS também demonstrou uma resposta HTTP 400 sem negociação TLS (`tls=-`), enquanto TLS 1.2/1.3 completaram normalmente. Isso é evidência da observabilidade, não simulação conclusiva do caminho de rede defeituoso do cliente.

## Mitigação aplicada no VPS

- Ativado `net.ipv4.tcp_mtu_probing=1` via `/etc/sysctl.d/99-cooklily-tcp-pmtud.conf`; valor foi confirmado ativo. O modo 1 habilita PLPMTUD quando o kernel detecta blackhole, sem forçar MSS baixo em todas as conexões. Referência: [documentação oficial do kernel Linux](https://docs.kernel.org/networking/ip-sysctl.html).
- Nginx agora registra respostas HTTP concluídas em `/var/log/nginx/carrochefe-tls.log` com timestamp, host, TLS, cipher, ALPN e status; sem IP, caminho, query string ou corpo.
- Falhas TLS são capturadas em nível `info` em `/var/log/nginx/carrochefe-tls-error.log`. Como esse canal pode conter IPs e detalhes de erro, o arquivo é `0640 root:adm`, e o script remove IPs ao gerar o TXT. Rotação diária, sete cópias.
- Nginx passou em `nginx -t` e permaneceu `active`; captura de teste mostrou a falha TLS 1.0 esperada e um handshake TLS 1.3/h2 com HTTP 200.
- Observador ativo por 60 minutos. Após corrigir a redação de IPv6, a captura anterior foi encerrada e substituída por `/var/tmp/cooklily-tls-20261028-234821-GGz4Cd.txt`, modo `0600`, iniciada às 23:48:21 UTC e prevista para encerrar às 00:48:21 UTC em 29/10. O relatório já mostra eventos recentes e mascara IPv4/IPv6.
- Após o deploy, o observador seguiu ativo. A janela registrou sucesso HTTP/TLS e dois `502` transitórios em 00:04:08 UTC durante o restart do Fastify; o health/smoke voltou a `200` em 00:04:10. Isso foi indisponibilidade HTTP breve durante restart, não falha de handshake TLS.
- Helpers instalados em `/usr/local/sbin/enable-cooklily-tls-logging`, `/usr/local/sbin/enable-cooklily-tcp-pmtud` e `/usr/local/sbin/capture-cooklily-tls`.
- Para iniciar uma nova janela antes da próxima tentativa do cliente: `sudo /usr/local/sbin/capture-cooklily-tls --minutes 60`. Para consultar retrospectivamente até 180 minutos após uma tentativa: `sudo bash /srv/carro-chefe/current/deploy/scripts/diagnose-cooklily-access --minutes 20`.

## Alterações versionadas deste hotfix

- `deploy/scripts/enable-cooklily-tls-logging`: configura log TLS de sucesso sem dados do cliente, error log TLS em nível info e retenção curta, com backup/validação do Nginx.
- `deploy/scripts/enable-cooklily-tcp-pmtud`: habilita fallback PMTU persistente com rollback do valor sysctl em caso de erro.
- `deploy/scripts/capture-cooklily-tls`: captura erros reais de handshake, metadados de sucesso e reloads durante uma janela limitada; mascara IPs e protege o TXT.
- `deploy/scripts/diagnose-cooklily-access`: correção da redação IPv6 que preserva tokens `::` de erros OpenSSL.
- `deploy/scripts/survey-ops.test.mjs`: testes de sintaxe, retenção, privacidade e redação IPv6.

## Gates e rollout

- `node --test deploy/scripts/survey-ops.test.mjs`: 9/9 passaram.
- `bash -n` nos três helpers e `git diff --check`: passaram.
- `npm run policy:preflight -- --agent AG-DEV --scope deploy/scripts,docs/execution-checkpoints`: passou no branch atual, manifesto `24d8c85a...`.
- `npm run check`: passou.
- `npm test`: passou com 68 arquivos, 357 testes aprovados e 3 ignorados. Para evitar estado antigo, databases de teste novos foram criados em `.runtime/` e migrados antes da suíte.
- `npm run build`: passou; Vite mostrou alerta já existente sobre chunk JavaScript acima de 500 kB, e o limite próprio da CookLily passou (`build_budget=ok`).
- `npm run policy:check`: passou (`2026.09.19.1`).
- `node --test deploy/scripts/survey-ops.test.mjs`: 9/9 passaram; `bash -n` dos três helpers e `git diff --check` passaram após a correção do redator.
- VPS: `tcp_mtu_probing=1`, `nginx -t` passou, serviço ativo; 10/10 conexões TLS 1.2 e 10/10 TLS 1.3 passaram após a instalação final.
- Domínio real confirmado na aba Codex in-app: `https://carrochefe.com/lilyacai/cardapio` carregou conteúdo e imagens do catálogo; screenshot capturado e aba marcada como entregável. Não foram controlados Chrome/Edge externos.
- Nota de execução: uma primeira execução da suíte contra o banco SQLite padrão local encontrou migrations antigas e resultou em 103 falhas de API. Os gates completos passaram depois de preparar bancos descartáveis migrados. A execução de migration também atualizou migrations pendentes no banco de desenvolvimento ignorado `.runtime/carro-chefe.db`; nenhum banco de produção foi usado.
- `npm run check`, `npm test` e `npm run build`: pendentes antes de concluir o PR, conforme `REGRAS.md`.
- PR #236 CI: passou nos jobs Node 20 e 24, Tool Health, Workbook Snapshot, Windows Supervisor e Excel Recipe.
- PR #236 merge/deploy: concluídos; `sudo cc deploy canonical` terminou com readiness e `external_smoke=ok`.
- Pós-deploy: `sudo cc status` confirmou current/canonical SHA `b9344599...`; PMTU `1`; Nginx e aplicação ativos; `nginx -t` passou; 10/10 TLS 1.2, 10/10 TLS 1.3; cardápio HTTP `200` em HTTP/2. O browser integrado carregou novamente os 8 produtos e as imagens no domínio real; screenshot registrado na sessão.

## Limite e próxima ação

O ajuste de PMTU é mitigação preventiva coerente com um caminho medido abaixo de MTU 1500; ainda não há prova de que a conexão dos clientes afetados tenha exatamente o mesmo problema. Não afirmar causa raiz nem resolução garantida até surgir uma falha real no log dedicado ou confirmação dos usuários.

Próxima ação exata: depois de 00:48:21 UTC, ler `/var/tmp/cooklily-tls-20261028-234821-GGz4Cd.txt` na VPS; classificar somente eventos de origem real, separando probes sintéticos e os `502` do restart. Se nenhum cliente falhar durante a janela, manter os helpers instalados para uma nova captura iniciada antes da próxima tentativa do cliente. Se surgir erro real, cruzar motivo/tempo com handshake e rede observados e ajustar somente com evidência.
