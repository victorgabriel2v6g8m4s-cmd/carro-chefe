# Incidente — falhas intermitentes de handshake TLS

- Estado: `confirmed_for_adguard_user_monitoring_other_reports`; mitigação TLS/PMTU já implantada; bloqueio DNS da AdGuard confirmado para um usuário, demais relatos ainda sem provedor identificado.
- Responsável: `AG-DEV`.
- Branch: `codex/fix-intermittent-tls-mtu`.
- Base branch: `cooklily/canonical`.
- Base SHA: `9f962d34895a228ac0114b89af0ccf84c9f8b33f`.
- HEAD canônico verificado após merge: `b93445996dfd47ee2386644bbdba120cd0cc33d2`.
- PR #236: merged por squash; merge SHA `b93445996dfd47ee2386644bbdba120cd0cc33d2`.
- Deploy VPS: concluído em 29/10/2026 00:01 UTC, release `b93445996dfd47ee2386644bbdba120cd0cc33d2`; log `/srv/carro-chefe/data/deploy-logs/deploy-20261029-000132-b93445996dfd.log`, evidência `/srv/carro-chefe/data/deploy-logs/deploy-20261029-000132-b93445996dfd.evidence`.
- Janela reportada: captura do celular mostra 19:13 local; o VPS usa UTC, então a janela pesquisada foi aproximadamente 22:00–23:00 UTC de 28/10. O arquivo foi enviado pouco depois.
- Última verificação: 30/10/2026 17:58 America/Sao_Paulo.

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

## Investigação de novo relato — 30/10/2026, 15:57 BRT

- Evidência fornecida: captura de tela com `ERR_SSL_PROTOCOL_ERROR`, aparência de Chrome em Android. A imagem permite inferir Android/Chrome, mas não modelo, versão do Android nem versão do Chrome.
- Correlação temporal: 15:57 BRT corresponde a 18:57 UTC. No log TLS dedicado há tentativas entre 18:57:44 e 18:57:59 UTC encerradas pelo cliente enquanto o Nginx aguardava concluir o handshake. Não houve registro de sessão TLS concluída nem requisição HTTP desse grupo. Os endereços de origem estavam no bloco Cloudflare `104.28.0.0/14`; isso é compatível com saída por WARP/proxy Cloudflare, mas não prova que o cliente usava WARP.
- No mesmo minuto o log de sucesso TLS e o access log registram somente outras sessões normais; não há `SSL_do_handshake() failed`, `no shared cipher`, `unsupported protocol` ou `bad key share` associados ao horário do print. Portanto, para este cliente a evidência identifica a interrupção pelo lado cliente/proxy antes de completar TLS, mas não a causa inicial que levou o cliente a abortar.
- Erros `no shared cipher`, `unsupported protocol` e `bad key share` encontrados em 19:50–19:55 UTC são tentativas de outros horários/origens e não devem ser atribuídos ao print. São negociações incompatíveis ou malformed probes que o Nginx recusou conforme esperado sob TLS 1.2/1.3.
- DNS consultado no diagnóstico atual aponta A `carrochefe.com -> 2.25.182.185`, sem AAAA; SOA informa DNS da Hostinger. O domínio chega diretamente à VPS, sem proxy/CDN Cloudflare configurado no DNS do site.
- Firewall Hostinger apresentado pelo proprietário aceita TCP 22, 80 e 443 de qualquer origem e descarta o restante. UFW local está ativo com `deny incoming` e libera somente essas mesmas portas em IPv4/IPv6. A tentativa do print chegou ao Nginx em 443, então o firewall não a descartou.
- `nginx -T` e `nginx -t` confirmados na VPS. TLS ativo: `TLSv1.2 TLSv1.3`, certificado Let's Encrypt `fullchain.pem`, HTTP/2 por TCP; o certificado cobre raiz e `www`.
- Qualys SSL Labs API concluiu scan em 30/10/2026 17:25 BRT: nota A, sem warnings, TLS 1.2/1.3, HTTP 200, cadeia confiável nos trust stores testados (incluindo Android). HSTS ausente e OCSP stapling desativado não explicam uma desconexão durante o handshake. Referência: https://www.ssllabs.com/ssltest/analyze.html?d=carrochefe.com&latest.
- RBL Spamhaus ZEN: o checker web retornou HTTP 403 no ambiente de consulta. Consulta DNS pelo resolvedor da rede local não retornou listagem para `2.25.182.185`; controles válidos confirmaram que o resolvedor retorna os códigos esperados para um IP de teste listado e NXDOMAIN para um teste não listado. Resultado: não listado no ZEN nesta consulta. Referência: https://check.spamhaus.org/faqs/dnsbl-usage/.
- MXToolbox Blacklist: consulta do IP `2.25.182.185` em 30/10/2026 encontrou 0 listagens e 0 timeouts entre 60 listas verificadas.
- MultiRBL Valli: 255 testes consultados. Na categoria principal de 201 DNSBLs, a página marcou 5 listagens, 6 falhas e 190 sem listagem. Quatro marcações foram respostas explícitas `127.0.0.1 Query Refused` de URIBL (limite do serviço consultado por MultiRBL, não listagem do IP). A quinta, `rbl.rbldns.ru`, retornou somente um TXT genérico do servidor sem resposta A; a consulta independente expirou, então permanece inconclusiva. A categoria combinada retornou um registro Hostkarma classificado como `neutral` e quatro falhas. Listas RBL são voltadas principalmente à reputação de envio de e-mail e não bloqueiam o TLS do site por si sós.
- Limitação importante do diagnóstico anterior: `deploy/scripts/diagnose-cooklily-access` lê `/var/log/nginx/error.log` por padrão, embora as falhas TLS estejam em `/var/log/nginx/carrochefe-tls-error.log`. Assim, a frase anterior “nenhum erro TLS na janela” não era válida; a leitura direta do log dedicado encontrou os eventos acima. Corrigir o caminho padrão do script e acrescentar teste de regressão.

