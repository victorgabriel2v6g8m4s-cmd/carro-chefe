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
LILY_UPLOAD_DIR=/srv/carro-chefe/data/lily-acai/uploads
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

Entrega 05:

```text
/api/v1/lily/auth/*
/api/v1/lily/admin/*
```

Entrega 06:

```text
/api/v1/lily/orders
/api/v1/lily/orders/*
/api/v1/lily/customer/*
```

As rotas acima precisam aparecer antes do bloqueio genérico de `/api/`.

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

## Smoke da Entrega 06

Antes de abrir pedidos ao público:

- migration `20260925100000_lily_orders` aplicada;
- `ordersEnabled` continua falso após migration;
- `/api/v1/lily/public/fulfillment` responde;
- painel `/lilyacai/painel/entrega` exige staff;
- endereço de retirada/horários/taxa/regiões são configurados com dados reais;
- pedido guest é cotado e criado;
- retry com a mesma Idempotency-Key não duplica pedido;
- preço/configuração stale é rejeitado;
- entrega fora da região configurada é rejeitada;
- pedido autenticado aparece somente para o titular;
- endereço de outro usuário não pode ser lido/alterado;
- pedido criado permanece `awaiting_payment`;
- restart mantém pedido e configuração;
- Entrega 07 ainda não é tratada como pagamento aprovado.

## Publicação recomendada da Entrega 06

SHA técnico validado:

`da166683ab2d0e27acae23d9714ec8e824a02ac4`

CI: `36124932957` — success.  
CodeQL: `36124933082` — success.

A branch pode conter commits documentais posteriores. Para deploy da Entrega 06, usar o SHA técnico acima salvo se outro SHA passar novamente pelos gates completos.

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


## Deploy automatizado por SHA

A partir da Entrega 06, o procedimento repetitivo foi encapsulado em:

`deploy/scripts/carro-chefe-deploy`

Instalação na VPS, feita uma vez:

```bash
cd /srv/carro-chefe/current
git fetch origin --prune

git show origin/feat/lily-entrega-06-pedidos:deploy/scripts/carro-chefe-deploy \
  > /usr/local/sbin/carro-chefe-deploy

chmod 0755 /usr/local/sbin/carro-chefe-deploy
```

Depois disso, uma publicação normal usa:

```bash
sudo carro-chefe-deploy <sha-tecnico-validado>
```

O script automatiza:

1. lock para impedir dois deploys simultâneos;
2. verificação de worktree limpo;
3. `git fetch` e validação do SHA;
4. precheck das rotas Nginx necessárias;
5. checkout detached;
6. `npm ci --include=dev` — necessário enquanto `npm start` depender de `tsx`;
7. venv Python isolado para Excel Snapshot/Tool Health;
8. migrations em bancos temporários;
9. policy/check/tests/build/tool-health contra bancos temporários;
10. backup consistente dos bancos reais;
11. parada controlada do serviço para evitar lock SQLite;
12. migrations core + Lily reais;
13. correção de permissões;
14. `nginx -t` e reload;
15. start do serviço;
16. health checks internos e HTTPS;
17. log e arquivo de evidência em `/srv/carro-chefe/data/deploy-logs/`.

### Fail-closed

Antes de migration real, uma falha restaura o checkout anterior e, se necessário, religa o serviço.

Depois que uma migration real começa, o script **não restaura banco automaticamente**. Essa decisão é intencional: rollback genérico de schema pode destruir dados ou deixar aplicação/schema incompatíveis. O script registra os backups e encerra para intervenção controlada.

### O script nunca executa

- `prisma migrate reset`;
- seed de desenvolvimento;
- `npm audit fix --force`;
- overwrite automático do Nginx real;
- rollback automático de banco.

### Quando ainda haverá etapa manual

Se uma entrega criar **novo namespace público no Nginx**, a configuração real precisa ser revisada uma vez antes do deploy. O deployer falha no precheck antes de tocar banco/serviço se as rotas esperadas estiverem ausentes.

Alterações que usam namespaces já expostos normalmente ficam reduzidas ao comando único por SHA.
