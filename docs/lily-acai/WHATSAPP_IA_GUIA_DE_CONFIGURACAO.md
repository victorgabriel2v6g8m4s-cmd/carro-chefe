# CookLily WhatsApp e IA — guia de configuração do proprietário

**Objetivo:** concluir as configurações externas depois da implementação, seguindo gates seguros e verificáveis.  
**Estado de referência:** 30/10/2026. Confirme cada item nos painéis antes de agir: o estado descrito em registros anteriores pode ter mudado.  
**Escopo:** CookLily, WABA e banco Lily. Não reutilize credenciais do Carro Chefe.

## Regras antes de iniciar

- Faça as etapas na ordem e pare sempre que um gate falhar.
- Não envie segredos no chat, em tickets, Git, screenshots ou no painel. Use um gerenciador de senhas e o cofre da VPS.
- Comece com inbox e testes internos. Ative o agente de IA por último, após privacidade, custos, respostas, handoff e recipient de teste aprovados.
- Não use clientes reais no piloto. Use um número de teste autorizado, titular consentido e templates aprovados.
- Mensagens do WhatsApp são dados não confiáveis. O agente não pode confirmar pagamento, alterar pedido, conceder desconto ou revelar informação privada.
- O caminho de configuração no servidor descrito pelo runbook é `/etc/carro-chefe/carro-chefe.env`. Nunca execute `cat`, `printenv` ou comandos que exibam valores secretos.

## 1. Preparar os painéis externos

### 1.1 Meta Business e WhatsApp

