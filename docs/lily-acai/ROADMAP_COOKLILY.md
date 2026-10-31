# Roadmap oficial — CookLily

**Nome público:** CookLily  
**Wordmark oficial:** cookLily  
**Branch canônica:** `cooklily/canonical`  
**Site real:** `https://carrochefe.com/lilyacai/*`  
**Documento atualizado:** 30/10/2026

**Reconciliação de implementação:** atualização em 30/10/2026 com base nos PRs #277–#291 e no checkpoint de TLS. O release atual da aplicação na VPS é `54d8b3600273366d46d47ef682f0ba503eca3712`; o painel administrativo, o catálogo progressivo e seus módulos refatorados foram homologados no navegador integrado do Codex em desktop (1365×900) e mobile (390×844). As PRs #289/#291 extraíram editor e formulários do catálogo, configurações globais, índice e helpers; o editor e as interações lazy foram retestados no domínio, sem erros de console ou overflow horizontal. Os checkpoints `docs/execution-checkpoints/cooklily-admin-catalog-progressive-2026-10-30.md`, `docs/execution-checkpoints/cooklily-admin-catalog-modularization-2026-10-30.md` e `docs/execution-checkpoints/cooklily-admin-modules-continued-2026-10-30.md` registram CI, deploy e retestes. A operação real do agente continua bloqueada pelos gates de configuração e segurança listados abaixo. O checkpoint `docs/execution-checkpoints/cooklily-whatsapp-ai-agent-2026-10-30.md` mantém as dependências do agente. `[*]` significa parcialmente implementado; `[ ]` continua pendente.

Este roadmap cobre apenas desenvolvimento de software, integrações, infraestrutura da aplicação e documentação técnica. Produção de artes, cadastro comercial em plataformas, campanhas/ads, chamadas de inauguração, execução da inauguração e contratação de terceiros ficam fora deste plano.

## Regras de execução

1. **Prioridade principal:** primeiro comprovar o fluxo pedido → confirmação autoritativa do pagamento → preparo → despacho → coleta e entrega segura. Fechar os gaps operacionais prioritários do item 9 sem duplicar as bases já implementadas. Assim que pedido, pagamento, preparo e entrega estiverem prontos para operar, o **ERP passa a ser a prioridade máxima**.
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
- [x] Disponibilizar pacote idempotente de rascunhos de templates de conta, código de autenticação, pagamento e etapas do pedido; revisar/submeter manualmente no WhatsApp Manager.
- [x] Implementar outbox e envio transacional pela Cloud API com opt-in, retry/idempotência e credenciais exclusivamente por ambiente; a ativação segue fail-closed enquanto a VPS não tiver a configuração Meta validada.
- [x] Validar handshake do webhook, assinatura HMAC, rate limit e persistência idempotente de hashes/estados sem guardar payload bruto.
- [ ] Manter notificações operacionais separadas de mensagens promocionais.
- [ ] Respeitar opt-in/opt-out, consentimentos e configuração do provider.
- [ ] Manter segredos somente na configuração protegida da VPS.
- [ ] Garantir que indisponibilidade do WhatsApp não bloqueie pedido, pagamento, cozinha ou entrega.
- [ ] Implementar OTP no cadastro; template de autenticação existe como rascunho, mas emissão/validação OTP ainda não está integrada ao cadastro.
- [x] Implantar a fundação do inbox humano e do processamento inbound durável: criptografia, dedupe, fila, rate limit por contato, opt-out, APIs internas e painel de handoff/reply/expurgo. PR #278 e releases seguintes até `b4673469`; contraste e layout responsivo revisados no domínio real em desktop e mobile, sem conversas de clientes durante a verificação.
- [*] Completar a operação humana com atribuição/SLA e busca; fechar política de opt-in conversacional e rotina operacional, e fazer testes consentidos em número de homologação. A inbox está disponível, mas não há validação operacional de atendimento real.
- [x] Implantar a fundação do agente IA com Responses `store:false`, prompt versionado, guardrails, handoff e orquestrador/RAG de conteúdo público. PR #278, com ajustes visuais posteriores até o release `b4673469`. Runtime permanece desligado por padrão; não houve piloto com mensagens de clientes.
- [ ] Integrar e habilitar agente IA para clientes após gates técnicos, privacidade, configuração Meta/OpenAI e teste consentido em número de homologação, conforme `WHATSAPP_IA_ARQUITETURA_E_IMPLANTACAO.md`.

