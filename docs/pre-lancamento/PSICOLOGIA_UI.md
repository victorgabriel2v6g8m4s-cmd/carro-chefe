# Psicologia comportamental e UI — landing de pré-inauguração

## 1. Objetivo

Este documento transforma evidências de psicologia comportamental, pesquisa de UX e acessibilidade em requisitos de experiência para o fluxo:

```text
banner na avenida → QR → landing mobile → cadastro → confirmação → relacionamento → inauguração
```

O objetivo não é “forçar” cadastro. É aumentar a probabilidade de uma pessoa interessada entender rapidamente a proposta, perceber valor real, concluir a ação com baixo esforço e confiar no Carro Chefe.

A conversão só é considerada saudável quando preserva autonomia, transparência e capacidade de recusa. Padrões enganosos, falsa urgência, consentimento manipulado e prova social inventada são incompatíveis com este plano.

---

## 2. Contexto psicológico da visita

Quem chega pelo QR do banner não se comporta como alguém que procurou deliberadamente a marca no Google.

A sequência provável é:

1. a pessoa percebe o banner em movimento ou durante uma passagem curta;
2. a mensagem desperta curiosidade suficiente para escanear;
3. ela abre o site no celular, muitas vezes em rede móvel e em ambiente com distrações;
4. decide em poucos momentos se vale a pena continuar;
5. se entender rapidamente o benefício e confiar na proposta, pode fornecer o WhatsApp;
6. qualquer ambiguidade, lentidão ou excesso de escolhas compete com a motivação originalmente gerada pelo banner.

Por isso, a landing deve trabalhar com **continuidade de intenção**: o site precisa parecer a continuação natural da promessa vista na rua, e não uma homepage genérica que obriga o visitante a descobrir sozinho o que fazer.

---

## 3. Princípios de evidência adotados

### 3.1. Lacuna de informação: curiosidade com resolução prometida

Loewenstein descreve curiosidade como uma resposta à percepção de uma lacuna entre o que a pessoa sabe e o que deseja saber. A aplicação correta não é esconder tudo; é entregar contexto suficiente para tornar uma informação futura desejável.[^1]

#### Aplicação no Carro Chefe

A landing deve responder imediatamente:

- quem é a marca;
- o que está chegando;
- em qual cidade;
- por que vale acompanhar;
- o que a pessoa recebe ao entrar na lista.

E deve deixar uma lacuna legítima:

- quando exatamente a inauguração será confirmada;
- qual será o benefício final aprovado;
- bastidores e revelações do produto que serão publicados progressivamente.

#### UI recomendada

Hero:

> **Pré-inauguração · Campo Grande**
>
> # O Carro Chefe está chegando.
>
> Brasa, espeto e baguete em uma experiência feita para chamar atenção antes mesmo da primeira mordida.
>
> Entre para a **Lista dos Primeiros** para receber a abertura em primeira mão e um benefício especial de inauguração.

Não usar frases vagas como “algo incrível está chegando”. Curiosidade sem informação suficiente reduz confiança e informação scent.

#### Métrica

- `landing_view → form_start`;
- alcance do teaser;
- saída antes do formulário.

---

### 3.2. Recompensa imediata + recompensa futura

Woolley e Fishbach encontraram que recompensas mais imediatas podem aumentar a motivação em comparação com recompensas mais atrasadas, mesmo quando o valor final não muda.[^2]

No fluxo do Carro Chefe, o benefício econômico principal provavelmente só será útil perto da inauguração. Portanto, o cadastro precisa gerar **alguma recompensa perceptível imediatamente**, sem fingir que um cupom ainda indefinido já está disponível.

#### Aplicação

Ao concluir o cadastro, o visitante recebe imediatamente:

- confirmação inequívoca de entrada na Lista dos Primeiros;
- status visual de progresso;
- um teaser real de produto, parrilla, bastidor ou detalhe da experiência;
- explicação clara de quando receberá o benefício futuro.

#### Estado de sucesso

> # Você está dentro.
>
> Seu WhatsApp entrou na Lista dos Primeiros.
>
> **Confirmado agora** ✓
>
> Você vai receber a notícia da abertura e seu benefício especial quando a inauguração estiver pronta para ser anunciada.

Depois da mensagem, exibir **um único teaser real** e, só então, a ação secundária de Instagram.

#### Não fazer

- “Obrigado pelo cadastro” sem nenhuma entrega;
- roleta, caixa misteriosa ou prêmio aleatório;
- fingir que um código tem valor antes da regra econômica existir;
- obrigar o usuário a seguir Instagram para validar o cadastro.

