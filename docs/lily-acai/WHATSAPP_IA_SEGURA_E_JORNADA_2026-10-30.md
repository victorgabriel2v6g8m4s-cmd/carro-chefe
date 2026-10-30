# WhatsApp, atendimento com IA e jornada CookLily

**Auditoria técnica e fontes consultadas em:** 30/10/2026
**Escopo:** CookLily (`/lilyacai/*`, `/api/v1/lily/*`), sem misturar dados do Carro Chefe.

## Estado da entrega

- O Pix Sicredi alternativo gera BR Code com valor, QR e Copia e Cola; a chave é cifrada em repouso e a tela mostra apenas uma máscara. O provider atual permanece selecionado até um admin alterar a preferência.
- O QR estático não confirma pagamento. O pedido segue pendente até um meio autenticado de confirmação. A implementação não deve ser considerada homologação bancária.
- O painel pode criar um pacote idempotente de 15 rascunhos de templates. Eles não são enviados nem submetidos à Meta; precisam ser cadastrados/revisados no WhatsApp Manager.
- Os uploads das artes LilyCoin/níveis aceitam SVG estático sanitizado (até 1 MB), além de PNG/JPEG/WebP. Scripts, eventos, declarações XML/DOCTYPE e referências externas são recusados.
- O webhook valida assinatura e persiste metadados/hash idempotentes. A branch de implementação `codex/cooklily-whatsapp-ai-agent` adiciona inbox cifrada, handoff humano, painel staff, agente/RAG e APIs; tudo continua desligado e ainda não foi integrado/deployado nem homologado no WABA real.

## Templates de atendimento para preparar no WhatsApp Manager

O botão “Criar pacote inicial” cadastra somente o que ainda não existe, em estado de rascunho:

| Momento | Template preparado | Categoria provável | Observação |
|---|---|---|---|
| Conta criada | Boas-vindas | Utility | Enviar após cadastro e opt-in válido |
| Verificação | Código de autenticação | Authentication | Botão de copiar código; fluxo de emissão/validação de OTP ainda não está ligado ao cadastro |
| Pedido recebido | Confirmação do pedido | Utility | Resumo e link seguro de acompanhamento |
| Pagamento | Pagamento confirmado | Utility | Disparar apenas após confirmação autoritativa |
| Alteração | Pedido atualizado | Utility | Informar mudança solicitada/confirmada |
| Cozinha | Em preparação | Utility | Atualização operacional |
| Retirada | Pronto para retirada | Utility | Incluir instrução de retirada |
| Entrega | Aguardando entregador | Utility | Atualização operacional |
| Entrega | Entregador aceitou | Utility | Atualização operacional |
| Entrega | Pedido coletado | Utility | Atualização operacional |
| Entrega | Saiu para entrega | Utility | Atualização operacional |
| Entrega | Entregador chegou | Utility | Mensagem operacional com cuidado para não expor endereço além do necessário |
| Entrega | Pedido entregue | Utility | Confirmação final |
| Cancelamento | Pedido cancelado | Utility | Motivo só quando verificado e adequado |
| Estorno | Estorno solicitado/registrado | Utility | Diferenciar solicitação de liquidação efetiva |

A categoria final é decidida pela Meta no Manager. Texto, variáveis, idioma, exemplos, botões, mídia e validade devem ser revistos antes da submissão. Não use template Utility para conteúdo promocional. O opt-in deve preceder contato proativo e o opt-out deve ser respeitado.

## Arquitetura recomendada para atendimento com IA

### Fluxo de mensagens

