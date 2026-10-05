# Deploy incremental e CLI operacional da VPS

## Objetivo

Reduzir o tempo de publicação sem enfraquecer os gates de produção e substituir sequências longas de comandos por uma interface curta e auditável.

A CLI instalada na VPS é `cc`. Depois de um deploy saudável, `deploy/scripts/carro-chefe-deploy` instala automaticamente `/usr/local/sbin/cc`.

## Comandos usuais

```bash
sudo cc deploy canonical
```

Resolve `origin/cooklily/canonical` para um SHA completo e imutável e chama o deployer.

```bash
sudo cc deploy <sha-completo>
```

Publica um SHA específico.

```bash
sudo cc deploy canonical --full
```

Ignora o cache de validação e reexecuta todos os gates repetíveis.

```bash
sudo cc prepare lily canonical
```

Faz `fetch`, resolve o SHA alvo, descobre automaticamente todos os helpers versionados com padrão `deploy/scripts/enable-lily-*-nginx`, valida a sintaxe, instala/executa cada helper de forma idempotente, executa `nginx -t` e valida a chave logística sem mostrar seu valor.

Alias equivalente:

```bash
sudo cc nginx lily canonical
```

```bash
sudo cc check logistics-key
```

Confere se `COOKLILY_LOGISTICS_CODE_KEY` existe e representa exatamente 32 bytes em base64url, sem imprimir o segredo.

```bash
sudo cc key logistics ensure
```

Cria uma chave aleatória de 32 bytes somente se a variável ainda não existir. Se houver uma chave existente porém inválida, o comando falha e **não a substitui automaticamente**, porque a troca altera os códigos derivados de coleta/entrega de pedidos em andamento.

```bash
sudo cc status
```

Mostra SHA atual, SHA canônico conhecido, serviço, Nginx, estado da chave logística e cache de validação.

```bash
sudo cc validation status
sudo cc validation clear
```

Inspeciona ou limpa somente o cache de gates. Limpar o cache não altera bancos nem configuração; apenas força revalidação na próxima publicação.

## Bootstrap único da CLI

Em uma VPS que ainda não possui `/usr/local/sbin/cc`, após o commit aprovado estar em `cooklily/canonical`, basta uma vez:

```bash
cd /srv/carro-chefe/current && git fetch origin --prune && git show origin/cooklily/canonical:deploy/scripts/cc > /tmp/cc && bash -n /tmp/cc && sudo install -m 0755 /tmp/cc /usr/local/sbin/cc && rm -f /tmp/cc
```

Depois disso, o próprio deployer mantém `cc` instalada a partir de cada release saudável.

## Cache incremental

O estado fica fora do Git:

```text
/srv/carro-chefe/data/deploy-validation/cache-v1.json
```

O cache é por **gate**, não apenas por SHA. Cada gate possui uma lista explícita de inputs em `deploy/validation/gates.json`. O fingerprint inclui:

- conteúdo dos arquivos versionados relevantes;
- configuração do próprio gate;
- implementação do motor de cache;
- comando executado;
- plataforma/arquitetura;
- versões de Node, npm e Python;
- inputs de ambiente públicos declarados explicitamente para o gate.

No build e no Tool Health, `VITE_GA4_ID` e `VITE_CLARITY_ID` participam do fingerprint porque são incorporados ao bundle Vite. Seus valores são usados somente como entrada do SHA-256: **não são gravados em claro no cache nem impressos no log**. Variáveis secretas não devem ser adicionadas como `envInputs`; segredos obrigatórios continuam sendo validados separadamente em todo deploy.

Somente resultado `success` é cacheado. Falha remove a entrada do gate. Mudança de fingerprint executa o gate novamente.

Os gates cacheáveis atuais são:

- `node-dependencies` — `npm ci`;
- `python-tooling` — venv e dependências Python;
- `preflight-migrations` — migrations em bancos temporários;
- `policy` — política de agentes;
- `static-checks` — Prisma validate/TypeScript;
- `tests` — suítes automatizadas;
- `build` — builds de produção;
- `tool-health` — saúde das ferramentas próprias.

A ausência de artefatos necessários força execução mesmo com fingerprint idêntico. Exemplos: `node_modules/.package-lock.json`, venv Python ou artefatos de build ausentes.

### O que nunca é pulado

Mesmo com todos os fingerprints em cache, o deploy continua executando em toda publicação:

1. validação de worktree/SHA;
2. precheck do Nginx;
3. validação dos segredos obrigatórios;
4. backup consistente dos bancos;
5. `integrity_check`/`foreign_key_check` e SHA-256 dos backups;
6. parada controlada do serviço;
7. migrations reais `prisma migrate deploy`;
8. permissões;
9. `nginx -t` e reload;
10. restart do Fastify;
11. readiness interno;
12. health CookLily/fulfillment;
13. smoke HTTPS externo;
14. evidência do deploy.

Portanto um `cache hit` nunca substitui validação operacional da VPS nem segurança de banco.

## Primeiro deploy após implantação do cache

O primeiro deploy executa os gates normalmente e semeia `/srv/carro-chefe/data/deploy-validation/cache-v1.json`. O ganho aparece nos deploys posteriores.

Em redeploy do mesmo runtime ou em commits que alteram apenas documentação fora dos inputs dos gates, o esperado é ver linhas como:

```text
validation_cache=hit gate=node-dependencies ...
validation_cache=hit gate=tests ...
validation_cache=hit gate=build ...
validation_cache=hit gate=tool-health ...
```

Mudança em código/schema/configuração relacionada produz `validation_cache=miss ... reason=fingerprint-changed` e reexecuta somente o gate afetado (e outros gates cujos inputs também incluam aquela área).

## Diagnóstico

Se houver dúvida sobre a validade do cache, use sempre:

```bash
sudo cc deploy canonical --full
```

Isso revalida tudo e, após sucesso, atualiza os fingerprints persistidos.

Nunca edite `cache-v1.json` manualmente para transformar falha em sucesso.
