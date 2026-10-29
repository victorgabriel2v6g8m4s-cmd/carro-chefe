# Incidente — falhas intermitentes de handshake TLS

- Estado: `mitigated_monitoring`; mitigação implantada, causa raiz específica dos clientes ainda não confirmada; reteste após ajuste PMTU solicitado.
- Responsável: `AG-DEV`.
- Branch: `codex/fix-intermittent-tls-mtu`.
- Base branch: `cooklily/canonical`.
- Base SHA: `9f962d34895a228ac0114b89af0ccf84c9f8b33f`.
- HEAD canônico verificado após merge: `b93445996dfd47ee2386644bbdba120cd0cc33d2`.
- PR #236: merged por squash; merge SHA `b93445996dfd47ee2386644bbdba120cd0cc33d2`.
- Deploy VPS: concluído em 29/10/2026 00:01 UTC, release `b93445996dfd47ee2386644bbdba120cd0cc33d2`; log `/srv/carro-chefe/data/deploy-logs/deploy-20261029-000132-b93445996dfd.log`, evidência `/srv/carro-chefe/data/deploy-logs/deploy-20261029-000132-b93445996dfd.evidence`.
- Janela reportada: captura do celular mostra 19:13 local; o VPS usa UTC, então a janela pesquisada foi aproximadamente 22:00–23:00 UTC de 28/10. O arquivo foi enviado pouco depois.
- Última verificação: 29/10/2026 00:31 UTC.

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
- Na ocorrência reportada novamente às 00:26 UTC, a captura de 20 minutos iniciada às 00:19:14 (`/var/tmp/cooklily-tls-20261029-001914-jsDsUb.txt`) mostrou apenas acessos normais de diagnóstico (TLS 1.3/HTTP2), sem erro de handshake correspondente. O diagnóstico retrospectivo `/var/tmp/cooklily-access-20261029-002645-XKtb8f.txt` também não encontrou erro TLS/rede na janela. Não há evidência de que a conexão daquele cliente chegou ao Nginx.
- Como experimento temporário para a hipótese PMTU, o kernel foi mudado de `tcp_mtu_probing=1` para `2` às 00:28 UTC, sem alterar a persistência. `tcp_base_mss=1024`; depois da mudança, 10/10 handshakes TLS 1.2, 10/10 TLS 1.3 e HTTPS `200`/HTTP2 passaram. Retorno automático ao modo `1` agendado para 15 minutos após o teste, para limitar impacto de throughput. O resultado do cliente ainda não foi informado.
- Captura TCP de cabeçalhos iniciada em 00:31:22 UTC por cinco minutos: `/var/tmp/cooklily-tcp-path-20261029-003122-ZWJVq5.txt`. Observa flags, MSS, sequências e retransmissões em TCP/443, snaplen 96, sem imprimir nem salvar payload; IPs são mascarados e o arquivo é privado. Foi iniciada para a nova tentativa do cliente.
- Após o deploy, o observador seguiu ativo. A janela registrou sucesso HTTP/TLS e dois `502` transitórios em 00:04:08 UTC durante o restart do Fastify; o health/smoke voltou a `200` em 00:04:10. Isso foi indisponibilidade HTTP breve durante restart, não falha de handshake TLS.
- Helpers instalados em `/usr/local/sbin/enable-cooklily-tls-logging`, `/usr/local/sbin/enable-cooklily-tcp-pmtud` e `/usr/local/sbin/capture-cooklily-tls`.
- Para iniciar uma nova janela antes da próxima tentativa do cliente: `sudo /usr/local/sbin/capture-cooklily-tls --minutes 60`. Para consultar retrospectivamente até 180 minutos após uma tentativa: `sudo bash /srv/carro-chefe/current/deploy/scripts/diagnose-cooklily-access --minutes 20`.

## Alterações versionadas deste hotfix