As notificações operacionais já são descritas na Entrega 11H. Verificar gaps concretos antes de criar trabalho duplicado.

### 4. Adaptar o painel de gerenciamento
- [ ] Ajustar o painel às necessidades reais da operação CookLily.
- [ ] Priorizar configuração da loja, catálogo, disponibilidade, pedidos, pagamentos e estados operacionais.
- [ ] Preservar RBAC, MFA, CSRF, auditoria, minimização de dados e isolamento por domínio.
- [ ] Evitar segunda fonte de verdade para produtos, preços, estoque, pedidos, pagamentos ou financeiro quando o ERP assumir esses domínios.
- [x] Reorganizar o painel em uma navegação lateral global recolhível, com ícones Lucide, foco/teclado e conteúdo do módulo selecionado à direita. Links mobile/desktop foram homologados no domínio real após os PRs #281/#282; a navegação mobile aberta exibe os nomes mesmo quando a barra está recolhida no desktop.
- [x] Tornar a gestão do catálogo progressiva: listar produtos com dados mínimos em cards que reaproveitam a linguagem visual do cardápio público e carregar no modal/editor apenas as configurações do produto selecionado. O detalhe só é solicitado ao abrir um produto.
- [x] Carregar sob demanda sabores, adicionais, mídia, combinações e outras dependências apenas quando a operação selecionada precisar delas; preservar estados de carregamento, erro/retry e salvamento do editor. PRs #284/#285/#288, deploy `44e5250a` e homologação visual desktop/mobile registrados no checkpoint progressivo do catálogo.
- [*] Auditar arquivos grandes e separar páginas, componentes, hooks, tipos e serviços por responsabilidade, extraindo somente lógica compartilhada comprovada. No painel do catálogo, as duas fatias extraíram editor e formulários de produto, categorias, sabores/adicionais, comercial, cadastros globais, índice, tipos e helpers; `admin.tsx` caiu de 1.206 para 111 linhas. PRs #289/#291, release `54d8b36`, CI e homologação desktop/mobile concluídos. A auditoria global permanece parcial: `catalog.tsx`, `api.ts`, `main.tsx` e outras páginas ainda têm responsabilidades grandes a mapear.
- [ ] Definir budgets distintos para entrada inicial, rotas críticas e total de assets; acompanhar tamanho minificado e gzip e impedir regressões em CI.
- [ ] Registrar gaps concretos e entregas incrementais antes de ampliar o painel; evitar uma reescrita ampla sem medição.