1. Cloud API envia evento ao webhook CookLily; validar assinatura, WABA/phone number ID, tamanho e formato e deduplicar pelo ID do evento.
2. Guardar somente o mínimo necessário em inbox cifrada e enfileirar processamento durável. A retenção configurável (1–90 dias) e a chave própria são pré-requisitos de runtime; ainda exigem decisão de prazo antes de ativar.
3. Resolver cliente por telefone normalizado, estado de opt-in/opt-out, janela de atendimento e vínculo seguro com pedido. Não inferir identidade só pelo texto recebido.
4. Dentro da janela de 24 horas após mensagem do cliente, responder como atendimento; fora dela, exigir template aprovado adequado. Mensagens Utility e Service dentro da janela têm tratamento sem cobrança segundo a página pública de preços consultada; as regras e tarifas exatas dependem do mercado e da tabela vigente no Manager.
5. Enviar contexto mínimo para OpenAI Responses API (`POST /v1/responses`), com `store:false`, sem anexar dados de outros clientes. O esqueleto usa o modelo definido pelo ambiente e teto de tokens, timeout e orçamento diário; nome/modelo precisa ser confirmado e validado antes do piloto.
6. Permitir somente ferramentas de leitura allowlistadas: cardápio publicado, horário configurado, estado do próprio pedido após verificação, e instruções públicas de entrega/retirada. Cada ferramenta verifica autorização no servidor.
7. Escalar para atendente humano quando solicitado, em tema de pagamento/reembolso/cancelamento, alergia/segurança alimentar, conflito, incerteza ou falha repetida. O sistema de IA não pode criar/modificar/cancelar pedido, aprovar pagamento/estorno, alterar endereço ou conceder benefício.
8. Registrar auditoria minimizada (IDs, categoria, latência, resultado, custo estimado, encaminhamento), sem guardar raciocínio interno ou texto integral sem finalidade e retenção aprovadas. Oferecer caminho claro para falar com pessoa e respeitar parar/SAIR.

### Camadas de segurança necessárias

- Segredos Meta e OpenAI fora do Git, cifrados/secret manager na VPS, escopo mínimo e rotação; chaves separadas por ambiente e por operação.
- Verificação criptográfica de webhook, proteção contra replay, idempotência, rate limit, limite de corpo, fila com tentativas limitadas e dead-letter.
- Isolamento CookLily/Carro Chefe em credenciais, banco, filas, logs e contexto; autorização server-side para cada consulta.
- Identidade para dados de pedido por sessão autenticada ou desafio de uso único; evitar revelar detalhes de pedido a quem apenas conhece um telefone.
- Defesa contra prompt injection: conteúdo do cliente e de mídia é dado não confiável; não pode alterar políticas ou habilitar tools. Validação estrita de esquema e autorização independente do modelo.
- Retenção curta e definida para texto/conversa, exclusão e atendimento de direitos LGPD, controle de acesso por papel, trilha de auditoria e plano de incidente.
- `store:false` reduz armazenamento de estado de resposta pela API, mas não substitui política CookLily; dados da API não são usados para treinar por padrão e logs de monitoramento contra abuso podem ser retidos por até 30 dias conforme exceções da documentação OpenAI.
- Circuit breaker, fallback para resposta humana/estática, limite de custo, monitoramento de erro e parada automática em opt-out ou indisponibilidade.

### Gestão WhatsApp que falta

O produto tem templates e outbox; a branch em andamento implementa inbox, fila e transferência, mas ainda faltam atribuição/filas com UX final, notas internas, SLA, busca com controle de acesso, métricas completas e homologação. O payload da Meta não deve virar log irrestrito.

## Estimativa de custo da IA

Estimativa ilustrativa pela tabela oficial de API consultada em 30/10/2026, tokens padrão de contexto curto, sem cache: cinco chamadas por conversa; em cada chamada 1.500 tokens de entrada e 300 de saída. O consumo real varia com contexto, tools, retries e modelo.

| Modelo | USD por 1.000 conversas | BRL por 1.000 conversas* | USD por 10.000 | BRL por 10.000* |
|---|---:|---:|---:|---:|
| GPT-6 Luna (`$0.05/M` entrada, `$0.25/M` saída) | $0.75 | R$ 4,03 | $7.50 | R$ 40,31 |
| GPT-6.1 Terra (`$0.50/M` entrada, `$2.50/M` saída) | $7.50 | R$ 40,31 | $75.00 | R$ 403,08 |

*Conversão indicativa a PTAX venda de 29/10/2026: US$ 1 = R$ 5,3744. Não inclui tributos, spread, VPS, armazenamento, observabilidade ou tarifas WhatsApp. Preço de modelo e câmbio são variáveis: antes de ativar, atualizar parâmetros no painel e recalcular com volume real. A tabela de preço Meta por país/categoria deve ser copiada do WhatsApp Manager no momento da ativação; não tratar os valores de exemplo do simulador como tarifa atual confirmada.

### Preço WhatsApp e janela

