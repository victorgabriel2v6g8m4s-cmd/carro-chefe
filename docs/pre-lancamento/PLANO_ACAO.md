# Plano de ação — landing de pré-inauguração

## 1. Problema

O site atual foi construído como apresentação institucional e já contém chamadas como “Fazer pedido” e “Quero pedir”. Para o tráfego do banner de pré-inauguração, isso cria uma promessa operacional prematura e dispersa a conversão.

A entrega rápida deve converter a entrada principal em uma experiência focada em uma única ação: **entrar na Lista dos Primeiros**.

O visitante vindo do QR provavelmente estará no celular, em rede móvel e com atenção dividida. A página precisa funcionar como continuação imediata da promessa do banner: reconhecer a marca, entender o que está chegando, perceber um benefício concreto e se cadastrar sem precisar navegar para descobrir a próxima etapa.

As decisões comportamentais e de interface deste plano são detalhadas e referenciadas em [`PSICOLOGIA_UI.md`](./PSICOLOGIA_UI.md).

## 2. Estratégia de conversão

A arquitetura deve reduzir quatro atritos em sequência:

```text
incerteza → esforço cognitivo → esforço de formulário → distância até a recompensa
```

Para isso:

1. **clareza antes de curiosidade:** a pessoa entende o produto e a pré-inauguração antes de receber qualquer teaser;
2. **uma ação dominante:** o hero não compete com pedido, cardápio, Instagram e WhatsApp direto;
3. **mínimo de dados necessários:** WhatsApp é o único dado pessoal obrigatório;
4. **recompensa imediata:** a confirmação entrega sensação real de conclusão e conteúdo/teaser quando houver ativo aprovado;
5. **recompensa futura garantida:** benefício de inauguração somente quando puder ser honrado;
6. **prova social/escassez somente verdadeiras:** entram depois, se houver dados e restrição operacional reais;
7. **consentimento simétrico:** nenhuma conversão depende de analytics e nenhuma escolha é pré-marcada ou escondida.

## 3. Proposta de experiência

### 3.1. Primeira viewport mobile

A primeira tela deve conter, em ordem visual:

```text
[logo compacto]
Pré-inauguração · Campo Grande

O Carro Chefe está chegando.

Brasa, espeto e baguete em uma experiência feita
para chamar atenção antes mesmo da primeira mordida.

Entre para a Lista dos Primeiros e receba a abertura
em primeira mão + benefício especial.

WhatsApp
[________________________]
[ ] Quero receber novidades da inauguração e promoções...

[ ENTRAR NA LISTA DOS PRIMEIROS ]

Novidades e promoções pelo WhatsApp. Saia quando quiser.
Privacidade
```

Não reduzir tipografia ou espaçamento de forma agressiva apenas para “caber tudo”. Se necessário, o final do formulário pode continuar abaixo da dobra, desde que a intenção da página e o início da ação estejam claros.

### 3.2. Hero

Mensagem-base:

> **Pré-inauguração · Campo Grande**
>
> # O Carro Chefe está chegando.
>
> Brasa, espeto e baguete em uma experiência feita para chamar atenção antes mesmo da primeira mordida.
>
> Entre para a **Lista dos Primeiros** e receba a abertura em primeira mão e um benefício especial de inauguração.

CTA principal:

> **Entrar na Lista dos Primeiros**

Microcopy de confiança:

> **Novidades da inauguração e promoções pelo WhatsApp. Saia quando quiser.**

A assinatura **“Sabor que lidera”** permanece como elemento institucional secundário.

Não usar hero genérico do tipo “algo incrível está chegando”. A curiosidade deve nascer de uma lacuna de informação específica, não da ausência de informação.

### 3.3. Formulário

#### P0 recomendado

Campos/controles:

- WhatsApp: obrigatório;
- consentimento de comunicação: escolha explícita, não pré-marcada.

O **primeiro nome permanece opcional**, mas deve preferencialmente ser solicitado após a confirmação, por progressive disclosure:

> **Como podemos te chamar? (opcional)**

Não bloquear a entrada na lista se o usuário ignorar esse campo.

Evitar na primeira captura:

- CPF;
- endereço;
- aniversário;
- e-mail obrigatório;
- múltiplos canais obrigatórios;
- preferências extensas.

#### Regras de UI

