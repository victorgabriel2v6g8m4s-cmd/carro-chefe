# CookLily — runbook de backup, verificação e restauração

**Última revisão:** 29/09/2026  
**Escopo:** bancos SQLite persistentes da plataforma e CookLily.

## Princípio

Backup existente não significa backup restaurável.

O deploy oficial cria os backups com o comando nativo `.backup` do SQLite e, a partir da Entrega 10A, valida cada arquivo antes de parar o serviço ou iniciar migrations.

A verificação é executada numa cópia temporária e nunca escreve no arquivo de backup original nem no banco live.

## Caminhos de produção

- dados persistentes: `/srv/carro-chefe/data/`;
- backups: `/srv/carro-chefe/data/backups/`;
- evidências/logs de deploy: `/srv/carro-chefe/data/deploy-logs/`;
- helper instalado após deploy válido: `/usr/local/sbin/carro-chefe-verify-backup`.

Os caminhos reais dos bancos continuam vindo de `DATABASE_URL` e `LILY_DATABASE_URL`.

## O que o verificador confere

Para cada backup:

1. arquivo regular e não vazio;
2. cópia isolada em diretório temporário;
3. `PRAGMA integrity_check = ok`;
4. `PRAGMA foreign_key_check` sem violações;
5. tabela `_prisma_migrations` presente e legível;
6. quantidade de migrations;
7. tamanho em bytes;
8. SHA-256.

A saída de sucesso contém:

`backup_verification=ok`

## Gate do deploy

A ordem do deploy é:

1. gates de código/testes/build;
2. criação dos backups SQLite;
3. **verificação dos backups**;
4. somente depois, parada do serviço;
5. migrations reais;
6. restart/health;
7. evidência final.

Se a verificação falhar, o deploy termina antes de parar o serviço ou alterar os bancos de produção.

A evidência final registra os caminhos e SHA-256 dos dois backups.

## Verificação manual

Listar backups recentes:

```bash
ls -lhtr /srv/carro-chefe/data/backups/
```

Validar um backup CookLily:

```bash
carro-chefe-verify-backup /srv/carro-chefe/data/backups/lily-acai-pre-<sha>-<timestamp>.db lily
```

Validar um backup core:

```bash
carro-chefe-verify-backup /srv/carro-chefe/data/backups/carro-chefe-pre-<sha>-<timestamp>.db core
```

Nunca rode comandos de reparo diretamente no arquivo de backup que pretende preservar.

## Restauração manual

A restauração não é automatizada porque substituir um banco de produção é uma decisão destrutiva e deve ser deliberada.

Antes de restaurar:

- identificar a causa do incidente;
- escolher explicitamente o backup;
- validar o backup com `carro-chefe-verify-backup`;
- registrar o SHA-256 retornado;
- conferir qual banco será substituído;
- preservar o banco problemático para investigação.

### Exemplo: CookLily

Carregar o ambiente sem imprimir segredos:

```bash
set -a
. /etc/carro-chefe/carro-chefe.env
set +a
```

Resolver o caminho:

```bash
LILY_DB="${LILY_DATABASE_URL#file:}"
BACKUP="/srv/carro-chefe/data/backups/<backup-escolhido>.db"
```

Validar antes de qualquer alteração:

```bash
carro-chefe-verify-backup "${BACKUP}" lily
```

Parar o serviço e preservar o banco atual:

```bash
systemctl stop carro-chefe
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
cp -- "${LILY_DB}" "${LILY_DB}.incident-${STAMP}"
```

Copiar o backup somente após revisar os caminhos acima:

```bash
install -o carrochefe -g carrochefe -m 0640 "${BACKUP}" "${LILY_DB}"
```

Ajuste usuário/grupo somente se o serviço real usar nomes diferentes.

Iniciar e validar:

```bash
systemctl start carro-chefe
systemctl is-active carro-chefe
curl -fsS http://127.0.0.1:4173/api/v1/lily/public/health
curl -fsS https://carrochefe.com/api/v1/lily/public/health
journalctl -u carro-chefe -n 100 --no-pager
```

## Drill sem tocar produção

Para testar restauração sem substituir o banco live:

1. validar um backup existente;
2. copiar para diretório temporário;
3. apontar `LILY_DATABASE_URL` de um processo isolado para a cópia;
4. executar migration/status ou testes somente nessa cópia;
5. apagar o ambiente temporário.

O drill não deve usar a porta do serviço de produção nem o diretório de uploads real.

## Cópia externa

Os backups locais protegem principalmente contra erro de aplicação/migration, mas não contra perda da VPS/volume.

Antes da operação comercial plena, manter uma cópia **criptografada e externa à VPS**, com política de retenção aprovada. A duração de retenção não é definida por este runbook porque depende da política jurídica/operacional ainda pendente.

## Correlação de incidentes

A API responde `X-Request-Id` em todas as respostas.

Quando houver erro reproduzível:

1. anotar horário aproximado;
2. copiar o `X-Request-Id` da resposta;
3. consultar `journalctl -u carro-chefe`;
4. correlacionar o ID sem compartilhar cookie, CSRF, guest token ou Authorization.

O logger da API possui redaction explícita desses headers sensíveis.
