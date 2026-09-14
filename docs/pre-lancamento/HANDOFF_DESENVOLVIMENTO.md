# Handoff para desenvolvimento — pré-lançamento do site

## 1. Responsável pela implementação

**AG-DEV**.

Este documento descreve o que deve ser entregue e validado. Não prescreve framework novo, estrutura interna de código ou decisões de implementação que pertencem ao agente de Development.

A pesquisa comportamental e de UI que fundamenta este handoff está em [`PSICOLOGIA_UI.md`](./PSICOLOGIA_UI.md). O agente não precisa refazer a pesquisa; deve implementar os requisitos P0 e registrar qualquer conflito técnico.

## 2. Objetivo da entrega

Receber tráfego do banner físico de pré-inauguração em `carrochefe.com`, converter visitantes em inscritos consentidos na **Lista dos Primeiros** e registrar dados suficientes para avaliar a campanha sem coletar PII desnecessária em plataformas analíticas.

A experiência deve minimizar quatro atritos em sequência:

```text
incerteza → esforço cognitivo → esforço de formulário → distância até a recompensa
```

## 3. Escopo P0

### 3.1. Experiência pública

- adaptar a entrada principal para estado de pré-inauguração;
- manter identidade visual do Carro Chefe sem excesso de ornamentação funcional;
- remover ou despriorizar chamadas de pedido ainda indisponíveis;
- manter **uma única ação visual dominante** antes do cadastro: entrar na Lista dos Primeiros;
- exibir intenção/CTA/formulário no primeiro fluxo de viewport mobile;
- usar formulário inline; não exigir modal ou bottom sheet para iniciar cadastro;
- layout do formulário em uma coluna;
- WhatsApp como único dado pessoal obrigatório;
- primeiro nome opcional e preferencialmente solicitado após `signup_success` por progressive disclosure;
- consentimento de comunicação explícito, não pré-marcado;
- confirmação clara após persistência do cadastro;
- mostrar progresso real pós-cadastro (`cadastro ✓ → abertura → benefício`), sem percentuais artificiais;
- oferecer recompensa imediata perceptível no sucesso: confirmação + teaser real aprovado quando disponível;
- ação secundária para Instagram somente após ou abaixo da conversão principal;
- política de privacidade acessível;
- não usar prova social ou escassez no P0 sem dado/restrição real.

### 3.2. Copy mínima esperada

O AG-DEV pode ajustar quebra de linha e pequenos detalhes de UI, mas não deve mudar a promessa sem Marketing/Gestão.

Hero base:

> **Pré-inauguração · Campo Grande**
>
> # O Carro Chefe está chegando.
>
> Brasa, espeto e baguete em uma experiência feita para chamar atenção antes mesmo da primeira mordida.
>
> Entre para a **Lista dos Primeiros** e receba a abertura em primeira mão e um benefício especial de inauguração.

CTA:

> **Entrar na Lista dos Primeiros**

Microcopy:

> **Novidades da inauguração e promoções pelo WhatsApp. Saia quando quiser.**

Consentimento:

> **Quero receber pelo WhatsApp novidades da inauguração e promoções do Carro Chefe. Posso cancelar quando quiser.**

### 3.3. Persistência

O sistema precisa suportar, conceitualmente:

- telefone normalizado;
- deduplicação;
- nome opcional;
- timestamp do cadastro;
- timestamp e versão do consentimento;
- versão da política;
- origem `cc_qr`, `cc_campaign`, `cc_variant`;
- status do lead.

Não armazenar dados de pagamento nesta camada.

### 3.4. Atribuição

Ler e preservar:

- `cc_qr`;
- `cc_campaign`;
- `cc_variant`.

Garantir que a origem inicial possa ser associada ao cadastro final.

### 3.5. Analytics

Instrumentar, no mínimo:

- `qr_scan`;
- `landing_view`;
- `signup_cta_click`;
- `form_start`;
- `signup_submit`;
- `signup_success`;
- `signup_duplicate`;
- `signup_error`;
- `reward_view`;
- `instagram_click`;
- `whatsapp_click`;
- `privacy_open`.