- formulário inline; não abrir modal obrigatório;
- layout de uma coluna;
- label persistente acima do campo;
- teclado apropriado para telefone;
- aceitar colagem e formatos comuns;
- normalizar número no sistema, não exigir formatação perfeita do usuário;
- preservar valor após erro;
- validação depois de informação suficiente ou ao sair do campo, nunca “acusando erro” no primeiro foco;
- mensagem de erro deve explicar correção;
- feedback positivo discreto após valor válido;
- CTA deve comunicar a ação, não usar “Enviar”.

Exemplo de erro:

> **Confira o número.** Digite DDD + telefone, por exemplo `(67) 99204-6721`.

### 3.4. Estado de envio

Após o toque:

- manter os dados visíveis;
- indicar processamento no próprio CTA;
- impedir duplo envio acidental;
- não disparar `signup_success` antes da persistência real;
- evitar layout shift relevante.

### 3.5. Estado de sucesso

Não terminar em “Obrigado” genérico.

Estado recomendado:

> # Você está dentro.
>
> Seu lugar na Lista dos Primeiros está confirmado.
>
> **1. Cadastro confirmado ✓**
>
> **2. A abertura será anunciada pelo WhatsApp**
>
> **3. Seu benefício chegará próximo à inauguração**

A interface comunica progresso real: o primeiro passo só aparece concluído depois que a inscrição realmente foi persistida.

Em seguida, mostrar uma recompensa perceptível imediata:

- teaser real de produto;
- detalhe da parrilla;
- bastidor aprovado;
- ou, na ausência de mídia real, uma composição de marca com informação de bastidor verdadeira.

Depois:

> **Quer acompanhar os bastidores?**
>
> **Seguir @carrochefe_cg**

O Instagram é secundário e nunca requisito de validação do cadastro.

### 3.6. Cadastro duplicado

Não tratar como falha:

> **Você já está na Lista dos Primeiros.**
>
> Esse WhatsApp já está confirmado. Quando houver novidade da inauguração, você continua dentro.

Não revelar data da inscrição anterior ou outros metadados pessoais.

### 3.7. Falha de rede/API

Mensagem:

> **Não conseguimos confirmar agora.**
>
> Seu cadastro ainda não foi concluído. Confira a conexão e tente novamente.

CTA:

> **Tentar novamente**

Preservar o telefone digitado.

## 4. Estratégias psicológicas aprovadas

A experiência usa mecanismos legítimos de motivação; não usa dark patterns.

### Curiosidade / information gap

Mostrar o bastante para a pessoa entender **brasa + espeto + baguete + pré-inauguração**, mantendo detalhes futuros como data confirmada, benefício final aprovado e revelações da operação como lacunas legítimas.

### Imediatismo

O cadastro não termina em espera abstrata. A confirmação entrega status imediato e, quando possível, conteúdo real desbloqueado.

### Progresso percebido

O pós-cadastro mostra:

```text
cadastro ✓ → abertura → benefício
```

Sem barra percentual fictícia.

### Fluência de processamento

A identidade rústica deve criar atmosfera, não complexidade. Fundo escuro, espaço livre, tipografia legível, ouro usado como hierarquia de ação e ornamentação concentrada em detalhes.

### Redução de alternativas

Antes do cadastro há uma única ação visual dominante. Links sociais e conteúdo não recebem o mesmo peso do CTA.

### Desejo por cue visual de alimento

Quando houver fotografia/vídeo real aprovado, priorizar produto e brasa como estímulo sensorial e evidência do que será vendido.

Não usar imagem artificial como substituto silencioso do produto real.

### Prova social

Ativar apenas depois de haver número real, deduplicado e auditável de inscritos. Não exibir número baixo apenas porque existe; uma norma fraca pode ter efeito contrário.

### Escassez

Não usar no P0. Só adicionar quando houver limite verdadeiro de prazo, capacidade, estoque ou soft opening.

### Consentimento

O poder de defaults não deve ser usado contra o visitante. Marketing e analytics não vêm pré-marcados; recusa de analytics precisa ser simples e visível.

## 5. Arquitetura de conteúdo

### Antes do cadastro

```text
header mínimo
→ hero + formulário inline
→ teaser real (se aprovado)
→ proposta curta da marca
→ bastidores/Instagram secundário
→ repetição do CTA/form para não cadastrados
→ rodapé / privacidade / preferências
```