#### Métrica

- `signup_success → reward_view`;
- `reward_view → instagram_click`;
- retorno posterior de inscritos.

---

### 3.3. Goal-gradient e progresso percebido

Pesquisas sobre goal-gradient mostram que esforço e persistência podem aumentar à medida que a pessoa percebe que está mais próxima de um objetivo; estudos de loyalty também encontraram efeitos quando existe progresso inicial percebido.[^3][^4]

A aplicação aqui deve ser pequena e verdadeira. Não criar uma falsa barra “90% completo” só para manipular.

#### Aplicação

A jornada pode ser comunicada como três estados reais:

```text
1. Entrar na lista ✓
2. Receber a abertura
3. Usar o benefício
```

Depois do cadastro, o passo 1 aparece concluído. O usuário vê que existe uma continuidade simples e entende o que acontecerá depois.

#### UI

O progresso deve aparecer **depois do cadastro**, quando já corresponde ao estado real do usuário. Antes do cadastro, evitar stepper artificial que faça uma ação de um campo parecer um processo longo.

#### Métrica

A função principal é clareza/retorno, não aumentar `signup_success` diretamente. Avaliar:

- retorno à landing;
- taxa de abertura/click em comunicação futura;
- resgate do benefício.

---

### 3.4. Redução de escolhas: uma ação dominante

A lei de Hick-Hyman descreve aumento do tempo de decisão conforme cresce o número/complexidade das alternativas, com limites e moderadores conhecidos.[^5]

A landing do banner não é lugar para oferecer simultaneamente:

- ver cardápio;
- pedir;
- abrir WhatsApp;
- seguir Instagram;
- conhecer história;
- ver produtos;
- entrar na lista.

#### Decisão de arquitetura

Antes do cadastro, a interface tem **uma ação visual dominante**:

> **Entrar na Lista dos Primeiros**

Instagram, WhatsApp e história da marca permanecem disponíveis, mas visualmente secundários e preferencialmente após a conversão principal.

#### Hierarquia visual

- 1 CTA primário sólido;
- links secundários em menor ênfase;
- sem dois botões grandes lado a lado no hero;
- sem navegação extensa no topo;
- sem carrossel de promoções.

#### Métrica

- `signup_cta_click / landing_view`;
- cliques concorrentes antes do formulário;
- dead clicks e quick backs.

---

### 3.5. Fluência de processamento: parecer fácil de entender

Processing fluency é a experiência subjetiva de facilidade/dificuldade de processar informação e pode afetar julgamentos como confiança, atitude e escolha.[^6] Em mobile commerce, maior complexidade visual foi associada a menor fluência, enquanto fluência se relacionou positivamente à satisfação.[^7]

#### Aplicação visual

A identidade Carro Chefe é rica, rústica e ornamentada. Na landing isso não autoriza excesso de molduras, texturas, fontes decorativas e elementos competindo pelo foco.

Usar a marca para criar **atmosfera**, não ruído.

#### Regra 80/20 visual

A maior parte da interface funcional deve ser simples:

- fundo escuro limpo;
- tipografia funcional legível;
- uma cor de ação consistente;
- ornamentação concentrada em logo, separadores e detalhes;
- textura sutil, nunca atrás de textos pequenos;
- display western/serifado apenas em títulos especiais.

#### Sinal de qualidade

A landing deve parecer deliberada, não “cheia”. Espaço vazio é componente de hierarquia.

#### Métrica

- `form_start / landing_view`;
- scroll;
- tempo até primeira interação;
- mapas de atenção;
- testes qualitativos de 5 segundos: “o que está chegando?” e “o que você deve fazer aqui?”.

---

### 3.6. Cue-reactivity de comida: produto real como estímulo de desejo

Uma meta-análise de 45 estudos/3.292 participantes encontrou associação de magnitude moderada entre reatividade/craving induzido por pistas de comida e desfechos alimentares; pistas visuais como fotos e vídeos tiveram associação semelhante à exposição a comida real nesse conjunto de estudos.[^8] Revisões também mostram que sinais visuais de alimentos influenciam atenção, percepção, atitudes e comportamento, embora resultados dependam do contexto.[^9]

#### Implicação para a landing

Quando existir ativo real aprovado, uma boa imagem do lanche/parrilla não é apenas decoração: ela ajuda a concretizar a promessa sensorial.

Prioridade de mídia:

1. foto/vídeo real aprovado do produto pronto;
2. detalhe real da carne/brasa/montagem;
3. bastidor real do preparo;
4. se nada disso existir, identidade visual sem fingir produto real.

