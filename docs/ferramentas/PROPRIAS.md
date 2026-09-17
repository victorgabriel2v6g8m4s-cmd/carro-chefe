# Ferramentas próprias do Carro Chefe

Este inventário cobre aplicações, scripts e utilitários mantidos pelo próprio projeto. A saúde automatizada é gerada por `tools/tool-health` em [STATUS_AUTOMATICO.md](./STATUS_AUTOMATICO.md); este arquivo descreve capacidades e critérios humanos.

| ID | Ferramenta | Capacidades | Maturidade | Processamento | Work | Limitações | Score |
|---|---|---|---|---|---|---|---:|
| `app-api` | `apps/api` | API Fastify, contratos HTTP, domínio, Prisma, SSE, webhooks, filas/execuções e integrações | completa | médio | nenhum direto/baixo para orquestração | não é checkout/fiscal/pagamento; produção exige autenticação e ambiente correto | 94 |
| `app-gestao` | `apps/gestao` | Central Operacional: tarefas, decisões, riscos, compras, agentes, auditoria e memória operacional | completa | médio | nenhum direto/baixo | depende da API; exposição pública é bloqueada até autenticação adequada | 92 |
| `app-site` | `apps/site` | site público, `/welcome`, cadastro de pré-lançamento, atribuição de campanha, analytics consentido e ponte para cardápio | completa | baixo/médio | nenhum direto/baixo | não implementa checkout; integração ERP depende de contrato/headers | 94 |
| `app-qr` | `apps/qr_manipulator` | QR no navegador, styling, background/centro, tracking, PNG, projeto JSON e manifesto | em desenvolvimento | médio | nenhum direto/baixo | encoder v1–10 byte mode; falta evidência do teste automatizado de decodificação exigido pelo próprio critério de pronto | 82 |
| `agent-policy` | `tools/agent-policy` | compilar/verificar manifesto de política, hashes, herança de `AGENTS.md` e preflight por agente/escopo | completa | baixo | nenhum direto/baixo | mudanças em fontes exigem rebuild do manifesto; não substitui regras integrais | 96 |
| `agent-runtime` | `tools/agent-runtime.mjs` | runtime/orquestração local dos agentes e conexão com a Central conforme configuração | em desenvolvimento | médio/alto | médio/alto quando aciona agentes | depende de ambiente/serviços; cobertura dedicada precisa ser ampliada | 84 |
| `excel-snapshot` | `tools/excel_snapshot` | exportar XLSM para snapshot textual determinístico, fórmulas, tabelas e VBA estático; verificar sincronização | completa | médio | nenhum direto/baixo | Python/dependências isoladas; não recalcula Excel nem executa macros | 95 |
| `excel-recipe` | `tools/excel_recipe` | motor reutilizável de receitas JSON para `.xlsm`; CRUD V1, dependências/rename V2, transformações físicas V3A e V3B com anchors DrawingML + referências ChartML clássico, SHA/firewall/rollback, receipts e snapshot configurável | completa | médio/alto em refactors estruturais | nenhum direto/baixo | Generic G1 ainda restringe o workspace ao repositório e aceita apenas `.xlsm`; VML, ActiveX/OLE, chartEx, pivôs, Power Query/conexões, VBA mutável e sintaxes não provadas permanecem blockers | 98 |
| `windows-supervisor` | `tools/windows-supervisor` | compilar/instalar supervisor que inicia API, agentes e webhooks no Windows | completa | baixo/médio | nenhum direto | Windows; instalação no logon é efeito de sistema e deve ser explícita | 89 |
| `planejamento-legacy` | `planejamento` | servidor/API e testes legados preservados; mantém compatibilidade durante a transição | completa/legada | baixo/médio | nenhum direto | não é arquitetura-alvo; evitar novas capacidades aqui sem decisão explícita | 74 |
| `tool-health` | `tools/tool-health` | validar catálogo, executar checks seguros, classificar saúde e atualizar status documental | em desenvolvimento | baixo/médio | nenhum direto/baixo | só testa comandos declarados; não instala dependências nem contorna permissões | 93 |

## Componentes compartilhados

`packages/contracts`, `packages/database` e `packages/ui` são bibliotecas internas de suporte, não ferramentas independentes. Sua saúde é coberta por typecheck, testes e builds do monorepo. Prisma/SQLite permanecem infraestrutura de persistência local da Central; o ERP futuro continua sendo a fonte transacional definida pelo projeto.

## Critério de maturidade

- `planejada`: contrato/aceite existe, implementação ainda não;
- `em desenvolvimento`: há código utilizável, mas falta um ou mais critérios de pronto/evidências;
- `completa`: contrato e critérios de pronto atendidos, com testes proporcionais;
- `completa/legada`: funcional e testada, porém mantida para compatibilidade e não recomendada para novas capacidades.

Maturidade não é substituída pelo resultado do último teste. Consulte `STATUS_AUTOMATICO.md` para saúde atual.

## Regras para uma nova ferramenta própria

Toda nova ferramenta deve ter ID estável, owner, README/uso, entradas e saídas, efeitos colaterais explícitos, limites, segurança, teste automatizado, comando não interativo e entrada em `tools/tool-health/catalog.json`. Se a necessidade ainda não justificar implementação, registre-a em `PENDENCIAS.md`.
