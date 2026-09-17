# Documentação do Carro Chefe

Este diretório concentra a documentação humana do projeto. Os documentos são organizados por **assunto**, mantendo poucos níveis para facilitar navegação, busca e referências estáveis.

## Comece por aqui

1. [Catálogo operacional de ferramentas](./ferramentas/README.md) — seleção tool-first, custos relativos, limitações, saúde, pendências e bloqueios.
2. [Arquitetura do negócio](./fundacao/ARQUITETURA.md) — visão geral da operação, experiência física e sistemas.
3. [Roadmap](./fundacao/ROADMAP.md) — portões de decisão e ordem de execução.
4. [Arquitetura técnica V2](./tecnologia/ARQUITETURA_TECNICA_V2.md) — aplicações, API, persistência e runtime.
5. [GitHub e agentes](./governanca/GITHUB_E_AGENTES.md) — fluxo de colaboração, branches e agentes.
6. [Excel Recipe V1](./tecnologia/EXCEL_RECIPE_V1.md) — edição transacional e auditável do workbook `.xlsm`.
7. [Excel Recipe V2](./tecnologia/EXCEL_RECIPE_V2.md) — mapa de dependências e renames seguros.
8. [Excel Recipe V3A](./tecnologia/EXCEL_RECIPE_V3A.md) — transformações físicas seguras de linhas, colunas, ranges e Tables.
9. [Excel Recipe V3B](./tecnologia/EXCEL_RECIPE_V3B.md) — DrawingML e gráficos clássicos com reescrita fail-closed.
10. [Plano Excel Recipe V3](./tecnologia/EXCEL_RECIPE_V3_PLAN.md) — status V3A/V3B e roadmap V3C/V3D.
11. [Guia de agentes do Excel Recipe](./governanca/EXCEL_RECIPE_AGENT_GUIDE.md) — procedimento obrigatório para manutenção da planilha por receitas JSON.
12. [Totem de autoatendimento](./tecnologia/TOTEM_AUTOATENDIMENTO.md) — hardware, offline-first, contingência e orçamento.

## Organização

```text
docs/
├── README.md
├── ferramentas/
├── fundacao/
├── negocio/
├── tecnologia/
│   ├── EXCEL_RECIPE_V1.md
│   ├── EXCEL_RECIPE_V2.md
│   ├── EXCEL_RECIPE_V3A.md
│   ├── EXCEL_RECIPE_V3B.md
│   └── EXCEL_RECIPE_V3_PLAN.md
├── operacao/
└── governanca/
```

## Categorias

| Categoria | Finalidade | Documentos |
|---|---|---|
| **Ferramentas** | inventário, seleção, saúde automática, pendências e bloqueios | [Índice](./ferramentas/README.md), [Próprias](./ferramentas/PROPRIAS.md), [Status](./ferramentas/STATUS_AUTOMATICO.md) |
| **Fundação** | visão do negócio, arquitetura geral e sequência de implantação | [Arquitetura](./fundacao/ARQUITETURA.md), [Roadmap](./fundacao/ROADMAP.md) |
| **Negócio** | marca, produto, cardápio, marketing e experiência comercial | [Marca](./negocio/MARCA.md), [Marketing e mídias](./negocio/MARKETING_MIDIAS.md), [Produto e cardápio](./negocio/PRODUTO_CARDAPIO.md) |
| **Tecnologia** | sistemas, integrações, dados, ERP e ferramentas internas | [Arquitetura técnica V2](./tecnologia/ARQUITETURA_TECNICA_V2.md), [Dados e ERP](./tecnologia/DADOS_ERP.md), [Excel Recipe V1](./tecnologia/EXCEL_RECIPE_V1.md), [Excel Recipe V2](./tecnologia/EXCEL_RECIPE_V2.md), [Excel Recipe V3A](./tecnologia/EXCEL_RECIPE_V3A.md), [Excel Recipe V3B](./tecnologia/EXCEL_RECIPE_V3B.md), [Plano Excel Recipe V3](./tecnologia/EXCEL_RECIPE_V3_PLAN.md), [Totem](./tecnologia/TOTEM_AUTOATENDIMENTO.md) |
| **Operação** | rotina física, qualidade, compras, fornecedores e contingência | [Compras](./operacao/COMPRAS.md), [Operação e qualidade](./operacao/OPERACAO.md) |
| **Governança** | agentes, GitHub, decisões, riscos e regras de coordenação | [Agentes](./governanca/AGENTES.md), [Guia de agentes do Excel Recipe](./governanca/EXCEL_RECIPE_AGENT_GUIDE.md), [GitHub e agentes](./governanca/GITHUB_E_AGENTES.md), [Riscos e decisões](./governanca/RISCOS_DECISOES.md) |

## Convenções

- antes de qualquer tarefa, agentes consultam `docs/ferramentas/README.md` e priorizam ferramentas existentes adequadas;
- capacidade inexistente é registrada em `docs/ferramentas/PENDENCIAS.md`; impedimento de acesso/recurso é registrado em `docs/ferramentas/BLOQUEIOS.md`;
- novos documentos devem entrar na categoria mais próxima;
- referências dentro de `docs/` devem usar links relativos;
- nomes de arquivos permanecem em maiúsculas com `_` quando já fazem parte do vocabulário do projeto;
- mudanças de estrutura precisam atualizar este índice e referências afetadas;
- documentos de plano distinguem capacidade **disponível** de capacidade **planejada**;
- documentos transacionais não substituem as fontes oficiais definidas em `AGENTS.md`.
