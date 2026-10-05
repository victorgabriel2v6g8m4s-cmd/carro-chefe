# Checkpoint — deploy incremental + CLI operacional

- Tarefa: reduzir o tempo de deploy com cache por fingerprint/gate e criar comandos operacionais curtos para a VPS.
- Responsável: AG-DEV.
- Estado: implementação concluída; aguardando gates/CI/CodeQL.
- Branch: `feat/deploy-incremental-cli`.
- Base branch: `cooklily/canonical`.
- Base SHA verificado: `58a81359096743f354197c25f128d3d16eec7e93`.
- HEAD de implementação antes deste checkpoint: `78d60bc4e70c1c4aeff57ef8f865aec6e07bff51`.

## Motivação verificada

O deploy de `24bef1616cd2d60208c6044b4a3b7ee747cc928c` repetiu `npm ci`, recriação do venv Python, suíte completa de testes e Tool Health mesmo com `previous_sha == release_sha`. A suíte Vitest executou 245 testes e levou cerca de 76 s; `npm ci` levou cerca de 57 s.

## Implementado

- motor `deploy/scripts/deploy-validation.mjs` com fingerprint SHA-256 determinístico por gate;
- catálogo `deploy/validation/gates.json` com inputs explícitos;
- cache externo em `/srv/carro-chefe/data/deploy-validation/cache-v1.json`;
- somente sucessos são cacheados; falha remove a entrada;
- versões de Node/npm/Python, plataforma, comando, configuração e implementação do motor participam do fingerprint;
- `node-dependencies`, `python-tooling`, preflight de migrations, policy, static checks, testes, build e Tool Health usam cache;
- ausência de `node_modules`, venv ou artefatos de build força execução;
- backup/verificação, migrations reais, Nginx, restart, readiness, health e smoke externo continuam sempre executados;
- `--full-validation` ignora cache e atualiza os fingerprints após sucesso;
- rollback anterior à primeira migration reaproveita `node_modules` quando `package.json`/`package-lock.json` são idênticos;
- CLI `deploy/scripts/cc` com `deploy`, `prepare/nginx lily`, `check/key logistics`, `validation` e `status`;
- `cc prepare lily` descobre automaticamente helpers `enable-lily-*-nginx` do SHA alvo, em vez de hardcodar apenas a Entrega 11D;
- `cc key logistics ensure` nunca substitui silenciosamente chave existente inválida;
- deploy saudável instala `/usr/local/sbin/cc`;
- testes unitários do cache e regressões estruturais do deployer/CLI adicionados;
- runbook `docs/lily-acai/DEPLOY_INCREMENTAL_CLI.md` criado e indexado.

## Invariantes de segurança

- O cache nunca autoriza pular backup, migrations reais, Nginx, restart ou health/smoke.
- Segredos não entram no fingerprint nem são registrados no cache/log.
- Mudança de `package.json`/`package-lock.json`, runtime, schemas, código ou configuração de gate invalida os gates relacionados.
- Ausência de artefato necessário força execução mesmo com fingerprint igual.
- O primeiro deploy após esta mudança executa os gates e semeia o cache.
- `cc prepare lily` altera Nginx apenas por helpers versionados, idempotentes e com `nginx -t`/rollback próprios.

## Testes/gates

- testes versionados adicionados, ainda aguardando execução autoritativa no CI;
- CI: pending;
- CodeQL: pending;
- deploy real: pending após merge/gates verdes.

## Próximos passos

- [x] implementar motor de fingerprint/cache;
- [x] integrar cache ao deployer;
- [x] adicionar CLI `cc`;
- [x] adicionar testes;
- [x] atualizar runbooks;
- [ ] abrir PR para `cooklily/canonical`;
- [ ] aguardar CI/CodeQL;
- [ ] corrigir qualquer regressão encontrada;
- [ ] integrar na canonical somente após gates verdes;
- [ ] bootstrap único de `cc` na VPS e primeiro deploy para semear o cache.
