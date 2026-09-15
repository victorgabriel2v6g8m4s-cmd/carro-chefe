# Ferramentas do GitHub

Escopo: recursos do GitHub e do conector GitHub usados para versionamento, revisão, automação e auditoria. A `main` é protegida e não é área de trabalho dos agentes.

## Catálogo

| Ferramenta/capacidade | Capacidades principais | Processamento | Work | Limitações e acesso | Evidência/status | Score |
|---|---|---|---|---|---|---:|
| Repositório Git | histórico, diff, branches, tags, recuperação e auditoria | baixo | nenhum/baixo | exige Git e acesso ao repositório; conflitos precisam de resolução | ativo | 94 |
| Branches | isolar entregas e impedir escrita direta na `main` | muito baixo | baixo | uma branch por entrega; sem force-push compartilhado | ativo; `main` protegida | 96 |
| Pull Requests | revisão, discussão, comparação e merge controlado | baixo | baixo | merge depende de checks/aprovação; usar squash conforme política | ativo | 96 |
| GitHub Actions / CI | testes em Linux/Windows, builds e verificações reproduzíveis | médio/alto | nenhum | usa minutos/recursos do GitHub, não cota do Work; depende de runners | ativo | 95 |
| CodeQL | análise estática de segurança JavaScript/TypeScript | médio | nenhum | cobertura limitada às linguagens/configuração habilitadas | obrigatório na `main` | 91 |
| Dependabot | atualização/vigilância de dependências npm e Actions | baixo | nenhum | não substitui revisão de compatibilidade/segurança | configurado semanalmente | 88 |
| CODEOWNERS e templates | padronizar ownership, issues e PRs | muito baixo | nenhum | governança, não valida funcionalidade | ativo | 86 |
| Busca/leitura via conector GitHub | localizar arquivos/código, ler árvore, commits, PRs e status | baixo | baixo | indexação pode atrasar; binários têm suporte limitado | conector instalado | 93 |
| Escrita via conector GitHub | criar branch, arquivos, commits e atualizar refs | baixo | médio | respeita permissões e proteção; não substitui testes locais/CI | conector instalado com escrita | 92 |
| Inspeção de CI/PR | ler patches, arquivos alterados, checks e metadados | baixo | baixo | alguns endpoints dependem de permissões do GitHub App | disponível | 91 |

## Uso recomendado

Use GitHub como fonte de verdade para código e documentação versionada. Mudanças devem nascer em branch própria, passar por testes e revisão e só depois seguir para merge autorizado. Para trabalho do agente, prefira o conector GitHub para leitura/escrita estruturada quando ele cobre a operação; use CLI/Git local apenas quando a tarefa exige comportamento que o conector não oferece.

## Checks atualmente exigidos pela `main`

- `Quality / Node 20`;
- `Quality / Node 24`;
- `CodeQL / JavaScript`.

O workflow de CI também contém verificação do snapshot XLSM e compilação do supervisor Windows. Consulte `.github/workflows/ci.yml` para o contrato executável.

## Restrições críticas

Não fazer push direto na `main`, force-push, reescrita de histórico ou inclusão de segredos. Criação/alteração de regras administrativas, secrets, credenciais, deploy ou publicação continua sujeita à autorização e ao nível de acesso efetivamente disponível.