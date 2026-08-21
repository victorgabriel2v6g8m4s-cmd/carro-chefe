# Documentação do Carro Chefe

Este diretório concentra a documentação humana do projeto. Os documentos são organizados por **assunto**, mantendo poucos níveis para facilitar navegação, busca e referências estáveis.

## Comece por aqui

1. [Arquitetura do negócio](./fundacao/ARQUITETURA.md) — visão geral da operação, experiência física e sistemas.
2. [Roadmap](./fundacao/ROADMAP.md) — portões de decisão e ordem de execução.
3. [Arquitetura técnica V2](./tecnologia/ARQUITETURA_TECNICA_V2.md) — aplicações, API, persistência e runtime.
4. [GitHub e agentes](./governanca/GITHUB_E_AGENTES.md) — fluxo de colaboração, branches e agentes.
5. [Totem de autoatendimento](./tecnologia/TOTEM_AUTOATENDIMENTO.md) — hardware, offline-first, contingência e orçamento.

## Organização

```text
docs/
├── README.md
├── fundacao/
│   ├── ARQUITETURA.md
│   └── ROADMAP.md
├── negocio/
│   ├── MARCA.md
│   ├── MARKETING_MIDIAS.md
│   └── PRODUTO_CARDAPIO.md
├── tecnologia/
│   ├── ARQUITETURA_TECNICA_V2.md
│   ├── DADOS_ERP.md
│   └── TOTEM_AUTOATENDIMENTO.md
├── operacao/
│   ├── COMPRAS.md
│   └── OPERACAO.md
└── governanca/
    ├── AGENTES.md
    ├── GITHUB_E_AGENTES.md
    └── RISCOS_DECISOES.md
```

## Categorias

| Categoria | Finalidade | Documentos |
|---|---|---|
| **Fundação** | visão do negócio, arquitetura geral e sequência de implantação | [Arquitetura](./fundacao/ARQUITETURA.md), [Roadmap](./fundacao/ROADMAP.md) |
| **Negócio** | marca, produto, cardápio, marketing e experiência comercial | [Marca](./negocio/MARCA.md), [Marketing e mídias](./negocio/MARKETING_MIDIAS.md), [Produto e cardápio](./negocio/PRODUTO_CARDAPIO.md) |
| **Tecnologia** | sistemas, integrações, dados, ERP e equipamentos digitais | [Arquitetura técnica V2](./tecnologia/ARQUITETURA_TECNICA_V2.md), [Dados e ERP](./tecnologia/DADOS_ERP.md), [Totem](./tecnologia/TOTEM_AUTOATENDIMENTO.md) |
| **Operação** | rotina física, qualidade, compras, fornecedores e contingência | [Compras](./operacao/COMPRAS.md), [Operação e qualidade](./operacao/OPERACAO.md) |
| **Governança** | agentes, GitHub, decisões, riscos e regras de coordenação | [Agentes](./governanca/AGENTES.md), [GitHub e agentes](./governanca/GITHUB_E_AGENTES.md), [Riscos e decisões](./governanca/RISCOS_DECISOES.md) |

## Convenções

- novos documentos devem entrar na categoria mais próxima, evitando criar uma nova pasta para um único arquivo;
- referências dentro de `docs/` devem usar links relativos;
- referências partindo da raiz do repositório devem usar `docs/<categoria>/<arquivo>.md`;
- nomes de arquivos permanecem em maiúsculas com `_` quando já fazem parte do vocabulário do projeto;
- mudanças de estrutura precisam atualizar este índice e todas as referências encontradas no repositório;
- documentos transacionais não substituem as fontes oficiais definidas em `AGENTS.md`.
