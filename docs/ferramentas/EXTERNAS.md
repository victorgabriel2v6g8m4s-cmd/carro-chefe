# Ferramentas externas e infraestrutura

Ferramentas de terceiros que sustentam desenvolvimento, teste, deploy, operação ou produção. Bibliotecas internas são tratadas em `PROPRIAS.md`; serviços ainda não contratados não devem ser tratados como disponíveis.

| Ferramenta | Uso no projeto | Processamento | Work | Limitações/dependências | Score típico |
|---|---|---|---|---|---:|
| Node.js 20+ | runtime, scripts, API, builds e testes | baixo/alto conforme tarefa | nenhum direto | versões suportadas pelo CI: 20 e 24; dependências precisam respeitar engines | 97 |
| npm | instalação lockada, workspaces e scripts | médio em instalação | nenhum direto | rede necessária para instalação; usar `npm ci` em CI/release | 95 |
| TypeScript | tipagem e verificação estática | médio | nenhum direto | não substitui testes de runtime | 94 |
| Vite | desenvolvimento/build dos frontends | médio | nenhum direto | build não valida UX real nem integrações externas | 92 |
| Vitest | testes automatizados JS/TS | médio | nenhum direto | cobertura depende dos testes existentes | 93 |
| Prisma | schema, client, validação e migração do banco operacional | médio | nenhum direto | migrações exigem cuidado/backup; não editar SQLite manualmente | 94 |
| SQLite / `sqlite3` | persistência local/atual da Central e backup controlado | baixo/médio | nenhum direto | uma instância gravadora; não é solução-alvo para escala distribuída | 89 |
| Fastify | servidor HTTP da API | baixo/médio | nenhum direto | segurança e autorização dependem da implementação/configuração | 92 |
| React / React DOM | interfaces `site`, `gestao` e QR Lab | médio | nenhum direto | framework não garante acessibilidade/performance por si só | 91 |
| Playwright Core | automação/browser quando usada pelos fluxos do projeto | médio/alto | nenhum direto | exige navegador/ambiente compatível; pode ser mais caro que testes unitários | 88 |
| Python 3.10+ | `excel_snapshot` e utilitários de dados | médio | nenhum direto | dependências Python ficam isoladas da produção Node | 91 |
| `openpyxl`/`oletools` | leitura estruturada XLSM e extração estática de VBA | médio | nenhum direto | não são motor de cálculo do Excel; não executam macros | 90 |
| Microsoft Excel Desktop | editar/recalcular XLSM preservando macros | médio | nenhum direto | licença/Windows ou macOS; automação não é assumida pelo CI Linux | 86 |
| PowerShell | build/instalação do supervisor Windows | baixo | nenhum direto | específico de ambiente; efeitos de startup precisam ser explícitos | 87 |
| compilador C#/.NET do Windows | gerar `CarroChefeSupervisor.exe` | baixo/médio | nenhum direto | depende do runner/host Windows suportado | 86 |
| Nginx | proxy HTTPS e fronteira pública da VPS | baixo | nenhum direto | alteração de produção requer autorização, TLS e configuração correta | 95 |
| systemd | execução/supervisão do serviço na VPS Linux | muito baixo | nenhum direto | requer acesso administrativo ao host; não deve ser acionado implicitamente | 93 |
| Let's Encrypt/TLS | certificado HTTPS na VPS | baixo | nenhum direto | emissão/renovação dependem de DNS/HTTP e configuração operacional | 92 |
| Git | versionamento local e sincronização com GitHub | baixo | nenhum direto | credenciais ficam fora do repositório; não usar force-push compartilhado | 96 |
| navegador moderno | validação manual de UX, acessibilidade e fluxos públicos | baixo/médio | nenhum direto | revisão manual não substitui automação nem vice-versa | 89 |

## Stack de bibliotecas, não ferramentas de escolha

O `package.json` também contém dependências como `better-sqlite3`, Zod, React Router e plugins Fastify. Elas são peças da implementação e devem ser avaliadas quando houver mudança arquitetural, vulnerabilidade ou atualização; não precisam ser escolhidas a cada tarefa como uma ferramenta operacional separada.

## Ferramentas/serviços futuros

ERP, observabilidade gerenciada, PostgreSQL e outros fornecedores só passam para o inventário de disponíveis quando houver decisão/contrato/configuração concreta. Até lá ficam em roadmap, decisão ou `PENDENCIAS.md`, nunca com custo ou capacidade inventados.