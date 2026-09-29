# Entrega 10A — observabilidade e backup/restore verificável

**Data:** 29/09/2026  
**Branch:** `feat/lily-entrega-10a-observabilidade-backup`  
**Base:** `cooklily/canonical` em `9262aa60d875f0a9c58d352e9e3d469a20e7419f`

## Objetivo

Tratar a parte de hardening que pode ser validada tecnicamente antes do QA real de amanhã:

- correlação segura de incidentes;
- redaction de segredos no logger;
- visão de saúde operacional sem PII;
- backup SQLite comprovadamente legível antes de migrations;
- runbook de restauração deliberada.

## Observabilidade HTTP

A API passa a devolver:

`X-Request-Id: <id>`

O ID vem do próprio ciclo de request do Fastify e permite correlacionar um erro reportado por navegador/app com o journal do serviço.

Nenhuma informação de autenticação é necessária para compartilhar esse identificador em suporte.

## Redaction de logs

A configuração de logger redige explicitamente:

- Authorization;
- Cookie;
- X-Lily-CSRF;
- X-Lily-Order-Token;
- X-Agent-Key;
- X-CarroChefe-Signature;
- X-Signature;
- X-API-Key;
- Set-Cookie.

Headers com hífen usam sintaxe de path compatível com o redactor do Pino/Fastify.

Os testes instanciam um Fastify real com essa configuração para detectar path inválido.

O sistema continua sem logar body de request como política padrão do logger; portanto telefone/endereço de payload não são adicionados ao log pelo hardening.

## Resumo operacional staff

Novo endpoint:

`GET /api/v1/lily/admin/observability/summary`

Requisitos:

- staff/admin;
- sessão privilegiada/MFA pela política existente;
- `Cache-Control: no-store`.

Retorna somente agregados:

- saúde do banco;
- aguardando pagamento;
- pedidos pagos ativos;
- em preparo;
- prontos;
- aguardando courier;
- entrega em andamento;
- WhatsApp pending/failed/dead;
- quantidade de conciliações Pix que exigem revisão;
- timestamps e código resumido da última tentativa Pix;
- estado técnico do último pedido, sem número/cliente/endereço.

Não retorna:

- telefone;
- endereço;
- order number;
- códigos de coleta/entrega;
- guest token;
- mensagem de erro bruta;
- endToEndId/txid;
- payload bancário/WhatsApp.

Frontend:

`/lilyacai/painel/saude`

Atualização automática a cada 15 s.

## Backup verificável

Novo helper:

`deploy/scripts/verify-sqlite-backup`

Ele:

1. exige arquivo regular e não vazio;
2. cria diretório temporário;
3. copia o backup para esse diretório;
4. roda `PRAGMA integrity_check`;
5. roda `PRAGMA foreign_key_check`;
6. confirma a tabela `_prisma_migrations`;
7. lê a quantidade de migrations;
8. calcula tamanho e SHA-256;
9. remove a cópia temporária.

O original não é aberto para escrita.

## Mudança no deploy

O deploy oficial agora possui fase:

`backup-verify`

Ordem relevante:

1. gates;
2. criar backup core/Lily;
3. verificar ambos;
4. só então parar o serviço;
5. só então executar migrations de produção.

Se um backup recém-criado falhar na verificação, o deploy falha **antes** de parar o serviço e antes de gravar migrations.

A evidência final passa a registrar:

- core_backup;
- core_backup_sha256;
- lily_backup;
- lily_backup_sha256;
- backup_verification=ok.

Após health bem-sucedido, o helper é instalado como:

`/usr/local/sbin/carro-chefe-verify-backup`

## Restauração

A restauração permanece propositalmente manual.

Motivo: substituir SQLite de produção é uma ação destrutiva e não deve acontecer automaticamente como reação a health check ou migration.

Runbook:

`docs/lily-acai/OPERACAO_BACKUP_RESTORE.md`

O runbook exige:

- validar o backup;
- registrar hash;
- parar serviço;
- preservar banco incidentado;
- conferir paths;
- copiar explicitamente;
- iniciar;
- health interno/externo;
- journal.

Também documenta drill isolado e necessidade futura de cópia externa criptografada.

## Retenção

A Entrega 10A não inventa prazo de retenção de PII, analytics ou backups.

A definição continua pendente de política jurídica/operacional.

## Recuperação de senha

Continua aberta e não foi implementada.

Sem canal de verificação de titularidade aprovado, “esqueci minha senha” baseado apenas em telefone criaria risco de account takeover.

## QA real

Continuam separados para amanhã:

- mobile 320/360/390/430/768 px;
- teclado/foco;
- impressão;
- dois couriers;
- providers reais;
- conferência dos dashboards em tráfego real;
- drill de backup usando os arquivos efetivamente gerados na VPS.
