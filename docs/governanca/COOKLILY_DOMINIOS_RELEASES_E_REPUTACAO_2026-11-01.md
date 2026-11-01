# CookLily: domínios, reputação e releases

- Data da decisão: 01/11/2026.
- Estado: decisão aprovada; documentação iniciada; separação técnica, provisionamento e homologação ainda pendentes.
- Owner de implementação: AG-DEV. Publicação da release: administrador CookLily.

## Decisões aprovadas

1. Durante a transição, `https://licalily.com` será o endereço público da CookLily.
2. `https://carrochefe.com/lilyacai/*` e suas APIs Lily continuam como ambiente de teste/homologação. O site principal Carro Chefe em `https://carrochefe.com/` permanece preservado; a classificação de teste se aplica somente ao namespace CookLily, não ao domínio inteiro.
3. Todo deploy de desenvolvimento/homologação publica primeiro no ambiente CookLily de teste. A versão só é candidata a público depois de testada e adicionada à lista de releases.
4. Um administrador revisa a lista e dispara, por ação explícita no painel, a publicação da release aprovada em `licalily.com`. Um deploy de teste nunca deve publicar automaticamente no domínio público.
5. A cada publicação pública, a página pública de releases é atualizada automaticamente. Cada release terá identificador imutável (SHA/versão), data, resumo e estado. O painel terá a opção **“Notificar usuários sobre a atualização”**, desligada por padrão até o administrador marcá-la. A preferência de marketing/contato do usuário e os canais consentidos continuam obrigatórios.
6. CookLily deixa de ser parceria pública com Carro Chefe e terá repositório exclusivo, contendo somente seu site, API, banco e infraestrutura necessária. Ferramentas individuais de uso local (incluindo `excel-recipe`) serão removidas do fluxo/runtime CookLily; a decisão de distribuí-las em repositórios próprios não implica publicá-las na VPS.
7. As referências antigas que apresentam CookLily como Carro Chefe, parceria ou usam o endereço antigo serão inventariadas e atualizadas com prioridade urgente: webhooks e configurações da Meta, redes sociais, documentação, links, e-mail/transacionais e configuração da aplicação. Antes de trocar qualquer callback externo, validar domínio, TLS e callback de destino e manter plano de retorno.

## Registro do incidente de TLS e reputação

### Fatos documentados

- Usuários reportaram `ERR_SSL_PROTOCOL_ERROR` ao abrir páginas CookLily sob `carrochefe.com`. Captura de 30/10/2026 15:57 BRT mostrou Chrome em Android; modelo e versões não são inferíveis pela imagem.
- Nginx, certificado, firewall e handshakes externos TLS 1.2/1.3 passaram nas verificações documentadas. A captura de logs encontrou tentativas interrompidas antes de completar o handshake; não demonstrou incompatibilidade de cipher/TLS que justificasse enfraquecer a configuração.
- O usuário confirmou que um dos aparelhos usava `dns.adguard.com`. A resolução filtrada AdGuard devolveu o endereço de sinkhole `94.140.14.33`, enquanto resolvedores sem filtro consultados devolveram a VPS `2.25.182.185`. Forçar TLS para o sinkhole reproduziu falha de protocolo. Isso explica o caso confirmado, não necessariamente os demais relatos.
- Uma consulta posterior não encontrou evidência de bloqueio geral por Cloudflare DNS/Radar, nem nas listas públicas amostradas. Isso não exclui regras privadas de Gateway/WARP nem outros filtros.
- Foi enviado pedido de revisão para `support@adguard.com`. O registro anterior identifica o remetente como `Victor Gabriel <victorgabriel2v6g8m4s@gmail.com>` e contém o ID da mensagem Gmail `1a18e9b699e102d4`. Segundo o proprietário, a resposta da AdGuard recusou tratar o caso como falso positivo e apontou relatório do VirusTotal com deteções recentes.
- A análise anterior do VirusTotal para `carrochefe.com` reportou múltiplas classificações de reputação/phishing. A expressão “14 vírus” é a descrição relatada pelo proprietário; uma contagem de fornecedores que marcam um domínio não prova que existam 14 arquivos de vírus no servidor. As detecções são sinais de reputação para investigar, não análise forense conclusiva dos artefatos servidos.
- Em 01/11/2026, buscas públicas não encontraram resultado indexado específico para `licalily.com` no VirusTotal. Isso não significa relatório limpo. DNS resolveu através da Cloudflare; uma sonda HTTP(S) feita durante esta checagem recebeu `429 Too Many Requests`, logo o domínio novo ainda não está homologado para tráfego público normal.

### Hipóteses (não confirmadas)

- Histórico de classificação/uso anterior de `carrochefe.com` pode ter influenciado fornecedores de reputação. O relatório da AdGuard e as classificações do VirusTotal justificam a hipótese, mas não identificam por si sós quando, por quem ou por qual URL essa reputação foi criada.
- Trocar para `licalily.com` pode reduzir o efeito do histórico associado ao nome `carrochefe.com`, mas não garante remoção de bloqueios: reputação pode seguir conteúdo, URLs, IP/hosting, redirecionamentos, infraestrutura compartilhada ou padrões de tráfego. O 429 atual é um problema independente a esclarecer.
- A causa reproduzida do handshake para o usuário AdGuard foi resolução para sinkhole DNS, não TLS defeituoso na origem. Não atribuir os outros casos ao AdGuard sem identificar seus resolvedores.

### Próximas verificações de reputação

