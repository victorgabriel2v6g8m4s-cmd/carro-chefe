# Documentação do Carro Chefe

Este diretório concentra a documentação humana do projeto. Os documentos são organizados por **assunto**, mantendo poucos níveis para facilitar navegação, busca e referências estáveis.

## Comece por aqui

1. [Catálogo operacional de ferramentas](./ferramentas/README.md) — seleção tool-first, custos relativos, limitações, saúde, pendências e bloqueios.
2. [Arquitetura do negócio](./fundacao/ARQUITETURA.md) — visão geral da operação, experiência física e sistemas.
3. [Roadmap](./fundacao/ROADMAP.md) — portões de decisão e ordem de execução.
4. [Arquitetura técnica V2](./tecnologia/ARQUITETURA_TECNICA_V2.md) — aplicações, API, persistência e runtime.
5. [GitHub e agentes](./governanca/GITHUB_E_AGENTES.md) — fluxo de colaboração, branches e agentes.
6. [Excel Recipe V1](./tecnologia/EXCEL_RECIPE_V1.md) — edição transacional e auditável de workbook `.xlsm`.
7. [Excel Recipe V2](./tecnologia/EXCEL_RECIPE_V2.md) — mapa de dependências e renames seguros.
8. [Excel Recipe V3A](./tecnologia/EXCEL_RECIPE_V3A.md) — transformações físicas seguras de linhas, colunas, ranges e Tables.
9. [Excel Recipe V3B](./tecnologia/EXCEL_RECIPE_V3B.md) — DrawingML/ChartML clássico suportado de forma fail-closed.
10. [Plano Excel Recipe V3](./tecnologia/EXCEL_RECIPE_V3_PLAN.md) — status V3A/V3B e roadmap V3C/V3D.
11. [Plano do Excel Recipe reutilizável](./tecnologia/EXCEL_RECIPE_GENERIC_ENGINE_PLAN.md) — separação entre core genérico e integração da planilha do Carro Chefe, com roadmap G1–G4.
12. [Guia de agentes do Excel Recipe](./governanca/EXCEL_RECIPE_AGENT_GUIDE.md) — procedimento obrigatório para manutenção de planilhas por receitas JSON.
13. [Totem de autoatendimento](./tecnologia/TOTEM_AUTOATENDIMENTO.md) — hardware, offline-first, contingência e orçamento.
14. [Atribuição omnicanal](./tecnologia/ATRIBUICAO_OMNICANAL.md) — regras aprovadas para cardápio físico/digital, QR por mesa, personalização, totem e origem de pedidos.
15. [Blender Agent](./tecnologia/BLENDER_AGENT.md) — bridge local, eventos de UI confinados ao Blender e roadmap do agente 3D.
16. [Contexto persistente do Blender Agent](./tecnologia/BLENDER_AGENT_CONTEXT.md) — consulta/captura de workspaces, auto-history segmentado, busca e retenção por etapa.
17. [Sculpt assistido do Blender Agent](./tecnologia/BLENDER_AGENT_SCULPT.md) — strokes seguros, checkpoints, before/after e integração MCP.
18. [Recipes 3D do Blender Agent](./tecnologia/BLENDER_AGENT_RECIPES.md) — recipes JSON versionadas, variants, execução step-by-step, critérios e receipts.
19. [Loop iterativo do Blender Agent](./tecnologia/BLENDER_AGENT_ITERATIVE.md) — percepção multimodal, proposals, budget, snapshots, rollback, critérios e aprovação humana da V0.5.
20. [Manual de agentes do Blender Agent](./governanca/BLENDER_AGENT_AGENT_GUIDE.md) — procedimento operacional obrigatório para agentes que controlam, refinam ou retomam produções 3D.
21. [Limitações de execução real do Blender Agent](./tecnologia/BLENDER_AGENT_REAL_RUN_LIMITS.md) — incidentes da recipe de 49 etapas, path Windows de 262 caracteres e regressão de `SculptPrepareJob`.
22. [Imagens de referência e texturas do Blender Agent](./tecnologia/BLENDER_AGENT_IMAGES.md) — Image Empty, Base Color por imagem, asset roots e CLI/MCP.
23. [Garrafa PET CookLily — produção 3D](./tecnologia/COOKLILY_GARRAFA_PET_3D.md) — blockout vazio, cotas provisórias, etiqueta separada, histórico, roadmap e dúvidas.