### 4A. Próximas atualizações de fidelidade e experiência
- [x] Aumentar a altura útil do header, redimensionar os controles e aumentar a espessura/reduzir o comprimento da barra de nível; remover a porcentagem do header. PR #277, release `080eae62`.
- [x] Ajustar o fundo do saldo de LilyCoins no header para alto contraste com o fundo do header. PR #277, release `080eae62`.
- [x] Fazer o saldo de LilyCoins abrir o dashboard já posicionado nas missões; fazer a barra de níveis abrir o dashboard. PR #277, release `080eae62`.
- [*] Profissionalizar o dashboard com gráfico alternável entre visão semanal e mensal. PR #293 e correções #294/#295 integradas; release `73721de10915dfb25abd75407346e9e75d868f82` implantado com sucesso. CI Node 20/22/24, testes, checks, build e budget passaram; no VPS, JS gzip `188,98/189 KiB`. A alternância foi homologada no domínio real em desktop; homologação móvel segue pendente porque o navegador integrado desta sessão não disponibilizou controle de viewport móvel. Ver checkpoint `docs/execution-checkpoints/cooklily-dashboard-progress-history-2026-10-30.md`.
- [ ] Mostrar histórico de pontos com missões concluídas, pesquisas respondidas, LilyCoins e pontos recebidos.
- [x] Adicionar card do nível atual que abre uma timeline de níveis equidistantes; permitir selecionar o nível e consultar as recompensas configuradas. PR #277, release `080eae62`.
- [ ] Exibir regra/data da próxima reinicialização da temporada; a funcionalidade de temporadas ainda não está implementada.
- [ ] Definir e implementar temporadas: níveis e recompensas por nível reiniciam a cada temporada, com regra de transição e histórico preservado.
- [ ] Criar recompensa diária por login e missões com periodicidade diária, semanal e perpétua.
- [ ] Antes de conceder pontos/LilyCoins, especificar regras de elegibilidade, limites, idempotência, auditoria, expiração e fuso horário; não inventar valores ou calendário de temporada.
- [x] Reutilizar no dashboard e nas estatísticas de ranking um painel com radar de cinco categorias, atividade e métricas por missões, pesquisas, pedidos e indicações; proteger perfis pelo consentimento e ocultar contas de teste de clientes comuns. PR #277, release `080eae62`.
- [x] Manter no perfil configurações da conta e segurança, removendo conteúdo de dashboard/fidelidade que foi transferido para o dashboard. PR #277, release `080eae62`.

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

#### Base já implementada — não duplicar
- [x] Pedido e pagamento são domínios separados; a cozinha só libera produção após confirmação de pagamento. O caminho `received → preparing` não contém uma etapa explícita de aceite/rejeição do restaurante.
- [x] Fila da cozinha, SLA configurável de preparo, comanda imprimível e transição para `ready_for_dispatch` existem; impressão usa o navegador/sistema, sem integração direta com hardware.
- [x] Entrega própria possui fila de couriers, aceite atômico, chegada à coleta, confirmação de retirada por código, saída para rota, chegada ao endereço e confirmação da entrega por código. Os códigos atuais têm seis dígitos, são derivados por HMAC e não são armazenados em texto puro.
- [x] Recusa, desistência e reatribuição administrativa são permitidas antes da retirada; depois de `picked_up`, a reatribuição automática é bloqueada para preservar a cadeia de custódia.
- [x] Cliente autenticado/guest acompanha eventos por status e polling; há estimativa de rota e ETA após a saída da coleta, explicitamente sem GPS ao vivo. O mapa é auxiliar e indisponibilidade externa não deve bloquear a entrega.
- [x] Há fundação de notificações transacionais pelo WhatsApp com outbox, consentimento e etapas do pedido; envio real permanece condicionado à configuração Meta, template aprovado e validação consentida descritas no item 3 e na Entrega 11H.

#### Prioridade P0 — fechar antes de declarar a operação de entrega pronta
- [ ] Definir e documentar o modelo operacional inicial: frota própria, operador contratado ou integração de logística externa; delimitar áreas atendidas, disponibilidade, contingência e responsável por cada transição. Não assumir algoritmo, raio fixo de 5 km, cobertura ou API de terceiros com base somente no exemplo do iFood.
- [ ] Implementar aceite explícito do restaurante (aceitar/recusar) separado do início do preparo, com timeout, motivo auditável, capacidade de definir/confirmar previsão de preparo e comunicação ao cliente. Evitar que “começar preparo” seja o único sinal de aceite.
- [ ] Criar conferência de expedição antes da retirada: pedido/itens/quantidades, quantidade de volumes, embalagem lacrada quando aplicável e entrega da bag térmica. Registrar quem conferiu e quando; não incluir dados pessoais desnecessários na comanda.
- [ ] Especificar cenários de exceção ponta a ponta: falta de entregador, entregador ausente, endereço incorreto, cliente não localizado/ausente, recusa do pedido, falha de contato, cancelamento, retorno ao estabelecimento e reembolso; definir estados permitidos, responsável, prazo, comunicação e trilha de auditoria, sobretudo após a retirada.
- [ ] Confirmar a política de pagamento. O código disponível lista Pix e cartão online; não foi localizada opção de dinheiro ou pagamento na entrega. Não anunciar nem habilitar pagamento na entrega antes de definir cobrança, conciliação, comprovante, fraude, cancelamento e autorização operacional.
- [ ] Validar uma jornada autorizada de ponta a ponta (pedido pago → aceite → preparo → conferência → atribuição → coleta → confirmação de entrega) e registrar evidência/limites antes de marcar a operação pronta.

