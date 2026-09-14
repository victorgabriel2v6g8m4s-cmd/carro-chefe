# AGENTS — GitHub e CI

## Região

Workflows, templates, Dependabot e automações do repositório.

## Regras locais

- Use permissões mínimas, actions pinadas por SHA e inputs/outputs não confiáveis tratados com segurança.
- CI deve instalar lockfile, validar política antes do build e executar check, testes e builds.
- Não imprimir secrets, usar evento inseguro para código não confiável ou conceder escrita sem necessidade.
- Dependabot/automação não fazem merge, deploy ou publicação implícita.

## Pronto

- [ ] YAML válido e least privilege revisado.
- [ ] `npm run policy:check` falha se REGRAS/AGENTS/manifest divergirem.
- [ ] Comandos locais equivalentes passam.