#### Direção de fotografia

Preferir:

- produto suficientemente fechado para parecer executável e real;
- carne/brasa visíveis;
- textura do pão e recheio reconhecíveis;
- enquadramento próximo, mas sem distorcer proporções;
- luz quente coerente com parrilla;
- cenário escuro/rústico compatível com a marca;
- nenhuma montagem impossível ou exagero de ingredientes.

#### Proibição

Não usar imagem de IA como se fosse fotografia fiel do produto real. Além de risco reputacional, isso quebra a função de prova sensorial: o visitante deve desejar **o que realmente poderá comprar**.

#### P0 x P1

Se mídia real de qualidade não estiver disponível hoje, **não bloquear o lançamento**: P0 usa marca + texto + brasa/textura. A foto real entra como P1 e deve ser testada.

---

### 3.7. Prova social: só quando existe uma norma verdadeira

Experimentos de normas sociais mostram que informação descritiva sobre o comportamento de pessoas semelhantes pode alterar comportamento.[^10] Isso torna a prova social poderosa — e também fácil de abusar.

#### Regra

Não mostrar “centenas de pessoas já entraram” até existir número real, estável e auditável.

#### Quando ativar

A prova social pode entrar em P1 quando houver volume suficiente para a mensagem soar informativa em vez de constrangedora.

Exemplo:

> **127 pessoas já entraram na Lista dos Primeiros.**

Somente se 127 representar pessoas válidas segundo a regra de deduplicação definida.

#### Evitar

- contador animado que sobe sozinho;
- “X pessoas estão vendo agora” sem medição real;
- notificações falsas “Fulano acabou de se cadastrar”;
- usar número baixo que produza norma contrária (“só 8 pessoas se cadastraram”).

#### Métrica

Teste A/B somente depois de volume suficiente:

- controle sem prova social;
- variante com contagem real.

KPI: `signup_success / attributed_unique_session`.

---

### 3.8. Escassez: usar somente restrição operacional real

Meta-análise de 131 estudos encontrou que sinais de escassez podem aumentar intenção de compra, mas a magnitude varia conforme tipo de escassez e contexto.[^11]

Isso não justifica fabricar urgência.

#### Usos permitidos

- “Cadastros para o benefício de inauguração até DD/MM”, se houver prazo real e regra aprovada;
- “Primeiras 200 unidades”, se a limitação corresponder a estoque/capacidade real;
- janela real de soft opening.

#### Usos proibidos

- contador reiniciável;
- “últimas vagas” sem limite real;
- relógio de 10 minutos por sessão;
- estoque fictício;
- urgência criada apenas para forçar telefone.

#### P0

Não usar escassez no lançamento inicial enquanto não houver decisão operacional concreta.

---

### 3.9. Defaults e consentimento: não usar o viés contra o usuário

Meta-análise de 58 estudos mostrou efeito relevante de opções padrão sobre escolhas, com grande variação entre contextos.[^12] Experimentos recentes com banners de cookies também mostram que a arquitetura da escolha — inclusive esconder opções atrás de cliques — altera substancialmente o comportamento.[^13]

Como o efeito é forte, **não deve ser usado para fabricar consentimento**.

#### Requisitos

Consentimento de comunicação:

- não pré-marcar checkbox;
- explicar o que será enviado;
- permitir saída posterior;
- não condicionar cadastro a analytics.

Consentimento de analytics/cookies:

- “Aceitar” e “Recusar” com legibilidade comparável;
- recusa não escondida em segundo nível;
- nenhuma linguagem de culpa;
- configuração revisável.

A ANPD recomenda transparência, minimização e controle do titular na utilização de cookies e mecanismos de consentimento.[^14]

---

## 4. Blueprint de UI mobile

### 4.1. Primeira viewport

Objetivo: em uma tela pequena, o visitante deve reconhecer marca, promessa e próxima ação sem precisar explorar.

Ordem recomendada:

```text
[logo compacto]
Pré-inauguração · Campo Grande

O Carro Chefe está chegando.

Brasa, espeto e baguete...

Entre para a Lista dos Primeiros e receba
abertura em primeira mão + benefício especial.

[WhatsApp __________________]
[ ] Quero receber novidades da inauguração e promoções...
[ ENTRAR NA LISTA DOS PRIMEIROS ]

Sem spam. Saia quando quiser.  Privacidade
```

Se o conjunto inteiro não couber confortavelmente, **não diminuir texto/campos excessivamente para forçar tudo acima da dobra**. Priorizar título + proposta + início do formulário, sinalizando naturalmente que há continuidade.