#### Prioridade P1 — previsibilidade e experiência do cliente
- [ ] Tornar clara a previsão para cada etapa: confirmação/recusa, tempo estimado de preparo, espera por entregador e ETA após saída. Informar quando um horário for estimativa e oferecer atualização em caso de atraso; não prometer minuto exato sem base operacional.
- [ ] Configurar e homologar notificações de pagamento, aceite, preparo, atraso, pronto, atribuição/coleta, saída, chegada e entrega. Reutilizar a outbox/consentimento do item 3 e manter o fluxo funcional se WhatsApp estiver indisponível.
- [ ] Decidir se status + ETA atendem ao lançamento ou se há necessidade real de localização ao vivo. Se aprovada, exigir finalidade/consentimento e acesso restrito, transmitir somente durante entrega ativa, não manter histórico de coordenadas, encerrar após conclusão e oferecer fallback sem localização. Não bloquear a entrega se geolocalização/provedor falhar.
- [ ] Revisar a experiência móvel do cliente, cozinha, expedição e courier, incluindo acessibilidade, rede instável, atualização stale, estados vazios/erro e privacidade por papel.

#### Prioridade P2 — qualidade após a entrega
- [ ] Criar avaliação do cliente após entrega confirmada, vinculada ao pedido e disponível uma única vez; separar qualidade do produto, embalagem e entrega e coletar somente dados necessários.
- [ ] Definir moderação, retenção, prevenção de abuso e tratamento de reclamações; não publicar avaliações automaticamente sem política definida.
- [ ] Avaliar feedback recíproco do courier sobre o restaurante como recurso opcional, com acesso e retenção delimitados. Não confundir essa avaliação com a avaliação do cliente.

#### Integração externa — condicional a contrato e acesso confirmados
- [ ] Antes de integrar logística iFood ou outro operador, confirmar elegibilidade/contrato, documentação oficial, APIs, eventos, cobertura, tarifas, cancelamento, SLA, suporte e responsabilidades por incidente.
- [ ] Projetar adapter isolado com idempotência, reconciliação de estados, observabilidade, timeout e fallback operacional; não duplicar status nem assumir disponibilidade/radius descritos em materiais de terceiros.

**Ordem de execução:** P0 primeiro; P1 pode avançar em paralelo após decisões operacionais e sem bloquear fallback; P2 após primeira operação estável; integração externa somente após os gates contratuais. O exemplo de fluxo do iFood serve como referência de experiência, não como especificação de API ou garantia de comportamento para a CookLily.

Referências: `docs/lily-acai/PIX_OPERACAO_PEDIDOS_ROADMAP_2026-09-27.md` e documentos das entregas 11A–11K.

### 10. Corrigir pendências bloqueadoras
- [ ] Consolidar gaps comprovados na branch canônica, deploy ou testes solicitados.
- [ ] Priorizar falhas que bloqueiem pedido, pagamento, confirmação, preparo, segurança, privacidade ou entrega.
- [ ] Resolver achados de acessibilidade, responsividade e UX com base em evidência.
- [ ] Não reabrir itens resolvidos sem evidência de regressão.
- [ ] Registrar a resolução e atualizar o roadmap.