- `deploy/scripts/enable-cooklily-tls-logging`: configura log TLS de sucesso sem dados do cliente, error log TLS em nível info e retenção curta, com backup/validação do Nginx.
- `deploy/scripts/enable-cooklily-tcp-pmtud`: habilita fallback PMTU persistente com rollback do valor sysctl em caso de erro.
- `deploy/scripts/capture-cooklily-tls`: captura erros reais de handshake, metadados de sucesso e reloads durante uma janela limitada; mascara IPs e protege o TXT.
- `deploy/scripts/capture-cooklily-tcp-path`: captura metadados apenas do cabeçalho TCP/443, com IPs mascarados e sem payload.
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
- Reteste do helper TCP: `node --test deploy/scripts/survey-ops.test.mjs` 10/10 passou; Bash syntax e `git diff --check` passaram. Helper instalado no VPS; observador de cinco minutos ativo.
- VPS: `tcp_mtu_probing=1`, `nginx -t` passou, serviço ativo; 10/10 conexões TLS 1.2 e 10/10 TLS 1.3 passaram após a instalação final.
- Domínio real confirmado na aba Codex in-app: `https://carrochefe.com/lilyacai/cardapio` carregou conteúdo e imagens do catálogo; screenshot capturado e aba marcada como entregável. Não foram controlados Chrome/Edge externos.
- Nota de execução: uma primeira execução da suíte contra o banco SQLite padrão local encontrou migrations antigas e resultou em 103 falhas de API. Os gates completos passaram depois de preparar bancos descartáveis migrados. A execução de migration também atualizou migrations pendentes no banco de desenvolvimento ignorado `.runtime/carro-chefe.db`; nenhum banco de produção foi usado.
- `npm run check`, `npm test` e `npm run build`: pendentes antes de concluir o PR, conforme `REGRAS.md`.
- PR #236 CI: passou nos jobs Node 20 e 24, Tool Health, Workbook Snapshot, Windows Supervisor e Excel Recipe.
- PR #236 merge/deploy: concluídos; `sudo cc deploy canonical` terminou com readiness e `external_smoke=ok`.
- Pós-deploy: `sudo cc status` confirmou current/canonical SHA `b9344599...`; PMTU `1`; Nginx e aplicação ativos; `nginx -t` passou; 10/10 TLS 1.2, 10/10 TLS 1.3; cardápio HTTP `200` em HTTP/2. O browser integrado carregou novamente os 8 produtos e as imagens no domínio real; screenshot registrado na sessão.
- Reteste da ocorrência: a captura do cliente não produziu handshake ou erro correspondente; modo agressivo `2` está em teste temporário com rollback automático para `1`.

## Limite e próxima ação

O ajuste de PMTU é mitigação preventiva coerente com um caminho medido abaixo de MTU 1500; ainda não há prova de que a conexão dos clientes afetados tenha exatamente o mesmo problema. Não afirmar causa raiz nem resolução garantida até surgir uma falha real no log dedicado ou confirmação dos usuários.

Próxima ação exata: cliente indisponível; quando voltar, iniciar captura curta antes da tentativa e cruzar o horário com TLS/TCP. Não fazer novas alterações globais sem esse sinal.

## Investigação adicional sem o cliente (2026-10-29 01:23 UTC)

- O rollback automático ocorreu: `net.ipv4.tcp_mtu_probing=1`; `tcp_base_mss=1024` (valor base do kernel, sem regra de MSS clamp em nftables/iptables). O teste em modo 2 não recebeu confirmação do cliente e não prova mitigação.
- DNS atual resolve apenas `A 2.25.182.185`; não há `AAAA`. Não há seleção intermitente entre IPv4 e IPv6 observável via DNS público nesta configuração.
- Certificado Let's Encrypt válido de 2026-09-14 a 2026-12-13, SAN cobre `carrochefe.com` e `www.carrochefe.com`, verificação OpenSSL OK. SNI correto e conexões TLS 1.2/1.3 passaram; HTTPS retornou 200 com verificação do certificado 0.
- Nginx oferece TLS 1.2/1.3. A chave/certificado publicado é ECDSA. Probe TLS 1.2 com assinatura ECDSA passou; probe artificial limitado a assinatura RSA falhou com alerta 40. Isso identifica uma hipótese de compatibilidade para clientes TLS antigos/proxies que só anunciem assinatura RSA; não atribui o erro aos celulares reportados e não justifica trocar/duplicar certificados sem evidência do ClientHello afetado.
- Probe sem SNI também passou e recebeu certificado válido do domínio. Ping DF de saída da VPS para 1.1.1.1 respondeu para payloads de 1472 até 1000 bytes; isso só testa o caminho de saída da VPS, não o caminho do cliente.
- Captura TCP encerrada às 00:36:22 UTC: 125 pacotes no total; um SYN e um SYN-ACK vistos na amostra, sem correlação com cliente e sem retransmissão comprovada. TLS watcher não mostrou falha atribuível ao cliente. Resultado não identifica a causa.
- Estado atual VPS: Nginx ativo, configuração TLS disponível, domínio público HTTP 200. Não há mudança permanente adicional feita nesta rodada.

Conclusão provisória: incompatibilidade de assinatura ECDSA/RSA é uma hipótese testável para clientes antigos; fragmentação/PMTU específica da rede móvel permanece sem confirmação. A próxima coleta útil exige o horário exato da falha e uma tentativa durante captura TLS/TCP; idealmente, obter também modelo do aparelho, versão Android/Chrome e operadora, sem coletar identificadores pessoais.

## Nova tentativa do cliente (2026-10-29 01:44:30 UTC aprox.)