### Avaliação atual

O Nginx e o certificado passam nos testes atuais; não há evidência para afrouxar TLS nem para alterar o firewall. O caso das 15:57 é compatível com interferência ou política em proxy/VPN do lado do cliente. Cloudflare WARP pode substituir o IP público do visitante por um IP Cloudflare mesmo ao acessar sites fora da rede Cloudflare; uma política HTTP do Gateway também pode apresentar `ERR_SSL_PROTOCOL_ERROR` quando a página de bloqueio usa certificado não confiável. Referências: https://developers.cloudflare.com/warp-client/known-issues-and-faq/ e https://developers.cloudflare.com/cloudflare-one/traffic-controls/troubleshoot-gateway/.

## Próxima ação exata atualizada

Corrigir `diagnose-cooklily-access` para ler o log TLS dedicado por padrão e cobrir essa seleção com teste. Para o usuário que confirmou `dns.adguard.com`, pedir revisão do falso positivo à AdGuard e orientar allowlist/resolvedor não filtrado enquanto aguarda; não houve envio externo nesta investigação. Para os outros dois relatos, identificar o DNS/VPN utilizado e comparar a resposta A antes de atribuir a causa. Não alterar TLS/cifras nem bloquear faixas Cloudflare sem evidência adicional.

## Reprodução de bloqueio DNS com AdGuard — 30/10/2026

