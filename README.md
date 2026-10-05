# Carro Chefe

Base estratégica, operacional e digital da lanchonete **Carro Chefe — Sabor que lidera**, com a operação temporária **CookLily** mantida em namespaces e persistência separados.

Este repositório reúne os ativos de marca existentes, arquitetura do negócio, plano de execução, aplicações, ferramentas e uma Central Operacional para que pessoas e agentes trabalhem com rastreabilidade.

## Comece por aqui

1. Leia [AGENTS.md](./AGENTS.md) para conhecer missão, precedência e responsabilidades.
2. Consulte o [mapa canônico do repositório](./docs/governanca/MAPA_REPOSITORIO.md) e a [regra de organização](./docs/governanca/ORGANIZACAO_REPOSITORIO.md) antes de criar ou mover arquivos.
3. Antes de qualquer tarefa, consulte o [catálogo operacional de ferramentas](./docs/ferramentas/README.md) e selecione as ferramentas adequadas.
4. Abra o [índice da documentação](./docs/README.md) para navegar por categoria e escopo de negócio.
5. Para Carro Chefe, use [docs/carro-chefe/README.md](./docs/carro-chefe/README.md). Para CookLily, use [docs/cooklily/README.md](./docs/cooklily/README.md).
6. Consulte [docs/fundacao/ARQUITETURA.md](./docs/fundacao/ARQUITETURA.md), [docs/fundacao/ROADMAP.md](./docs/fundacao/ROADMAP.md) e [docs/tecnologia/ARQUITETURA_TECNICA_V2.md](./docs/tecnologia/ARQUITETURA_TECNICA_V2.md).
7. Use [docs/governanca/GITHUB_E_AGENTES.md](./docs/governanca/GITHUB_E_AGENTES.md) para operar GitHub, chats e agentes com segurança.

## Organização obrigatória

`.repo/structure.json` é o contrato machine-readable da estrutura. `docs/governanca/MAPA_REPOSITORIO.md` é sua representação humana gerada. Qualquer alteração estrutural deve atualizar ambos na mesma entrega.

```bash
npm run repo:map        # gera/atualiza o mapa
npm run repo:map:check  # valida estrutura e sincronização
npm run policy:check    # valida política de agentes + mapa
```

O `policy:preflight` também valida a organização, portanto agentes não devem concluir trabalho com arquivo ou pasta fora do contrato.

## Protocolo obrigatório de ferramentas para agentes

Em toda tarefa, o agente deve aplicar a política **tool-first** de `docs/ferramentas/README.md`: procurar primeiro as ferramentas disponíveis, comparar capacidade, saúde, custo relativo, impacto estimado de Work, limitações e acesso, e priorizar a melhor ferramenta existente em vez de recriar sua função manualmente.

Se nenhuma ferramenta atender uma necessidade recorrente, registrar o planejamento em [`docs/ferramentas/PENDENCIAS.md`](./docs/ferramentas/PENDENCIAS.md). Impedimentos de acesso, quota, credencial, plataforma, dependência ou autoridade ficam em [`docs/ferramentas/BLOQUEIOS.md`](./docs/ferramentas/BLOQUEIOS.md), sem contornar controles de segurança.

Ferramentas próprias têm inventário executável em `tools/tool-health/catalog.json`. Use `npm run tools:status` para testar os checks aplicáveis e atualizar [`docs/ferramentas/STATUS_AUTOMATICO.md`](./docs/ferramentas/STATUS_AUTOMATICO.md).

## Estrutura principal

```text
apps/site/             Site público Carro Chefe
apps/gestao/           Central Operacional
apps/api/              API e módulos de domínio
apps/lily_acai/        Frontend isolado CookLily
apps/qr_manipulator/   QR Lab
packages/database/     Persistência operacional Carro Chefe/Central
packages/lily-database/ Persistência transacional isolada CookLily
packages/contracts/    Contratos compartilhados
packages/ui/           UI compartilhada sem regra de negócio
tools/                 Ferramentas próprias organizadas por capacidade
deploy/                Nginx, systemd, scripts e gates de deploy
docs/                  Documentação categorizada e separada por escopo
mídias/                Acervo visual categorizado por origem/uso
anexos/                Workbooks e anexos operacionais
logos/                 Originais de logotipo
cardápio/              Materiais visuais de cardápio preservados
elementos gráficos/   Originais de marca preservados
planejamento/          Implementação legada preservada
```

Consulte o mapa para a árvore completa e os diretórios gerenciados.

## Separação Carro Chefe × CookLily

A CookLily é uma operação isolada dentro do mesmo repositório. Seu frontend fica em `apps/lily_acai/`, backend em `apps/api/src/modules/lily/`, banco em `packages/lily-database/`, documentação sob o índice `docs/cooklily/` e ativos em `mídias/cooklily/`. Isso não altera a regra de que pedidos e pagamentos do **Carro Chefe** pertencem ao ERP definido para a marca.

## Execução local

Requer Node.js 20 ou superior.

```bash
npm ci
npm run db:deploy
npm run build
npm run dev
```

Para agentes locais, mantenha a API aberta e execute `npm run bridge:codex` quando necessário. No Windows, o supervisor pode ser instalado explicitamente com `npm run supervisor:install` e removido com `npm run supervisor:uninstall`.

## Direitos

A publicação deste repositório não licencia a marca nem seus ativos. Consulte [NOTICE.md](./NOTICE.md).
