# AGENTS — Perfis Codex

## Região

Configuração de subagentes nativos do Codex para o projeto Carro Chefe.

## Regras locais

- Cada perfil é estreito, declara sua especialidade e só executa o preflight da política quando não houver execução válida registrada nos últimos 6 dias; ele se torna obrigatório quando tiver transcorrido mais de 6 dias desde a última execução válida para o agente/escopo.
- Dentro da janela de 6 dias após uma execução válida, não repita o preflight apenas por iniciar uma nova tarefa, sessão ou alteração.
- Todo perfil lê `REGRAS.md` e a cadeia `AGENTS.md` indicada para o caminho-alvo.
- Somente `development` altera código, configuração, schema, migração, CI ou automação.
- Perfis de negócio produzem análise, requisitos e artefatos apenas da sua área; software vira handoff para `development`.
- Modelos fixos destes perfis são defaults do Codex nativo; o runtime da Central continua escolhendo modelo/esforço por complexidade.
- Não ampliar sandbox, publicar, comprar, fazer deploy ou executar ação externa sem autorização.

## Pronto

- [ ] `name`, `description` e `developer_instructions` existem e não se contradizem.
- [ ] Perfil de negócio proíbe edição de código e identifica o handoff correto.
- [ ] Decisões de marca e fontes oficiais atuais estão refletidas.
- [ ] `npm run policy:build` e `npm run policy:check` passam após qualquer mudança.
