# AGENTS — Ferramentas internas

## Região

Scripts de desenvolvimento, runtime de agentes e supervisor Windows.

## Regras locais

- Scripts de CI são determinísticos, não interativos e independentes de sessão local.
- Valide caminhos antes de criar/mover/excluir; prefira ações recuperáveis e menor privilégio.
- Não imprima nem persista segredos; use redaction e variáveis validadas.
- A CLI local do agente assina desafios via OpenSSH Agent, não imprime/salva tickets, não transfere chave privada e só aceita HTTPS fora de localhost.
- Entradas CLI têm allowlist, limites, ajuda curta e erro com exit code não zero.
- Ação externa, deploy, compra ou publicação nunca é efeito colateral implícito.

## Pronto

- [ ] Happy path, entrada inválida, ambiente ausente e falha parcial testados.
- [ ] Windows e CI suportados quando a ferramenta participa desses ambientes.
- [ ] Documentação operacional e preflight atualizados.