“Corrigir pendências” não autoriza uma rodada genérica de testes. Testes funcionais ocorrem quando solicitados; gates obrigatórios de engenharia/deploy continuam valendo.

## Fase 2 — ERP próprio: prioridade máxima após o site estar pronto para vender

Não iniciar a implantação como substituto de um checkout ainda incapaz de concluir pedido e pagamento.

- [ ] Levantar requisitos e integrações necessários à operação CookLily.
- [ ] Projetar e desenvolver o ERP do próprio projeto como fonte oficial de produtos, preços, estoque, pedidos, pagamentos, fiscal e financeiro, por domínio.
- [ ] Definir APIs/webhooks, autenticação, limites, permissões, disponibilidade, operação, suporte e custo total de propriedade do ERP próprio.
- [ ] Mapear IDs estáveis de produtos/modificadores e estratégia de sincronização.
- [ ] Definir autoridade de cada dado; evitar dupla escrita sem reconciliação.
- [ ] Implementar adaptadores isolados, idempotência, retries, observabilidade e reconciliação.
- [ ] Definir comportamento em indisponibilidade do ERP para evitar pedidos/pagamentos duplicados.
- [ ] Planejar migração e corte com backup, rollback e compatibilidade do histórico.
- [ ] Implantar por domínio, priorizando maior redução de risco e trabalho manual.
- [ ] Fazer deploy e validação real por marco relevante, após aprovação e conforme a solicitação de testes.

**Regra arquitetural:** não manter a aplicação como segunda fonte de verdade dos domínios transacionais assumidos pelo ERP. Respeitar `REGRAS.md` e o isolamento CookLily/Carro Chefe.

**Critério de conclusão:** domínios implementados e integrados, fontes oficiais documentadas, divergências tratadas e operação aprovada pelo proprietário. Não presumir capacidades antes de especificar e validar o ERP próprio.

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

**Nota de arquitetura:** a Central Operacional do Carro Chefe foi descontinuada pelo proprietário em 30/10/2026. O ERP será desenvolvido pelo projeto. Não reutilizar a Central como painel/ERP nem publicar seus bundles; remover código exclusivo e dependências de runtime com inventário e validação próprios.

### Segurança de software
- [ ] Priorizar identidade/acesso, hardening, logs, backups, recuperação e monitoramento.
- [ ] Manter gates de produção fail-closed e verificações dos runbooks.
- [ ] Segurança física (câmeras, alarmes, equipamentos) fica fora do escopo, salvo integração de software aprovada.

### Totem de autoatendimento
- [x] Aplicação dedicada escolhida pelo proprietário em 30/10/2026.
- [ ] Projetar e implementar aplicação dedicada.
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

## Próximas entregas aprovadas pelo proprietário (2026-10-30)

### Política de marketing e CRM — proposta para decisão

Recomendação para aprovação antes de automações promocionais:
- consentimento promocional separado de mensagens operacionais, WhatsApp e programa VIP; opt-in explícito por canal e retirada simples;
- frequência inicial conservadora configurável, com limite sugerido de até 2 campanhas promocionais por semana por canal e supressão após opt-out, reclamação ou bloqueio;
- segmentar apenas por preferências e comportamento próprio necessários à campanha; evitar perfilamento sensível e não compartilhar PII/eventos identificáveis com plataformas de anúncios;
- registrar finalidade, versão do consentimento, canal, origem, instante e retirada; manter lista mínima de supressão para respeitar opt-out;
- medir pedidos pagos, margem de contribuição e recompra por campanha, não apenas abertura/clique; definir janela de atribuição antes de comparar campanhas.

Limite de frequência e janela de atribuição são sugestões, não decisões aprovadas. Envios promocionais aguardam aprovação das regras e homologação de canal/templates.

### Indicações — proposta para decisão

