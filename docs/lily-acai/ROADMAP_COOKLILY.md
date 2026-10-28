# Roadmap oficial — CookLily

**Nome público:** CookLily  
**Wordmark oficial:** cookLily  
**Branch canônica:** `cooklily/canonical`  
**Site real:** `https://carrochefe.com/lilyacai/*`  
**Documento atualizado:** 21/10/2026

Este roadmap cobre apenas desenvolvimento de software, integrações, infraestrutura da aplicação e documentação técnica. Produção de artes, cadastro comercial em plataformas, campanhas/ads, chamadas de inauguração, execução da inauguração e contratação de terceiros ficam fora deste plano.

## Regras de execução

1. **Prioridade principal:** primeiro deixar o site aceitando pagamentos e assegurar o fluxo pedido → confirmação autoritativa do pagamento → liberação correta para preparo. Assim que esse fluxo estiver pronto, o **ERP passa a ser a prioridade máxima**.
2. **Entrega incremental:** não executar uma bateria completa de testes a cada entrega por iniciativa própria.
3. **Testes sob solicitação:** testes funcionais/homologação no site real serão executados quando o proprietário pedir. Isso não elimina gates técnicos/de segurança obrigatórios pelo repositório ou pelo deploy.
4. **Deploy:** cada entrega relevante aprovada para publicação deve ser implantada na VPS e validada em `carrochefe.com/lilyacai/*`, dentro do escopo combinado. O deploy exige autorização explícita para o SHA exato.
5. **Comando habitual:** `sudo cc deploy canonical`. Pode variar; consultar `docs/lily-acai/DEPLOY_INCREMENTAL_CLI.md` e `docs/lily-acai/DEPLOY_VPS.md`. Atualizar este documento não exige deploy de aplicação.
6. **UI/UX/design:** seguir `docs/lily-acai/marca/KIT_DE_MARCA.md`, ativos oficiais e regras locais de `AGENTS.md`. Não misturar a identidade visual do Carro Chefe com a CookLily.
7. **Segurança e isolamento:** preservar `/lilyacai/*`, `/api/v1/lily/*), banco e dados CookLily separados. Nunca versionar segredos nem duplicar uma fonte de verdade transacional que deva pertencer ao ERP.
8. **Ferramentas próprias:** consultar a documentação de scripts/CLIs antes de utilizá-los e respeitar prechecks, backup, rollback e gates.
9. **Status honesto:** implementação, CI verde, integração na branch, deploy, teste real e homologação comercial são estados diferentes. Não marcar uma fase concluída sem evidência correspondente.

## Fase 1 — Site público pronto para operar

Esta é a prioridade antes do ERP.

### 1. Aviso de inauguração no site
- [ ] Implementar componente de aviso/estado de inauguração, se ainda necessário.
- [ ] Permitir alterar texto/estado sem modificar código a cada atualização, se compatível com a arquitetura.
- [ ] Seguir kit de marca, acessibilidade e responsividade.
- [ ] Não inventar data, promoção ou promessa operacional.

Fora do escopo: redação publicitária final, arte gráfica e decisão da data de inauguração.

### 2. Página de pesquisa e recompensa
- [ ] Implementar a página de pesquisa.
- [ ] Aprovar regras antes de codificar: elegibilidade, concessão, limites, expiração, prevenção de abuso e auditoria.
- [ ] Definir dados necessários, finalidade, consentimento e retenção compatíveis com a LGPD.
- [ ] Separar resposta de pesquisa, consentimento de marketing e compartilhamento de dados.
- [ ] Implementar estados de sucesso, erro, duplicidade e inelegibilidade com UX acessível.

**Bloqueio:** não inventar valor ou regra comercial da recompensa; aguardar aprovação.

### 3. Integração com WhatsApp
- [ ] Concluir as integrações de software aprovadas que ainda estiverem pendentes.
- [ ] Manter notificações operacionais separadas de mensagens promocionais.
- [ ] Respeitar opt-in/opt-out, consentimentos e configuração do provider.
- [ ] Manter segredos somente na configuração protegida da VPS.
- [ ] Garantir que indisponibilidade do WhatsApp não bloqueie pedido, pagamento, cozinha ou entrega.

As notificações operacionais já são descritas na Entrega 11H. Verificar gaps concretos antes de criar trabalho duplicado.

### 4. Adaptar o painel de gerenciamento
- [ ] Ajustar o painel às necessidades reais da operação CookLily.
- [ ] Priorizar configuração da loja, catálogo, disponibilidade, pedidos, pagamentos e estados operacionais.
- [ ] Preservar RBAC, MFA, CSRF, auditoria, minimização de dados e isolamento por domínio.
- [ ] Evitar segunda fonte de verdade para produtos, preços, estoque, pedidos, pagamentos ou financeiro quando o ERP assumir esses domínios.
- [ ] Registrar gaps concretos antes de ampliar o painel; evitar refatoração sem necessidade comprovada.

### 5. Finalizar landing page e UI pública
- [ ] Fechar itens abertos de UI/UX conforme U1–U6 da especificação detalhada.
- [ ] Corrigir hierarquia de compra, responsividade, acessibilidade, estados de interface e conteúdo provisório.
- [x] Implementar a apresentação de alergênicos em sanfona fechada por padrão, conforme ADR-002 (PR #169 integrado).
- [ ] Validar visualmente e por teclado a sanfona em navegador/dispositivos reais.
- [ ] Revisar dados reais de alergênicos e contato cruzado por produto/sabor/adicional antes de vender.
- [ ] Usar ativos aprovados; placeholders devem ser distinguíveis de conteúdo publicado.
- [ ] Mostrar somente preços, disponibilidade, prazos e métodos de pagamento autorizados pelo backend.

Referências: `docs/lily-acai/UX_REELS_DASHBOARD_FIDELIDADE_2026-10-09.md`, `docs/lily-acai/marca/KIT_DE_MARCA.md` e `docs/lily-acai/decisoes/ADR_002_UX_ALERGENICOS_PAGAMENTOS_2026-09-30.md`.

### 6. Fechar o fluxo financeiro obrigatório
**Gate de liberação — não presumir que já está homologado.**
- [ ] Aceitar somente métodos de pagamento realmente habilitados.
- [ ] Concluir pendências aprovadas, incluindo coexistência de Pix próprio e crédito/débito Mercado Pago conforme configuração e disponibilidade autorizadas.
- [ ] Confirmar pagamento por fonte autoritativa; gerar/ler o QR não prova recebimento.
- [ ] Atualizar o pedido de forma consistente para pago e liberar preparo somente após confirmação válida.
- [ ] Preservar idempotência, reconciliação, auditoria e tratamento de falhas.
- [ ] Nunca simular aprovação nem liberar pedido com pagamento pendente.

**Critério para avançar:** site preparado para pedido → pagamento confirmado → preparo, com homologação aceita pelo proprietário quando solicitada. O registro consultado de 08/10 informa que o QR foi lido e o valor conferido, mas nenhum pagamento foi concluído; o fluxo ponta a ponta não está comprovado por esse registro.

Referências: `docs/lily-acai/entregas/HOMOLOGACAO_QR_PIX_2026-10-08.md`, `docs/lily-acai/entregas/ENTREGA_07_PAGAMENTOS_RECONCILIACAO.md` e `docs/lily-acai/PAGAMENTOS_GATEWAY_2026-09-27.md`.

### 7. Integração canônica com o repositório Carro Chefe
- [ ] Manter mudanças aprovadas integradas em `cooklily/canonical`.
- [ ] Preservar a fronteira CookLily/Carro Chefe e namespaces/bancos separados.
- [ ] Confirmar que mudanças em `/lilyacai/*` não quebram site institucional, gestão ou APIs do Carro Chefe.
- [ ] Tratar merge, deploy e homologação como marcos diferentes.
- [ ] Usar os fluxos documentados; não fazer merge de branches históricas inteiras sem revisão.

### 8. Animações 3D na página
- [ ] Iniciar somente depois de estabilizar o fluxo de compra e a UI principal.
- [ ] Usar solução compatível com o stack e carregamento progressivo.
- [ ] Respeitar reduced motion, acessibilidade, desempenho mobile e fallback sem WebGL quando necessário.
- [ ] Não atrasar conteúdo, catálogo, checkout nem pagamento por efeitos decorativos.
- [ ] Seguir o kit de marca CookLily.

Produção externa de modelos/arte 3D não é desenvolvimento de software e fica fora do escopo.

### 9. Gerenciamento próprio de entregas
- [ ] Revisar o fluxo já implementado antes de criar componentes duplicados.
- [ ] Fechar gaps concretos em atribuição, fila, coleta, entrega, códigos, reatribuição e histórico.
- [ ] Manter estados de pagamento, preparo e logística separados.
- [ ] Preservar acesso mínimo de entregadores e proteção de endereço/telefone.
- [ ] Documentar configuração operacional e contingências.
- [ ] Validar em dispositivos reais quando solicitado.

Referências: `docs/lily-acai/PIX_OPERACAO_PEDIDOS_ROADMAP_2026-09-27.md` e documentos das entregas 11A–11K.

### 10. Corrigir pendências bloqueadoras
- [ ] Consolidar gaps comprovados na branch canônica, deploy ou testes solicitados.
- [ ] Priorizar falhas que bloqueiem pedido, pagamento, confirmação, preparo, segurança, privacidade ou entrega.
- [ ] Resolver achados de acessibilidade, responsividade e UX com base em evidência.
- [ ] Não reabrir itens resolvidos sem evidência de regressão.
- [ ] Registrar a resolução e atualizar o roadmap.

“Corrigir pendências” não autoriza uma rodada genérica de testes. Testes funcionais ocorrem quando solicitados; gates obrigatórios de engenharia/deploy continuam valendo.

## Fase 2 — ERP: prioridade máxima após o site estar pronto para vender

Não iniciar a implantação como substituto de um checkout ainda incapaz de concluir pedido e pagamento.

- [ ] Levantar requisitos e integrações necessários à operação CookLily.
- [ ] Definir o ERP escolhido como fonte oficial dos domínios que efetivamente cobrir: produtos, preços, estoque, pedidos, pagamentos, fiscal e financeiro, conforme capacidades reais do fornecedor.
- [ ] Confirmar API, webhooks, autenticação, limites, custos, permissões, disponibilidade e condições contratuais antes de integrar.
- [ ] Mapear IDs estáveis de produtos/modificadores e estratégia de sincronização.
- [ ] Definir autoridade de cada dado; evitar dupla escrita sem reconciliação.
- [ ] Implementar adaptadores isolados, idempotência, retries, observabilidade e reconciliação.
- [ ] Definir comportamento em indisponibilidade do ERP para evitar pedidos/pagamentos duplicados.
- [ ] Planejar migração e corte com backup, rollback e compatibilidade do histórico.
- [ ] Implantar por domínio, priorizando maior redução de risco e trabalho manual.
- [ ] Fazer deploy e validação real por marco relevante, após aprovação e conforme a solicitação de testes.

**Regra arquitetural:** não manter a aplicação como segunda fonte de verdade dos domínios transacionais assumidos pelo ERP. Respeitar `REGRAS.md` e o isolamento CookLily/Carro Chefe.

**Critério de conclusão:** domínios contratados integrados, fontes oficiais documentadas, divergências tratadas e operação aprovada pelo proprietário. Não presumir funcionalidades do ERP antes de avaliar o fornecedor.

## Fase 3 — Preparação técnica para terceirização completa

Somente a preparação técnica entra neste roadmap; contratação e transferência comercial ficam fora dele.

- [ ] Documentar arquitetura, fronteiras de domínio, ambientes, deploy, rollback e operação.
- [ ] Tornar desenvolvimento e publicação reproduzíveis.
- [ ] Consolidar contratos de API, eventos, integrações e responsabilidades sobre dados.
- [ ] Definir acessos por função, rotação de segredos, auditoria e revogação de credenciais.
- [ ] Reduzir dependência de conhecimento tácito com documentação/automação segura.
- [ ] Identificar riscos de continuidade e pontos únicos de falha.
- [ ] Não conceder acesso externo nem transferir segredos sem autorização explícita.

## Fase 4 — Sistemas complementares

Executar após estabilizar o site e definir a arquitetura com o ERP. Cada item depende de escopo e requisitos aprovados.

### Segurança de software
- [ ] Priorizar identidade/acesso, hardening, logs, backups, recuperação e monitoramento.
- [ ] Manter gates de produção fail-closed e verificações dos runbooks.
- [ ] Segurança física (câmeras, alarmes, equipamentos) fica fora do escopo, salvo integração de software aprovada.

### Totem de autoatendimento
- [ ] Decidir entre fluxo web existente e aplicação dedicada.
- [ ] Integrar a catálogo, disponibilidade e ERP como fontes autoritativas.
- [ ] Definir sessão, privacidade, acessibilidade, impressão, pagamento e recuperação de falhas.
- [ ] Usar modo kiosk e impedir acesso do cliente ao sistema operacional/navegador.
- [ ] Validar compatibilidade com hardware real antes de declarar pronto.

### Sistema de gestão com IA
- [ ] Definir casos de uso mensuráveis e limites de autonomia.
- [ ] Usar dados autorizados/minimizados, controle de acesso e auditoria.
- [ ] Exigir aprovação humana para decisões financeiras/fiscais, pagamentos, preços e ações irreversíveis.
- [ ] Começar por análise/assistência de baixo risco; não conceder autoridade transacional ampla por padrão.
- [ ] Avaliar qualidade, custo, latência, falhas e mecanismo de desligamento.

## Próximas entregas aprovadas pelo proprietário (2026-10-28)

### Critérios para links compartilháveis CookLily
- Produto: slug público estável; o link pode abrir o produto para visitante, sem expor IDs internos ou dados de conta.
- Pesquisa: token opaco aleatório, distinto do ID de banco; visitante vê somente título, texto introdutório, duração, quantidade de perguntas e recompensa quando visível/configurada; responder exige conta e o retorno de login/cadastro preserva o link. Pausa/cancelamento desativa o link.
- Indicação: token aleatório único; crédito ocorre uma vez após novo cadastro elegível, sem autorreferência, contas suspensas ou de equipe; a configuração operacional define os pontos (2.000 nesta entrega). URL não leva telefone/nome/ID interno. Registro e crédito são server-side e idempotentes.
- Não encaminhar token de indicação, conteúdo de respostas, telefone ou nome a analytics. Expiração/revogação manual de convites permanece decisão futura; pesquisa pode ser desativada pausando/cancelando.

### Próxima execução: WhatsApp oficial
- [ ] Finalizar integração por WhatsApp Business Platform / WhatsApp Cloud API oficial.
- [ ] Validar conta Meta Business, número, templates, webhooks, tokens e secrets no ambiente protegido da VPS; nunca versionar credenciais.
- [ ] Separar mensagens operacionais de promocionais, respeitar opt-in/opt-out e limitar retries/idempotência para não duplicar mensagens.
- [ ] Testar ponta a ponta em número de homologação e só então liberar os fluxos aprovados.

### Conector MCP administrativo para LLMs
- [ ] Projetar ferramenta MCP para tarefas autorizadas de admin/staff (configuração, catálogo, cupons, pesquisas, diagnóstico e correções) via linguagem natural.
- [ ] Reutilizar casos de uso e autorização da API de automação; negar por padrão, validar role/escopo por ferramenta, registrar auditoria, limitar dados pessoais e evitar sessões humanas compartilhadas.
- [ ] Exigir confirmação humana para operações de alto impacto, pagamentos, comunicação externa, exclusões definitivas e alterações de acesso; manter idempotência, rate limits e kill switch.
- [ ] Adicionar testes de autorização, prompt injection em dados retornados, replay, concorrência e auditoria antes de habilitar em produção.

### API de automação do painel para scripts
- [ ] Publicar API versionada para scripts executarem os mesmos casos administrativos cobertos pelo painel.
- [ ] Usar credenciais de máquina rotacionáveis, escopos mínimos e revogáveis; não usar cookies/sessões humanas nem expor secrets nas respostas.
- [ ] Aplicar rate limits, idempotency keys, validação de entrada, auditoria append-only, paginação e mensagens de erro estáveis.
- [ ] Incluir documentação OpenAPI, SDK/exemplos mínimos, ambiente de homologação e testes de segurança antes de emitir credenciais de produção.

Ordem: concluir primeiro a entrega atual; em seguida priorizar WhatsApp oficial conforme orientação do proprietário. MCP e API administrativa ficam planejados para entregas próprias, depois de definidos e aprovados os limites de autonomia.

## Fase 5 — Expansão técnica
- [ ] Planejar novas unidades, marcas, canais ou aumento de volume somente após estabilizar a operação atual.
- [ ] Distinguir componentes reutilizáveis de domínios que devem permanecer isolados.
- [ ] Definir escala, observabilidade, custo e suporte com base em dados reais.
- [ ] Preservar isolamento de dados, permissões e fontes oficiais.
- [ ] Criar roadmap específico para cada iniciativa aprovada.

## Fora do roadmap de desenvolvimento

Excluídos por serem tarefas comerciais, criativas externas ao software ou operacionais:
- produção de arte para banner;
- produção de arte de pastel, caldo de cana e açaí;
- cadastro comercial no iFood;
- marketing e anúncios em Instagram, Facebook e Google;
- chamada/campanha de inauguração;
- simulação operacional da inauguração, salvo pedido específico de teste técnico de software;
- execução da inauguração;
- contratação/execução da terceirização.

O software pode dar suporte a campanhas, páginas, integrações e operação; produção de conteúdo, compra de mídia e decisões comerciais ficam fora deste plano.

## Estado de referência e evidências existentes

A documentação consultada registra UI pública com itens de aceite em aberto; QR Pix lido e valor conferido, mas nenhum pagamento concluído; e partes substanciais de catálogo, pedidos, pagamentos, painel, analytics, cozinha, entregas e alergênicos descritas como implementadas/integradas tecnicamente. Também registra pendências de homologação real, dados operacionais, UX e configuração externa.

Esses registros são referência histórica, não confirmação automática do estado da VPS em 21/10/2026. Reconciliar cada status com evidência recente antes de marcar como concluído.

### Documentos de referência
- `REGRAS.md` — arquitetura, segurança e fontes de verdade.
- `AGENTS.md` — governança e separação CookLily/Carro Chefe.
- `docs/lily-acai/README.md` — escopo e arquitetura.
- `docs/lily-acai/marca/KIT_DE_MARCA.md` — identidade visual.
- `docs/lily-acai/DEPLOY_VPS.md` — deploy e segurança de produção.
- `docs/lily-acai/DEPLOY_INCREMENTAL_CLI.md` — CLI `cc` e gates.
- `docs/lily-acai/DECISOES_PENDENCIAS.md` — decisões e pendências.
- `docs/lily-acai/STATUS_IMPLEMENTACAO_2026-09-30.md` — auditoria de implementação.
- `docs/lily-acai/entregas/HOMOLOGACAO_QR_PIX_2026-10-08.md` — limites da homologação Pix registrada.
- `docs/lily-acai/entregas/ENTREGA_07_PAGAMENTOS_RECONCILIACAO.md` — pagamentos e reconciliação.
- `docs/lily-acai/PIX_OPERACAO_PEDIDOS_ROADMAP_2026-09-27.md` — cozinha, tracking e entregas.
- `docs/lily-acai/UX_REELS_DASHBOARD_FIDELIDADE_2026-10-09.md` — especificação UX; requisito não equivale a implementação.

Os relatórios das entregas 03–12 e dos patches P0/P1/P2 permanecem como evidência técnica detalhada. Eles não substituem a ordem de prioridade deste roadmap. Em conflito de priorização, prevalece este documento; as regras de arquitetura, segurança, isolamento e deploy continuam obrigatórias.
