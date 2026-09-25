# Deploy em VPS — Carro Chefe

Este diretório contém **templates**, não uma publicação automática. DNS, TLS e ativação da VPS exigem autorização do proprietário.

A arquitetura P0 mantém o processo Fastify em `127.0.0.1:4173` e usa Nginx como única entrada pública HTTPS.

## Estrutura sugerida

```text
/srv/carro-chefe/current/          checkout/release atual
/srv/carro-chefe/data/             SQLite persistente e backups locais
/etc/carro-chefe/carro-chefe.env   configuração fora do Git
/etc/systemd/system/carro-chefe.service
/etc/nginx/sites-available/carrochefe.com
```

O usuário de serviço deve ter leitura em `current` e escrita apenas nos caminhos necessários, especialmente `data` e `.runtime`.

## Ambiente de produção

Exemplo mínimo em `/etc/carro-chefe/carro-chefe.env`:

```env
DATABASE_URL=file:/srv/carro-chefe/data/carro-chefe.db
LILY_DATABASE_URL=file:/srv/carro-chefe/data/lily-acai.db
TRUST_PROXY=true
PRODUCTION_AUTH_READY=false
VITE_GA4_ID=
VITE_CLARITY_ID=
```

`VITE_*` não é segredo: esses valores são incorporados ao bundle público durante o build. Segredos reais não podem usar prefixo `VITE_`.

## Release

Com o checkout já atualizado para o commit aprovado:

```bash
cd /srv/carro-chefe/current

# O build Vite precisa enxergar os VITE_* e o Prisma deve usar o banco correto.
set -a
. /etc/carro-chefe/carro-chefe.env
set +a

npm ci
npm run check
npm test
npm run build
```

Antes de `db:deploy` em banco que já contém dados, gere um backup consistente. Exemplo com `sqlite3`:

```bash
mkdir -p /srv/carro-chefe/data/backups
sqlite3 /srv/carro-chefe/data/carro-chefe.db ".backup '/srv/carro-chefe/data/backups/pre-migrate-$(date +%Y%m%d-%H%M%S).db'"
npm run db:deploy
```

Depois:

```bash
sudo systemctl restart carro-chefe
sudo systemctl is-active carro-chefe
curl --fail http://127.0.0.1:4173/api/health
```

Faça o smoke test externo somente por HTTPS e confirme que:

- `/` abre a landing;
- cadastro válido persiste;
- duplicata não cria novo lead;
- `/api/v1/public/prelaunch/*` responde;
- `/api/v1/*` não público retorna 404 no Nginx;
- `/gestao` retorna 404 no Nginx;
- recusar analytics não carrega GA4/Clarity;
- aceitar analytics carrega somente os IDs configurados;
- CookLily aceita `cc_qr`/`cc_campaign`/`cc_variant` por compatibilidade e persiste o modelo canônico `la*`;
- `/api/v1/lily/public/health` responde;
- lead CookLily válido persiste no banco Lily e repetição não duplica;
- sem opt-in promocional não há lead CookLily persistido.

## TLS e Nginx

O template `nginx/carrochefe.com.conf.example` pressupõe que o certificado Let's Encrypt já existe. Para a primeira emissão, use uma configuração HTTP compatível com o método de validação escolhido e só então habilite o bloco HTTPS do template.

O Nginx deve sobrescrever os cabeçalhos de proxy; não aceite `X-Forwarded-For` diretamente da Internet. Com essa topologia, `TRUST_PROXY=true` no Fastify é apropriado para rate limit por IP real.

## Central Operacional

Não remova os bloqueios de `/gestao` e das APIs internas apenas alterando `PRODUCTION_AUTH_READY`. Esse sinalizador não implementa autenticação. A exposição da Central exige login/sessão, autorização por papel, CSRF, auditoria de segurança e homologação separada.

## Backup e restauração

SQLite deve permanecer em volume local persistente e numa única instância gravadora. Mantenha cópia criptografada fora da VPS e teste restauração periodicamente.

Procedimento mínimo de restauração:

1. parar o serviço;
2. preservar o banco problemático para investigação;
3. copiar o backup validado para o caminho configurado em `DATABASE_URL`;
4. conferir proprietário/permissões;
5. iniciar o serviço;
6. executar health check e smoke test de cadastro em ambiente controlado.

Antes de múltiplas réplicas, storage de rede ou arquitetura distribuída, migrar a persistência para PostgreSQL gerenciado.


## CookLily — primeira publicação

Antes da primeira publicação CookLily, além do banco principal, faça backup de `/srv/carro-chefe/data/lily-acai.db` se ele já existir. Aplique a migration Lily com `npm run db:deploy:lily`.

Na Entrega 05, o Nginx também libera `/api/v1/lily/auth/*` e `/api/v1/lily/admin/*`.

Na Entrega 06, liberar explicitamente antes do bloqueio genérico:

```text
/api/v1/lily/orders
/api/v1/lily/orders/*
/api/v1/lily/customer/*
```

A autorização continua no Fastify; o Nginx não substitui sessão, papel ou CSRF.

A publicação deve usar um SHA imutável aprovado, nunca um `git pull` cego.

## CookLily — Entrega 06

SHA técnico validado para carrinho/pedidos:

`da166683ab2d0e27acae23d9714ec8e824a02ac4`

A migration `20260925100000_lily_orders` cria pedidos, itens, endereços, fulfillment e zonas. Os defaults deixam pedidos/retirada/entrega desligados.

Depois da migration, configurar dados operacionais reais no painel e manter `ordersEnabled=false` até o smoke estar concluído.