### 4.2. Não usar CTA que abre modal para o formulário

A intenção já está formada quando a pessoa veio do QR. Um modal/bottom sheet adiciona uma etapa e pode competir com banners de cookies.

Padrão preferido:

**formulário inline na própria página.**

Se houver CTA separado no hero por limitação de layout, ele deve fazer scroll previsível para o formulário, sem overlay obrigatório.

### 4.3. Uma coluna

Pesquisas de usabilidade da Baymard recomendam evitar formulários extensos em múltiplas colunas; uma única direção de varredura reduz interpretação errada e esforço visual.[^15]

No Carro Chefe:

- WhatsApp em uma linha;
- consentimento abaixo;
- nome opcional não deve competir com o campo obrigatório.

### 4.4. Progressive disclosure para o nome

O telefone é o dado necessário para cumprir a promessa. O nome é útil, mas não deve elevar o custo percebido do cadastro.

Padrão recomendado:

**P0:** WhatsApp + consentimento.

Depois de `signup_success`, oferecer opcionalmente:

> **Como podemos te chamar? (opcional)**

Isso mantém a ação principal mínima. O usuário já entrou na lista mesmo se ignorar o nome.

Alternativa aceitável: nome opcional visível abaixo do telefone, desde que dados reais mostrem que não reduz conversão.

### 4.5. Teclado e preenchimento

- usar controle apropriado para telefone;
- permitir colar número;
- não exigir que o usuário digite símbolos manualmente;
- aceitar formatação comum e normalizar na persistência;
- não apagar o que foi digitado após erro;
- usar autocomplete quando compatível com privacidade e plataforma.

A interface deve tolerar entradas como:

```text
67992046721
(67) 99204-6721
+55 67 99204-6721
```

A normalização é problema do sistema, não do usuário.

### 4.6. Labels persistentes

Placeholder não substitui label.

Usar:

```text
WhatsApp
(67) 9 9999-9999
```

O label continua visível durante a digitação, facilitando revisão e acessibilidade.

### 4.7. Validação sem agressão

Testes da Baymard indicam que validação inline ajuda a recuperação, mas mensagens prematuras enquanto o usuário ainda está digitando geram frustração.[^16]

Regra:

- não mostrar erro no primeiro foco;
- validar quando houver informação suficiente ou ao sair do campo;
- se houver erro, explicar como corrigir;
- remover o erro assim que a correção ficar válida;
- usar confirmação positiva discreta.

Exemplo correto:

> **Confira o número.** Digite DDD + telefone, por exemplo `(67) 99204-6721`.

Evitar:

> **Número inválido!**

sem dizer o que fazer.

### 4.8. Estado de envio

Após toque no CTA:

- preservar conteúdo;
- indicar processamento no mesmo botão;
- impedir duplo envio acidental;
- não substituir o botão por um elemento que cause layout shift importante;
- após confirmação do backend, mudar para sucesso.

`signup_success` só existe após persistência real.

### 4.9. Duplicata

Não tratar uma pessoa já cadastrada como erro.

Mensagem sugerida:

> **Você já está na Lista dos Primeiros.**
>
> Esse WhatsApp já está confirmado. Quando houver novidade da inauguração, você continua dentro.

Não revelar metadados da inscrição anterior que possam expor informações pessoais.

### 4.10. Falha de rede

Mensagem:

> **Não conseguimos confirmar agora.**
>
> Seu cadastro ainda não foi concluído. Confira a conexão e tente novamente.

CTA:

> **Tentar novamente**

Preservar o telefone digitado.

---

## 5. CTA e microcopy

NN/G recomenda rótulos de comandos que expliquem a ação e evitem labels genéricos; microcopy específica melhora information scent.[^17][^18]

### CTA principal

**Recomendado:**

> Entrar na Lista dos Primeiros

Alternativa a testar:

> Quero meu benefício de inauguração

A alternativa só é permitida quando existir benefício garantido. Caso contrário, o primeiro rótulo é mais seguro.

### Evitar

- Enviar
- Continuar
- Saiba mais
- Clique aqui
- Quero agora

sem deixar claro o que ocorre.

### Microcopy de confiança

Próxima ao CTA:

> **Novidades da inauguração e promoções pelo WhatsApp. Saia quando quiser.**

Não escrever um parágrafo jurídico inteiro no hero. O resumo deve ser claro e o documento completo acessível por “Privacidade”.

---

## 6. Consentimento sem destruir a conversão

Privacidade não deve ser tratada como um obstáculo a esconder. Uma interface clara pode aumentar confiança e gerar base de melhor qualidade.

