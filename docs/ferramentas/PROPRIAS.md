# Ferramentas próprias do Carro Chefe

Este inventário cobre aplicações, scripts e utilitários mantidos pelo próprio projeto. A saúde automatizada é gerada por `tools/tool-health` em [STATUS_AUTOMATICO.md](./STATUS_AUTOMATICO.md); este arquivo descreve capacidades e critérios humanos.

| ID | Ferramenta | Capacidades | Maturidade | Processamento | Work | Limitações | Score |
|---|---|---|---|---|---|---|---:|
| `app-api` | `apps/api` | API Fastify, contratos HTTP, domínio, Prisma, SSE, webhooks, filas/execuções e integrações | completa | médio | nenhum direto/baixo para orquestração | não é checkout/fiscal/pagamento do Carro Chefe; o domínio CookLily permanece isolado | 94 |
| `app-gestao` | `apps/gestao` | Central Operacional: tarefas, decisões, riscos, compras, agentes, auditoria e memória operacional | completa | médio | nenhum direto/baixo | depende da API; exposição pública é bloqueada até autenticação adequada | 92 |
| `app-site` | `apps/site` | site público, `/welcome`, cadastro de pré-lançamento, atribuição de campanha, analytics consentido e ponte para cardápio | completa | baixo/médio | nenhum direto/baixo | não implementa checkout do Carro Chefe; integração ERP depende de contrato/headers | 94 |
| `app-lily` | `apps/lily_acai` | frontend isolado da CookLily, autenticação, catálogo, checkout, pedidos, pagamentos e operação correspondente ao estágio versionado | em desenvolvimento | baixo/médio | nenhum direto/baixo | operação separada; não pode misturar dados transacionais com o Carro Chefe | 86 |
| `app-qr` | `apps/qr_manipulator` | QR no navegador, styling, background/centro, tracking, PNG, projeto JSON e manifesto | em desenvolvimento | médio | nenhum direto/baixo | encoder v1–10 byte mode; falta evidência do teste automatizado de decodificação exigido pelo próprio critério de pronto | 82 |
| `agent-policy` | `tools/agent-policy` | compilar/verificar manifesto de política, hashes, herança de `AGENTS.md`, preflight por agente/escopo e gate do mapa do repositório | completa | baixo | nenhum direto/baixo | mudanças em fontes exigem rebuild do manifesto; não substitui regras integrais | 96 |
| `agent-runtime` | `tools/agent-runtime.mjs` | runtime/orquestração local dos agentes e conexão com a Central conforme configuração | em desenvolvimento | médio/alto | médio/alto quando aciona agentes | depende de ambiente/serviços; cobertura dedicada precisa ser ampliada | 84 |
| `excel-snapshot` | `tools/excel_snapshot` | exportar XLSM para snapshot textual determinístico, fórmulas, tabelas e VBA estático; verificar sincronização | completa | médio | nenhum direto/baixo | Python/dependências isoladas; não recalcula Excel nem executa macros | 95 |
| `excel-recipe` | `tools/excel_recipe` | motor reutilizável de receitas JSON para `.xlsm`; CRUD V1, dependências/rename V2, transformações físicas V3A e V3B com anchors DrawingML + referências ChartML clássico, SHA/firewall/rollback, receipts e snapshot configurável | completa | médio/alto em refactors estruturais | nenhum direto/baixo | Generic G1 ainda restringe o workspace ao repositório e aceita apenas `.xlsm`; VML, ActiveX/OLE, chartEx, pivôs, Power Query/conexões, VBA mutável e sintaxes não provadas permanecem blockers | 98 |
| `lily-build-budget` | `tools/lily-build-budget` | mede assets JS/CSS da CookLily, calcula gzip e bloqueia regressões acima do orçamento de performance | completa | baixo | nenhum direto | depende do build da CookLily para a medição final; os limites são versionados e precisam de revisão deliberada | 94 |
| `repo-map` | `tools/repo-map` | valida estrutura física, categorias, diretórios gerenciados e sincronização do mapa humano com `.repo/structure.json` | completa | baixo | nenhum direto | controla estrutura versionada, não decide sozinho a semântica de uma nova categoria | 97 |
| `windows-supervisor` | `tools/windows-supervisor` | compilar/instalar supervisor que inicia API, agentes e webhooks no Windows | completa | baixo/médio | nenhum direto | Windows; instalação no logon é efeito de sistema e deve ser explícita | 89 |
| `planejamento-legacy` | `planejamento` | servidor/API e testes legados preservados; mantém compatibilidade durante a transição | completa/legada | baixo/médio | nenhum direto | não é arquitetura-alvo; evitar novas capacidades aqui sem decisão explícita | 74 |
| `tool-health` | `tools/tool-health` | validar catálogo, executar checks seguros, classificar saúde e atualizar status documental | em desenvolvimento | baixo/médio | nenhum direto/baixo | só testa comandos declarados; não instala dependências nem contorna permissões | 93 |

## Componentes compartilhados

`packages/contracts`, `packages/database`, `packages/lily-database` e `packages/ui` são bibliotecas internas de suporte, não ferramentas independentes. A persistência CookLily continua isolada em `packages/lily-database`; Prisma/SQLite da Central e a futura fonte transacional do Carro Chefe permanecem separados conforme as regras do projeto.

## Critério de maturidade

- `planejada`: contrato/aceite existe, implementação ainda não;
- `em desenvolvimento`: há código utilizável, mas falta um ou mais critérios de pronto/evidências;
- `completa`: contrato e critérios de pronto atendidos, com testes proporcionais;
- `completa/legada`: funcional e testada, porém mantida para compatibilidade e não recomendada para novas capacidades.

Maturidade não é substituída pelo resultado do último teste. Consulte `STATUS_AUTOMATICO.md` para saúde atual.

## Regras para uma nova ferramenta própria

Toda nova ferramenta deve ter ID estável, owner, README/uso, entradas e saídas, efeitos colaterais explícitos, limites, segurança, teste automatizado, comando não interativo e entrada em `tools/tool-health/catalog.json`. Se a necessidade ainda não justificar implementação, registre-a em `PENDENCIAS.md`. A pasta da ferramenta deve ser criada sob `tools/<ferramenta>/` e incluída no mapa na mesma PR.
