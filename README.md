# Carro Chefe

Base estratégica, operacional e digital da lanchonete **Carro Chefe — Sabor que lidera**.

Este repositório reúne os ativos de marca existentes, a arquitetura do negócio, o plano de execução e uma Central Operacional para que pessoas e agentes proponham e aprovem mudanças sem editar os arquivos de planejamento manualmente.

## Comece por aqui

1. Leia [AGENTS.md](./AGENTS.md) para conhecer a missão, as regras e as responsabilidades.
2. Abra [docs/ARQUITETURA.md](./docs/ARQUITETURA.md) para visualizar o negócio e os sistemas.
3. Consulte [docs/ROADMAP.md](./docs/ROADMAP.md) para a ordem de execução.
4. Inicie a plataforma seguindo [docs/ARQUITETURA_TECNICA_V2.md](./docs/ARQUITETURA_TECNICA_V2.md).
5. Use [docs/GITHUB_E_AGENTES.md](./docs/GITHUB_E_AGENTES.md) para operar GitHub, chats e agentes com segurança.

## Estrutura

```text
apps/site/            Site público React/Vite (`/welcome` e `/cardapio`)
apps/gestao/          Central Operacional React/Vite (`/gestao`)
apps/api/             API TypeScript, SSE, webhooks e bridge do Codex
packages/             Banco Prisma, contratos e componentes compartilhados
cardápio/             Materiais atuais do cardápio
elementos gráficos/  Elementos visuais originais
logos/                Variações oficiais da marca
mídias/               Destino de fotos e vídeos aprovados
docs/                 Arquitetura e plano do negócio
planejamento/         Dados iniciais e implementação legada preservada
```

## Entregas desta fundação

- visão do negócio e proposta de valor;
- arquitetura do site público, ERP, atendimento, dados e operação;
- catálogo normalizado do cardápio e modelo de modificadores;
- roadmap por ondas, impacto, urgência e dependências;
- agentes de Gestão, Marketing, Mídias, Development, Compras, Operações e Finanças;
- matriz de indicadores, riscos, decisões e critérios de aceite;
- API transacional com histórico justificado, trilha de auditoria, SSE e webhooks assinados;
- canal de execução, perguntas e respostas entre a Central e agentes Codex;
- site público e painel responsivo baseados na identidade visual existente.

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
