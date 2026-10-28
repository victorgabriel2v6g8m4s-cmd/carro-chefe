# CookLily — configuração da Meta e roteiro do template de pedidos

- Data: 2026-10-28
- Estado: callback e assinatura de eventos CookLily configurados em 2026-10-28; app ainda em desenvolvimento, template não cadastrado, cobrança pendente.
- Escopo: WhatsApp CookLily. A operação Carro Chefe usa credenciais e callback independentes.

## Antes de começar

O backend separa os callbacks por negócio:

| Operação | Callback | Variáveis de verificação no servidor |
|---|---|---|
| CookLily | `https://carrochefe.com/api/v1/integrations/cooklily/whatsapp/webhook` | `COOKLILY_WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `COOKLILY_WHATSAPP_APP_SECRET` |
| Carro Chefe | `https://carrochefe.com/api/v1/integrations/carro-chefe/whatsapp/webhook` | `CARRO_CHEFE_WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `CARRO_CHEFE_WHATSAPP_APP_SECRET` |

O `Verify Token` é um segredo escolhido pela operação e precisa ser igual no Meta e no servidor. O `App Secret` vem da página de configurações do app Meta e é usado para conferir a assinatura das notificações. São valores diferentes. Não os envie no chat, não os coloque no Git e não use o token de acesso da Cloud API como Verify Token.

O Meta oferece um callback no nível do app e permite substituir o callback na inscrição de uma WABA. Para reduzir erros na primeira configuração, recomendamos criar/usar um app Meta para cada operação; também é possível usar um app e configurar a substituição de callback por WABA via API. Em qualquer opção, associe cada número/WABA ao callback e às credenciais do respectivo negócio. A documentação da Meta descreve a substituição por WABA e a inscrição que ativa o envio dos eventos para o callback configurado.

## Passo a passo no painel Meta — CookLily

