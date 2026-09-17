# AGENTS — Documentação

## Região

Arquitetura, decisões, riscos, operação e instruções humanas. Documentação explica; banco/ERP mantêm estado transacional.

## Regras locais

- Registre problema, decisão, motivo, impacto, alternativa, owner e evidência verificável.
- Não invente preço, fornecedor, licença, prazo ou métrica; hipótese deve estar rotulada.
- Preserve PT-BR, nomes oficiais e encoding UTF-8. Links e caminhos devem ser válidos.
- Nunca copie segredo, PII, dump de banco ou log sensível.
- Mudança estrutural atualiza mapa/fluxo e o `AGENTS.md` regional correspondente.
- `DEC-010` constitui autorização explícita permanente do proprietário para merge por squash de PRs **exclusivamente documentais** que apenas registrem decisões já aprovadas/finalizadas, desde que todos os checks e proteções da `main` sejam satisfeitos e não haja expansão para código, deploy, publicação externa, compra ou outra ação operacional.

## Pronto

- [ ] Fonte, data e status distinguem fato, decisão e hipótese.
- [ ] Fluxo mostra como módulos se interligam, não só lista arquivos.
- [ ] Documentação não contradiz contratos, seed ou ERP; divergência está sinalizada.
- [ ] Quando `DEC-010` for usado, o diff foi revisado e permanece estritamente documental e restrito ao registro de decisão finalizada.
