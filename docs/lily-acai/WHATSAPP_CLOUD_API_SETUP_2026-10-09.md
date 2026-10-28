# CookLily — base de integração com WhatsApp Cloud API

**Estado desta integração:** backend, webhook, fila de saída e painel administrativo estão implementados. A ativação de produção ainda depende de ativos e credenciais da Meta no servidor protegido e da validação do callback/template no Meta Developers. Nenhum token, App Secret ou Verify Token real deve ser versionado.

## Objetivo e escopo

A CookLily já possui uma fila de notificações transacionais de pedidos e um worker que envia templates pela API oficial Meta WhatsApp Cloud API. Esta entrega adiciona:

- cadastro e manutenção de mensagens padrão no banco da CookLily;
- associação opcional de cada mensagem a um template aprovado na Meta;
- verificação GET de webhook exigida pelo Meta Developers;
- recepção POST com validação criptográfica do cabeçalho `X-Hub-Signature-256`;
- registro idempotente e minimizado dos eventos recebidos;
- testes unitários de verificação de assinatura e token;
- operação da conexão, fila e templates em `/lilyacai/painel/whatsapp`.

Não inclui configuração de credenciais reais, criação/aprovação de templates dentro da Meta, envio de mensagens livres, respostas automáticas a conversas recebidas, nem deploy. A API não persiste o texto de mensagens recebidas nem números de telefone dos eventos webhook.

## Endpoints

Use o domínio público HTTPS já apontado para a API. Não informe um domínio fictício.

| Método | Caminho | Uso |
|---|---|---|
| GET | `/api/v1/integrations/cooklily/whatsapp/webhook` | Verificação do webhook CookLily pelo Meta Developers; responde o `hub.challenge` em texto puro |
| POST | `/api/v1/integrations/cooklily/whatsapp/webhook` | Recebe eventos WhatsApp da CookLily e valida `X-Hub-Signature-256` |
| GET | `/api/v1/lily/admin/whatsapp/templates` | Lista mensagens padrão; requer sessão de equipe CookLily |
| POST | `/api/v1/lily/admin/whatsapp/templates` | Cadastra mensagem; requer admin, MFA verificado e CSRF |
| PATCH | `/api/v1/lily/admin/whatsapp/templates/:id` | Atualiza ou arquiva logicamente mensagem; requer admin, MFA verificado e CSRF |
| GET | `/api/v1/lily/admin/whatsapp/settings` | Estado da configuração da API e da fila |
| GET | `/api/v1/lily/admin/whatsapp/notifications` | Consulta a fila transacional existente |
| POST | `/api/v1/lily/admin/whatsapp/retry` | Reenfileira itens failed/dead; exige admin, MFA e CSRF |

O painel é acessível a staff/admin para consulta. Criar/editar/ativar/arquivar templates e reenfileirar notificações exige admin, MFA verificado e CSRF, conforme as regras server-side. Ele mostra apenas se cada segredo está configurado, nunca seu conteúdo. Erros detalhados do provider, conteúdo de mensagens e telefones não são exibidos no painel.

URL para colar no Meta Developers, substituindo pelo host real de produção:

```text
https://SEU_DOMINIO_PUBLICO/api/v1/integrations/cooklily/whatsapp/webhook
```