Nenhum evento pode conter nome ou telefone.

Preparar eventos para receber, sem PII, parâmetros de experimento/UI quando P1 começar, como:

- `experiment`;
- `cta_variant`;
- `form_position`;
- `has_product_media`.

### 3.6. Preferência de analytics

- visitante pode aceitar ou recusar analytics não essenciais;
- rejeição não bloqueia cadastro;
- preferência é respeitada antes de disparar ferramentas não essenciais conforme arquitetura adotada;
- formulário e conteúdo sensível permanecem mascarados em ferramentas de replay;
- aceitar e recusar precisam ser ações claramente acessíveis, sem recusa escondida.

Mensagem-base:

> **Podemos usar analytics para entender como esta página é usada?**
>
> Isso nos ajuda a melhorar a experiência. O cadastro funciona mesmo se você recusar.

## 4. Requisitos específicos de formulário

### WhatsApp

- label persistente, não apenas placeholder;
- teclado/input apropriado para telefone;
- aceitar colagem;
- aceitar formatos comuns e normalizar internamente;
- não exigir símbolos específicos do usuário;
- preservar valor em erro de rede ou validação;
- não enviar valor digitado para analytics/logs de frontend desnecessários.

Entradas equivalentes devem poder ser normalizadas, por exemplo:

```text
67992046721
(67) 99204-6721
+55 67 99204-6721
```

### Validação

- não apresentar erro no primeiro foco;
- validar quando houver informação suficiente ou ao sair do campo;
- se inválido, mensagem explica como corrigir;
- ao corrigir, remover erro assim que o valor se tornar válido;
- feedback positivo pode ser usado de forma discreta.

Mensagem recomendada:

> **Confira o número.** Digite DDD + telefone, por exemplo `(67) 99204-6721`.

### CTA / envio

- rótulo descritivo, não “Enviar”;
- estado de loading no mesmo contexto;
- impedir envio duplo acidental;
- `signup_success` apenas depois de persistência confirmada;
- evitar layout shift relevante durante loading/sucesso.

## 5. Estados de interface obrigatórios

O fluxo deve prever:

### Inicial

Hero + formulário vazio + consentimento desmarcado.

### Campo inválido

Erro acionável e preservação do input.

### Envio em andamento

CTA indica processamento e evita clique repetido.

### Sucesso

Mensagem:

> # Você está dentro.
>
> Seu lugar na Lista dos Primeiros está confirmado.
>
> **1. Cadastro confirmado ✓**
>
> **2. A abertura será anunciada pelo WhatsApp**
>
> **3. Seu benefício chegará próximo à inauguração**

Depois, quando houver ativo real aprovado, mostrar teaser e então Instagram.

### Duplicata

> **Você já está na Lista dos Primeiros.**
>
> Esse WhatsApp já está confirmado. Quando houver novidade da inauguração, você continua dentro.

Não expor quando a inscrição anterior ocorreu.

### Falha de rede/API

> **Não conseguimos confirmar agora.**
>
> Seu cadastro ainda não foi concluído. Confira a conexão e tente novamente.

CTA: **Tentar novamente**.

Preservar telefone.

### Analytics aceito / recusado

Ambos deixam o cadastro plenamente funcional.

## 6. Fora do escopo P0

Não bloquear a entrega por:

- dashboard completo dentro do C.O.;
- BigQuery/warehouse;
- experimentação A/B automatizada;
- integração completa com ERP;
- cálculo de margem atribuída;
- coortes 30/60/90 dias;
- redirector first-party definitivo;
- automação de CRM avançada;
- contador de prova social;
- escassez/contagem regressiva;
- vídeo pesado ou animação avançada;
- nome obrigatório ou enriquecimento extenso de lead.

Esses itens pertencem a P1/P2 quando aplicável.

## 7. Dependências externas

O AG-DEV não deve inventar respostas para as seguintes pendências.

### Benefício de inauguração

Marketing recomenda comunicar **“benefício/cupom especial de inauguração”**.

Valor, percentual, item gratuito ou regra de resgate dependem de validação de Finanças/Operações.