### Comunicação WhatsApp

Checkbox desmarcado por padrão:

> **Quero receber pelo WhatsApp novidades da inauguração e promoções do Carro Chefe. Posso cancelar quando quiser.**

O texto deve ser versionado para auditoria.

### Analytics

Banner simples:

> **Podemos usar analytics para entender como esta página é usada?**
>
> Isso nos ajuda a melhorar a experiência. O cadastro funciona mesmo se você recusar.

Ações:

`[Aceitar analytics] [Recusar analytics]`

Gerenciamento detalhado pode ser terciário.

### Simetria de escolha

Não usar:

- botão “Aceitar” grande e “recusar” como link quase invisível;
- texto emocional “Não, prefiro uma experiência pior”;
- múltiplos cliques para recusar;
- checkbox pré-marcado.

FTC, OECD e EDPB documentam como interfaces podem direcionar ou manipular usuários por padrões enganosos; o projeto deve usar princípios psicológicos para **reduzir esforço e aumentar entendimento**, não para subverter autonomia.[^19][^20][^21]

---

## 7. Hierarquia visual do Carro Chefe

### 7.1. O ouro é ação, não decoração em todo lugar

A paleta existente usa ouro/bronze como parte da marca. Se tudo for dourado, nada é prioridade.

Aplicação:

- ouro claro: CTA principal, foco e detalhes estratégicos;
- bronze: bordas/ornamentos secundários;
- pergaminho: texto principal;
- brasa: pequenos sinais de calor e destaques de produto;
- obsidiana: superfície dominante.

### 7.2. Contraste de CTA

O CTA principal deve ser o elemento interativo de maior saliência da viewport. Botões secundários não usam o mesmo peso visual.

### 7.3. Ornamentos

Ornamento nunca deve:

- atravessar label/campo;
- parecer botão;
- competir com o produto;
- reduzir contraste;
- aumentar significativamente o LCP.

### 7.4. Movimento

Animação só quando comunica estado ou reforça atmosfera sem atrasar ação.

Permitido:

- brasa sutil;
- transição curta de sucesso;
- press/focus states claros.

Evitar:

- intro obrigatória com logo;
- parallax pesado;
- autoplay de vídeo grande antes do formulário;
- animação infinita ao redor do CTA;
- partículas que competem com leitura.

Respeitar `prefers-reduced-motion`.

---

## 8. Alvos de toque, acessibilidade e uso na rua

WCAG 2.2 define critério mínimo de 24×24 CSS px para targets, com exceções; Apple recomenda hit regions de pelo menos 44×44 pt e Android recomenda 48×48 dp para interfaces touch.[^22][^23][^24]

Para esta landing, adotar como **meta de projeto**:

- CTA e controles principais com área de toque equivalente a pelo menos ~48 px CSS quando possível;
- no mínimo 44 px de altura visual para o botão principal;
- bom espaçamento entre checkbox, links e ações;
- foco visível;
- contraste WCAG AA;
- nada importante dependente apenas de cor;
- campos com labels reais;
- erros associados semanticamente aos campos.

O contexto de rua torna targets generosos ainda mais importantes: a pessoa pode estar em movimento, usando uma mão, sob iluminação variável ou com atenção dividida.

---

## 9. Performance como parte da psicologia da conversão

Uma pessoa que acabou de escanear um banner tem motivação volátil. Carregamento lento cria uma interrupção entre estímulo e recompensa.

Core Web Vitals atuais tratam como “bom”, no percentil 75:

- LCP ≤ 2,5 s;
- INP ≤ 200 ms;
- CLS ≤ 0,1.[^25]

Estudos de caso de performance mostram associação consistente entre melhor velocidade e melhores métricas comerciais, inclusive exemplos brasileiros recentes.[^26][^27]

### Requisitos do projeto

P0:

- hero não depender de vídeo;
- não carregar imagens enormes antes do CTA;
- reservar dimensões de imagens para evitar CLS;
- analytics não bloquear conteúdo;
- fonte display não bloquear legibilidade inicial;
- página utilizável em rede celular comum.

P1:

- RUM segmentado por dispositivo e origem QR;
- acompanhar LCP/INP/CLS junto da taxa QR → cadastro;
- investigar conversão por faixas de LCP.

---

## 10. Arquitetura final recomendada da página

