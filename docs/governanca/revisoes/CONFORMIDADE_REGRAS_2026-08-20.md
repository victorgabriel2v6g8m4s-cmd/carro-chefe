# Revisão de conformidade com o `REGRAS.md`

Data da revisão: **20/08/2026**

Responsável pela consolidação: **AG-GESTAO**

Escopo: aplicações, runtime de agentes, API, banco, documentação e fronteiras locais do Carro Chefe.

## Resultado

A base está apta para desenvolvimento local controlado. Ela **não está autorizada para exposição pública** porque ainda não existe autenticação server-side nem RBAC. O servidor bloqueia incondicionalmente bind fora de loopback até que essa lacuna seja implementada e testada.

## Conformidades corrigidas nesta revisão

| Área | Estado | Evidência |
|---|---|---|
| Regras dos agentes | implementado | manifesto versionado em `.agent-policy/manifest.json`, preflight obrigatório e verificação no CI/runtime |
| Especialização | implementado | somente `AG-DEV` possui workspace de código; agentes de negócio usam leitura ou artefatos da própria área |
| Economia de contexto | implementado | cápsulas de política por agente/região com orçamento de caracteres e hash auditável |
| Central Operacional | implementado parcialmente | CSS dividido em 12 módulos; catálogo pt-BR e tipos compartilhados nas superfícies prioritárias |
| Segurança local | implementado | bind apenas em loopback, proteção de origem, limites de requisição e caminhos estáticos confinados |
| Webhooks | implementado para o ambiente local | HMAC no inbound, idempotência estrutural e bloqueio de destinos privados/redirects no outbound |
| Uploads | implementado parcialmente | nome, tamanho, extensão, MIME e assinatura real validados; visualização recebe CSP restritiva |
| Persistência | corrigido | migrações aplicáveis em banco vazio, seed idempotente e unicidade das entregas de webhook |
| Qualidade | aprovado | `policy:check`, `npm run check`, 51 testes e `npm run build` concluídos sem falha |

## Lacunas conhecidas

| Prioridade | Lacuna | Impacto | Owner e próximo passo |
|---|---|---|---|
| P0 | autenticação real, sessão segura e RBAC ausentes | impede publicar `/gestao` ou a API | `AG-DEV`: implementar identidade server-side; `AG-GESTAO`: aprovar matriz de papéis |
| P0 | autorização por recurso ainda não existe | um usuário autenticado poderia acessar entidade alheia se a exposição fosse liberada | `AG-DEV`: aplicar deny-by-default e testes de IDOR antes do primeiro deploy |
| P1 | uploads sem antivírus/CDR e quarentena | arquivo malicioso pode passar pela validação estrutural | `AG-DEV`: integrar scanner assíncrono antes de aceitar documentos externos |
| P1 | webhook inbound sem janela temporal específica por provedor | a idempotência evita reprocessamento, mas não substitui proteção completa contra replay | `AG-DEV`: adicionar timestamp, tolerância e contrato por provedor |
| P1 | transporte outbound não fixa o IP resolvido | permanece uma corrida extrema de DNS rebinding | `AG-DEV`: usar transporte que conecte ao IP validado e preserve SNI/Host |
| P1 | internacionalização e tipagem ainda são parciais | manutenção mais cara e risco de inconsistência | `AG-DEV`: migrar módulos restantes por fatias; não fazer reescrita ampla |
| P2 | SQLite é adequado somente ao runtime local/single-instance | não suporta escala horizontal no formato atual | `AG-DADOS` especifica migração; `AG-DEV` implementa quando a topologia de produção for aprovada |

## Critério para reabrir a publicação

A Gestão só pode autorizar exposição pública após evidência conjunta de autenticação real, RBAC/IDOR, HTTPS, gestão de segredos, backup/restauração, observabilidade, retenção LGPD e testes de segurança. A variável de ambiente não pode substituir nenhuma dessas garantias.

## Evidências executadas

- Manifesto de regras íntegro: versão `2026.08.20.1`.
- Prisma `generate` e `validate`: aprovados.
- TypeScript global: aprovado.
- Testes legados e Vitest: **51 aprovados**.
- Builds: Central, site, QR e API aprovados.
- Banco vazio: migrações e seed aplicados; 16 raízes da árvore de conhecimento confirmadas.
