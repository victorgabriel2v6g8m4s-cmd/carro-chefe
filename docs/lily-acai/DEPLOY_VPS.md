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
LILY_MFA_ENCRYPTION_KEY=<32-bytes-aleatorios-em-base64url>
TRUST_PROXY=true
NODE_ENV=production
```

Segredos nunca usam `VITE_*`.

A partir do MFA de staff/admin, `LILY_MFA_ENCRYPTION_KEY` é obrigatória em produção e o deployer falha antes de migrations se ela estiver ausente ou inválida. Gere uma vez na VPS e preserve a mesma chave enquanto existirem contas com MFA configurada:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Grave o valor somente em `/etc/carro-chefe/carro-chefe.env`, com permissões restritas. Não versione, não troque a chave sem plano de rotação e backup: ela cifra os segredos TOTP persistidos no banco Lily.

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

Entrega 07:

```text
/api/v1/lily/payments
/api/v1/lily/payments/*
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


## Bootstrap único do Nginx para a Entrega 06

Como a Entrega 06 abre os namespaces `/api/v1/lily/orders*` e `/api/v1/lily/customer/*`, existe um helper idempotente:

`deploy/scripts/enable-lily-entrega06-nginx`

Ele:

- cria backup da configuração real;
- não duplica blocos já presentes;
- aborta se detectar configuração parcial;
- insere as rotas somente antes do bloqueio genérico de `/api/`;
- executa `nginx -t`;
- restaura o backup automaticamente se o teste falhar;
- recarrega o Nginx somente após validação.

Instalação/execução na primeira publicação 06:

```bash
git show origin/feat/lily-entrega-06-pedidos:deploy/scripts/enable-lily-entrega06-nginx \
  > /usr/local/sbin/enable-lily-entrega06-nginx
chmod 0755 /usr/local/sbin/enable-lily-entrega06-nginx
sudo enable-lily-entrega06-nginx
```

Depois desse bootstrap, o deploy da Entrega 06 e releases futuras que usem os mesmos namespaces fica reduzido a:

```bash
sudo carro-chefe-deploy <sha-tecnico-validado>
```


## Bootstrap único do Nginx para a Entrega 07

A Entrega 07 abre os namespaces de pagamentos:

```text
/api/v1/lily/payments
/api/v1/lily/payments/*
```

O helper idempotente é:

`deploy/scripts/enable-lily-entrega07-nginx`

Ele cria backup, rejeita configuração parcial, insere os dois blocos somente antes do bloqueio genérico `/api/`, executa `nginx -t`, restaura o backup se a validação falhar e só então recarrega o Nginx.

Na VPS, instale a versão aprovada do helper a partir do SHA operacional validado:

```bash
cd /srv/carro-chefe/current
git fetch origin --prune

NGINX_HELPER_SHA="<sha-operacional-validado>"

git show "${NGINX_HELPER_SHA}:deploy/scripts/enable-lily-entrega07-nginx" \
  > /tmp/enable-lily-entrega07-nginx

bash -n /tmp/enable-lily-entrega07-nginx
install -m 0755 /tmp/enable-lily-entrega07-nginx /usr/local/sbin/enable-lily-entrega07-nginx
rm -f /tmp/enable-lily-entrega07-nginx

sudo enable-lily-entrega07-nginx
```

Depois confirme:

```bash
grep -F "location = /api/v1/lily/payments" /etc/nginx/sites-available/carrochefe.com
grep -F "location ^~ /api/v1/lily/payments/" /etc/nginx/sites-available/carrochefe.com
sudo nginx -t
```

Só depois repetir o `carro-chefe-deploy`.

## Readiness após restart

O deployer não trata mais `systemctl is-active` como prova suficiente de que a API já está pronta.

Depois de iniciar `carro-chefe`, ele consulta:

`http://127.0.0.1:4173/api/health`

por até 30 tentativas, com intervalo padrão de 1 segundo.

Variáveis opcionais:

```bash
CARRO_CHEFE_READINESS_ATTEMPTS=30
CARRO_CHEFE_READINESS_DELAY_SECONDS=1
```

Se a aplicação não ficar pronta dentro da janela, o deploy falha mostrando automaticamente:

- `systemctl status`;
- últimas linhas do `journalctl`;
- listener da porta 4173 quando `ss` estiver disponível;
- último erro do health check.

O smoke HTTPS externo também possui tentativas curtas para tolerar pequenos atrasos depois do reload/restart.

Esse comportamento evita falso negativo como o observado na primeira publicação da Entrega 06, em que migrations e restart concluíram mas o primeiro `curl` ocorreu antes do Fastify começar a escutar.


## Smoke de segurança — MFA staff/admin

Antes de liberar acesso administrativo após a migration `20260927160000_lily_staff_mfa`:

- login de customer continua sem MFA;
- conta promovida para staff/admin exige troca de senha quando aplicável;
- staff/admin sem MFA recebe `LILY_STAFF_MFA_SETUP_REQUIRED` nas rotas administrativas;
- configuração TOTP exige senha atual e CSRF;
- segredo TOTP persistido não aparece em texto puro no banco;
- confirmação inicial emite códigos de recuperação somente uma vez;
- nova sessão staff/admin recebe `LILY_STAFF_MFA_REQUIRED` até confirmar TOTP ou recovery code;
- recovery code usado uma vez não funciona novamente;
- após MFA válida, permissões staff/admin continuam respeitando RBAC;
- `LILY_MFA_ENCRYPTION_KEY` não aparece em bundle, logs de aplicação ou Git.


## Incidentes de preflight MFA e deployer instalado — 27/09/2026

Duas tentativas falharam com segurança na fase `tests`, antes de qualquer migration real, e restauraram automaticamente o checkout anterior `675a3004b2980d18f013081e37dd3b70e2099675`.

A segunda tentativa confirmou duas causas operacionais distintas:

1. `/usr/local/sbin/carro-chefe-deploy` ainda era uma versão antiga. O comando recebeu um SHA novo, mas o código do próprio deployer executado continuou sendo o binário antigo, portanto a correção `NODE_ENV=test` versionada no release não foi usada;
2. `/etc/carro-chefe/carro-chefe.env` ainda não possuía `LILY_MFA_ENCRYPTION_KEY`, e o caminho MFA falhou fechado quando executado com semântica de produção.

### Correção estrutural

O deployer agora, imediatamente após `git fetch` e antes de Nginx, checkout, gates, backup ou migrations:

- extrai `deploy/scripts/carro-chefe-deploy` do SHA alvo;
- compara o checksum com a versão em execução;
- se houver diferença, reexecuta exatamente a versão contida no release;
- preserva o lock de deploy através do `exec`;
- impede loop com `CARRO_CHEFE_DEPLOY_REEXEC`.

A suíte de preflight continua usando explicitamente `NODE_ENV=test`. Um teste separado exercita o MFA com `NODE_ENV=production` e chave válida.

### Bootstrap único desta VPS

Como o binário atualmente instalado é anterior ao mecanismo de auto-reexec, atualize-o uma vez antes do próximo deploy:

```bash
cd /srv/carro-chefe/current
git fetch origin --prune

RELEASE_SHA="bf72060e156775f3114c5fd91c5555c412894d3c"

git cat-file -e "${RELEASE_SHA}^{commit}"
git show "${RELEASE_SHA}:deploy/scripts/carro-chefe-deploy" > /tmp/carro-chefe-deploy
bash -n /tmp/carro-chefe-deploy

install -m 0755 /tmp/carro-chefe-deploy /usr/local/sbin/carro-chefe-deploy
rm -f /tmp/carro-chefe-deploy

EXPECTED="$(git show "${RELEASE_SHA}:deploy/scripts/carro-chefe-deploy" | sha256sum | awk '{print $1}')"
ACTUAL="$(sha256sum /usr/local/sbin/carro-chefe-deploy | awk '{print $1}')"
test "${EXPECTED}" = "${ACTUAL}" || { echo "ERRO: deployer instalado diverge do release"; exit 1; }
echo "deployer_bootstrap=ok"
```

### Chave MFA

Gere a chave somente na VPS e grave-a no arquivo de ambiente sem imprimi-la:

```bash
ENV_FILE=/etc/carro-chefe/carro-chefe.env

if ! grep -Eq '^LILY_MFA_ENCRYPTION_KEY=.+
  KEY="$(node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))")"

  if grep -q '^LILY_MFA_ENCRYPTION_KEY=' "${ENV_FILE}"; then
    sed -i "s|^LILY_MFA_ENCRYPTION_KEY=.*$|LILY_MFA_ENCRYPTION_KEY=${KEY}|" "${ENV_FILE}"
  else
    printf '\nLILY_MFA_ENCRYPTION_KEY=%s\n' "${KEY}" >> "${ENV_FILE}"
  fi

  unset KEY
fi

chmod 600 "${ENV_FILE}"

set -a
. "${ENV_FILE}"
set +a
node -e 'const k=Buffer.from(process.env.LILY_MFA_ENCRYPTION_KEY||"","base64url"); if(k.length!==32) process.exit(1); console.log("mfa_key=ok")'
```

Não substituir uma chave MFA já válida em releases futuros: contas já provisionadas dependem dela para descriptografar o segredo TOTP.

### Runtime aprovado para a próxima tentativa

`bf72060e156775f3114c5fd91c5555c412894d3c`

Evidências:

- CI `36352209781`: success;
- CodeQL `36352209735`: success;
- Node 20: 27 arquivos / 139 testes;
- Node 24: 27 arquivos / 139 testes;
- `mfa.test.ts`: 4/4 success;
- `deploy-scripts.test.ts`: 4/4 success;
- builds, Tool Health e gates auxiliares: success.

Depois do bootstrap do deployer e da chave:

```bash
sudo carro-chefe-deploy bf72060e156775f3114c5fd91c5555c412894d3c
```

Não usar `547985824...`, `4ec675fa...` ou a cabeça documental posterior da branch para esta publicação.
 "${ENV_FILE}"; then
  KEY="$(node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))")"

  if grep -q '^LILY_MFA_ENCRYPTION_KEY=' "${ENV_FILE}"; then
    sed -i "s|^LILY_MFA_ENCRYPTION_KEY=.*$|LILY_MFA_ENCRYPTION_KEY=${KEY}|" "${ENV_FILE}"
  else
    printf '\nLILY_MFA_ENCRYPTION_KEY=%s\n' "${KEY}" >> "${ENV_FILE}"
  fi

  unset KEY
fi

chmod 600 "${ENV_FILE}"

set -a
. "${ENV_FILE}"
set +a
node -e 'const k=Buffer.from(process.env.LILY_MFA_ENCRYPTION_KEY||"","base64url"); if(k.length!==32) process.exit(1); console.log("mfa_key=ok")'
```

Não substituir uma chave MFA já válida em releases futuros: contas já provisionadas dependem dela para descriptografar o segredo TOTP.

### Runtime aprovado para a próxima tentativa

`bf72060e156775f3114c5fd91c5555c412894d3c`

Evidências:

- CI `36352209781`: success;
- CodeQL `36352209735`: success;
- Node 20: 27 arquivos / 139 testes;
- Node 24: 27 arquivos / 139 testes;
- `mfa.test.ts`: 4/4 success;
- `deploy-scripts.test.ts`: 4/4 success;
- builds, Tool Health e gates auxiliares: success.

Depois do bootstrap do deployer e da chave:

```bash
sudo carro-chefe-deploy bf72060e156775f3114c5fd91c5555c412894d3c
```

Não usar `547985824...`, `4ec675fa...` ou a cabeça documental posterior da branch para esta publicação.


## Homologação do gateway Mercado Pago

A integração automática foi implementada de forma fail-closed e não cria nem ativa uma conta no processador.

Antes de selecionar `mercado_pago` no painel:

1. criar/aprovar a conta do estabelecimento no Mercado Pago;
2. criar a aplicação em Mercado Pago Developers;
3. habilitar o Checkout Transparente e cadastrar a chave Pix exigida pelo processador;
4. obter as credenciais produtivas `Public Key` e `Access Token`;
5. em **Webhooks**, configurar notificações de **Orders** para:

```text
https://carrochefe.com/api/v1/lily/payments/webhooks/mercado-pago
```

6. copiar a chave secreta gerada para validação das notificações;
7. adicionar manualmente em `/etc/carro-chefe/carro-chefe.env`, sem versionar os valores:

```env
MERCADO_PAGO_PUBLIC_KEY=<public-key-produtiva>
MERCADO_PAGO_ACCESS_TOKEN=<access-token-produtivo>
MERCADO_PAGO_WEBHOOK_SECRET=<secret-do-webhook>
```

8. manter o arquivo com permissões restritas;
9. fazer novo deploy/restart para o processo receber as variáveis;
10. acessar `/lilyacai/painel/pagamentos` e confirmar que o painel mostra as três credenciais como configuradas;
11. homologar Pix e cartão em operação controlada;
12. somente depois habilitar os métodos e, por último, `paymentsEnabled`.

### Segurança operacional

- `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_WEBHOOK_SECRET` nunca podem entrar em Git, logs, bundle Vite ou navegador;
- somente `MERCADO_PAGO_PUBLIC_KEY` pode ser enviada ao frontend;
- o endpoint de webhook fica coberto pelo namespace Nginx `/api/v1/lily/payments/`;
- o backend valida `x-signature` + `x-request-id` + `data.id` e consulta a Order diretamente no Mercado Pago antes de alterar o banco;
- a aprovação automática exige que o valor confirmado pelo provider seja exatamente o total do pedido;
- o painel não permite confirmação manual de pagamento de provider automático;
- cancelamentos e estornos automáticos chamam primeiro o provider;
- `paymentsEnabled`, Pix Mercado Pago e cartão Mercado Pago permanecem desligados até homologação.

### Smoke mínimo do gateway

Com uma conta/configuração de teste ou cobrança controlada:

- configuração pública nunca expõe Access Token nem Webhook Secret;
- Pix gera QR Code/Copia e Cola vinculado ao pedido correto;
- repetir a mesma criação com a mesma idempotência não duplica cobrança;
- webhook com assinatura inválida retorna 401;
- webhook válido é deduplicado;
- pagamento aprovado com valor exato muda pedido de `awaiting_payment` para `paid`;
- valor divergente não paga o pedido e cria reconciliação `discrepant`;
- cartão é criado somente com token do Brick; PAN/CVV não chegam ao backend;
- estorno parcial mantém pedido pago e registra saldo estornado;
- estorno total muda pagamento/pedido para `refunded`.

Veja também `docs/lily-acai/PAGAMENTOS_GATEWAY_2026-09-27.md`.