```text
HEADER MÍNIMO
logo + “Sabor que lidera”

HERO / CONVERSÃO
Pré-inauguração · Campo Grande
O Carro Chefe está chegando.
proposta sensorial curta
benefício claro da lista
WhatsApp
consentimento de comunicação
CTA primário
microcopy de confiança

TEASER REAL
foto/vídeo real, se aprovado
uma frase sensorial

PROPOSTA DA MARCA
espeto → parrilla → baguete
preparo como experiência
sem cardápio completo

BASTIDORES / SOCIAL
Instagram como ação secundária

REPETIÇÃO DE CONVERSÃO
somente para quem ainda não se cadastrou
CTA/form enxuto

RODAPÉ
Instagram
WhatsApp
Privacidade
Termos
preferências de analytics
```

Após `signup_success`, a página pode substituir repetições de cadastro por estado de participação, evitando pedir novamente a mesma ação.

---

## 11. Experiência de sucesso — “peak/end” operacional

Independentemente de usar formalmente uma heurística de peak-end, o último estado da interação precisa ser forte porque é o que encerra a experiência de cadastro.

### Composição recomendada

```text
[ícone/assinatura de confirmação]

Você está dentro.

Seu lugar na Lista dos Primeiros está confirmado.

1 Cadastro confirmado ✓
2 Abertura pelo WhatsApp
3 Benefício na inauguração

[teaser real do produto/bastidor]

Quer acompanhar os bastidores?
[Seguir @carrochefe_cg]
```

Não redirecionar automaticamente para Instagram ou WhatsApp. O usuário deve permanecer no contexto onde recebeu a confirmação.

---

## 12. Estratégias classificadas por força de evidência

| Estratégia | Evidência | Uso no projeto | P0/P1 | Risco |
|---|---|---|---|---|
| reduzir alternativas no hero | alta/base cognitiva | 1 CTA dominante | P0 | baixo |
| reduzir campos visíveis | forte pesquisa UX | WhatsApp primeiro | P0 | baixo |
| layout de uma coluna | forte pesquisa UX | formulário mobile | P0 | baixo |
| validação inline não prematura | forte pesquisa UX | telefone | P0 | baixo |
| recompensa imediata | evidência experimental | confirmação + teaser | P0 | baixo |
| curiosidade/information gap | base teórica forte | teaser de abertura | P0 | médio se virar clickbait |
| progresso percebido | evidência experimental/field | estado 1/3 após cadastro | P0 | baixo se verdadeiro |
| foto real de alimento | meta-análises/revisões | teaser/hero quando disponível | P1 ou P0 se ativo pronto | risco de representação enganosa |
| prova social | evidência experimental | número real de inscritos | P1 | alto se inventado |
| escassez | meta-análise | somente limite real | P1 | alto se artificial |
| defaults | efeito robusto, mas eticamente sensível | **não usar para forçar consentimento** | P0 | alto |
| animação atmosférica | hipótese de marca, não motor principal | brasa/microinteração | P1 | performance/distração |

---

## 13. Backlog de experimentos A/B

Nenhum teste deve trocar várias variáveis ao mesmo tempo.

### EXP-01 — proposta do hero

Controle:

> O Carro Chefe está chegando.

Variante:

> Seja um dos primeiros a provar o Carro Chefe.

Manter benefício, imagem, CTA e formulário iguais.

**KPI:** QR → cadastro.

### EXP-02 — produto real

Controle: composição visual de marca.

Variante: foto real aprovada do Carro-Chefe/Chefão.

**KPI:** form_start e signup_success.

### EXP-03 — CTA

Controle:

> Entrar na Lista dos Primeiros

Variante, somente com benefício aprovado:

> Garantir meu benefício de inauguração

**KPI:** signup_success, não apenas clique.

### EXP-04 — prova social

Somente quando houver amostra real suficiente.

Controle: sem contador.

Variante:

> X pessoas já entraram na lista.

**KPI:** signup_success.

### EXP-05 — nome opcional

Controle: nome pós-cadastro.

Variante: nome visível no formulário.

**KPI principal:** signup_success.  
**KPI secundário:** percentual de leads com nome.

### EXP-06 — recompensa imediata

Controle: confirmação textual.

Variante: confirmação + teaser real.

**KPI:** Instagram click, retorno e engajamento pós-cadastro. O `signup_success` já aconteceu antes desse teste.

---

## 14. Instrumentação específica para avaliar UI/psicologia

Além dos eventos já definidos em `ANALYTICS_PRIVACIDADE.md`, incluir parâmetros/derivações que permitam responder:

- qual versão do hero foi exibida;
- qual CTA foi exibido;
- se houve mídia real;
- posição do formulário (`hero` ou repetição inferior);
- erro de validação por categoria, sem registrar valor digitado;
- tempo até `form_start`;
- tempo até `signup_success`;
- profundidade de scroll antes do cadastro;
- seção vista antes da conversão.

