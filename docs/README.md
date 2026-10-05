# Documentação do Carro Chefe

Este diretório concentra a documentação humana do projeto, organizada por **assunto** e por **escopo de negócio**.

## Separação de escopos de negócio

- **Carro Chefe:** navegação canônica em [carro-chefe/README.md](./carro-chefe/README.md).
- **CookLily:** navegação canônica em [cooklily/README.md](./cooklily/README.md); os documentos físicos permanecem em `docs/lily-acai/` por compatibilidade histórica/técnica até uma migração transacional aprovada.
- **Compartilhado:** ferramentas, governança e infraestrutura só são compartilhadas quando o documento declara esse escopo.

Uma decisão de CookLily não altera cardápio, marca ou operação do Carro Chefe automaticamente, e vice-versa.

## Comece por aqui

1. [Mapa do repositório](./governanca/MAPA_REPOSITORIO.md) — árvore, categorias, legado e política de branches.
2. [Organização obrigatória](./governanca/ORGANIZACAO_REPOSITORIO.md) — regra que toda pessoa/agente deve seguir ao criar ou mover arquivos.
3. [Catálogo operacional de ferramentas](./ferramentas/README.md) — seleção tool-first, custos relativos, limitações, saúde, pendências e bloqueios.
4. [GitHub e agentes](./governanca/GITHUB_E_AGENTES.md) — colaboração, branches e agentes.
5. [Arquitetura do negócio](./fundacao/ARQUITETURA.md) e [Roadmap](./fundacao/ROADMAP.md).
6. [Arquitetura técnica V2](./tecnologia/ARQUITETURA_TECNICA_V2.md).
7. [Índice Carro Chefe](./carro-chefe/README.md) ou [índice CookLily](./cooklily/README.md), conforme a operação.

## Organização canônica

```text
docs/
├── AGENTS.md
├── README.md
├── carro-chefe/            fronteira/índice do Carro Chefe
├── cooklily/               índice canônico CookLily
├── lily-acai/              conteúdo físico CookLily legado/compatível
├── execution-checkpoints/  checkpoints de execuções longas
├── ferramentas/            inventário, saúde, pendências e bloqueios
├── financeiro/             planilhas e documentação financeira não transacional
├── fundacao/               arquitetura e roadmap de alto nível
├── governanca/             agentes, GitHub, decisões e mapa do repositório
├── historico/              snapshots e status antigos
├── negocio/                marca, cardápio, marketing e funis do Carro Chefe
├── operacao/               compras, operação física e equipe
├── pre-lancamento/         campanha/implementação de pré-lançamento
├── referencias/            artefatos externos e documentos de referência
└── tecnologia/             arquitetura técnica, dados e ferramentas técnicas
```

A lista acima é controlada por `.repo/structure.json`; mudanças estruturais devem atualizar o contrato e `MAPA_REPOSITORIO.md` na mesma PR.

## Categorias

| Categoria | Finalidade | Entrada principal |
|---|---|---|
| **Carro Chefe** | índice e fronteira documental da marca/operação principal | [carro-chefe/README.md](./carro-chefe/README.md) |
| **CookLily** | índice da operação isolada e compatibilidade com `lily-acai/` | [cooklily/README.md](./cooklily/README.md) |
| **Ferramentas** | inventário, seleção, saúde automática, pendências e bloqueios | [ferramentas/README.md](./ferramentas/README.md) |
| **Fundação** | visão do negócio, arquitetura geral e sequência de implantação | [fundacao/ARQUITETURA.md](./fundacao/ARQUITETURA.md) |
| **Negócio** | marca, produto, cardápio, marketing e experiência comercial do Carro Chefe | [negocio/PRODUTO_CARDAPIO.md](./negocio/PRODUTO_CARDAPIO.md) |
| **Tecnologia** | sistemas, integrações, dados, ERP e ferramentas internas | [tecnologia/ARQUITETURA_TECNICA_V2.md](./tecnologia/ARQUITETURA_TECNICA_V2.md) |
| **Operação** | rotina física, qualidade, compras, fornecedores e contingência | [operacao/OPERACAO.md](./operacao/OPERACAO.md) |
| **Governança** | agentes, GitHub, decisões, riscos e organização do repositório | [governanca/MAPA_REPOSITORIO.md](./governanca/MAPA_REPOSITORIO.md) |
| **Histórico** | evidências antigas mantidas sem competir com documentos correntes | `historico/` |
| **Referências** | PDFs e documentos externos usados como evidência | `referencias/` |
| **Financeiro** | documentação de planilhas e artefatos financeiros versionados | `financeiro/` |

## Convenções

- antes de qualquer tarefa, agentes consultam `docs/ferramentas/README.md` e priorizam ferramentas existentes adequadas;
- antes de criar, mover ou remover arquivo, consultar `docs/governanca/MAPA_REPOSITORIO.md`;
- novos documentos entram na categoria mais próxima; não criar nova pasta apenas para um arquivo;
- arquivos soltos diretamente em `docs/` ficam limitados a `README.md` e `AGENTS.md`;
- referências internas usam links relativos;
- mudanças de caminho atualizam todos os links, imports, manifests e scripts afetados na mesma entrega;
- capacidade inexistente vai para `docs/ferramentas/PENDENCIAS.md`; impedimento de acesso/recurso vai para `docs/ferramentas/BLOQUEIOS.md`;
- documentos de plano distinguem capacidade disponível de capacidade planejada;
- documentos não substituem fontes transacionais oficiais definidas em `AGENTS.md`;
- `npm run repo:map:check` e `npm run policy:check` devem passar antes da integração.
