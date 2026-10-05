# Checkpoint — deploy incremental + CLI operacional

- Tarefa: reduzir o tempo de deploy com cache por fingerprint/gate e criar comandos operacionais curtos para a VPS.
- Responsável: AG-DEV.
- Estado: implementação validada tecnicamente e integrada; deploy real/cache warm-up pendentes.
- Branch de origem: `feat/deploy-incremental-cli`.
- Branch canônica: `cooklily/canonical`.
- Base SHA verificado: `58a81359096743f354197c25f128d3d16eec7e93`.
- SHA funcional validado: `45bb8fb7fa4c51439f772fd0a024c848a662cd35`.
- Merge SHA do PR #126: `383d6deca0c56c5d3fb284095f1f6e8baa51e907`.
- PR canônico: #126, integrado por squash.
- PR temporário de gate: #127, fechado sem merge após validação.

## Motivação verificada

O deploy de `24bef1616cd2d60208c6044b4a3b7ee747cc928c` repetiu `npm ci`, recriação do venv Python, suíte completa de testes e Tool Health mesmo com `previous_sha == release_sha`. A suíte Vitest executou 245 testes e levou cerca de 76 s; `npm ci` levou cerca de 57 s.

## Implementado

- motor `deploy/scripts/deploy-validation.mjs` com fingerprint SHA-256 determinístico por gate;
- catálogo `deploy/validation/gates.json` com inputs explícitos;
- cache externo em `/srv/carro-chefe/data/deploy-validation/cache-v1.json`;
- somente sucessos são cacheados; falha remove a entrada;
- versões de Node/npm/Python, plataforma, comando, configuração e implementação do motor participam do fingerprint;
- inputs públicos de build (`VITE_GA4_ID` e `VITE_CLARITY_ID`) invalidam build/Tool Health sem serem persistidos em claro;
- `node-dependencies`, `python-tooling`, preflight de migrations, policy, static checks, testes, build e Tool Health usam cache;
- ausência de `node_modules`, venv ou artefatos de build força execução;
- backup/verificação, migrations reais, Nginx, restart, readiness, health e smoke externo continuam sempre executados;
- `--full-validation` ignora cache e atualiza os fingerprints após sucesso;
- rollback anterior à primeira migration reaproveita `node_modules` quando `package.json`/`package-lock.json` são idênticos;
- CLI `deploy/scripts/cc` com `deploy`, `prepare/nginx lily`, `check/key logistics`, `validation` e `status`;
- `cc deploy` resolve o SHA, extrai/valida o deployer versionado desse próprio SHA e o executa, sem depender da versão instalada em `/usr/local/sbin`;
- `cc prepare lily` descobre automaticamente helpers `enable-lily-*-nginx` do SHA alvo, em vez de hardcodar apenas a Entrega 11D;
- `cc key logistics ensure` nunca substitui silenciosamente chave existente inválida;
- deploy saudável instala `/usr/local/sbin/cc`;
- testes unitários do cache e regressões estruturais do deployer/CLI adicionados;
- scripts Vitest por domínio foram adicionados para permitir granularização posterior sem alterar o contrato de CI atual;
- runbook `docs/lily-acai/DEPLOY_INCREMENTAL_CLI.md` criado e indexado.

## Invariantes de segurança

- O cache nunca autoriza pular backup, migrations reais, Nginx, restart ou health/smoke.
- Segredos não entram no fingerprint nem são registrados no cache/log.
- Mudança de `package.json`/`package-lock.json`, runtime, schemas, código ou configuração de gate invalida os gates relacionados.
- Ausência de artefato necessário força execução mesmo com fingerprint igual.
- O primeiro deploy após esta mudança executa os gates e semeia o cache.
- `cc prepare lily` altera Nginx apenas por helpers versionados, idempotentes e com `nginx -t`/rollback próprios.

## Evidência técnica

Head funcional validado: `45bb8fb7fa4c51439f772fd0a024c848a662cd35`.

- CI #669 / run `37347448040`: **success**;
- CodeQL #674 / run `37347448017`: **success**;
- Quality Node 20: **success**;
- Quality Node 24: **success**;
- Tool Health / Linux: **success**;
- Workbook Snapshot: **success**;
- Excel Recipe / Ubuntu: **success**;
- Excel Recipe / Windows: **success**;
- Windows Supervisor: **success**.

O merge por squash preserva o conteúdo funcional validado e adiciona o checkpoint documental. A atualização posterior deste checkpoint é apenas documental.

## Próximos passos

- [x] implementar motor de fingerprint/cache;
- [x] integrar cache ao deployer;
- [x] adicionar CLI `cc`;
- [x] adicionar testes;
- [x] atualizar runbooks;
- [x] abrir PR para `cooklily/canonical` (#126);
- [x] executar CI/CodeQL pelo gate temporário #127;
- [x] fechar #127 sem merge;
- [x] integrar #126 na canonical (`383d6deca0c56c5d3fb284095f1f6e8baa51e907`);
- [ ] bootstrap único de `cc` na VPS;
- [ ] primeiro deploy para semear o cache;
- [ ] segundo deploy/redeploy controlado para confirmar `validation_cache=hit` nos gates inalterados.