## Organização

```text
docs/
├── README.md
├── ferramentas/
│   ├── README.md
│   ├── GITHUB.md
│   ├── AGENTES.md
│   ├── SKILLS.md
│   ├── PLUGINS.md
│   ├── PROPRIAS.md
│   ├── EXTERNAS.md
│   ├── STATUS_AUTOMATICO.md
│   ├── PENDENCIAS.md
│   └── BLOQUEIOS.md
├── fundacao/
│   ├── ARQUITETURA.md
│   └── ROADMAP.md
├── negocio/
│   ├── FUNIL_SOCIAL_PRE_LANCAMENTO.md
│   ├── MARCA.md
│   ├── MARKETING_MIDIAS.md
│   ├── PRODUTO_CARDAPIO.md
│   └── REDES_SOCIAIS_TRENDS_CAMPO_GRANDE_2026.md
├── tecnologia/
│   ├── ARQUITETURA_TECNICA_V2.md
│   ├── BLENDER_AGENT.md
│   ├── BLENDER_AGENT_CONTEXT.md
│   ├── BLENDER_AGENT_SCULPT.md
│   ├── BLENDER_AGENT_RECIPES.md
│   ├── BLENDER_AGENT_ITERATIVE.md
│   ├── BLENDER_AGENT_IMAGES.md
│   ├── BLENDER_AGENT_REAL_RUN_LIMITS.md
│   ├── COOKLILY_GARRAFA_PET_3D.md
│   ├── ATRIBUICAO_OMNICANAL.md
│   ├── DADOS_ERP.md
│   ├── EXCEL_RECIPE_GENERIC_ENGINE_PLAN.md
│   ├── EXCEL_RECIPE_V1.md
│   ├── EXCEL_RECIPE_V2.md
│   ├── EXCEL_RECIPE_V2_PLAN.md
│   ├── EXCEL_RECIPE_V3A.md
│   ├── EXCEL_RECIPE_V3B.md
│   ├── EXCEL_RECIPE_V3_PLAN.md
│   ├── SOCIAL_GROWTH_ENGINE.md
│   └── TOTEM_AUTOATENDIMENTO.md
├── operacao/
│   ├── COMPRAS.md
│   ├── DECLARACAO_VINCULO_EMPREGATICIO_MODELO.md
│   └── OPERACAO.md
└── governanca/
    ├── AGENTES.md
    ├── BLENDER_AGENT_AGENT_GUIDE.md
    ├── EXCEL_RECIPE_AGENT_GUIDE.md
    ├── GITHUB_E_AGENTES.md
    └── RISCOS_DECISOES.md
```

## Categorias

