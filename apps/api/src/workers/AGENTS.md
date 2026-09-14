# AGENTS — Workers

## Região

Executa filas locais, bridge Codex, webhooks e supervisão assíncrona. O worker coordena; não duplica regra dos módulos HTTP.

## Regras locais

- Inicialização falha de forma clara se configuração ou manifesto de política estiver inválido/desatualizado.
- Jobs são pequenos, observáveis, canceláveis quando aplicável e idempotentes diante de reentrega.
- Use heartbeat, timeout, retry limitado, graceful shutdown e concorrência configurada.
- Contexto enviado a modelos deve ser mínimo, relevante, sem segredos e vinculado a hash/versão auditável.
- Agente de negócio recebe workspace restrito e nunca instrução de programar; só `AG-DEV` recebe escrita no projeto.
- Não construa requests manuais longos quando o helper/runtime já completa metadados.

## Dependências

- Permitidas: `config`, contrato/runtime API e módulos especializados.
- Proibidas: escrita direta no SQLite, segredo hardcoded, ação externa implícita e import de UI.

## Pronto

- [ ] Preflight de política e caminho de falha testados.
- [ ] Logs/auditoria identificam versão, hash, escopo, execução e resultado sem dados sensíveis.
- [ ] Testes unitários cobrem seleção de política, orçamento e fail-safe.
