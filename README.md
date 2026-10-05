# Carro Chefe

Base estratégica, operacional e digital da lanchonete **Carro Chefe — Sabor que lidera**.

Este repositório reúne os ativos de marca existentes, a arquitetura do negócio, o plano de execução e uma Central Operacional para que pessoas e agentes proponham e aprovem mudanças sem editar os arquivos de planejamento manualmente.

## Comece por aqui

1. Leia [AGENTS.md](./AGENTS.md) para conhecer a missão, as regras e as responsabilidades.
2. Antes de qualquer tarefa, consulte o [catálogo operacional de ferramentas](./docs/ferramentas/README.md) e selecione as ferramentas adequadas.
3. Consulte o [mapa canônico do repositório](./docs/governanca/MAPA_REPOSITORIO.md) antes de criar, mover ou remover arquivos.
4. Abra o [índice da documentação](./docs/README.md) para navegar por categoria.
5. Abra [docs/fundacao/ARQUITETURA.md](./docs/fundacao/ARQUITETURA.md) para visualizar o negócio e os sistemas.
6. Consulte [docs/fundacao/ROADMAP.md](./docs/fundacao/ROADMAP.md) para a ordem de execução.
7. Inicie a plataforma seguindo [docs/tecnologia/ARQUITETURA_TECNICA_V2.md](./docs/tecnologia/ARQUITETURA_TECNICA_V2.md).
8. Use [docs/governanca/GITHUB_E_AGENTES.md](./docs/governanca/GITHUB_E_AGENTES.md) para operar GitHub, chats e agentes com segurança.

## Protocolo obrigatório de ferramentas para agentes

Em toda tarefa, o agente deve aplicar a política **tool-first** descrita em `docs/ferramentas/README.md`: procurar primeiro as ferramentas disponíveis, comparar capacidades, saúde, custo relativo, impacto estimado de Work, limitações e acesso, e priorizar a melhor ferramenta existente em vez de recriar sua função manualmente.

Se nenhuma ferramenta atender uma necessidade recorrente, o agente deve registrar o planejamento em [`docs/ferramentas/PENDENCIAS.md`](./docs/ferramentas/PENDENCIAS.md), com capacidade necessária e critérios de aceite. Se a execução for impedida por nível de acesso, permissão, quota, credencial, plataforma, dependência, recurso, fornecedor, autoridade ou qualquer outro bloqueio, o agente deve registrar o impedimento em [`docs/ferramentas/BLOQUEIOS.md`](./docs/ferramentas/BLOQUEIOS.md), sem contornar controles de segurança ou inventar dados.

Ferramentas próprias têm inventário executável em `tools/tool-health/catalog.json`. Use `npm run tools:status` para testar os checks aplicáveis e atualizar [`docs/ferramentas/STATUS_AUTOMATICO.md`](./docs/ferramentas/STATUS_AUTOMATICO.md).

## Organização obrigatória

A estrutura física do repositório é um contrato versionado em [`.repo/structure.json`](./.repo/structure.json). O mapa legível está em [`docs/governanca/MAPA_REPOSITORIO.md`](./docs/governanca/MAPA_REPOSITORIO.md) e as regras completas em [`docs/governanca/ORGANIZACAO_REPOSITORIO.md`](./docs/governanca/ORGANIZACAO_REPOSITORIO.md).

Não crie diretório novo na raiz por conveniência. Mudanças estruturais devem atualizar o contrato e o mapa na mesma PR. `npm run policy:check` e o preflight dos agentes validam automaticamente a organização; uma estrutura fora do contrato não pode ser integrada à `main`.

Comandos úteis:

```bash
npm run repo:map
npm run repo:map:check
npm run policy:check
```

## Estrutura

```text
apps/                 Aplicações executáveis: API, Central, site e QR Lab
packages/             Contratos, banco e componentes compartilhados
tools/                Ferramentas internas, automação e validações
deploy/               Infraestrutura e exemplos de deploy
docs/                 Documentação categorizada e mapa do repositório
mídias/               Acervo bruto, produtos e registros do espaço
logos/                Variações oficiais da marca
cardápio/             Originais visuais do cardápio preservados
elementos gráficos/  Elementos visuais originais de marca
anexos/               Binários e dados operacionais de referência
planejamento/         Implementação legada preservada até paridade
site/                  Placeholder legado; código ativo está em apps/site
.repo/                 Contrato machine-readable da organização
```

A árvore detalhada e as subpastas permitidas ficam no [mapa do repositório](./docs/governanca/MAPA_REPOSITORIO.md).

## Entregas desta fundação

- visão do negócio e proposta de valor;
- arquitetura do site público, ERP, atendimento, dados e operação;
- catálogo normalizado do cardápio e modelo de modificadores;
- roadmap por ondas, impacto, urgência e dependências;
- agentes de Gestão, Marketing, Mídias, Development, Dados, Compras, Operações, Finanças e Marca;
- matriz de indicadores, riscos, decisões e critérios de aceite;
- API transacional com histórico justificado, trilha de auditoria, SSE e webhooks assinados;
- canal de execução, perguntas e respostas entre a Central e agentes Codex;
- site público e painel responsivo baseados na identidade visual existente;
- catálogo de ferramentas e verificação automática da saúde das ferramentas próprias.

## Princípio de operação

O ERP será a fonte oficial de produtos, preços, estoque, pedidos, pagamentos e dados financeiros. A Central Operacional será a fonte oficial do plano, das decisões, dos riscos e da coordenação entre agentes. O site público apresentará a marca e encaminhará o pedido ao ambiente transacional do ERP.

## Execução local

Requer Node.js 20 ou superior.

```bash
npm ci
npm run db:deploy
npm run db:seed
npm run build
npm run dev
```

Abra `http://127.0.0.1:4173/welcome` e `http://127.0.0.1:4173/gestao`. Para um agente Codex local consumir a fila criada na Central, mantenha o servidor aberto e execute `npm run bridge:codex` em outro terminal.

No Windows, a opção recomendada é instalar o supervisor, que inicia a API, até três agentes Codex em paralelo e os webhooks no logon:

```bash
npm run supervisor:install
```

Depois, use o campo **Comando rápido** na Visão Geral. A Central encaminha a frase aos responsáveis e mostra uma notificação na conclusão. Para remover a inicialização automática, execute `npm run supervisor:uninstall`.

## Direitos

A publicação deste repositório não licencia a marca nem seus ativos. Consulte [NOTICE.md](./NOTICE.md).