Não trocar a copy por promessa específica antes dessa decisão.

### Texto jurídico definitivo

A página de privacidade precisa refletir a coleta real, mas o texto final deve ser revisado juridicamente.

### Ativos fotográficos

Só usar fotografia/vídeo real aprovado. Se não houver, usar composição de identidade visual existente; não gerar comida artificial como substituto silencioso.

O P0 não deve ser bloqueado pela falta de foto.

### Identificador do banner

Antes da impressão/publicação, confirmar o `cc_qr` definitivo usado na peça.

Referência provisória deste plano:

```text
cc_qr=QR-20260911-AV01
cc_campaign=pre_inauguracao
cc_variant=banner_avenida_a
```

## 8. Requisitos de qualidade

### 8.1. Mobile first

O tráfego principal virá de câmera/QR em celular.

Validar:

- largura pequena;
- teclado de telefone apropriado;
- layout de uma coluna;
- CTA facilmente tocável;
- ações principais com hit area generosa (~44–48 px CSS ou maior quando possível);
- espaçamento suficiente entre checkbox, links e CTA;
- carregamento em rede celular;
- ausência de scroll horizontal;
- ausência de layout shift grave;
- legibilidade em ambiente externo/noturno.

### 8.2. Acessibilidade

- labels reais de formulário;
- foco visível;
- navegação por teclado;
- contraste AA;
- mensagens de erro associadas aos campos;
- nada importante transmitido apenas por cor;
- respeito a `prefers-reduced-motion`;
- targets compatíveis com WCAG 2.2 e com meta touch do projeto.

### 8.3. Performance

Não permitir que animações, vídeo, fontes ou ativos pesados impeçam o visitante de ver/interagir com o CTA rapidamente.

A landing deve priorizar conteúdo principal e formulário.

Metas de referência no percentil 75:

```text
LCP ≤ 2,5 s
INP ≤ 200 ms
CLS ≤ 0,1
```

Não é necessário bloquear deploy por dados de campo inexistentes no primeiro dia, mas a implementação deve ser projetada para não introduzir regressões óbvias e deve medir quando houver volume.

### 8.4. Hierarquia visual

- um CTA primário de maior saliência;
- Instagram/WhatsApp direto como secundários;
- ouro claro reservado principalmente para ação/foco;
- ornamento nunca deve parecer controle;
- textura não pode prejudicar texto pequeno;
- sem dois CTAs grandes concorrentes no hero.

## 9. Movimento e mídia

P0 permitido:

- press state;
- loading;
- transição curta de sucesso;
- efeitos sutis que não bloqueiem renderização.

Evitar:

- intro obrigatória da logo;
- parallax pesado;
- autoplay de vídeo antes do formulário;
- partículas no CTA;
- animação infinita que roube atenção.

Quando mídia real for adicionada, reservar dimensões para evitar CLS e otimizar peso/formato.

## 10. Segurança e abuso

P0:

- validação server-side ou equivalente da persistência;
- rate limiting compatível com a infraestrutura existente;
- honeypot ou mecanismo simples equivalente, se apropriado;
- normalização de telefone;
- nenhuma credencial no frontend/repositório.

P1 pode adicionar proteção adaptativa/Turnstile caso abuso real justifique.

## 11. Dark patterns proibidos

O AG-DEV deve rejeitar requisitos posteriores que introduzam, sem nova decisão formal:

- checkbox de marketing/analytics pré-marcado;
- recusa deliberadamente apagada ou escondida;
- confirmshaming;
- urgência falsa;
- escassez falsa;
- contador fake;
- prova social inventada;
- condição escondida;
- seguir Instagram como requisito de cadastro;
- popup que reaparece imediatamente após recusa;
- cancelamento deliberadamente difícil;
- benefício sem regra real de entrega.

Se Marketing pedir qualquer um desses padrões, escalar à Gestão em vez de implementar silenciosamente.

## 12. Critérios de aceite funcionais

### Cadastro

- telefone válido é persistido;
- nome não é obrigatório para `signup_success`;
- cadastro duplicado não cria inflação artificial;
- `signup_success` só dispara após confirmação de persistência;
- falha de cadastro produz estado de erro compreensível;
- origem do QR é preservada;
- input não é perdido em erro recuperável.