### Depois do cadastro

```text
header mínimo
→ confirmação + progresso
→ teaser/recompensa imediata
→ Instagram secundário
→ proposta da marca
→ rodapé
```

Repetições do formulário devem ser substituídas pelo estado “você já está dentro” para o usuário recém-confirmado, quando tecnicamente viável sem criar identificação indevida em analytics.

O cardápio completo não deve ser protagonista enquanto a operação ainda não está aberta.

## 6. Identidade visual aplicada à conversão

Reaproveitar a identidade já documentada:

- fundo obsidiana/preto como superfície dominante;
- madeira escura em textura sutil;
- bronze para bordas/ornamentos secundários;
- ouro/ouro claro para ação e foco;
- pergaminho para texto principal;
- brasa para calor e pequenos destaques;
- jipe com chapéu de chef;
- tipografia display somente em títulos especiais;
- sans funcional em interface e campos.

### Regra de hierarquia

**O ouro é ação, não decoração em todo lugar.**

Se CTA, bordas, títulos, ícones e ornamentos tiverem o mesmo destaque dourado, a hierarquia desaparece.

### Mídia

Prioridade:

1. produto real aprovado;
2. parrilla/brasa real;
3. bastidor real;
4. identidade visual sem foto de produto.

Evitar aparência genérica de startup e evitar comida gerada artificialmente apresentada como produto real.

## 7. Movimento e microinterações

P0:

- press state claro no CTA;
- loading no envio;
- transição curta de sucesso;
- foco visível;
- respeito a `prefers-reduced-motion`.

P1 opcional:

- brasa sutil;
- pequenos movimentos atmosféricos que não concorram com leitura.

Proibido:

- intro obrigatória de logo;
- parallax pesado;
- autoplay de vídeo grande antes do formulário;
- partículas ao redor do CTA;
- animação que atrase interação.

## 8. Mobile, acessibilidade e performance

### Touch

Meta de projeto para ações principais:

- hit area generosa, aproximadamente 44–48 px CSS ou maior quando possível;
- bom espaço entre checkbox, CTA, links e preferências;
- sem alvos minúsculos amontoados.

### Acessibilidade

- labels reais;
- foco visível;
- navegação por teclado;
- contraste AA;
- erro associado ao campo;
- nada importante transmitido só por cor;
- redução de movimento respeitada.

### Performance

Core Web Vitals entram como critério de qualidade. Metas atuais de referência no percentil 75:

```text
LCP ≤ 2,5 s
INP ≤ 200 ms
CLS ≤ 0,1
```

P0 deve:

- não depender de vídeo para hero/form;
- não carregar imagem enorme antes da ação;
- reservar dimensões de mídia;
- não bloquear UI com analytics;
- evitar fonte display pesada bloqueando legibilidade;
- funcionar em rede móvel comum.

## 9. Consentimento e dark patterns

### Comunicação

Checkbox desmarcado:

> **Quero receber pelo WhatsApp novidades da inauguração e promoções do Carro Chefe. Posso cancelar quando quiser.**

### Analytics

Mensagem curta:

> **Podemos usar analytics para entender como esta página é usada?**
>
> Isso nos ajuda a melhorar a experiência. O cadastro funciona mesmo se você recusar.

Ações:

- `Aceitar analytics`;
- `Recusar analytics`.

As duas precisam ser legíveis e acessíveis sem cadeia artificial de cliques.

### Proibições

- checkbox pré-marcado;
- botão de recusa escondido;
- confirmshaming;
- falso contador;
- falsa urgência;
- prova social inventada;
- condição escondida;
- follow obrigatório;
- popup insistente após recusa;
- cancelamento deliberadamente difícil.

## 10. Fases de entrega

### P0 — antes do banner receber tráfego

Obrigatório:

1. entrada coerente com pré-inauguração;
2. uma única ação visual dominante;
3. formulário inline, mobile first e de uma coluna;
4. WhatsApp como único dado pessoal obrigatório;
5. consentimento de comunicação explícito e não pré-marcado;
6. persistência do lead;
7. deduplicação básica por telefone normalizado;
8. estados de loading, erro, duplicata e sucesso;
9. recompensa imediata de confirmação/progresso;
10. QR identificável;
11. política de privacidade compatível com a coleta;
12. preferência de analytics simétrica;
13. eventos mínimos do funil;
14. teste em celular e rede móvel;
15. Instagram e WhatsApp corretos;
16. ausência de chamada de pedido indisponível;
17. ausência de dark patterns;
18. CTA e formulário disponíveis sem depender de mídia pesada.

