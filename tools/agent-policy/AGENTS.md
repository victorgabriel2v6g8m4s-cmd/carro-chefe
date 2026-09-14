# AGENTS — Política dos agentes

## Região

Compila e verifica a política compacta derivada de `REGRAS.md`, `AGENTS.md` hierárquicos e cápsulas revisadas.

## Invariantes

- Build é determinístico: mesma entrada gera bytes e hash idênticos, sem timestamp.
- Toda fonte registra caminho e SHA-256; novo/alterado `AGENTS.md` invalida o manifesto.
- Preflight falha fechado se fonte, hash, versão, escopo, agente ou orçamento estiver inválido.
- Cápsulas são resumos operacionais; sempre mantêm ponte para a cadeia integral de fontes.
- `AG-DEV` e agentes de negócio recebem cápsulas distintas; negócio nunca recebe autorização de programar.
- Implementação usa somente Node padrão e não acessa rede, banco ou segredos.

## Pronto

- [ ] `npm run policy:build` é revisado no diff.
- [ ] `npm run policy:check` e testes de fail-safe/orçamento/herança passam.
- [ ] Bridge registra versão/hash/fontes aplicadas sem despejar os documentos no prompt.