### UI/conversão

- existe apenas uma ação visual dominante antes do cadastro;
- formulário é utilizável inline e em uma coluna;
- CTA não usa rótulo genérico;
- consentimento não vem marcado;
- validação não acusa erro prematuramente;
- sucesso comunica progresso real;
- Instagram não compete visualmente com o cadastro no hero;
- não existe modal obrigatório para preencher telefone.

### Privacidade

- página de privacidade está acessível;
- consentimento de comunicação é explícito;
- analytics pode ser recusado com ação clara;
- recusar analytics não impede cadastro;
- nenhum PII chega aos eventos analíticos;
- replay/heatmap não captura conteúdo de input legível.

### QR

- URL funciona a partir de QR físico;
- parâmetros `cc_*` são lidos;
- `qr_scan` é distinguível de visita não atribuída;
- teste concluído em Android e iPhone quando disponíveis.

### Conteúdo

- não existe data de inauguração inventada;
- não existe escassez falsa;
- não existe prova social inventada;
- benefício comunicado pode ser honrado;
- não existe CTA principal prometendo pedido antes da abertura;
- imagem de produto, quando existir, corresponde a ativo real aprovado.

## 13. Critérios de aceite de analytics

O agente deve conseguir demonstrar uma sessão de teste contendo a sequência:

```text
qr_scan
→ landing_view
→ signup_cta_click (quando houver clique/âncora explícito)
→ form_start
→ signup_submit
→ signup_success
→ reward_view
```

Se o formulário estiver imediatamente disponível e o usuário iniciar direto pelo campo, `form_start` não depende de `signup_cta_click`.

Também demonstrar uma sessão recusando analytics em que o cadastro continue funcional.

Testar:

- erro de cadastro;
- duplicata;
- clique Instagram;
- clique WhatsApp;
- abertura de privacidade.

## 14. Evidências esperadas no PR de implementação

O PR futuro do AG-DEV deve informar, no mínimo:

- rotas/arquivos afetados;
- solução de persistência escolhida;
- solução de analytics escolhida;
- como consentimento é respeitado;
- como `cc_*` é preservado;
- screenshots mobile e desktop;
- screenshot dos estados inicial, erro, loading, sucesso e duplicata;
- evidência do fluxo de cadastro;
- evidência de evento sem PII;
- evidência de recusa de analytics com cadastro funcional;
- teste do QR físico;
- resultado de acessibilidade proporcional ao risco;
- dados de performance/lab disponíveis;
- comandos de testes executados;
- pendências P1/P2 conscientemente adiadas.

## 15. Ordem sugerida de implementação

1. estado de pré-inauguração e hierarquia de copy;
2. formulário inline de WhatsApp + consentimento;
3. persistência e normalização;
4. deduplicação e estados de erro/loading/sucesso;
5. progressive disclosure do nome opcional;
6. política de privacidade compatível com a coleta;
7. leitura/persistência dos parâmetros `cc_*`;
8. eventos first-party do funil;
9. GA4/Clarity conforme consentimento;
10. QA mobile/acessibilidade/performance;
11. teste QR físico ponta a ponta;
12. revisão final de PII em URLs/logs/analytics;
13. revisão explícita contra a lista de dark patterns.

## 16. Referências internas obrigatórias

Antes de programar, ler:

- `AGENTS.md`;
- `docs/ARQUITETURA.md`;
- `docs/MARCA.md`;
- `docs/MARKETING_MIDIAS.md`;
- `docs/pre-lancamento/PLANO_ACAO.md`;
- `docs/pre-lancamento/PSICOLOGIA_UI.md`;
- `docs/pre-lancamento/ANALYTICS_PRIVACIDADE.md`;
- `docs/pre-lancamento/QR_ATRIBUICAO.md`;
- `apps/qr_manipulator/TRACKING.md` na branch `qr-app`.

Em caso de conflito, não inventar decisão: registrar a divergência e escalar à Gestão/proprietário.