| Categoria | Finalidade | Documentos |
|---|---|---|
| **Ferramentas** | inventário, seleção, saúde automática, pendências e bloqueios | [Índice](./ferramentas/README.md), [Próprias](./ferramentas/PROPRIAS.md), [Status](./ferramentas/STATUS_AUTOMATICO.md) |
| **Fundação** | visão do negócio, arquitetura geral e sequência de implantação | [Arquitetura](./fundacao/ARQUITETURA.md), [Roadmap](./fundacao/ROADMAP.md) |
| **Negócio** | marca, produto, cardápio, marketing e experiência comercial | [Marca](./negocio/MARCA.md), [Marketing e mídias](./negocio/MARKETING_MIDIAS.md), [Radar social de Campo Grande](./negocio/REDES_SOCIAIS_TRENDS_CAMPO_GRANDE_2026.md), [Funil social de pré-lançamento](./negocio/FUNIL_SOCIAL_PRE_LANCAMENTO.md), [Produto e cardápio](./negocio/PRODUTO_CARDAPIO.md) |
| **Tecnologia** | sistemas, integrações, dados, ERP e ferramentas internas | [Arquitetura técnica V2](./tecnologia/ARQUITETURA_TECNICA_V2.md), [Blender Agent](./tecnologia/BLENDER_AGENT.md), [Contexto do Blender Agent](./tecnologia/BLENDER_AGENT_CONTEXT.md), [Sculpt do Blender Agent](./tecnologia/BLENDER_AGENT_SCULPT.md), [Recipes 3D do Blender Agent](./tecnologia/BLENDER_AGENT_RECIPES.md), [Loop iterativo V0.5](./tecnologia/BLENDER_AGENT_ITERATIVE.md), [Imagens do Blender Agent](./tecnologia/BLENDER_AGENT_IMAGES.md), [Incidentes reais do Blender Agent](./tecnologia/BLENDER_AGENT_REAL_RUN_LIMITS.md), [Garrafa PET CookLily — produção 3D](./tecnologia/COOKLILY_GARRAFA_PET_3D.md), [Atribuição omnicanal](./tecnologia/ATRIBUICAO_OMNICANAL.md), [Dados e ERP](./tecnologia/DADOS_ERP.md), [Excel Recipe genérico](./tecnologia/EXCEL_RECIPE_GENERIC_ENGINE_PLAN.md), [Excel Recipe V1](./tecnologia/EXCEL_RECIPE_V1.md), [Excel Recipe V2](./tecnologia/EXCEL_RECIPE_V2.md), [Excel Recipe V3A](./tecnologia/EXCEL_RECIPE_V3A.md), [Excel Recipe V3B](./tecnologia/EXCEL_RECIPE_V3B.md), [Plano Excel Recipe V3](./tecnologia/EXCEL_RECIPE_V3_PLAN.md), [Social Growth Engine](./tecnologia/SOCIAL_GROWTH_ENGINE.md), [Totem](./tecnologia/TOTEM_AUTOATENDIMENTO.md) |
| **Operação** | rotina física, qualidade, compras, fornecedores, equipe e contingência | [Compras](./operacao/COMPRAS.md), [Modelo de declaração de vínculo empregatício](./operacao/DECLARACAO_VINCULO_EMPREGATICIO_MODELO.md), [Operação e qualidade](./operacao/OPERACAO.md) |
| **Governança** | agentes, GitHub, decisões, riscos e regras de coordenação | [Agentes](./governanca/AGENTES.md), [Manual Blender Agent](./governanca/BLENDER_AGENT_AGENT_GUIDE.md), [Guia de agentes do Excel Recipe](./governanca/EXCEL_RECIPE_AGENT_GUIDE.md), [GitHub e agentes](./governanca/GITHUB_E_AGENTES.md), [Riscos e decisões](./governanca/RISCOS_DECISOES.md) |

## Convenções

- antes de qualquer tarefa, agentes consultam `docs/ferramentas/README.md` e priorizam ferramentas existentes adequadas;
- capacidade inexistente é registrada em `docs/ferramentas/PENDENCIAS.md`; impedimento de acesso/recurso é registrado em `docs/ferramentas/BLOQUEIOS.md`;
- novos documentos devem entrar na categoria mais próxima, evitando criar uma nova pasta para um único arquivo;
- referências dentro de `docs/` devem usar links relativos;
- referências partindo da raiz do repositório devem usar `docs/<categoria>/<arquivo>.md`;
- nomes de arquivos permanecem em maiúsculas com `_` quando já fazem parte do vocabulário do projeto;
- mudanças de estrutura precisam atualizar este índice e todas as referências encontradas no repositório;
- documentos de plano devem distinguir claramente capacidade **disponível** de capacidade **planejada**;
- documentos transacionais não substituem as fontes oficiais definidas em `AGENTS.md`.

Os caminhos categorizados acima são os caminhos canônicos; branches posteriores devem atualizar referências antigas antes de serem integradas.
