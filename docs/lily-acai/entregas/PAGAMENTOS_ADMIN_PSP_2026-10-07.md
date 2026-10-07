# CookLily — configuração de pagamentos e PSP Pix — 2026-10-07

## Decisão

O painel administrativo passa a separar duas responsabilidades:

- `/painel/pagamentos/metodos`: formas de pagamento, disponibilidade, fallback Pix e motor de desconto por método;
- `/painel/pagamentos`: pagamentos existentes, confirmação, reconciliação, cancelamento e estorno.

O cliente continua escolhendo explicitamente Pix, cartão de crédito ou cartão de débito.

## Ordem operacional desejada para Pix

1. BR Code próprio CookLily usando a chave Pix da instituição recebedora;
2. Mercado Pago como fallback de Pix via API;
3. Pix manual como último fallback.

A troca de provider não deve ocorrer automaticamente quando uma chamada externa fica ambígua: timeout/estado incerto deve permanecer fail-closed para evitar cobrança duplicada.

## Instituição recebedora — prioridade

### 1. InfinitePay

A documentação pública atual da InfinitePay confirma Checkout Integrado por API, com criação de links em `POST https://api.checkout.infinitepay.io/links`, `order_nsu`, consulta de pagamento em `/payment_check` e webhook opcional. O Checkout Integrado aceita Pix ou cartão de crédito.

Isso torna a InfinitePay uma candidata adequada para ser a **instituição da chave Pix usada pelo BR Code próprio**, caso a conta/chave da CookLily esteja na InfinitePay.

Não tratar a InfinitePay como provider de BR Code Pix dinâmico direto sem um contrato/API adicional: a documentação pública consultada descreve link de checkout, consulta e webhook, não uma API Pix dinâmica equivalente à API Pix do Sicredi.

### 2. Mercado Pago

Continua sendo o fallback técnico de Pix e o provider de cartões.

A Orders API pública documenta criação de orders com Pix, idempotência, QR Code/copia e cola e notificações por webhook.

### 3. Sicredi

É a alternativa preferida caso seja necessário conciliar o BR Code diretamente por API do banco.

A documentação pública do Sicredi descreve API Pix para cobranças imediatas/com vencimento, consulta, conciliação, devoluções e webhooks, usando mTLS + OAuth2. A adesão e credenciais dependem da cooperativa.

### 4. Nubank

O material público consultado confirma Pix Cobrança no Nu Empresas, mas não foi localizada, nesta revisão, documentação pública equivalente à API Pix do Sicredi para integração direta do nosso backend com cobrança dinâmica + webhook + conciliação.

Portanto não implementar endpoints Nubank por inferência. Se o Nubank for escolhido, primeiro obter o contrato/API oficial aplicável à conta PJ.

## Próximo passo de infraestrutura

Não colocar credenciais de PSP no Git.

Quando a conta InfinitePay estiver aberta e a chave Pix definida, configuraremos a chave no segredo da VPS. O BR Code próprio continuará sendo gerado pela CookLily; a instituição recebedora será determinada pela chave Pix informada.

Se a prioridade passar de "receber na InfinitePay" para "conciliação bancária automática direta", avaliar a migração da reconciliação para Sicredi ou outra API Pix oficial antes de alterar o motor de fallback.

## UI

O novo painel deve permanecer sem reload global após salvar regras. Mutations administrativas usam o feedback discreto existente e mensagens específicas de sucesso/erro.



## Configuração segura da chave Pix na VPS

A CLI operacional `cc` agora possui:

- `sudo cc check pix-key`: verifica somente presença/validade básica, sem exibir a chave;
- `sudo cc key pix`: solicita a chave Pix em entrada oculta, confirma a digitação, solicita nome/cidade do recebedor e grava as variáveis no arquivo de ambiente da VPS;
- o comando reinicia o serviço `carro-chefe` para carregar a nova configuração;
- o segredo nunca é impresso no terminal nem versionado no Git.

A chave deve ser uma chave Pix realmente registrada na conta InfinitePay que receberá os pagamentos. O nome do recebedor informado no BR Code deve corresponder ao usuário recebedor registrado, conforme o padrão Pix do Banco Central. 

Após configurar a chave, a homologação financeira deve ser feita com um pedido explicitamente marcado como homologação e com `X-Lily-Homologation: 1`. O modo de homologação exige staff/MFA e não habilita pagamento real em pedidos normais.