1. Acesse [Meta for Developers](https://developers.facebook.com/apps/) com a conta administradora da CookLily e escolha o app correto.
2. Confirme Business Portfolio, WABA e número: precisam pertencer à CookLily. Não reutilize o número da operação Carro Chefe.
3. Confirme verificação comercial, nome de exibição e estado do número no WhatsApp Manager.
4. No WhatsApp Manager, configure um método de cobrança válido para as conversas pagas. Consulte a tabela de preços vigente da Meta antes de aprovar gastos; este guia não fixa tarifa.
5. Publique o app quando estiver pronto para produção. Revise permissões, política de privacidade, URL de exclusão de dados e requisitos de revisão apresentados pela Meta.
6. Crie um System User com o menor conjunto de permissões necessário para WhatsApp Cloud API; gere token de longa duração, com validade/renovação documentadas. Registre o token somente no cofre da VPS.
7. Anote no cofre, sem copiar para este repositório: Phone Number ID, WABA ID, App Secret, Access Token e versão Graph suportada pelo app.
8. Em Webhooks, configure callback `https://carrochefe.com/api/v1/integrations/cooklily/whatsapp/webhook`. Gere um Verify Token aleatório, use o mesmo valor no painel Meta e na VPS, e valide o handshake.
9. Assine o campo `messages` e os eventos de status/templates necessários. Confirme que a WABA CookLily está inscrita no app e que os eventos chegam sem duplicar efeitos.
10. Em WhatsApp Manager, submeta templates necessários para análise. Aguarde status Approved e confira nome técnico, idioma, categoria e variáveis letra por letra.

O histórico de 28/10/2026 registrou o callback e assinatura da WABA, mas o app ainda em desenvolvimento, cobrança pendente e nenhum template aprovado. Trate isso somente como histórico; revalide tudo agora.

### 1.2 Projeto OpenAI

1. Crie/seleciona um projeto de API dedicado à CookLily, separado de usos pessoais e de outras operações.
2. Configure budget/alertas no painel da organização e limites de uso do projeto. A aplicação também limita quantidade de chamadas, mas esse limite **não equivale a um teto financeiro em reais**.
3. Escolha e registre o modelo Responses API aprovado e compatível. Compare preços atuais de entrada/saída e faça uma estimativa conservadora com volume de mensagens, retries e testes.
4. Revise [controles de dados da API](https://developers.openai.com/api/docs/guides/your-data), retenção e elegibilidade de Zero Data Retention junto à política atual do projeto. `store:false` desativa o estado persistente de resposta da aplicação, mas não significa retenção zero de logs contra abuso.
5. Gere uma chave API restrita ao projeto e grave-a diretamente no cofre da VPS como `COOKLILY_OPENAI_API_KEY`. Nunca a cole no navegador do painel nem em arquivo versionado.
6. Para embeddings, mantenha a configuração desabilitada nesta fase. O texto da consulta do cliente sairia para o provedor de embeddings; só habilite após revisar transparência/consentimento, retenção e necessidade.

Referências técnicas: [Responses](https://developers.openai.com/api/docs/guides/migrate-to-responses), [embeddings](https://developers.openai.com/api/docs/guides/embeddings), [dados](https://developers.openai.com/api/docs/guides/your-data), [preços](https://developers.openai.com/api/docs/pricing). Reconfira preço e controles no dia da ativação.

## 2. Aprovar privacidade e operação antes de persistir inbox

Registre uma decisão operacional antes de habilitar a inbox:

1. Escolha retenção de conversas de 1 a 90 dias, documente finalidade, base legal, responsáveis e procedimento para solicitação do titular.
2. Atualize o aviso de privacidade para explicar atendimento via WhatsApp, compartilhamento com Meta/OpenAI quando aplicável, retenção e canal humano.
3. Defina horário de cobertura humana, SLA de handoff, responsáveis por fila e procedimento fora de expediente.
4. Defina modelo, limite financeiro mensal no projeto OpenAI, orçamento de Meta e alertas. Defina também o teto diário de requisições na aplicação.
5. Defina os critérios de aceite: FAQ autorizadas, perguntas proibidas, linguagem, limiar de handoff, amostra de testes e quem aprova resultados.
6. Mantenha embeddings de consulta desabilitados até aprovação separada da finalidade e do envio de texto ao provedor.

## 3. Configurar segredos e flags na VPS

Use o procedimento administrativo do runbook (`deploy/README.md` e `docs/lily-acai/DEPLOY_INCREMENTAL_CLI.md`). A edição do arquivo pode ser feita com ferramenta segura de root, por exemplo `sudoedit /etc/carro-chefe/carro-chefe.env`. Não imprima o arquivo no terminal.

Configure as variáveis abaixo. Mantenha os valores booleanos desativados inicialmente.

| Variável | Como preencher |
|---|---|
| `COOKLILY_WHATSAPP_PROVIDER` | `meta_cloud` |
| `COOKLILY_WHATSAPP_ACCESS_TOKEN` | Token restrito do System User/WABA CookLily |
| `COOKLILY_WHATSAPP_PHONE_NUMBER_ID` | ID do número CookLily, não o telefone formatado |
| `COOKLILY_WHATSAPP_GRAPH_VERSION` | Versão Graph suportada no app, no formato `vN.N` |
| `COOKLILY_WHATSAPP_APP_SECRET` | App Secret do app Meta CookLily |
| `COOKLILY_WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Segredo aleatório igual ao Verify Token cadastrado na Meta |
| `COOKLILY_WHATSAPP_INBOX_ENABLED` | `false` até aprovar retenção/privacidade e validar a chave de cifra |
| `COOKLILY_WHATSAPP_AI_ENABLED` | `false` até concluir todas as etapas de piloto e aceite |
| `COOKLILY_WHATSAPP_AI_ENCRYPTION_KEY` | 32 bytes criptograficamente aleatórios em base64url, exclusivo para a inbox CookLily |
| `COOKLILY_WHATSAPP_RETENTION_DAYS` | Inteiro entre 1 e 90, conforme decisão documentada |
| `COOKLILY_WHATSAPP_AI_MAX_DAILY_REQUESTS` | Inteiro de 1 a 10000, compatível com o orçamento aprovado |
| `COOKLILY_WHATSAPP_AI_QUERY_EMBEDDINGS_ENABLED` | Ausente ou `false` inicialmente; não habilitar sem aprovação específica |
| `COOKLILY_OPENAI_API_KEY` | Chave do projeto dedicado |
| `COOKLILY_OPENAI_MODEL` | Modelo Responses aprovado e disponível no projeto |
| `COOKLILY_OPENAI_EMBEDDING_MODEL` | Opcional; deixar ausente até aprovação de embeddings |
| `COOKLILY_OPENAI_EMBEDDING_DIMENSIONS` | Opcional; padrão atual do código: 512 |

Gere a chave de cifra **direto no terminal seguro da VPS**, sem copiá-la para este documento ou chat:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Copie a saída diretamente para o cofre de segredos e para o arquivo de ambiente via editor seguro. Restrinja leitura ao usuário do serviço/root. Não gere nova chave sobre uma instalação que já tenha conteúdo cifrado: isso tornaria histórico anterior ilegível. Para rotação, siga procedimento específico de descriptografia/recriptação e backup.

Depois de salvar, confira permissões sem imprimir conteúdo. Use `sudo cc status` para estado do serviço e execute deploy somente de release SHA revisado conforme `docs/lily-acai/DEPLOY_INCREMENTAL_CLI.md`; não faça deploy de código diferente do SHA integrado. Reinicie o serviço conforme o procedimento do runbook se a mudança de ambiente não for aplicada pelo deploy.

## 4. Validar conexão sem iniciar atendimento automático

1. Abra `https://carrochefe.com/lilyacai/painel/whatsapp` com conta staff/admin autorizada.
2. Confira o checklist: provider, token, Phone Number ID, Graph version, template/idioma, Verify Token e App Secret. O painel deve exibir somente configurado/pendente, jamais valores secretos.
3. Confirme via `GET /api/v1/lily/admin/whatsapp/ai/settings` que as flags efetivas estão desligadas e dependências apontam configuração incompleta/segura quando apropriado. Não cole respostas contendo dados privados em tickets.
4. Envie/receba eventos apenas com recipient de teste aprovado e consentido. Compare webhook, status, deduplicação e logs redigidos. Não testar em números de clientes.
5. Deixe a inbox persistente desligada até retenção e consentimento serem aprovados. Quando aprovado, configure `COOKLILY_WHATSAPP_RETENTION_DAYS` e a chave de cifra, habilite somente `COOKLILY_WHATSAPP_INBOX_ENABLED=true` e valide expurgo, autorização staff/admin, MFA, CSRF e handoff humano.

## 5. Homologar IA em piloto controlado

1. Mantenha IA desligada e valide pelo menos 30 cenários em ambiente de teste: FAQ respondida com fonte, informação ausente, prompt injection, pedido de humano, SAIR/PARAR, reclamação, pagamento/estorno, pedido/status privado, alergia/segurança alimentar, mídia/áudio, conteúdo excessivo, janela de 24 horas expirada, provider indisponível, rate limit e custo limite.
2. Verifique que temas sensíveis, identidade incerta, pedido privado, opt-out e duas falhas seguidas encaminham para humano; nenhum cenário deve simular ações de pedido/pagamento.
3. Meça latência, proporção de handoff, respostas rejeitadas, uso e custo agregado. Não registrar texto, telefone, prompt, resposta nem segredo em logs.
4. Confira que o time humano consegue assumir a conversa e que, durante atendimento humano/resolvido/opt-out, nenhum worker envia resposta automática.
5. Faça revisão de privacidade/segurança e aceite operacional com o responsável. Se o gate falhar, mantenha IA desligada.
6. A implementação atual exige `COOKLILY_WHATSAPP_AI_QUERY_EMBEDDINGS_ENABLED=true` para considerar o agente pronto. Habilite essa variável somente depois de aprovação explícita e documentada da finalidade, transparência/consentimento e retenção do texto enviado ao provedor. Se essa aprovação não existir, mantenha IA desligada e opere somente inbox/handoff humano.
7. Com o gate de embeddings aprovado, ative `COOKLILY_WHATSAPP_AI_ENABLED=true` apenas numa janela piloto limitada, com humano acompanhando e recipient de teste consentido.
8. Observe o painel de saúde, backlog, dead-letter, custo e taxa de handoff. Pare o piloto se houver vazamento de dado, resposta não respaldada, envio duplicado, custo acima do teto ou fila humana sem cobertura.

## 6. Parada, rollback e rotação

1. Para interromper IA, defina `COOKLILY_WHATSAPP_AI_ENABLED=false`; para parar entrada/persistência, desative também `COOKLILY_WHATSAPP_INBOX_ENABLED=false`. A aplicação deve continuar fail-closed. Reinicie o serviço se necessário.
2. Se uma chave Meta/OpenAI vazar, revogue-a no provedor primeiro, gere substituta e atualize cofre/ambiente. Revise auditoria por atividade indevida sem exportar conversas.
3. Para incidente de privacidade, desligue inbox e IA, preserve somente evidências técnicas permitidas, siga processo de incidente e obrigação aplicável; não apague/alterne chave de cifra antes de preservar/restaurar o acesso autorizado aos dados sob retenção.
4. Após estabilizar, valide callback, checklist, flag efetiva e ausência de nova atividade automática com recipient de teste.

## Checklist de conclusão do proprietário

- [ ] Meta Business/WABA/número CookLily e cobrança conferidos
- [ ] App publicado e permissões mínimas revisadas
- [ ] Webhook/Verify Token/eventos testados
- [ ] Templates necessários aprovados na Meta
- [ ] Projeto OpenAI dedicado, limites e retenção revisados
- [ ] Aviso de privacidade, consentimento, retenção e SLA humano aprovados
- [ ] Segredos armazenados no cofre da VPS; flags ainda desligadas
- [ ] Checklist do painel validado sem expor valores
- [ ] Inbox validada e expurgo confirmado
- [ ] Cenários offline aprovados e handoff testado
- [ ] Aprovação explícita para embeddings de consultas documentada (gate obrigatório para IA na implementação atual)
- [ ] Piloto consentido, custo observado e aprovação operacional registrada
- [ ] IA ligada somente após todos os gates acima

## Referências internas

- [Arquitetura e guardrails](WHATSAPP_IA_ARQUITETURA_E_IMPLANTACAO.md)
- [Configuração Meta e templates](WHATSAPP_META_SETUP_E_PEDIDO_2026-10-28.md)
- [Setup Cloud API](WHATSAPP_CLOUD_API_SETUP_2026-10-09.md)
- [Deploy incremental CookLily](DEPLOY_INCREMENTAL_CLI.md)