- Proprietário esclareceu que 22:44 é horário de Brasília (UTC−3), não de Campo Grande (UTC−4). Janela de tolerância informada: 22:43–22:45 BRT = 01:43–01:45 UTC. Cliente confirmou `ERR_SSL_PROTOCOL_ERROR` novamente; aparelho Samsung A56, Chrome 156.0.8078.47.
- Capturas TLS/TCP executadas de 01:43:43 a 01:53:43 UTC: `/var/tmp/cooklily-tls-20261029-014343-oUIYmk.txt` e `/var/tmp/cooklily-tcp-path-20261029-014343-ioVBO9.txt`, privadas e com endereços mascarados.
- Janela completa: 22 eventos TLS observados, todos `NGINX_TLS_OK`; zero falhas no error log TLS. O TCP capture viu 301 pacotes totais, sem retransmissões anotadas; os únicos SYNs novos foram sondagens automatizadas às 01:49:37 UTC, fora da janela do usuário. Não houve SYN/handshake atribuível ao Samsung A56 entre 01:43 e 01:45 UTC.
- Os 22 HTTP 401 foram identificados no access log com método/path/UA minimizados: `GET /api/v1/lily/notifications`, UA Windows NT 10.0 / Chrome 156.0.0.0, repetido em cadência de 60 segundos. Não são do Samsung A56. O padrão coincide com o polling em `apps/lily_acai/src/main.tsx` (linha 151), que consulta `notifications?limit=1` (linha 144) a cada minuto quando o estado local indica usuário; uma sessão expirada/inválida pode responder 401. HTTP 401 significa que essa requisição HTTP chegou após handshake TLS concluído; não indica falha TLS nem tentativa do cliente móvel.
- Nginx ficou ativo e `nginx -t` passou. Conclusão: o erro do cliente não chegou à interface de rede/Nginx da VPS na janela informada. Evidência favorece falha antes da VPS ou resolução/rota distinta no aparelho/rede; ainda não discrimina DNS, operadora, Wi‑Fi, proxy/VPN ou caminho assimétrico. O modelo/Chrome atuais tornam a hipótese de cliente TLS legado que só aceita RSA muito improvável; não há evidência para trocar certificado ou cipher suites.

## Teste em dados móveis e repetição com PMTU modo 2 (2026-10-29)

- Antes das tentativas, iniciou-se nova janela TLS/TCP de 10 minutos às 01:58:27 UTC: `/var/tmp/cooklily-tls-20261029-015827-B3pmGW.txt` e `/var/tmp/cooklily-tcp-path-20261029-015827-zpQfvg.txt`.
- O cliente testou em dados móveis e confirmou o mesmo `ERR_SSL_PROTOCOL_ERROR`. O proprietário então pediu um segundo teste em modo PMTU 2; o modo foi ativado às ~01:59:30 UTC, com timer de retorno após 15 minutos verificado. O cliente repetiu o teste e reportou o mesmo erro.
- Durante as tentativas, o TLS watcher registrou apenas respostas `NGINX_TLS_OK`, sem erros TLS. O access log associado mostra polling de `/api/v1/lily/notifications` de Chrome 156 no Windows (401, uma vez por minuto); a origem não é o Samsung A56. A consulta no código confirma polling periódico no dashboard (`apps/lily_acai/src/main.tsx`), então esses 401 explicam-se por uma aba desktop aberta com estado/sessão não autorizada e não são causa do handshake móvel.
- Nenhum SYN ou handshake atribuível ao telefone chegou à VPS na janela observada. O modo 2 não apresentou evidência de efeito para a tentativa, pois o tráfego do cliente não alcançou o host; após a resposta negativa, PMTU voltou manualmente para `1` e o timer foi cancelado. Valor confirmado: `net.ipv4.tcp_mtu_probing=1`.
- As capturas da janela de 10 minutos permaneceram ativas após a mudança para observar novas tentativas. Sem pacote vindo do cliente, não é possível testar MSS/fragmentação da sessão dele na VPS. Evidência agora aponta mais fortemente para DNS ou caminho/rede entre o A56 e o endereço publicado, e afasta a configuração TLS da VPS como causa observada; causa exata permanece sem identificação.
- Às 02:02:29–30 UTC (23:02:29–30 BRT), após o relato de nova falha, houve TLS 1.3 bem-sucedido com HTTP 200/204 para `GET /`, `/assets/products/chefao-recorte-v02.webp` e `/favicon.ico`, UA `WhatsApp/2.23.20.0`; trata-se de outro cliente/agente, possivelmente prévia de link, e não prova acesso do Chrome do A56. Próximo teste discriminante: abrir o app Chrome diretamente e digitar a URL, sem passar pelo WhatsApp, enquanto a captura atual ainda estiver ativa; a janela termina às 02:08:27 UTC.