Exemplo conceitual sem PII:

```json
{
  "event": "signup_success",
  "experiment": "hero_v1",
  "cta_variant": "lista_primeiros",
  "form_position": "hero",
  "has_product_media": false
}
```

Nunca registrar o conteúdo do campo de telefone nesses eventos.

---

## 15. Dark patterns explicitamente proibidos

O agente de implementação e futuros agentes de Growth não devem introduzir:

- checkbox de marketing pré-marcado;
- botão de recusa deliberadamente ilegível;
- confirmshaming (“não, não quero desconto”);
- urgência falsa;
- escassez falsa;
- contador fake;
- prova social inventada;
- custo/condição escondida;
- cadastro automático em canal não informado;
- seguir Instagram como requisito escondido;
- pop-up que reaparece imediatamente após fechar;
- formulário que perde dados para pressionar reentrada;
- dificuldade artificial para cancelar comunicação;
- “benefício” prometido sem regra de entrega.

A métrica de conversão não justifica violar essa lista.

---

## 16. Critérios de aceite de UI — P0

### Compreensão

Uma pessoa que vê a primeira tela deve conseguir responder sem explorar o site:

- qual marca é;
- que a inauguração ainda está por vir;
- qual é a proposta geral do produto;
- o que ganha ao se cadastrar;
- qual ação deve executar.

### Conversão

- existe somente um CTA visualmente dominante antes do cadastro;
- formulário é inline ou acessível sem modal obrigatório;
- WhatsApp é o único dado pessoal obrigatório;
- consentimento de comunicação não vem pré-selecionado;
- nome não é obstáculo à entrada na lista;
- telefone aceita formatos comuns;
- botão explica a ação;
- envio possui estado de loading e evita duplicata por clique.

### Confiança

- microcopy explica o canal e a possibilidade de sair;
- privacidade está próxima e acessível;
- não existe promessa indefinida apresentada como fato;
- imagem de produto, quando usada, representa produto real aprovado.

### Feedback

- sucesso inequívoco;
- erro acionável;
- duplicata tratada como estado válido;
- erro não apaga telefone;
- não há redirecionamento forçado após cadastro.

### Mobile/acessibilidade

- CTA principal com hit area generosa (~44–48 px ou maior);
- sem targets pequenos amontoados;
- labels persistentes;
- foco visível;
- contraste AA;
- redução de movimento respeitada;
- sem scroll horizontal;
- layout de uma coluna.

### Performance

- CTA/form não dependem de mídia pesada para renderizar;
- Core Web Vitals entram como métrica de qualidade;
- nenhuma intro/loader de marca bloqueia a ação.

---

## 17. Critérios de priorização

Quando houver conflito entre “mais chamativo” e “mais compreensível”, priorizar compreensão.

Quando houver conflito entre “mais dados do lead” e “menos fricção”, coletar somente o necessário agora e enriquecer depois.

Quando houver conflito entre “mais prova social” e veracidade, escolher veracidade.

Quando houver conflito entre animação e performance, escolher performance.

Quando houver conflito entre conversão e consentimento livre, escolher consentimento livre.

Quando houver conflito entre imagem espetacular e fidelidade ao produto, escolher fidelidade.

---

## 18. Referências externas