O simulador de orçamento usa categorias Marketing, Utility, Authentication e Service. Mensagens de Service e respostas Utility durante a janela de atendimento aberta pelo cliente são cotadas como gratuitas; Utility iniciada pela empresa fora da janela e Marketing/Authentication seguem tarifa configurada. A página pública Meta consultada também documenta janela de 24 horas e período gratuito de 72 horas após entrada por anúncio Click-to-WhatsApp elegível. A regra de 72 horas depende da origem e condições Meta. Valores unitários configuráveis do painel são hipóteses até conferência no Manager.

## Jornada do cliente e lacunas verificadas

| Etapa | Estado no código/documentação | Lacuna para operação completa |
|---|---|---|
| Chegada ao site | parâmetros `la_qr`, `la_campaign`, `la_variant` e aliases `cc_*` podem ser registrados | Não há cobertura completa de UTM/referrer/click IDs; capturar origem com finalidade, consentimento e minimização LGPD |
| Consentimento | termos/privacidade obrigatórios no cadastro; marketing, compartilhamento e analytics têm escolhas próprias | Exibir finalidade/canais de mensagens WhatsApp de forma granular; guardar prova/versionamento e opt-out |
| Conta | cadastro por telefone e senha | Cadastro não executa desafio OTP; template de código é apenas rascunho |
| Navegar e montar pedido | catálogo/carrinho e pedido implementados, inclusive compra como visitante | Homologação operacional, catálogo/preços/estoque reais e integração ERP continuam pendentes conforme roadmap |
| Alterar pedido | APIs de mudança e notificações por etapa existem | Política de janela de alteração, autorização, trilha e mensagem do cliente precisam homologação ponta a ponta |
| Pagamento | Pix QR/BR Code e opções configuráveis | QR estático não prova liquidação; validar PSP/banco real e reconciliação antes de liberar cozinha. Sicredi nesta entrega não tem consulta autenticada de pagamento |
| Produção | fila/cozinha e etapas de tracking já existem | SLA, tablet/impressora e estados reais devem ser ensaiados |
| Acompanhar no site | timeline autenticada e guest tracking com capability token implementados | Validar permissões, expiração, mobile e journey real |
| Acompanhar por WhatsApp | outbox operacional e opt-in por pedido disponíveis | Configurar WABA, templates aprovados, credenciais, destinatário de teste consentido e comprovar entrega/status |
| Entrega | estados logísticos e registro de entrega existem | QA multiusuário, rotas, prova e operação local continuam pendentes |
| Suporte/IA | não implementado; webhook apenas registra metadados/hash | Inbox, opt-in conversacional, processamento inbound, verificação de identidade, escalonamento e controles acima |

## Sequência recomendada

1. Revisar e cadastrar os rascunhos no WhatsApp Manager; aprovar templates, credenciais, número e opt-ins de teste.
2. Integrar e homologar canal de confirmação bancária Sicredi antes de ativá-lo para pedidos reais; a preferência pode ser selecionada pelo admin, mas o adapter atual só gera cobrança estática e não detecta liquidação.
3. Implementar OTP de telefone e prova de consentimento/canais, com limites e expiração.
4. Construir inbox e processamento inbound durável com retenção/apagamento aprovados e escalonamento humano.
5. Liberar IA limitada inicialmente a FAQ e leitura autorizada do pedido; expandir somente após métricas, segurança e aprovação.
6. Homologar a jornada real pedido→pagamento confirmado→produção→entrega em ambiente controlado antes da abertura.

## Fontes oficiais consultadas

- Meta, [WhatsApp Business Platform Pricing](https://whatsappbusiness.com/products/platform-pricing/?lang=en), consultado em 30/10/2026. A tabela de tarifas dinâmica não foi confirmada para a conta/país nesta auditoria.
- Meta, [WhatsApp Business Messaging Policy](https://whatsappbusiness.com/policy/?faq=5), consultado em 30/10/2026.
- OpenAI, [API Pricing](https://developers.openai.com/api/docs/pricing), consultado em 30/10/2026.
- OpenAI, [Your data](https://developers.openai.com/api/docs/guides/your-data), consultado em 30/10/2026.
- Banco Central do Brasil, [PTAX — consulta da última cotação](https://ptax.bcb.gov.br/ptax_internet/consultarUltimaCotacaoDolar.do), cotação venda de 29/10/2026 usada somente na estimativa acima.