1. Abra [Meta for Developers](https://developers.facebook.com/apps/) e selecione o app que pertence ao WhatsApp da CookLily. Se ainda não existir, crie um app empresarial, adicione o produto WhatsApp e associe a WABA/número CookLily.
2. Em **WhatsApp → API Setup**, confirme que o número é o da CookLily. Anote em um gerenciador seguro o **Phone Number ID** e o **WhatsApp Business Account ID (WABA ID)**; não são o número de telefone exibido aos clientes.
3. Em **App settings → Basic**, copie o **App Secret** para o cofre de segredos da VPS na variável `COOKLILY_WHATSAPP_APP_SECRET`.
4. Gere um valor aleatório longo para `COOKLILY_WHATSAPP_WEBHOOK_VERIFY_TOKEN` no cofre da VPS. Não reutilize senha, access token ou App Secret.
5. Abra **WhatsApp → Configuration** (em algumas versões da interface, **Webhooks → WhatsApp Business Account**) e informe o callback CookLily acima e o mesmo Verify Token da etapa 4. Clique **Verify and save**.
6. Na lista de campos de webhook, assine **messages**. Esse campo recebe mensagens recebidas e atualizações de status de mensagens.
7. Confirme que o app está inscrito na WABA CookLily. A configuração do callback, sozinha, não ativa a entrega de eventos: a inscrição da WABA é necessária.
8. No ambiente da VPS, configure também `COOKLILY_WHATSAPP_ACCESS_TOKEN`, `COOKLILY_WHATSAPP_PHONE_NUMBER_ID`, `COOKLILY_WHATSAPP_PROVIDER=meta_cloud`, `COOKLILY_WHATSAPP_GRAPH_VERSION` (a versão Graph suportada e vigente no app) e o nome/idioma do template. Reinicie o serviço após atualizar as variáveis.
9. Em **WhatsApp Manager → Account tools → Message templates**, crie o template abaixo. Selecione a categoria Utility, idioma Portuguese (Brazil) (`pt_BR`) e envie para análise.
10. Aguarde o status **Approved**. Depois, no painel CookLily `/lilyacai/painel/whatsapp`, cadastre o mesmo nome, idioma, corpo e variáveis; associe o nome aprovado e só então ative o template.

Para Carro Chefe, repita com o callback e variáveis `CARRO_CHEFE_WHATSAPP_*` e com o número/WABA próprios. O endpoint de Carro Chefe responde que falta configuração até que seus próprios segredos sejam cadastrados. Não copie os segredos CookLily para as variáveis Carro Chefe.

## Template inicial para pedido

- Nome técnico: `cooklily_atualizacao_pedido`
- Categoria sugerida: **Utility** (mensagens transacionais ligadas a um pedido solicitado pelo cliente; a Meta decide a aprovação e pode reclassificar).
- Idioma: `pt_BR`
- Corpo:

```text
Oi! O pedido {{1}} da CookLily está {{2}}. Acompanhe as próximas atualizações por aqui. Se precisar de ajuda, responda esta mensagem.
```

- Variável `{{1}}`: número do pedido. Exemplo para análise: `12345`.
- Variável `{{2}}`: etapa curta e objetiva do pedido. Exemplo para análise: `em preparo`.
- O mesmo template pode informar as etapas configuradas no produto, como pagamento confirmado, em preparo, pronto para retirada, saiu para entrega e entregue. Evitar inserir dados pessoais, endereço ou detalhes desnecessários.
- O envio só deve ocorrer para pedidos com consentimento de atualização por WhatsApp, conforme o registro do pedido. Para o primeiro teste, usar apenas número de teste/recipient permitido pela Meta e confirmar o consentimento do titular.

## Como conectar o agente aos testes

- A autenticação administrativa do agente já usa uma chave Ed25519 local; não é necessário guardar a senha humana ou MFA no agente. A sessão admin é auditada e pode ser revogada.
- A chave privada fica no computador/gerenciador local; o App Secret, Verify Token e Cloud API access token permanecem na VPS. O painel expõe apenas se cada item está configurado, nunca o valor.
- Após a aprovação do template, a homologação verifica primeiro o status no painel, depois envia uma mensagem de teste apenas para um recipient autorizado, valida o webhook de status e acompanha a entrada na fila/outbox. Mensagem a cliente real requer autorização e destinatário definidos pelo proprietário.

## Escopo do painel WhatsApp

O painel atual em `/lilyacai/painel/whatsapp` oferece cadastro dos templates locais, estado de ativação e consulta/gestão básica das notificações e tentativas de envio. Ele ainda não é uma caixa de entrada multiatendente nem uma central completa de conversas.

Próximos incrementos planejados, fora desta configuração inicial:

1. Caixa de entrada com conversas, atribuição/transferência entre atendentes, estado aberto/pendente/resolvido, busca e histórico.
2. Metadados operacionais minimizados: pedido vinculado, etapa, consentimento, timestamps, entrega/leitura/falha e responsável; proteger telefone e conteúdo por RBAC, retenção e trilha de auditoria.
3. Resposta humana e envio de template aprovados pela Meta, com prévia das variáveis e validação do consentimento/janela de atendimento.
4. Assistente LLM server-side com recuperação de respostas da CookLily, ferramentas estritamente limitadas, registro de ações e transferência imediata para gerente quando houver risco, reclamação grave, baixa confiança ou pedido explícito.
5. Indicadores agregados para operação e qualidade, sem usar conversas para analytics/model training sem finalidade, consentimento e retenção documentados.

## Referências oficiais

## Estado confirmado da configuração — 2026-10-28

- Perfil comercial CookLily marcado completo pelo MCP; app `CookLily` conectado.
- Número CookLily `+55 67 9928-9187` consta registrado/linked. Não reutilizar esse número na configuração Carro Chefe.
- Callback configurado: `https://carrochefe.com/api/v1/integrations/cooklily/whatsapp/webhook`.
- O endpoint respondeu `200` ao handshake GET da Meta e devolveu o challenge esperado. Segredo verificado permanece apenas na VPS e nunca é registrado neste documento.
- Campos adicionados: `account_update`, `message_statuses`, `message_template_status_update`, `messages`, `phone_number_name_update`.
- A assinatura da conta CookLily ao app foi ativada após confirmação do proprietário. Estes passos, isoladamente, não confirmam entrega real enquanto o app permanece em modo de desenvolvimento.
- Pendências Meta: publicar o app (aguardar decisão do proprietário), adicionar método de pagamento para mensagens cobradas e criar/submeter os templates Utility. A lista de templates cadastrados retornou vazia.
- Nenhum envio de teste foi feito nesta etapa. Para um teste de saída será necessário escolher um template aprovado e um destinatário de teste autorizado; mensagens a clientes reais continuam dependendo de consentimento e autorização.

- [Meta — Webhooks da WhatsApp Business Platform](https://www.postman.com/meta/whatsapp-business-platform/folder/lboq68h/webhooks)
- [Meta — Override Callback URL por WABA](https://www.postman.com/meta/whatsapp-business-platform/request/13382743-1293399e-36eb-47a3-8b15-4a0fe8f2a9c4)
- [Meta — inscrição do app na WABA](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api?entity=request-13382743-d0e227d1-e520-4b12-a8f6-32657a52d26e)
- [Meta Blueprint — criar, gerenciar e enviar templates](https://www.facebookblueprint.com/student/path/253055-message-templates?sid=15215967-affd-4cda-b9e6-a1774c5fc32c&sid_i=1)
