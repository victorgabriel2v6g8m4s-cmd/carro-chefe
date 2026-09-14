# Política executável dos agentes

O runtime aplica uma cápsula curta e verificável em vez de copiar as 394 regras para cada prompt. A cápsula não substitui as fontes integrais: ela informa exatamente quais arquivos formam a cadeia do escopo, seus hashes e a raiz onde podem ser lidos.

```text
REGRAS.md + AGENTS.md raiz→região + capsules.json
                       │
                       ▼
              policy:build (determinístico)
                       │
                       ▼
        .agent-policy/manifest.json + SHA-256
                 │                    │
                 ▼                    ▼
          policy:check/CI       policy-context.ts
                                      │
                                      ▼
                           preflight do Codex bridge
                                      │
                         ┌────────────┴────────────┐
                         ▼                         ▼
                 cápsula no prompt        hash/escopo no log
```

## Comandos

- `npm run policy:build`: recompila o manifesto após revisão de `REGRAS.md`, qualquer `AGENTS.md` ou `capsules.json`.
- `npm run policy:check`: compara bytes, fontes, hashes, herança e orçamento; não escreve arquivos.
- `npm run policy:preflight -- --agent AG-DEV --scope apps/api/src/workers`: mostra a cadeia integral e a cápsula que será aplicada.

O `build` não grava timestamp, portanto entradas iguais geram manifesto e hash iguais em Windows e Linux. O `check` falha se um `AGENTS.md` for criado/removido, se uma fonte mudar, se o manifesto for adulterado ou se a cápsula ultrapassar o orçamento.

## Especialização

`AG-DEV` recebe a cápsula de implementação e escrita no projeto. Gestão, Marketing, Mídias, Dados, Compras, Operações, Finanças e Marca recebem a cápsula de negócio, sem instrução/autorização para programar. Esses agentes usam análise ou workspace isolado de artefatos e fazem handoff ao `AG-DEV` quando houver necessidade de software.