[^1]: Loewenstein, G. (1994). *The Psychology of Curiosity: A Review and Reinterpretation*. Psychological Bulletin, 116(1), 75–98. DOI: https://doi.org/10.1037/0033-2909.116.1.75 — cópia acadêmica: https://www.cmu.edu/dietrich/sds/docs/loewenstein/PsychofCuriosity.pdf
[^2]: Woolley, K. & Fishbach, A. (2018). *It’s about time: Earlier rewards increase intrinsic motivation*. Journal of Personality and Social Psychology, 114(6), 877–890. https://pubmed.ncbi.nlm.nih.gov/29771568/
[^3]: Kivetz, R., Urminsky, O. & Zheng, Y. (2006). *The Goal-Gradient Hypothesis Resurrected: Purchase Acceleration, Illusionary Goal Progress, and Customer Retention*. Journal of Marketing Research, 43(1), 39–58. https://doi.org/10.1509/jmkr.43.1.39
[^4]: Nunes, J. C. & Drèze, X. (2006). *The Endowed Progress Effect: How Artificial Advancement Increases Effort*. Journal of Consumer Research, 32(4), 504–512. https://academic.oup.com/jcr/article-abstract/32/4/504/1787013
[^5]: Proctor, R. W. & Schneider, D. W. (2018). *Hick’s law for choice reaction time: A review*. Quarterly Journal of Experimental Psychology, 71(6), 1281–1299. https://pubmed.ncbi.nlm.nih.gov/28434379/
[^6]: Schwarz, N. (2021). *Metacognitive experiences as information: Processing fluency in consumer judgment and decision making*. Consumer Psychology Review, 4(1), 4–25. https://doi.org/10.1002/arcp.1067
[^7]: *Consumer processing of mobile online stores: Sources and effects of processing fluency*. Journal of Retailing and Consumer Services, 36, 137–147. https://doi.org/10.1016/j.jretconser.2017.01.008
[^8]: Boswell, R. G. & Kober, H. (2016). *Food cue reactivity and craving predict eating and weight gain: a meta-analytic review*. Obesity Reviews, 17(2), 159–177. https://pmc.ncbi.nlm.nih.gov/articles/PMC6042864/
[^9]: *Visual Design Cues Impacting Food Choice: A Review and Future Research Agenda*. Foods, 9(10), 1495. https://pmc.ncbi.nlm.nih.gov/articles/PMC7589873/
[^10]: Goldstein, N. J., Cialdini, R. B. & Griskevicius, V. (2008). *A Room with a Viewpoint: Using Social Norms to Motivate Environmental Conservation in Hotels*. Journal of Consumer Research, 35(3), 472–482. Referência: https://academic.oup.com/jcr/article/35/3/472/1856257
[^11]: Barton, B., Zlatevska, N. & Oppewal, H. (2022). *Scarcity tactics in marketing: A meta-analysis of product scarcity effects on consumer purchase intentions*. Journal of Retailing, 98(4), 741–758. https://doi.org/10.1016/j.jretai.2022.06.003
[^12]: Jachimowicz, J. M., Duncan, S., Weber, E. U. & Johnson, E. J. (2019). *When and why defaults influence decisions: a meta-analysis of default effects*. Behavioural Public Policy, 3(2), 159–186. https://doi.org/10.1017/bpp.2018.43
[^13]: Farronato, C., Fradkin, A. & Lin, T. (2025). *Designing Consent: Choice Architecture and Consumer Welfare in Data Sharing*. NBER Working Paper 34025. https://www.nber.org/papers/w34025
[^14]: Autoridade Nacional de Proteção de Dados. *Guia orientativo Cookies e proteção de dados pessoais*. https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais
[^15]: Baymard Institute. *Form Field Usability: Avoid Extensive Multicolumn Layouts*. https://baymard.com/blog/avoid-multi-column-forms
[^16]: Baymard Institute. *Usability Testing of Inline Form Validation*. https://baymard.com/blog/inline-form-validation
[^17]: Nielsen Norman Group. *UI Copy: UX Guidelines for Command Names and Keyboard Shortcuts*. https://www.nngroup.com/articles/ui-copy/
[^18]: Nielsen Norman Group. *Microcontent: How to Write Headlines, Page Titles, and Subject Lines*. https://www.nngroup.com/articles/microcontent-how-to-write-headlines-page-titles-and-subject-lines/
[^19]: Federal Trade Commission. *Bringing Dark Patterns to Light*. https://www.ftc.gov/reports/bringing-dark-patterns-light
[^20]: OECD (2022). *Dark commercial patterns*. OECD Digital Economy Papers No. 336. https://doi.org/10.1787/44f5e846-en
[^21]: European Data Protection Board. *Guidelines 03/2022 on deceptive design patterns in social media platform interfaces*. https://www.edpb.europa.eu/documents/guideline/guidelines-032022-on-deceptive-design-patterns-in-social-media-platform_en
[^22]: W3C. *WCAG 2.2 — Success Criterion 2.5.8 Target Size (Minimum)*. https://www.w3.org/TR/WCAG22/#target-size-minimum
[^23]: Apple Developer. *UI Design Dos and Don’ts — Hit Targets*. https://developer.apple.com/design/tips/
[^24]: Android Developers. *Make apps more accessible — Use large, simple controls*. https://developer.android.com/guide/topics/ui/accessibility/apps
[^25]: web.dev. *Web Vitals*. https://web.dev/articles/vitals
[^26]: web.dev. *How Nuvemshop's image prioritization strategy led to a 68% improvement in LCP and 8.9% more conversions*. https://web.dev/case-studies/nuvemshop
[^27]: web.dev. *How QuintoAndar increased conversion rates and pages per session by improving page performance*. https://web.dev/case-studies/quintoandar