Recomendação: token aleatório com validade configurável; conceder crédito uma vez após novo cadastro elegível completar primeira compra paga e não cancelada; impedir autorreferência, duplicidade de identidade, contas de equipe/suspensas e autoindicação entre contas sob controle comum quando detectável; não revelar ao indicador se um contato específico converteu; permitir revogação/pausa administrativa auditada; definir prazo de contestação e reversão em fraude/estorno antes de campanha. Pontuação/benefício deve ser configurável e aprovado separadamente. A proposta não altera os 2.000 pontos já registrados para a entrega aprovada de 28/10.

### Critérios para links compartilháveis CookLily
- Produto: slug público estável; o link pode abrir o produto para visitante, sem expor IDs internos ou dados de conta.
- Pesquisa: token opaco aleatório, distinto do ID de banco; visitante vê somente título, texto introdutório, duração, quantidade de perguntas e recompensa quando visível/configurada; responder exige conta e o retorno de login/cadastro preserva o link. Pausa/cancelamento desativa o link.
- Indicação: token aleatório único; crédito ocorre uma vez após novo cadastro elegível, sem autorreferência, contas suspensas ou de equipe; a configuração operacional define os pontos (2.000 nesta entrega). URL não leva telefone/nome/ID interno. Registro e crédito são server-side e idempotentes. Validade e revogação manual de convites ainda aguardam decisão.
- Não encaminhar token de indicação, conteúdo de respostas, telefone ou nome a analytics. Pesquisa pode ser desativada pausando/cancelando.

### Em andamento: WhatsApp oficial e agente IA seguro
- [*] Integração base WhatsApp Cloud API: envio/outbox, callback assinado, inbox, processamento inbound durável e agente estão implantados. A VPS tem configuração Meta, mas inbox/IA e consulta de cliente por embeddings permanecem desligadas; OpenAI secret, chave de criptografia e retenção ainda precisam ser provisionados/aprovados. O checklist protegido do painel não substitui um teste real de entrega.
- [ ] Validar WABA, número, templates aprovados e segredos no ambiente protegido; comprovar handshake e entrega/recebimento em número de homologação consentido.
- [*] Separar mensagens operacionais das promocionais, implementar controles de opt-in/opt-out e janela, com retries idempotentes; concluir a validação de consentimentos, textos e operação em ambiente real.
- [x] Implementar inbox, processamento inbound durável e transferências humanas; restringir histórico à equipe autenticada e permitir resposta/expurgo. Atribuição/SLA, busca e rotina operacional permanecem parciais no item 3.
- [*] Implementar Responses API stateless (`store:false`), prompt versionado, guardrails, contexto mínimo, APIs internas e fallback humano. A fundação e os testes de guardrail estão no código; avaliação offline ampliada de abuso/injeção, autorização e orçamento ainda precisa ser registrada antes do piloto. O agente segue desativado.
- [x] Implementar base curada de conhecimento, embeddings de conteúdo público, cache e busca vetorial isolada. Embeddings de consultas do cliente dependem de autorização/consentimento explícito e continuam desativados.
- [ ] Avaliar offline cenários benignos e adversariais, então testar ponta a ponta em número autorizado de homologação; liberar para clientes somente após revisão dos gates de privacidade, segurança, operação e custo.
- [x] Documentar passo a passo do proprietário para Meta, OpenAI, privacidade, segredos VPS, validação, piloto, rollback e checklist, mantendo flags desligadas até aprovação: `WHATSAPP_IA_GUIA_DE_CONFIGURACAO.md`.

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

Ordem: a navegação lateral do painel foi concluída sem depender de credenciais; em paralelo, o proprietário pode seguir o guia de configuração de WhatsApp. Só depois dos gates Meta/OpenAI/privacidade o atendimento IA pode ser homologado. Na sequência, priorizar a confirmação financeira real e ERP conforme os gates da Fase 1. MCP e API administrativa ficam em entregas próprias, depois de definidos e aprovados os limites de autonomia.

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
