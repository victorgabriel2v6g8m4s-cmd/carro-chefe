# Checkpoint — deploy incremental + CLI operacional

- Tarefa: reduzir o tempo de deploy com cache por fingerprint/gate e criar comandos operacionais curtos para a VPS.
- Responsável: AG-DEV.
- Estado: em andamento.
- Branch: `feat/deploy-incremental-cli`.
- Base branch: `cooklily/canonical`.
- Base SHA verificado: `58a81359096743f354197c25f128d3d16eec7e93`.
- HEAD verificado no início: `58a81359096743f354197c25f128d3d16eec7e93`.

## Motivação verificada

O deploy de `24bef1616cd2d60208c6044b4a3b7ee747cc928c` repetiu `npm ci`, recriação do venv Python, suíte completa de testes e Tool Health mesmo com `previous_sha == release_sha`. A suíte Vitest executou 245 testes e levou cerca de 76 s; `npm ci` levou cerca de 57 s.

## Escopo

1. Cache persistente fora do Git em `/srv/carro-chefe/data/deploy-validation/`.
2. Fingerprints determinísticos por gate, usando somente arquivos versionados relevantes + versão do ambiente + comando executado.
3. Cache somente de resultados bem-sucedidos; falha invalida o gate.
4. Gates operacionais/produção continuam sempre executados: segredos, Nginx, backup verificável, migrations reais, restart, readiness, health e smoke externo.
5. `--full-validation` força todos os gates novamente.
6. CLI curta `cc` para deploy, preparação Nginx CookLily, checagem/criação segura da chave logística, status e inspeção do cache.
7. Instalação automática da CLI após deploy saudável.
8. Documentação e testes de regressão.

## Invariantes de segurança

- O cache nunca autoriza pular backup, migrations reais, Nginx, restart ou health/smoke.
- Segredos não entram no fingerprint nem são registrados no cache/log.
- Mudança de `package.json`/`package-lock.json`, runtime, schemas, código ou configuração de gate invalida os gates relacionados.
- Ausência de artefato necessário (`node_modules`, venv) força execução mesmo com fingerprint igual.
- O primeiro deploy após esta mudança executa os gates e semeia o cache.

## Trabalho em andamento

- [ ] implementar motor de fingerprint/cache;
- [ ] integrar cache ao deployer;
- [ ] adicionar CLI `cc`;
- [ ] adicionar testes;
- [ ] atualizar runbooks;
- [ ] executar gates/CI/CodeQL;
- [ ] abrir PR para `cooklily/canonical`.