- Fazer varredura de artefatos e cadeia de supply chain no servidor e comparar hashes dos bundles servidos com releases aprovadas; revisar scripts, dependências, redirects, formulários e páginas reportadas.
- Capturar e preservar URLs/objetos e datas dos relatórios VirusTotal, fornecedores sinalizadores e evidência da resposta AdGuard; solicitar correção a cada fornecedor somente após análise do destino e conteúdo real. Não tratar “sem resultado” como “limpo”.
- Antes do lançamento público, confirmar que a origem do HTTP 429 foi entendida, revisar regras de rate limit/WAF e testar carga normal sem desabilitar a proteção global.

## Arquitetura de release pretendida

```text
commit CookLily -> CI seletivo + gates completos de release
  -> artefato imutável assinado/identificado por SHA
  -> deploy de homologação em carrochefe.com/lilyacai
  -> QA desktop/mobile, acessibilidade, smoke, API, migrations Lily
  -> release candidata aparece na lista do painel
  -> aprovação explícita do administrador
  -> promoção do mesmo artefato (sem rebuild) para licalily.com
  -> smoke público e registro da release
  -> atualização da página de releases
  -> notificação somente se checkbox marcado e consentimentos permitirem
```

O painel não deve executar shell nem aceitar SHA/URL arbitrário. A publicação deve chamar um serviço de release autenticado, com RBAC/MFA para administradores, CSRF, idempotência, allowlist de releases candidatas, logs de auditoria, proteção contra replay, validação de integridade e rollback. A promoção copia o artefato homologado; não recompila fontes diferentes. Migrations CookLily devem ser retrocompatíveis e executadas com backup, health gate e plano de rollback. Nunca migrar banco do Carro Chefe por uma release Lily.

## Plano de execução e ordem de prioridade

| Prioridade | Trabalho | Aceite / dependência |
|---|---|---|
| P0 urgente | Inventariar e corrigir URLs e identidade CookLily antiga em Meta webhooks, redes, repositórios e conteúdo/configuração | Lista de ocorrências, responsável, estado, teste dos callbacks; não alterar callback sem credenciais e domínio validado |
| P0 | Entender o `429` de `licalily.com`, verificar DNS authoritative/proxy, regras de WAF/rate-limit, origem, certificados para apex e `www`, redirects e saúde pública | Acesso anônimo normal retorna conteúdo correto; TLS válido; nenhum bloqueio falso em testes regionais básicos |
| P0 | Reconciliar reputação dos dois domínios e varrer os artefatos | Relatórios datados, hashes e achados corrigidos/contestados com evidência |
| P1 | Criar repositório exclusivo CookLily, preservar histórico/licenças e segredos fora do Git; retirar código Carro Chefe e ferramentas locais | Build/testes/build budget independentes, inventário de dependências e plano de arquivamento do monorepo antigo |
| P1 | Separar ferramentas em repositórios próprios apenas quando necessário; impedir ferramentas locais no pacote/release da VPS | Manifesto de artefatos e inspeção do pacote confirmam somente runtime CookLily/deploy necessário |
| P1 | Eliminar do pipeline CookLily builds, migrations e testes exclusivos do Carro Chefe; manter testes de contrato/segurança compartilhados que protegem integração real | Matriz caminho alterado → gates; testes seletivos por diff + execução integral agendada/antes de release, sem ignorar lockfile, config ou dependências compartilhadas |
| P1 | Corrigir deploy single-line e implementar promoção por painel de release | Teste idempotente de deploy; homologação primeiro; botão de promoção com confirmação, auditoria, rollback e proteção contra concorrência |
| P2 | Migrar webhooks, links sociais/transacionais e referências externas | Todos os callbacks confirmados no painel Meta e smoke de ponta a ponta; prazo de convivência/redirect documentado |
| P2 | Publicar em `licalily.com`, testar mobile/desktop e monitorar migração | Testes em navegadores/rede usuais, analytics minimizados, erros e contato de suporte acompanhados |

## Regras de segurança da migração

- Não mudar o DNS do domínio principal inteiro para “teste”: a homologação CookLily fica restrita a `/lilyacai` enquanto compartilha `carrochefe.com`.
- Domínio e conta independentes exigem configuração explícita de CORS, cookies, CSRF, URLs canônicas, OAuth/social login, e-mail, CSP, links profundos, webhook callbacks e allowlists. Cookies de sessão não devem ser compartilhados entre origens.
- Preservar pedidos, pagamentos, conta, consentimento e histórico. Planejar continuidade de sessão ou pedir reautenticação claramente; nunca transferir dados para uma base da marca Carro Chefe.
- Migração de domínio requer redirects permanentes apenas para páginas equivalentes, atualização de sitemap/canonical, QR codes, pixels/analytics consentidos, app links e templates Meta. Não redirecionar callbacks de API sem compatibilidade testada.
- Mudanças de DNS, certificados, WAF, deploy público e configurações externas permanecem pendentes até pré-requisitos técnicos e verificações de segurança acima serem atendidos. A aprovação geral desta arquitetura não substitui validação do SHA/release candidata na promoção.

## Evidências e fontes de trabalho

- Investigação detalhada de handshake/AdGuard e runbooks de deploy estão documentados na branch `cooklily/canonical`: [checkpoint TLS](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/blob/cooklily/canonical/docs/execution-checkpoints/carrochefe-ssl-handshake-2026-10-28.md), [runbook VPS](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/blob/cooklily/canonical/docs/lily-acai/DEPLOY_VPS.md) e [deploy incremental](https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/blob/cooklily/canonical/docs/lily-acai/DEPLOY_INCREMENTAL_CLI.md).
- Relatório público consultado em 01/11/2026 para idade/HTTPS/DNS do domínio: [ScamAdviser](https://www.scamadviser.com/check-website/licalily.com). Fonte secundária; não é uma auditoria de segurança.
- Modelo VirusTotal para relatórios agregados: [Domains object](https://docs.virustotal.com/reference/domains-object). Ausência de relatório acessível ou resultado indexado não equivale a domínio limpo.

