# AGENTS — Aplicações

## Região

Orquestra os produtos executáveis ainda ativos (`api`, `site` e `lily_acai`). A antiga Central Operacional (`gestao`) foi descontinuada e não deve ser buildada/publicada. Herda integralmente `REGRAS.md` e o `AGENTS.md` raiz.

## Arquitetura e limites

```text
UI → hooks/services → API versionada → módulos de domínio → persistência/integrações
```

- Aplicações podem consumir `packages/*`; pacotes não importam aplicações.
- Preserve os contratos do ERP e mantenha pedidos/pagamentos fora do site institucional.
- Configuração variável fica centralizada e validada; segredos nunca chegam ao frontend.
- Cada aplicação mantém build e testes independentes, sem duplicar regra compartilhada.

## Agentes e veto

- `AG-DEV` é o único agente que edita código.
- Segurança pode vetar fronteira sem validação/autorização; Dados pode vetar contrato inconsistente; Marca/UX pode vetar regressão pública ou inacessível.
- Agentes de negócio entregam requisito e aceite; não programam.

## Pronto

- [ ] Regras aplicáveis revisadas; `policy:preflight` é opcional e local.
- [ ] Fluxo ponta a ponta, estados de erro/vazio/loading, mobile e teclado avaliados.
- [ ] `npm run check`, testes pertinentes e build da aplicação passam.
- [ ] Logs não expõem segredos/dados pessoais e documentação regional continua válida.
