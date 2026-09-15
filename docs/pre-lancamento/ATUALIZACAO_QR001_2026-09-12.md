# Atualização operacional — QR-001, banner e acesso à cupons e promoções exclusivas

> Atualização de 14/09/2026: uma versão da landing já foi migrada para carrochefe.com e foi verificada no navegador. O estado atual, a nova comunicação “acesso à cupons e promoções exclusivas” e a distinção entre versão publicada e próxima release estão em [Estado da landing](ESTADO_LANDING_2026-09-14.md). Relatos anteriores de ausência de publicação referem-se às respectivas entregas históricas.


**Data:** 2026-09-12  
**Responsável pela implementação:** AG-DEV  
**Campanha:** `banner`  
**QR:** `QR-001`

## 1. Confirmações recebidas do proprietário

Foram confirmados como dados operacionais desta entrega:

1. o QR foi homologado em Android;
2. o QR foi homologado em iPhone;
3. o QR foi homologado em rede móvel;
4. o destino/identificador efetivamente utilizado é:

```text
https://carrochefe.com/?cc_qr=QR-001&cc_campaign=banner
```

5. clientes que se cadastrarem por essa campanha terão **acesso à cupons e promoções exclusivas**.

Nenhum `cc_variant` foi fornecido no QR homologado. O valor deve permanecer ausente (`null`) para esta peça.

## 2. Banner de referência

O proprietário forneceu o arquivo **“Banner vertical Chefão - Canva editável.pdf”** como referência da peça física.

Conteúdo visual observado na página única do material:

- fundo predominantemente preto;
- marca Carro Chefe com o jipe/chapéu de chef;
- destaque para **“Lanche de 30 cm”**;
- produto **Chefão**;
- chamadas de ingredientes `cheddar`, `bacon` e `picles` na peça;
- fotografia grande do lanche;
- WhatsApp `(67) 9 9204-6721`;
- Instagram `@carrochefe_cg`;
- QR Code no canto inferior direito.

A landing mantém a mesma direção visual geral — preto/obsidiana, creme e dourado — sem copiar o banner como layout de tela. O site precisa cumprir uma função diferente: transformar o interesse gerado pela peça em cadastro rápido e mensurável.

O PDF recebido nesta conversa é referência de conteúdo/identidade; o binário não foi adicionado ao repositório nesta alteração.

## 3. Decisão de copy

Antes desta confirmação, a landing usava a promessa genérica de “benefício especial de inauguração”, porque o formato do benefício ainda não estava aprovado.

Com a confirmação do proprietário, acessos identificados simultaneamente por:

```text
cc_qr=QR-001
cc_campaign=banner
```

passam a receber copy específica:

> acesso à cupons e promoções exclusivas

A comunicação permanece deliberadamente sem:

- percentual de desconto;
- valor de cupom;
- produto/brinde específico;
- quantidade limitada;
- contagem regressiva;
- data de validade não aprovada.

Assim, a promessa exibida é exatamente a autorizada, sem transformar “VIP” em uma oferta financeira inventada.

## 4. Comportamento implementado no frontend

Foi adicionada identificação específica da campanha no frontend:

```text
QR-001 + banner → campanha VIP confirmada
```

Efeitos:

- hero comunica o acesso à cupons e promoções exclusivas;
- formulário explica que o WhatsApp será usado para novidades, promoções, cupons e benefícios;
- consentimento de comunicação menciona essas categorias;
- bloco “O que você recebe” mostra “Acesso à cupons e promoções exclusivas”;
- `signup_success` de um **novo cadastro** originado dessa campanha confirma o acesso à cupons e promoções exclusivas.

### Duplicatas

A API mantém deduplicação por telefone e preserva first-touch.

Por isso, quando o servidor responde `duplicate`, a interface **não confirma que aquele lead pertence originalmente ao QR-001**. Ela apenas informa que o WhatsApp já está na Lista dos Primeiros.

Essa decisão evita sobrescrever atribuição histórica ou conceder semanticamente uma origem que o sistema não verificou.

## 5. Persistência esperada

Para um novo cadastro realizado na sessão aberta pelo QR oficial:

```text
ccQr       = QR-001
ccCampaign = banner
ccVariant  = null
```

O telefone permanece normalizado e deduplicado no servidor.

A atribuição continua sendo preservada mesmo se analytics não essencial for recusado.

## 6. Analytics

Uma sessão com analytics aceito pode registrar:

```text
qr_scan
→ landing_view
→ signup_cta_click
→ form_start
→ signup_submit
→ signup_success
→ reward_view
```

Os eventos recebem `ccQr=QR-001` e `ccCampaign=banner`, mas nunca telefone ou nome.

Não foi criado um evento “vip” separado no P0 porque o benefício pode ser inferido de forma determinística pela campanha (`QR-001` + `banner`). Isso evita duplicar semântica e reduz risco de inconsistência.

## 7. Homologação atualizada

### Confirmado pelo proprietário

- [x] Android;
- [x] iPhone;
- [x] rede móvel;
- [x] identificador do QR;
- [x] campanha;
- [x] promessa de acesso à cupons e promoções exclusivas.

### Ainda depende de operação/deploy

- [ ] confirmar que a versão publicada em `carrochefe.com` é o commit aprovado;
- [ ] concluir um cadastro real pelo QR e conferir `ccQr=QR-001` / `ccCampaign=banner` no banco de produção;
- [ ] validar HTTPS/certificado no ambiente definitivo após autorização de deploy;
- [ ] definir e documentar as regras concretas de cada promoção/cupom antes de distribuí-los.

## 8. Impacto na preparação para VPS

Nenhuma mudança de arquitetura foi necessária.

O QR aponta diretamente para o domínio final e utiliza parâmetros relativos à aplicação, então o mesmo frontend/backend funciona em localhost e na VPS sem hardcode de host público.

Em produção:

```text
Internet
→ https://carrochefe.com/?cc_qr=QR-001&cc_campaign=banner
→ Nginx/TLS
→ Fastify em 127.0.0.1
→ React + /api/v1/public/prelaunch/*
→ SQLite persistente P0
```

A Central Operacional e as APIs internas continuam bloqueadas no proxy público até a autenticação de produção ser implementada.