- O proprietário confirmou que o usuário afetado utilizava `dns.adguard.com`. A documentação anterior não registrava esse nome; inicialmente reproduzi o comportamento sem assumir qual era o produto. Agora também consultei diretamente o hostname informado, sem instalar aplicativo nem alterar a configuração de rede local.
- A consulta DoH para `https://dns.adguard.com/resolve?name=carrochefe.com&type=A` retornou `94.140.14.33`, igual ao endpoint atual `dns.adguard-dns.com`; o endpoint oficial não filtrado retornou `2.25.182.185`. Portanto a configuração usada pelo cliente está reproduzida no DNS, além da consulta ao endpoint atual.
- `carrochefe.com` e `www.carrochefe.com` responderam `94.140.14.33` no DNS padrão filtrado da AdGuard e no perfil Family; o resolvedor não filtrado da AdGuard e Google/Cloudflare Security responderam o IP real `2.25.182.185`. Controles: `google.com` resolveu normalmente no filtro; `doubleclick.net` foi corretamente bloqueado como `0.0.0.0` pelo filtro AdGuard.
- O endereço `94.140.14.33` é o host de bloqueio de navegação segura da AdGuard (`standard-block.dns.adguard.com`); a resposta é compatível com classificação de segurança/phishing/malware, não com detecção do site como anúncio. A lista pública `AdGuard DNS filter` não continha o texto literal `carrochefe` na consulta realizada, então o sinal aponta mais para a camada de browsing security do que para regra de anúncios, mas a categoria e a origem exatas precisam ser confirmadas pela AdGuard.
- Reprodução TLS: acesso HTTPS normal ao domínio completou com HTTP 200, validação TLS válida e IP remoto `2.25.182.185`. Forçando o mesmo SNI `carrochefe.com` para o IP de bloqueio `94.140.14.33`, o Windows Schannel retornou `SEC_E_ILLEGAL_MESSAGE` durante o handshake. Isso reproduz a classe do `ERR_SSL_PROTOCOL_ERROR` da captura.
- Conclusão revisada: há uma causa concreta que explica o usuário confirmado com `dns.adguard.com`: o domínio resolve para o IP de bloqueio da AdGuard, que rejeita o handshake TLS. Isso não prova que os outros dois telefones usavam o mesmo serviço; será preciso comparar a configuração DNS/VPN deles antes de generalizar. O relato de VPN desativada é consistente com um app que cria um túnel local para impor o DNS filtrado.
- Resolução recomendada: pedir revisão/remoção de falso positivo à AdGuard e orientar temporariamente o usuário afetado a permitir `carrochefe.com` ou usar o resolvedor não filtrado. Para os outros relatos, registrar o provedor DNS/VPN usado e comparar a resposta A do domínio. Não mudar TLS, firewall ou conteúdo do site para contornar um sinkhole DNS.
- Fontes técnicas: [servidores AdGuard DNS e endpoints filtrado/não filtrado](https://adguard-dns.io/kb/general/dns-providers/); [configuração upstream da página de bloqueio de navegação segura](https://github.com/AdguardTeam/AdGuardDNS/blob/master/configuration.md); [orientação oficial AdGuard para reportar bloqueio incorreto](https://adguard.com/en/support/adguard-mini-android/problems/websites_are_displayed_incorrectly.html).
- Revisão solicitada por e-mail a `support@adguard.com` em 30/10/2026 17:58 BRT, assunto `False positive review request: carrochefe.com blocked by AdGuard DNS`. Mensagem enviada com reprodução e pedido para revisar/remover a classificação ou informar sua origem. Nenhum IP de cliente, dado pessoal ou captura foi anexado. ID Gmail da mensagem: `1a18e9b699e102d4`.

## Limite e próxima ação

O ajuste de PMTU é mitigação preventiva coerente com um caminho medido abaixo de MTU 1500; não há prova de que os clientes tenham o mesmo problema de MTU. Para o usuário confirmado com `dns.adguard.com`, o falso positivo/blackhole TLS via sinkhole DNS foi reproduzido; isso não confirma a causa dos outros dois relatos nem garante que o fornecedor já removeu a classificação.

Próxima ação exata: corrigir e testar o caminho padrão de log em `diagnose-cooklily-access`; acompanhar a resposta ao e-mail enviado à AdGuard e identificar DNS/VPN dos outros dois usuários. Se surgir novo erro fora do DNS AdGuard, correlacionar horário com captura TLS dedicada antes de alterar a infraestrutura.