### P1 — qualidade e otimização

1. inserir foto/vídeo real aprovado e medir impacto;
2. dashboard consolidado na Central Operacional;
3. análise por seção da landing;
4. heatmaps e session replay com consentimento;
5. comparação por variante de QR/banner;
6. prevenção de abuso mais robusta;
7. código individual de benefício;
8. prova social real, se houver volume suficiente;
9. experimentos A/B controlados;
10. RUM/Core Web Vitals segmentados por campanha;
11. testar nome opcional no formulário versus pós-cadastro.

### P2 — arquitetura ideal

1. redirector first-party `carrochefe.com/r/<id>`;
2. registro central de QRs e peças;
3. integração da origem com pedido pago no ERP;
4. atribuição até margem;
5. coortes de recompra 30/60/90 dias;
6. camada analítica consolidada/warehouse;
7. estados de campanha `PRE_LAUNCH`, `OPENING` e `LIVE`.

## 11. Backlog inicial de experimentos

Os experimentos e racional estão detalhados em `PSICOLOGIA_UI.md`.

Prioridade sugerida após estabilizar P0:

1. hero atual vs. headline orientada a “ser um dos primeiros”;
2. composição de marca vs. foto real aprovada;
3. CTA “Entrar na Lista dos Primeiros” vs. CTA orientado ao benefício, somente quando benefício estiver aprovado;
4. nome pós-cadastro vs. nome visível no formulário;
5. prova social verdadeira vs. ausência de prova social, somente com volume suficiente;
6. confirmação textual vs. confirmação + teaser real.

KPI primário para testes de aquisição:

```text
signup_success / attributed_unique_session
```

Nunca otimizar apenas `signup_cta_click`.

## 12. Critérios GO / NO-GO

### GO

O banner pode apontar tráfego para a landing quando:

- QR abre em HTTPS;
- destino funciona em rede móvel;
- campanha é identificável;
- primeira viewport deixa clara a pré-inauguração e a ação principal;
- formulário é utilizável em mobile;
- cadastro persiste de verdade;
- telefone duplicado não gera múltiplos leads desnecessários;
- confirmação aparece após sucesso;
- recusar analytics não impede cadastro;
- consentimento de comunicação não vem pré-marcado;
- política de privacidade está acessível;
- nenhum PII é enviado a plataformas analíticas;
- Instagram e WhatsApp estão corretos;
- não há data de abertura inventada;
- não há CTA para pedido indisponível;
- não há falsa escassez/prova social;
- não há imagem artificial apresentada como produto real;
- fluxo completo foi testado a partir do QR físico.

### NO-GO

Bloquear lançamento se:

- o QR não puder ser atribuído;
- o formulário falhar silenciosamente;
- a página coletar telefone sem transparência adequada;
- analytics registrar telefone/nome;
- o usuário for obrigado a aceitar analytics para se cadastrar;
- consentimento vier pré-selecionado;
- houver promessa de benefício que não possa ser honrada;
- CTA/form depender de uma experiência pesada que falhe em rede móvel;
- existir qualquer dark pattern deliberado para inflar conversão.

## 13. Métrica principal

A métrica nº 1 do banner é:

```text
Taxa QR → cadastro válido
= cadastros válidos atribuídos / sessões únicas atribuídas ao QR
```

Métricas de diagnóstico:

```text
landing_view → form_start
form_start → signup_submit
signup_submit → signup_success
signup_success → reward_view
reward_view → instagram_click
```

Depois da inauguração, o KPI deve evoluir para:

```text
QR → cadastro → pedido pago → margem → recompra
```

Page views e cliques isolados não devem ser usados como indicador principal de sucesso.

## 14. Fontes

A fundamentação completa, links e referências de psicologia, UX, ANPD, acessibilidade e performance estão em [`PSICOLOGIA_UI.md`](./PSICOLOGIA_UI.md). O AG-DEV não precisa reinterpretar a literatura: deve tratar os critérios P0 deste documento e do handoff como requisitos, registrando qualquer conflito técnico para decisão da Gestão.
