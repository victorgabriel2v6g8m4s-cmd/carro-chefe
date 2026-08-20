# AGENTS — Manifesto de política

## Região

Configuração versionada das cápsulas e manifesto gerado consumido pelo runtime.

## Regras locais

- `capsules.json` é revisão humana compacta; `manifest.json` é artefato determinístico gerado.
- Não inclua prompt de tarefa, segredo, dado pessoal, estado mutável ou timestamp.
- Toda cápsula precisa ter responsabilidade clara, texto conciso e vínculo a fontes integrais por hash.
- Alteração exige `npm run policy:build`, revisão do diff e `npm run policy:check`.

## Limites

- A política não substitui autorização da Central nem amplia permissão de agente.
- Regra regional pode restringir, nunca remover proteção global.