O Carro Chefe usa callback independente: `https://SEU_DOMINIO_PUBLICO/api/v1/integrations/carro-chefe/whatsapp/webhook`. Cada app Meta tem um callback URL próprio; para manter estes dois endpoints independentes, use **dois apps Meta**, um para a CookLily e outro para o Carro Chefe, e associe a WABA de cada operação ao app correspondente. Depois assine cada WABA ao seu app. Se as duas WABAs forem associadas ao mesmo app, os eventos irão para o único callback configurado nesse app, não para dois caminhos diferentes. Cada operação usa Verify Token e App Secret próprios (`COOKLILY_WHATSAPP_*` e `CARRO_CHEFE_WHATSAPP_*`); não reutilize credenciais entre elas.
```

O host precisa usar HTTPS válido e o proxy reverso precisa encaminhar `/api/v1/` para o serviço da API. A rota pública está em `/api/v1/integrations/...` porque o middleware de segurança já isenta essa família de webhooks de origem/browser; a autenticação é feita pela verificação Meta, não por cookie de sessão.

## Variáveis de ambiente

Configure no ambiente de execução da API (arquivo de ambiente protegido ou gerenciador de segredos do servidor). Não adicione valores reais ao Git.

```dotenv
COOKLILY_WHATSAPP_PROVIDER=meta_cloud
COOKLILY_WHATSAPP_ACCESS_TOKEN=
COOKLILY_WHATSAPP_PHONE_NUMBER_ID=
COOKLILY_WHATSAPP_GRAPH_VERSION=
COOKLILY_WHATSAPP_TEMPLATE_NAME=cooklily_order_update
COOKLILY_WHATSAPP_TEMPLATE_LANGUAGE=pt_BR
COOKLILY_WHATSAPP_WEBHOOK_VERIFY_TOKEN=
COOKLILY_WHATSAPP_APP_SECRET=
COOKLILY_WHATSAPP_TIMEOUT_MS=8000
COOKLILY_WHATSAPP_WORKER_INTERVAL_MS=15000
```

- `COOKLILY_WHATSAPP_ACCESS_TOKEN`: token com permissões apropriadas para WhatsApp Business Platform.
- `COOKLILY_WHATSAPP_PHONE_NUMBER_ID`: ID do número de telefone, não o número público em si.
- `COOKLILY_WHATSAPP_GRAPH_VERSION`: versão Graph suportada e escolhida no momento da configuração, no formato `vNN.N`.
- `COOKLILY_WHATSAPP_TEMPLATE_NAME`: template aprovado de fallback utilizado pelo worker quando não há mensagem ativa para a etapa do pedido.
- `COOKLILY_WHATSAPP_WEBHOOK_VERIFY_TOKEN`: segredo aleatório criado por nós; deve ser exatamente igual ao token de verificação informado no Meta Developers.
- `COOKLILY_WHATSAPP_APP_SECRET`: App Secret do app Meta; usado apenas no servidor para validar HMAC-SHA256 das requisições POST.
- Nunca coloque Access Token ou App Secret em código frontend, URL, logs ou documentação versionada.

A configuração do envio continua fail-closed: sem os parâmetros de API/template exigidos, o worker não envia mensagens. A configuração do webhook é independente: GET responde 503 até o Verify Token estar configurado; POST responde 503 até o App Secret estar configurado.

## Cadastrar uma mensagem padrão

O endpoint administrativo exige autenticação da equipe. Para criar, envie JSON semelhante a este:

```json
{
  "key": "preparing",
  "displayName": "Pedido em preparo",
  "category": "utility",
  "language": "pt_BR",
  "bodyTemplate": "O pedido {{1}} está em preparo.",
  "variables": ["orderNumber"],
  "metaTemplateName": "cooklily_pedido_em_preparo",
  "status": "draft"
}
```

Regras importantes:

- `key` deve ser minúscula, usando letras, números e sublinhado. Para associar a uma etapa automática, use exatamente uma das chaves de etapa do pedido, por exemplo `preparing`, `payment_confirmed`, `out_for_delivery` ou `delivered`.
- `bodyTemplate` é a cópia de referência para a equipe; cadastrar aqui não cria nem aprova automaticamente o template na Meta.
- `metaTemplateName` deve corresponder ao nome real do template aprovado na WhatsApp Manager/Meta.
- `variables` aceita, nesta versão, `orderNumber` e `stageLabel`, nessa ordem. O número e a ordem precisam corresponder aos parâmetros posicionais do corpo aprovado na Meta.
- `category` aceita `utility`, `marketing` ou `authentication`; `language` usa código como `pt_BR`.
- Comece com `draft`. Só use `active` depois de confirmar que o template foi aprovado e que idioma e parâmetros correspondem. Ativar um registro com `key` igual à etapa faz o worker priorizá-lo para essa etapa; caso não exista registro ativo, usa o template global de fallback.
- O envio transacional respeita o opt-in já existente. O cadastro de template não concede consentimento ao cliente.

Para listar, use GET no endpoint de templates. Para atualizar, use PATCH com o ID retornado. Use `status: "archived"` para retirar uma mensagem de uso sem apagar o histórico administrativo.

## Configuração no Meta for Developers

1. Abra o app em Meta for Developers e adicione/configure o produto **WhatsApp**.
2. Em WhatsApp > Configuration (ou Webhooks, conforme a versão da interface), informe a URL pública HTTPS indicada acima.
3. No campo **Verify token**, cole o mesmo valor de `COOKLILY_WHATSAPP_WEBHOOK_VERIFY_TOKEN` configurado no servidor.
4. Clique em **Verify and save**. A Meta fará GET com `hub.mode`, `hub.verify_token` e `hub.challenge`; o endpoint só devolve o challenge quando token e modo correspondem.
5. Assine o objeto/field de webhook **messages** para receber mensagens e atualizações de estado de mensagens. Confirme que o produto WhatsApp está inscrito no app/WABA correta.
6. No servidor, configure `COOKLILY_WHATSAPP_APP_SECRET` com o App Secret da aplicação Meta. Sem ele, POST será recusado com 503.
7. Configure também Access Token, Phone Number ID e Graph API version para habilitar o worker de envio.
8. Reinicie o serviço da API após alterar as variáveis de ambiente.
9. Use a ferramenta de teste de webhooks da Meta e consulte os logs operacionais sem imprimir tokens, App Secret, texto recebido ou números de telefone.

### Checklist visual no Meta — callbacks separados

Use dois apps Meta, um por operação, e faça o procedimento abaixo para cada app e sua WABA correspondente. Não reutilize o Verify Token, App Secret, Access Token, Phone Number ID ou número de telefone entre CookLily e Carro Chefe.

**CookLily**

1. Abra `developers.facebook.com/apps` e selecione o app da CookLily.
2. Em WhatsApp > Configuration (ou Webhooks, conforme a versão do painel), confirme que este app e seu produto WhatsApp estão conectados à WABA CookLily.
3. Configure Callback URL `https://carrochefe.com/api/v1/integrations/cooklily/whatsapp/webhook`.
4. Cole no Verify Token o valor configurado somente em `COOKLILY_WHATSAPP_WEBHOOK_VERIFY_TOKEN` na VPS; não envie esse segredo em mensagens nem o coloque no Git.
5. Use **Verify and save**. A confirmação só está concluída quando a Meta aceita o handshake; um 403 em teste com token inválido não equivale a essa confirmação.
6. Em Webhooks, assine o campo `messages` e confirme a assinatura da WABA CookLily ao app.

