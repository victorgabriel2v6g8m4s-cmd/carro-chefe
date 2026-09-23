# Runbook de deploy — CookLily na VPS Hostinger

Este runbook adapta o procedimento já usado pelo Carro Chefe para a branch `lily-acai`.

**Não autoriza deploy automaticamente.** Cada publicação exige aprovação explícita do proprietário para o SHA exato.

## Arquitetura

```text
Internet
  -> Nginx/TLS carrochefe.com
     -> Fastify 127.0.0.1:4173
        -> /                  Carro Chefe
        -> /lilyacai/*       CookLily
        -> /api/v1/lily/*    API Lily
```

Persistência:

```text
/srv/carro-chefe/data/carro-chefe.db
/srv/carro-chefe/data/lily-acai.db
/srv/carro-chefe/data/lily-acai/uploads/
```

Ambiente:

```text
/etc/carro-chefe/carro-chefe.env
```

## Release por SHA

Por isolamento, a Lily parte de SHA aprovado da `lily-acai`, sem merge integral na `main`.

```bash
cd /srv/carro-chefe/current

git status --short
git fetch origin --prune

RELEASE_SHA="<sha-aprovado>"
git show --no-patch --oneline "$RELEASE_SHA"
git checkout --detach "$RELEASE_SHA"
```

Se houver alteração local inesperada, interromper.

## Ambiente mínimo

```env
DATABASE_URL=file:/srv/carro-chefe/data/carro-chefe.db
LILY_DATABASE_URL=file:/srv/carro-chefe/data/lily-acai.db
TRUST_PROXY=true
NODE_ENV=production
```

Segredos nunca usam `VITE_*`.

## Backup antes de migration

```bash
sudo mkdir -p /srv/carro-chefe/data/backups

sqlite3 /srv/carro-chefe/data/carro-chefe.db \
  ".backup '/srv/carro-chefe/data/backups/carro-chefe-pre-lily-$(date +%Y%m%d-%H%M%S).db'"

if [ -f /srv/carro-chefe/data/lily-acai.db ]; then
  sqlite3 /srv/carro-chefe/data/lily-acai.db \
    ".backup '/srv/carro-chefe/data/backups/lily-acai-pre-release-$(date +%Y%m%d-%H%M%S).db'"
fi
```

## Qualidade e build

```bash
cd /srv/carro-chefe/current

set -a
. /etc/carro-chefe/carro-chefe.env
set +a

npm ci
npm run policy:check
npm run check
npm test
npm run build
npm run tools:status:check
```

Falhou qualquer gate: não migrar nem reiniciar.

## Migrações

```bash
npm run db:deploy:core
npm run db:deploy:lily
```

Nunca usar reset/seed de desenvolvimento em produção.

## Nginx

O template atual bloqueia `/api/` genericamente. As rotas Lily autorizadas devem aparecer antes desse bloqueio.

Entrega 04:

```text
/api/v1/lily/public/*
```

Entrega 05, após homologação:

```text
/api/v1/lily/auth/*
/api/v1/lily/admin/*
```

Depois de alterar proxy:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Não sobrescrever a configuração real sem comparar a VPS.

## Reinício e saúde

```bash
sudo systemctl restart carro-chefe
sudo systemctl is-active carro-chefe

curl --fail http://127.0.0.1:4173/api/health
curl --fail http://127.0.0.1:4173/api/v1/lily/public/health
```

## Smoke da Entrega 04

- `/lilyacai/` abre CookLily;
- identidade oficial correta;
- telefone válido persiste;
- duplicata não duplica;
- sem consentimento não há inscrição promocional;
- erro de rede preserva telefone;
- WhatsApp abre número oficial;
- `la_*` não contém PII;
- `/` Carro Chefe continua funcionando;
- `/gestao` permanece protegido.

## Smoke da Entrega 05

- draft/paused não aparecem;
- indisponível não aparece como comprável;
- published + disponível aparece;
- preço vem da API;
- painel exige `staff`;
- customer recebe 403 no admin;
- mídia inválida é rejeitada;
- disponibilidade reflete no cardápio sem rebuild.

## Rollback

Registrar `PREVIOUS_SHA`.

```bash
cd /srv/carro-chefe/current
git checkout --detach "<sha-anterior>"
sudo systemctl restart carro-chefe
sudo systemctl is-active carro-chefe
```

Se schema for incompatível, seguir restauração de banco de `deploy/README.md`.

## Evidência por publicação

Registrar SHA, horário/fuso, backup, migrations, `nginx -t`, status systemd, health checks, smoke tests e SHA de rollback.