**Carro Chefe**

Repita os passos no segundo app Meta e na WABA próprios do Carro Chefe com `https://carrochefe.com/api/v1/integrations/carro-chefe/whatsapp/webhook` e o segredo `CARRO_CHEFE_WHATSAPP_WEBHOOK_VERIFY_TOKEN`. Não configure os dois números/WABAs no mesmo app se a intenção é usar callbacks separados.

Depois de salvar, confira no painel da Meta que a URL aparece sem erro e que o campo `messages` está assinado. A validação ponta a ponta ainda precisa do teste de webhook da Meta e de um evento real de número autorizado. A URL conhecida e a rota acessível no servidor não provam que o callback foi salvo no painel Meta.

### Rascunho do template de acompanhamento de pedido

Quando a operação WhatsApp da CookLily estiver selecionada no WhatsApp Manager, criar um template de categoria **Utility**, idioma **Portuguese (Brazil) / pt_BR**, com nome simples como `cooklily_atualizacao_pedido`. Texto sugerido, submetido à aprovação da Meta:

> Oi! O pedido {{1}} da CookLily está {{2}}. Acompanhe as próximas atualizações por aqui. Se precisar de ajuda, responda esta mensagem.

Mapear `{{1}}` para `orderNumber` e `{{2}}` para `stageLabel`, conforme as variáveis atualmente aceitas pelo worker. Usar o mesmo conteúdo aprovado para as etapas cadastradas no painel, desde que os placeholders e idioma permaneçam idênticos. Não adicionar preço, promoção ou conteúdo de marketing a este template de utilidade. O nome, conteúdo, categoria e idioma só podem ser ativados no painel depois de a Meta mostrar status aprovado. Um template cadastrado localmente não é criado nem aprovado na Meta.

O plano de homologação posterior deve cobrir, com número de teste e opt-in: confirmação de pedido, transição de status (preparo/retirada ou entrega), recebimento de status de mensagem no webhook, deduplicação, correlação por pedido e logs sem conteúdo sensível. Não enviar mensagens para clientes reais durante o teste.

A Meta assina o corpo HTTP bruto. O endpoint calcula HMAC-SHA256 usando o App Secret e compara em tempo constante com `X-Hub-Signature-256`; não reserializa o JSON para validar. Assinaturas inválidas recebem 401. O evento só é aceito depois da verificação.

## Persistência, privacidade e idempotência

- `LilyWhatsAppMessageTemplate`: mensagens padrão, categoria, idioma, variáveis, estado e nome do template Meta.
- `LilyWhatsAppWebhookEvent`: tipo do evento, ID de mensagem do provedor quando disponível, estado, hash do payload e chave de deduplicação.
- O corpo bruto, texto da mensagem e telefone do remetente não são persistidos no ledger de webhook.
- Eventos duplicados são consolidados pela chave SHA-256; o endpoint responde HTTP 200 após processar os registros reconhecidos para evitar reentrega infinita.
- A validação de assinatura usa o corpo bruto capturado pelo parser JSON do Fastify.
- A API não responde automaticamente a mensagens recebidas nesta entrega; ela apenas recebe e registra metadados mínimos. Qualquer automação de resposta deve ser uma entrega separada com política de consentimento e janela de atendimento.
- A política de opt-in para atualizações transacionais já implementada permanece obrigatória.

## Testes e ativação

Teste local antes de apontar a Meta para produção:

1. Execute `npm run db:generate:lily` e `npm run db:validate:lily`.
2. Aplique a migration em ambiente de teste/homologação com o fluxo de deploy de banco já utilizado pelo projeto.
3. Execute `npx vitest run --config vitest.config.ts apps/api/src/modules/lily/whatsapp.test.ts apps/api/src/modules/lily/whatsapp-webhook.test.ts`.
4. Confirme GET válido (200 + challenge), Verify Token incorreto (403), App Secret ausente (503), assinatura ausente/inválida (401) e POST assinado (200).
5. Só então configure o callback no Meta Developers e faça o teste de envio com número autorizado.

**Limite de ativação:** o painel e endpoints só ficam disponíveis no site após migração/deploy. Mesmo após o deploy, envio real permanece desativado se o painel indicar configuração incompleta. Para ativar a produção ainda é necessário provisionar WABA/número, token, Phone Number ID, versão Graph, App Secret, Verify Token e template aprovado no idioma/ordem de variáveis corretos, configurar o callback e verificar o handshake/eventos no Meta Developers. Nenhuma credencial real foi fornecida ou configurada nesta entrega; não declarar o envio real homologado antes desses passos.
